import { useEffect, useState, type ReactNode } from "react";

import type { ResourceActionTone } from "@dev-mainsequence/command-center-sdk/resource";
import { ResourceActionConfirmationDialog } from "@dev-mainsequence/command-center-sdk/views";

import { describeError } from "../api/client";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  actionLabel: string;
  confirmButtonLabel: string;
  tone?: ResourceActionTone;
  description?: ReactNode;
  warning?: ReactNode;
  selectionLabel?: ReactNode;
  /** The exact text the person must type, for example `DELETE <uid>`. */
  confirmationWord?: string;
  confirmDisabled?: boolean;
  pending?: boolean;
  error?: unknown;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

/** The SDK confirmation dialog with the typed-confirmation state held here. */
export function ConfirmDialog({
  open,
  title,
  actionLabel,
  confirmButtonLabel,
  tone = "default",
  description,
  warning,
  selectionLabel,
  confirmationWord,
  confirmDisabled,
  pending,
  error,
  children,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [confirmationValue, setConfirmationValue] = useState("");
  useEffect(() => {
    if (!open) setConfirmationValue("");
  }, [open]);
  if (!open) return null;
  return (
    <ResourceActionConfirmationDialog
      actionLabel={actionLabel}
      confirmButtonLabel={confirmButtonLabel}
      confirmDisabled={confirmDisabled}
      confirmationValue={confirmationValue}
      confirmationWord={confirmationWord}
      description={description}
      error={error ? describeError(error) : undefined}
      onClose={onClose}
      onConfirm={onConfirm}
      onConfirmationValueChange={setConfirmationValue}
      open
      pending={pending}
      presentation="auto"
      selectionLabel={selectionLabel}
      title={title}
      tone={tone}
      warning={warning}
    >
      {children}
    </ResourceActionConfirmationDialog>
  );
}
