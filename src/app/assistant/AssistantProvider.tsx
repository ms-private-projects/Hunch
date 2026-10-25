import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import {
  ChatEngineProvider,
  createChatBackendConnection,
  createLocalAgentSource,
  type ChatAuth,
  type ChatBackendConnection,
  type ChatDefaultSession,
  type ChatThreadCopy,
  type ChatViewer,
  type LocalAgentSource,
} from "@dev-mainsequence/command-center-ai";

import { useConfiguration } from "../config/ConfigurationContext";
import { useNotices } from "../notices/NoticesProvider";

export interface AssistantValue {
  enabled: boolean;
  mode: "local" | "platform" | null;
  displayName: string;
  /** Why the conversation is not available, for the page's notice. */
  unavailableReason: string | null;
  railOpen: boolean;
  openRail: () => void;
  closeRail: () => void;
  viewer: ChatViewer | null;
  copy: Partial<ChatThreadCopy>;
}

const AssistantContext = createContext<AssistantValue | null>(null);
export const ASSISTANT_ROUTE = "/assistant";
const SESSION_HANDLE = "hunch_assistant";

const THREAD_COPY: Partial<ChatThreadCopy> = {
  emptyTitle: "Ask the Hunch Agent",
  emptyDescription:
    "Describe a thesis, ask about one of your takes, or go through a proposal before you approve it.",
  composerPlaceholder: "Message the Hunch Agent",
  disclaimer: "Hunch is not investment advice. Verify before you act.",
};

/**
 * One chat engine for the whole site: the rail on take pages and the full page share it. The
 * configuration endpoint chooses the source: the local Tau runtime through `/tau`, or the
 * deployed Agent through the platform.
 */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const { configuration, transport } = useConfiguration();
  const { notify } = useNotices();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [railOpen, setRailOpen] = useState(false);

  const assistant = configuration.assistant;
  const userUid = configuration.request_user_uid;
  const onAssistantRoute = location.pathname.startsWith(ASSISTANT_ROUTE);
  const requestedSessionId = onAssistantRoute ? searchParams.get("session") : null;
  const mode = assistant.enabled ? (assistant.runtime?.mode ?? null) : null;

  const openRail = useCallback(() => setRailOpen(true), []);
  const closeRail = useCallback(() => setRailOpen(false), []);

  const localSource = useMemo<{ source: LocalAgentSource | null; problem: string | null }>(() => {
    if (mode !== "local") return { source: null, problem: null };
    try {
      return {
        source: createLocalAgentSource({
          baseUrl: assistant.runtime?.base_path?.trim() || "/tau",
          displayName: assistant.display_name,
          userUid,
        }),
        problem: null,
      };
    } catch (error) {
      return { source: null, problem: error instanceof Error ? error.message : String(error) };
    }
  }, [assistant.display_name, assistant.runtime?.base_path, mode, userUid]);

  type PlatformSetup =
    | { kind: "problem"; problem: string }
    | {
        kind: "ready";
        connection: ChatBackendConnection;
        auth: ChatAuth;
        defaultSession: ChatDefaultSession;
        environmentUid: string;
      };

  const platform = useMemo<PlatformSetup | null>(() => {
    if (mode !== "platform") return null;
    if (transport.platformRequests === "unsupported") {
      return {
        kind: "problem",
        problem:
          "This page cannot reach the platform on its own. Open Hunch inside Command Center, or run the dev server.",
      };
    }
    if (!assistant.agent_uid || !assistant.environment_uid) {
      return { kind: "problem", problem: "The API named no deployed Hunch Agent for this Environment." };
    }
    return {
      kind: "ready",
      connection: createChatBackendConnection({
        apiBaseUrl: window.location.origin,
        sendPlatformRequest: (request) => transport.sendPlatformRequest(request),
      }),
      auth: { userUid },
      defaultSession: {
        agentUid: assistant.agent_uid,
        handleUniqueId: SESSION_HANDLE,
        name: assistant.display_name,
        status: "ready",
        unavailableMessage: "The Hunch Agent's session could not be opened.",
      },
      environmentUid: assistant.environment_uid,
    };
  }, [assistant.agent_uid, assistant.display_name, assistant.environment_uid, mode, transport, userUid]);

  const viewContext = useMemo(() => ({ app: "hunch", path: location.pathname }), [location.pathname]);
  const viewer = useMemo<ChatViewer | null>(() => (userUid ? { uid: userUid } : null), [userUid]);

  const unavailableReason = !assistant.enabled
    ? mode === null
      ? "No Hunch Agent answers right now. Locally, start the Tau runtime (scripts/dev_stack.sh tau); hosted, the Agent deploys with the API."
      : null
    : (localSource.problem ?? (platform?.kind === "problem" ? platform.problem : null));

  const value = useMemo<AssistantValue>(
    () => ({
      enabled: assistant.enabled && unavailableReason === null,
      mode,
      displayName: assistant.display_name,
      unavailableReason,
      railOpen,
      openRail,
      closeRail,
      viewer,
      copy: THREAD_COPY,
    }),
    [assistant.display_name, assistant.enabled, closeRail, mode, openRail, railOpen, unavailableReason, viewer],
  );

  const isVisible = railOpen || onAssistantRoute;
  const content = <AssistantContext value={value}>{children}</AssistantContext>;

  if (value.enabled && localSource.source) {
    return (
      <ChatEngineProvider
        isVisible={isVisible}
        notify={notify}
        onRequestVisible={openRail}
        requestedSessionId={requestedSessionId}
        source={localSource.source}
        viewContext={viewContext}
      >
        {content}
      </ChatEngineProvider>
    );
  }

  if (value.enabled && platform?.kind === "ready") {
    return (
      <ChatEngineProvider
        auth={platform.auth}
        connection={platform.connection}
        defaultSession={platform.defaultSession}
        environmentUid={platform.environmentUid}
        isVisible={isVisible}
        notify={notify}
        onRequestVisible={openRail}
        requestedSessionId={requestedSessionId}
        showsDefaultSession={!requestedSessionId}
        viewContext={viewContext}
      >
        {content}
      </ChatEngineProvider>
    );
  }

  return content;
}

export function useAssistant(): AssistantValue {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("useAssistant needs an AssistantProvider.");
  return value;
}
