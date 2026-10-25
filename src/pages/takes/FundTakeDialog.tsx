import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api/hunch";
import type { FundBody, FundResponse, LinkedAccountResource, TakeResource } from "../../api/types";
import { useAction, useQuery } from "../../api/useQuery";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { SelectField, TextField, YES_NO_OPTIONS, parseNumberField } from "../../components/fields";
import { ErrorNotice } from "../../components/Notices";
import { formatMoney, humanize, shortUid } from "../../lib/format";

interface PolicyValues {
  maxTurnover: string;
  maxNotional: string;
  maxWeight: string;
  allowNew: "yes" | "no";
  window: "session" | "any";
}

const DEFAULT_POLICY: PolicyValues = {
  maxTurnover: "0.25",
  maxNotional: "25000",
  maxWeight: "0.20",
  allowNew: "yes",
  window: "any",
};

function accountLabel(account: LinkedAccountResource): string {
  return account.account_name ?? account.account_identifier ?? shortUid(account.account_uid);
}

export function FundTakeDialog({
  take,
  open,
  onClose,
  onFunded,
}: {
  take: TakeResource;
  open: boolean;
  onClose: () => void;
  onFunded: (response: FundResponse) => void;
}) {
  const accounts = useQuery((signal) => api.accounts.list(false, signal), [open], { enabled: open });
  const active = useMemo(
    () => (accounts.data ?? []).filter((account) => account.status === "active"),
    [accounts.data],
  );
  const [accountUid, setAccountUid] = useState<string | null>(null);
  const [notional, setNotional] = useState("10000");
  const [mode, setMode] = useState<"approval" | "autopilot">("approval");
  const [policy, setPolicy] = useState<PolicyValues>(DEFAULT_POLICY);
  const action = useAction();
  const { clearError } = action;

  useEffect(() => {
    if (!open) {
      setAccountUid(null);
      setNotional("10000");
      setMode("approval");
      setPolicy(DEFAULT_POLICY);
      clearError();
    }
  }, [clearError, open]);

  const activeKey = active.map((account) => account.uid).join(",");
  useEffect(() => {
    if (accountUid === null && active.length === 1) setAccountUid(active[0].uid);
  }, [accountUid, active, activeKey]);

  const notionalValue = parseNumberField(notional);
  const notionalError =
    notionalValue === null || Number.isNaN(notionalValue)
      ? "Enter an amount."
      : notionalValue < 100 || notionalValue > 50_000_000
        ? "Between 100 and 50,000,000."
        : undefined;

  const fraction = (value: string, max = 1) => {
    const parsed = parseNumberField(value);
    return parsed === null || Number.isNaN(parsed) || parsed < 0 || parsed > max ? null : parsed;
  };
  const policyValues =
    mode === "autopilot"
      ? {
          max_turnover_per_day: fraction(policy.maxTurnover),
          max_notional_per_order: (() => {
            const parsed = parseNumberField(policy.maxNotional);
            return parsed === null || Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
          })(),
          max_single_name_weight: fraction(policy.maxWeight),
        }
      : null;
  const policyValid =
    policyValues === null || Object.values(policyValues).every((value) => value !== null);
  const valid = Boolean(accountUid) && !notionalError && policyValid;
  const selected = active.find((account) => account.uid === accountUid) ?? null;

  async function submit() {
    if (!valid || !accountUid || notionalValue === null) return;
    const body: FundBody = {
      profile_account_uid: accountUid,
      target_notional: notionalValue,
      execution_mode: mode,
      ...(mode === "autopilot" && policyValues
        ? {
            autopilot_policy: {
              max_turnover_per_day: policyValues.max_turnover_per_day ?? 0.25,
              max_notional_per_order: policyValues.max_notional_per_order ?? 25_000,
              max_single_name_weight: policyValues.max_single_name_weight ?? 0.2,
              allow_new_instruments: policy.allowNew === "yes",
              trading_window: policy.window,
            },
          }
        : {}),
    };
    const result = await action.run(() => api.takes.fund(take.uid, body));
    if (result) onFunded(result);
  }

  return (
    <ConfirmDialog
      actionLabel={`Fund “${take.title}”`}
      confirmButtonLabel={mode === "autopilot" ? "Fund on autopilot" : "Fund and propose trades"}
      confirmDisabled={!valid}
      description="Hunch opens a virtual fund in the linked account for this take's basket and prepares the first trades. In approval mode they wait for you; on autopilot they execute within the policy. The venue connector places every order."
      error={action.error}
      onClose={onClose}
      onConfirm={submit}
      open={open}
      pending={action.pending}
      selectionLabel={
        selected && notionalValue && !notionalError
          ? `${formatMoney(notionalValue, selected.currency)} into ${humanize(selected.venue)} · ${accountLabel(selected)}`
          : undefined
      }
      title="Fund this take"
      tone="primary"
      warning={
        !accounts.loading && active.length === 0 ? (
          <>
            You have no active linked account. <Link className="hunch-link" to="/accounts">Link one</Link> first.
          </>
        ) : undefined
      }
    >
      <div className="hunch-form-stack">
        {accounts.error ? <ErrorNotice error={accounts.error} onRetry={accounts.refetch} /> : null}
        <SelectField
          emptyMessage="No active linked account."
          label="Linked account"
          loading={accounts.loading}
          onChange={setAccountUid}
          options={active.map((account) => ({
            value: account.uid,
            label: `${humanize(account.venue)} · ${accountLabel(account)}`,
            subtitle: `${account.is_paper ? "Paper" : "Live"}${account.simulated ? " · simulated" : ""}`,
            meta: account.cash !== null ? `Cash ${formatMoney(account.cash, account.currency)}` : undefined,
          }))}
          placeholder="Choose an account"
          required
          value={accountUid}
        />
        <TextField
          description="Between 100 and 50,000,000."
          error={notionalError}
          inputMode="decimal"
          label="Target notional"
          min={100}
          onChange={setNotional}
          required
          step={100}
          type="number"
          value={notional}
        />
        <SelectField
          label="Execution mode"
          onChange={(value) => setMode(value === "autopilot" ? "autopilot" : "approval")}
          options={[
            { value: "approval", label: "Approval", subtitle: "Every proposal waits for you" },
            { value: "autopilot", label: "Autopilot", subtitle: "Executes within the policy below" },
          ]}
          value={mode}
        />
        {mode === "autopilot" ? (
          <div className="hunch-form-grid">
            <TextField
              description="Fraction of the fund per day, 0 to 1."
              inputMode="decimal"
              label="Max turnover per day"
              max={1}
              min={0}
              onChange={(value) => setPolicy((current) => ({ ...current, maxTurnover: value }))}
              step={0.05}
              type="number"
              value={policy.maxTurnover}
            />
            <TextField
              inputMode="decimal"
              label="Max notional per order"
              min={1}
              onChange={(value) => setPolicy((current) => ({ ...current, maxNotional: value }))}
              step={100}
              type="number"
              value={policy.maxNotional}
            />
            <TextField
              description="Fraction per instrument, 0 to 1."
              inputMode="decimal"
              label="Max single-name weight"
              max={1}
              min={0}
              onChange={(value) => setPolicy((current) => ({ ...current, maxWeight: value }))}
              step={0.01}
              type="number"
              value={policy.maxWeight}
            />
            <SelectField
              label="Allow new instruments"
              onChange={(value) => setPolicy((current) => ({ ...current, allowNew: value === "no" ? "no" : "yes" }))}
              options={YES_NO_OPTIONS}
              value={policy.allowNew}
            />
            <SelectField
              label="Trading window"
              onChange={(value) => setPolicy((current) => ({ ...current, window: value === "session" ? "session" : "any" }))}
              options={[
                { value: "any", label: "Any time" },
                { value: "session", label: "Regular session only" },
              ]}
              value={policy.window}
            />
          </div>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
