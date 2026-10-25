import type { ReactNode } from "react";

import { Badge, Button } from "@dev-mainsequence/command-center-sdk/controls";
import { ActivityIndicator } from "@dev-mainsequence/command-center-sdk/feedback";

import { describeError, errorCode } from "../api/client";

export function ErrorNotice({
  error,
  onRetry,
  retryLabel = "Retry",
}: {
  error: unknown;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const code = errorCode(error);
  return (
    <div className="hunch-alert hunch-alert--danger" role="alert">
      {code ? <Badge variant="danger">{code}</Badge> : <Badge variant="danger">error</Badge>}
      <span>{describeError(error)}</span>
      {onRetry ? (
        <Button onClick={onRetry} size="small" variant="outline">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function InfoNotice({
  children,
  tone = "info",
  actions,
}: {
  children: ReactNode;
  tone?: "info" | "warning";
  actions?: ReactNode;
}) {
  return (
    <div className={`hunch-alert hunch-alert--${tone}`} role="status">
      <span>{children}</span>
      {actions}
    </div>
  );
}

export function LoadingNotice({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="hunch-loading" role="status">
      <ActivityIndicator label={label} size="small" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyNotice({ children }: { children: ReactNode }) {
  return <p className="hunch-muted hunch-empty-text">{children}</p>;
}
