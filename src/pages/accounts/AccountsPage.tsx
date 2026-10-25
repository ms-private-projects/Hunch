import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge, Button } from "@dev-mainsequence/command-center-sdk/controls";
import {
  ApplicationCard,
  ApplicationPage,
  ApplicationPageHeader,
  ApplicationPageStack,
} from "@dev-mainsequence/command-center-sdk/layout";
import type { ResourceColumnDefinition } from "@dev-mainsequence/command-center-sdk/resource";
import { DataTable, ResourceIconLabelCell, ResourceStatusCell } from "@dev-mainsequence/command-center-sdk/views";

import { api } from "../../api/hunch";
import type { HoldingResource, LinkAccountBody, LinkedAccountResource, Venue } from "../../api/types";
import { useAction, useQuery } from "../../api/useQuery";
import { useConfiguration } from "../../app/config/ConfigurationContext";
import { useNotices } from "../../app/notices/NoticesProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { SelectField, TextField } from "../../components/fields";
import { StatRow } from "../../components/KeyValueList";
import { ErrorNotice, InfoNotice, LoadingNotice } from "../../components/Notices";
import { formatDate, formatDateTime, formatMoney, formatQuantity, humanize, shortUid } from "../../lib/format";
import { accountStatusTone } from "../../lib/status";

const VENUE_LABELS: Record<string, string> = { alpaca: "Alpaca", ibkr: "Interactive Brokers" };
const venueLabel = (venue: string) => VENUE_LABELS[venue] ?? humanize(venue);
const accountName = (account: LinkedAccountResource) =>
  account.account_name ?? account.account_identifier ?? shortUid(account.account_uid);

/** Five columns that fit the main column from 1024px; Linked hides below `lg`, rows stack below `sm`. */
const columns: ResourceColumnDefinition<LinkedAccountResource, ReactNode>[] = [
  {
    id: "account",
    header: "Account",
    importance: "primary",
    renderCell: (account) => (
      <div className="hunch-cell">
        <span className="hunch-cell__label">{accountName(account)}</span>
        <span className="hunch-item-meta">
          {venueLabel(account.venue)} · {account.is_paper ? "Paper" : "Live"}
          {account.simulated ? " · simulated" : ""}
          {account.account_identifier && account.account_name ? ` · ${account.account_identifier}` : ""}
        </span>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    importance: "secondary",
    renderCell: (account) => (
      <span className="hunch-inline-badges">
        <ResourceStatusCell label={humanize(account.status)} tone={accountStatusTone(account.status)} />
        {!account.ownership_verified ? <ResourceStatusCell label="Unverified" tone="warning" /> : null}
      </span>
    ),
  },
  {
    id: "balances",
    header: "Cash · equity",
    importance: "secondary",
    renderCell: (account) => (
      <div className="hunch-cell">
        <span className="hunch-cell__label">{formatMoney(account.cash, account.currency)}</span>
        <span className="hunch-item-meta">Equity {formatMoney(account.equity, account.currency)}</span>
      </div>
    ),
  },
  {
    id: "linked",
    header: "Linked",
    importance: "tertiary",
    hideBelow: "lg",
    renderCell: (account) => (account.status === "revoked" ? `Revoked ${formatDate(account.revoked_at)}` : formatDate(account.linked_at)),
  },
];

const holdingColumns: ResourceColumnDefinition<HoldingResource, ReactNode>[] = [
  {
    id: "asset",
    header: "Asset",
    importance: "primary",
    renderCell: (holding) => <ResourceIconLabelCell label={holding.symbol ?? holding.asset_identifier} meta={holding.figi ?? holding.kind} />,
  },
  { id: "kind", header: "Kind", importance: "tertiary", renderCell: (holding) => humanize(holding.kind) },
  {
    id: "quantity",
    header: "Quantity",
    importance: "secondary",
    renderCell: (holding) => `${holding.direction < 0 ? "−" : ""}${formatQuantity(Math.abs(holding.quantity))}`,
  },
  { id: "value", header: "Market value", importance: "secondary", renderCell: (holding) => formatMoney(holding.market_value) },
];

function LinkAccountDialog({ open, onClose, onLinked }: { open: boolean; onClose: () => void; onLinked: (account: LinkedAccountResource) => void }) {
  const { configuration } = useConfiguration();
  const connectors = configuration.connectors ?? null;
  const simulated = connectors?.mode === "simulated";
  const venues = useMemo(
    () =>
      configuration.venues
        .filter((venue): venue is Venue => venue === "alpaca" || venue === "ibkr")
        .map((venue) => ({ venue, enabled: connectors ? connectors.venues[venue] !== false : true })),
    [configuration.venues, connectors],
  );
  const firstEnabled = venues.find((item) => item.enabled)?.venue ?? null;
  const [venue, setVenue] = useState<Venue | null>(firstEnabled);
  const [accountUid, setAccountUid] = useState("");
  const [accountName, setAccountName] = useState("");
  const action = useAction();
  const { clearError } = action;

  useEffect(() => {
    if (!open) {
      setVenue(firstEnabled);
      setAccountUid("");
      setAccountName("");
      clearError();
    }
  }, [clearError, firstEnabled, open]);

  const venueEnabled = venue !== null && venues.some((item) => item.venue === venue && item.enabled);

  async function submit() {
    if (!venue || !venueEnabled) return;
    const body: LinkAccountBody = {
      venue,
      ...(accountUid.trim() ? { account_uid: accountUid.trim() } : {}),
      ...(accountName.trim() ? { account_name: accountName.trim().slice(0, 255) } : {}),
    };
    const linked = await action.run(() => api.accounts.link(body));
    if (linked) onLinked(linked);
  }

  return (
    <ConfirmDialog
      actionLabel="Link a venue account"
      confirmButtonLabel={simulated && !accountUid.trim() ? "Create paper account" : "Link account"}
      confirmDisabled={!venueEnabled}
      description={
        simulated
          ? "This deployment runs a simulated venue inside Hunch. Leave the account uid empty and Hunch creates a simulated paper account with cash to practise funding; name a uid to link an account the simulated venue already registered."
          : "The account must first be registered on the venue connector's own site, where you enter your API keys. Keys never pass through Hunch. Only accounts the connector registered for you can be linked here."
      }
      error={action.error}
      onClose={onClose}
      onConfirm={submit}
      open={open}
      pending={action.pending}
      title="Link an account"
      tone="primary"
      warning={
        firstEnabled === null ? "No venue connector is enabled in this deployment, so no account can be linked." : undefined
      }
    >
      <div className="hunch-form-stack">
        <SelectField
          label="Venue"
          onChange={(value) => setVenue(value as Venue)}
          options={venues.map((item) => ({
            value: item.venue,
            label: venueLabel(item.venue),
            disabled: !item.enabled,
            subtitle: item.enabled ? undefined : "Not enabled in this deployment",
          }))}
          required
          value={venue}
        />
        <TextField
          description={
            simulated
              ? "Optional. Empty creates a simulated paper account with cash."
              : "Optional. The connector's Account uid; leave it empty when exactly one registered account is yours."
          }
          label="Account uid"
          onChange={setAccountUid}
          placeholder="Optional"
          value={accountUid}
        />
        <TextField description="How the account is shown in Hunch." label="Account name" onChange={setAccountName} placeholder="Optional" value={accountName} />
      </div>
    </ConfirmDialog>
  );
}

function HoldingsDialog({ account, onClose }: { account: LinkedAccountResource | null; onClose: () => void }) {
  const uid = account?.uid ?? null;
  const holdings = useQuery((signal) => api.accounts.holdings(uid ?? "", false, signal), [uid], { enabled: uid !== null });
  const capture = useAction();
  if (!account) return null;
  const snapshot = holdings.data;
  return (
    <ConfirmDialog
      actionLabel="Capture the holdings now"
      confirmButtonLabel="Capture now"
      description="The latest holdings snapshot Hunch holds for this account. Capture asks the venue connector for a fresh one."
      error={capture.error ?? holdings.error}
      onClose={onClose}
      onConfirm={async () => {
        const fresh = await capture.run(() => api.accounts.holdings(account.uid, true));
        if (fresh) holdings.setData(fresh);
      }}
      open
      pending={capture.pending}
      title={`Holdings · ${venueLabel(account.venue)} · ${accountName(account)}`}
    >
      {holdings.loading ? <LoadingNotice label="Loading holdings…" /> : null}
      {snapshot ? (
        <div className="hunch-stack">
          <StatRow
            items={[
              { key: "cash", label: "Cash", value: formatMoney(snapshot.cash, account.currency) },
              { key: "positions", label: "Positions", value: String(snapshot.holdings.length) },
              { key: "asof", label: "As of", value: formatDateTime(snapshot.time_index) },
            ]}
          />
          <DataTable
            columns={holdingColumns}
            emptyContent="No positions in this account."
            getId={(holding) => `${holding.asset_identifier}:${holding.direction}`}
            items={snapshot.holdings}
            presentation="auto"
          />
        </div>
      ) : null}
    </ConfirmDialog>
  );
}

export function AccountsPage() {
  const { configuration } = useConfiguration();
  const { notify } = useNotices();
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const accounts = useQuery((signal) => api.accounts.list(includeRevoked, signal), [includeRevoked]);
  const [linking, setLinking] = useState(false);
  const [holdingsOf, setHoldingsOf] = useState<LinkedAccountResource | null>(null);
  const [revoking, setRevoking] = useState<LinkedAccountResource | null>(null);
  const revoke = useAction();

  const items = accounts.data ?? [];
  const unverified = items.some((account) => account.status === "active" && !account.ownership_verified);
  const simulated = configuration.connectors?.mode === "simulated";

  return (
    <ApplicationPage maxWidth="wide">
      <ApplicationPageHeader
        actions={
          <>
            <Button
              aria-pressed={includeRevoked}
              onClick={() => setIncludeRevoked((current) => !current)}
              size="small"
              variant={includeRevoked ? "secondary" : "outline"}
            >
              Include revoked
            </Button>
            <Button onClick={() => setLinking(true)} variant="primary">
              Link account
            </Button>
          </>
        }
        description={
          <span className="hunch-inline-badges">
            The brokerage accounts Hunch may fund takes into. Keys live on the venue connectors; Hunch only links the accounts they created for you.
            {simulated ? <Badge variant="secondary">Simulated venue</Badge> : null}
          </span>
        }
        eyebrow="Profile"
        title="Linked accounts"
      />
      <ApplicationPageStack>
        {accounts.error ? <ErrorNotice error={accounts.error} onRetry={accounts.refetch} /> : null}
        {unverified ? (
          <InfoNotice tone="warning">
            At least one account's ownership is not verified yet. Hunch will not fund a take into it until the connector confirms it is yours.
          </InfoNotice>
        ) : null}
        {accounts.loading ? <LoadingNotice label="Loading accounts…" /> : null}
        {!accounts.loading && !accounts.error ? (
          <ApplicationCard contentPadding="none">
            <DataTable
              columns={columns}
              emptyContent={
                <div className="hunch-empty">
                  <p>No linked account yet. Link one to fund a take with real notional; practice takes need none.</p>
                  <Button onClick={() => setLinking(true)} variant="primary">
                    Link your first account
                  </Button>
                </div>
              }
              getId={(account) => account.uid}
              items={items}
              presentation="auto"
              rowActions={[
                { id: "holdings", label: "Holdings", onSelect: (account) => setHoldingsOf(account) },
                {
                  id: "revoke",
                  label: "Revoke",
                  tone: "danger",
                  disabled: (account) => account.status === "revoked",
                  onSelect: (account) => setRevoking(account),
                },
              ]}
            />
          </ApplicationCard>
        ) : null}
      </ApplicationPageStack>

      <LinkAccountDialog
        onClose={() => setLinking(false)}
        onLinked={(linked) => {
          setLinking(false);
          accounts.refetch();
          notify({
            title: linked.status === "active" ? "Account linked" : "Link pending",
            description:
              linked.status === "active"
                ? `${venueLabel(linked.venue)} · ${accountName(linked)}`
                : "Finish entering the keys on the connector; the link activates once the account is verified.",
            variant: "success",
          });
        }}
        open={linking}
      />

      <HoldingsDialog account={holdingsOf} onClose={() => setHoldingsOf(null)} />

      <ConfirmDialog
        actionLabel="Revoke the link"
        confirmButtonLabel="Revoke"
        description="Hunch stops using this account. Takes funded in it must be withdrawn first."
        error={revoke.error}
        onClose={() => {
          setRevoking(null);
          revoke.clearError();
        }}
        onConfirm={async () => {
          if (!revoking) return;
          const updated = await revoke.run(() => api.accounts.revoke(revoking.uid));
          if (!updated) return;
          setRevoking(null);
          accounts.refetch();
          notify({ title: "Link revoked", variant: "success" });
        }}
        open={revoking !== null}
        pending={revoke.pending}
        selectionLabel={revoking ? `${venueLabel(revoking.venue)} · ${accountName(revoking)}` : undefined}
        title="Revoke this account"
        tone="danger"
      />
    </ApplicationPage>
  );
}
