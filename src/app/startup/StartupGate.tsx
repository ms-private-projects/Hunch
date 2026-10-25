import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  ApplicationStatusScreen,
  type ProgressStageDefinition,
} from "@dev-mainsequence/command-center-sdk/feedback";

import { describeError, isApiError } from "../../api/client";
import { api } from "../../api/hunch";
import { connectTransport, type ApiTransport } from "../../api/transport";
import type { ProjectConfiguration } from "../../api/types";
import { ConfigurationContext, type ConfigurationValue } from "../config/ConfigurationContext";
import { applyHostTheme } from "../theme/theme";

type StageId = "theme" | "transport" | "configuration";

type StartupState =
  | { phase: StageId; attempt: number; retryingIn: number | null }
  | { phase: "error"; failedStage: StageId; attempt: number; message: string }
  | { phase: "ready"; configuration: ProjectConfiguration; transport: ApiTransport };

const STAGE_LABELS: Record<StageId, string> = {
  theme: "Apply the theme",
  transport: "Connect to the Hunch API",
  configuration: "Read the project configuration",
};
const STAGE_ORDER: readonly StageId[] = ["theme", "transport", "configuration"];
const MAX_AUTOMATIC_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_500;

function isTransient(error: unknown): boolean {
  if (isApiError(error)) return error.retryable || error.status === 0 || error.status >= 502;
  return false;
}

function stagesFor(state: StartupState): ProgressStageDefinition[] {
  const current = state.phase === "error" ? state.failedStage : state.phase;
  const activeIndex = current === "ready" ? STAGE_ORDER.length : STAGE_ORDER.indexOf(current);
  return STAGE_ORDER.map((id, index) => ({
    id,
    label: STAGE_LABELS[id],
    status:
      index < activeIndex
        ? "complete"
        : index === activeIndex
          ? state.phase === "error"
            ? "error"
            : "active"
          : "pending",
  }));
}

/**
 * The application root gate: theme, transport, then the configuration endpoint. Nothing below it
 * mounts until all three succeed; transient failures retry a bounded number of times.
 */
export function StartupGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StartupState>({ phase: "theme", attempt: 0, retryingIn: null });
  const [runToken, setRunToken] = useState(0);
  const attemptRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | null = null;
    const attempt = attemptRef.current;

    async function start() {
      let stage: StageId = "theme";
      try {
        setState({ phase: "theme", attempt, retryingIn: null });
        stage = "transport";
        setState({ phase: "transport", attempt, retryingIn: null });
        const transport = await connectTransport();
        if (controller.signal.aborted) return;
        if (transport.context) {
          applyHostTheme(transport.context.themeId, transport.context.themeMode);
        }
        stage = "configuration";
        setState({ phase: "configuration", attempt, retryingIn: null });
        const configuration = await api.configuration(controller.signal);
        if (controller.signal.aborted) return;
        setState({ phase: "ready", configuration, transport });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = describeError(error);
        if (isTransient(error) && attempt < MAX_AUTOMATIC_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
          setState({ phase: stage, attempt, retryingIn: delay });
          retryTimer = window.setTimeout(() => {
            attemptRef.current = attempt + 1;
            setRunToken((current) => current + 1);
          }, delay);
          return;
        }
        setState({ phase: "error", failedStage: stage, attempt, message });
      }
    }

    void start();
    return () => {
      controller.abort();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [runToken]);

  const retry = useCallback(() => {
    attemptRef.current = 0;
    setRunToken((current) => current + 1);
  }, []);

  const refresh = useCallback(async () => {
    const configuration = await api.configuration();
    setState((current) => (current.phase === "ready" ? { ...current, configuration } : current));
  }, []);

  const value = useMemo<ConfigurationValue | null>(
    () =>
      state.phase === "ready"
        ? { configuration: state.configuration, transport: state.transport, refresh }
        : null,
    [state, refresh],
  );

  if (value) {
    return <ConfigurationContext value={value}>{children}</ConfigurationContext>;
  }

  const retrying = state.phase !== "error" && state.phase !== "ready" && state.retryingIn !== null;
  return (
    <ApplicationStatusScreen
      action={state.phase === "error" ? { label: "Retry", onSelect: retry } : undefined}
      eyebrow="Hunch"
      message={
        state.phase === "error"
          ? state.message
          : retrying
            ? "The API did not answer yet."
            : "Connecting to the Hunch API."
      }
      notice={
        retrying && state.retryingIn !== null
          ? `Trying again in ${Math.round(state.retryingIn / 1000)} s (attempt ${state.attempt + 2} of ${MAX_AUTOMATIC_RETRIES + 1}).`
          : undefined
      }
      stages={stagesFor(state)}
      state={state.phase === "error" ? "error" : retrying ? "retrying" : "loading"}
      title={state.phase === "error" ? "Hunch could not start" : "Preparing Hunch"}
      variant="viewport"
    />
  );
}
