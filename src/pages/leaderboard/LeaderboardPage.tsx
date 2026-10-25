import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Badge, Button } from "@dev-mainsequence/command-center-sdk/controls";
import {
  ApplicationCard,
  ApplicationPage,
  ApplicationPageHeader,
  ApplicationPageStack,
} from "@dev-mainsequence/command-center-sdk/layout";
import type { ResourceColumnDefinition } from "@dev-mainsequence/command-center-sdk/resource";
import { DataTable, ResourceStatusCell } from "@dev-mainsequence/command-center-sdk/views";

import { describeError } from "../../api/client";
import { api } from "../../api/hunch";
import type { LeaderboardEntry } from "../../api/types";
import { useQuery } from "../../api/useQuery";
import { useNotices } from "../../app/notices/NoticesProvider";
import { ErrorNotice, LoadingNotice } from "../../components/Notices";
import { formatDate, formatNumber, formatPercent, shortUid } from "../../lib/format";

const columns: ResourceColumnDefinition<LeaderboardEntry, ReactNode>[] = [
  { id: "rank", header: "#", importance: "secondary", renderCell: (entry) => String(entry.rank) },
  {
    id: "title",
    header: "Take",
    importance: "primary",
    renderCell: (entry) => (
      <Link className="hunch-link" to={`/takes/${encodeURIComponent(entry.take_uid)}`}>
        {entry.title ?? shortUid(entry.take_uid)}
      </Link>
    ),
  },
  { id: "owner", header: "Owner", importance: "secondary", renderCell: (entry) => (entry.owner_handle ? `@${entry.owner_handle}` : "—") },
  {
    id: "return",
    header: "Return since activation",
    importance: "secondary",
    renderCell: (entry) => (
      <span className={entry.return_since_activation >= 0 ? "hunch-positive" : "hunch-negative"}>
        {formatPercent(entry.return_since_activation, { signed: true })}
      </span>
    ),
  },
  { id: "days", header: "Days active", importance: "tertiary", renderCell: (entry) => String(entry.days_active) },
  {
    id: "volatility",
    header: "Volatility",
    importance: "tertiary",
    hideBelow: "lg",
    renderCell: (entry) => formatPercent(entry.metrics?.annualised_volatility ?? null, { digits: 1 }),
  },
  {
    id: "drawdown",
    header: "Max drawdown",
    importance: "tertiary",
    hideBelow: "lg",
    renderCell: (entry) => formatPercent(entry.metrics?.max_drawdown ?? null, { digits: 1 }),
  },
  {
    id: "sharpe",
    header: "Sharpe",
    importance: "tertiary",
    hideBelow: "lg",
    renderCell: (entry) => formatNumber(entry.metrics?.sharpe_ratio ?? null, 2),
  },
  {
    id: "kind",
    header: "Kind",
    importance: "secondary",
    renderCell: (entry) =>
      entry.is_funded ? <ResourceStatusCell label="Funded" tone="success" /> : <ResourceStatusCell label="Simulated" tone="info" />,
  },
  {
    id: "origin",
    header: "Origin",
    importance: "tertiary",
    renderCell: (entry) =>
      entry.origin_take_uid && entry.origin_take_uid !== entry.take_uid ? (
        <Link className="hunch-link" to={`/takes/${encodeURIComponent(entry.origin_take_uid)}`}>
          Forked from {shortUid(entry.origin_take_uid)}
        </Link>
      ) : (
        <span className="hunch-muted">Original</span>
      ),
  },
];

export function LeaderboardPage() {
  const navigate = useNavigate();
  const { notify } = useNotices();
  const board = useQuery((signal) => api.leaderboard(signal), []);
  const [forking, setForking] = useState<string | null>(null);

  async function fork(entry: LeaderboardEntry) {
    setForking(entry.take_uid);
    try {
      const forked = await api.takes.fork(entry.take_uid);
      notify({ title: "Forked", description: "Your copy is a private draft with lineage.", variant: "success" });
      navigate(`/takes/${encodeURIComponent(forked.uid)}`);
    } catch (error) {
      notify({ title: "Fork failed", description: describeError(error), variant: "error" });
    } finally {
      setForking(null);
    }
  }

  const data = board.data;
  return (
    <ApplicationPage maxWidth="wide">
      <ApplicationPageHeader
        actions={
          <Button onClick={board.refetch} pending={board.refreshing} size="small" variant="outline">
            Refresh
          </Button>
        }
        description={
          data ? (
            <span className="hunch-inline-badges">
              Snapshot {formatDate(data.snapshot_date)}
              {data.live ? <Badge variant="warning">Live: computed now, no snapshot yet</Badge> : <Badge>Snapshot</Badge>}
            </span>
          ) : (
            "Published takes ranked by return since activation."
          )
        }
        eyebrow="Community"
        title="Leaderboard"
      />
      <ApplicationPageStack>
        {board.error ? <ErrorNotice error={board.error} onRetry={board.refetch} /> : null}
        {board.loading ? <LoadingNotice label="Loading the leaderboard…" /> : null}
        {data ? (
          <ApplicationCard contentPadding="none">
            <DataTable
              columns={columns}
              emptyContent="No published takes yet. Publish one of yours to open the board."
              getId={(entry) => entry.take_uid}
              items={data.entries}
              presentation="auto"
              rowActions={[
                {
                  id: "fork",
                  label: "Fork",
                  disabled: (entry) => forking === entry.take_uid,
                  onSelect: (entry) => void fork(entry),
                },
              ]}
            />
          </ApplicationCard>
        ) : null}
        {data && data.disclaimers.length > 0 ? (
          <ul className="hunch-item-meta">
            {data.disclaimers.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </ApplicationPageStack>
    </ApplicationPage>
  );
}
