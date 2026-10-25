import type { ReactNode } from "react";

import { Badge } from "@dev-mainsequence/command-center-sdk/controls";
import type { ResourceColumnDefinition } from "@dev-mainsequence/command-center-sdk/resource";
import { DataTable, ResourceStatusCell } from "@dev-mainsequence/command-center-sdk/views";

import { api } from "../../../api/hunch";
import type { RevisionResource } from "../../../api/types";
import { useQuery } from "../../../api/useQuery";
import { CitationBadges, EvidenceList, isEvidenceItem, linkCitations } from "../../../components/EvidenceList";
import { Markdown } from "../../../components/Markdown";
import { EmptyNotice, ErrorNotice, InfoNotice, LoadingNotice } from "../../../components/Notices";
import { SectionCard } from "../../../components/Page";
import { formatDateTime, formatPercent, humanize } from "../../../lib/format";

type Row = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === "string" ? value : value === null || value === undefined ? "" : String(value));
const number = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

const candidateColumns: ResourceColumnDefinition<Row, ReactNode>[] = [
  { id: "ticker", header: "Ticker", importance: "primary", renderCell: (row) => text(row.ticker) || "—" },
  {
    id: "role",
    header: "Role",
    importance: "secondary",
    renderCell: (row) => <ResourceStatusCell label={humanize(text(row.role) || "—")} tone={text(row.role) === "hedge" || text(row.role) === "defensive" ? "info" : "primary"} />,
  },
  { id: "conviction", header: "Conviction", importance: "secondary", renderCell: (row) => formatPercent(number(row.conviction), { digits: 0 }) },
  { id: "case", header: "Case", importance: "tertiary", renderCell: (row) => text(row.case) || "—" },
  {
    id: "risks",
    header: "Risks",
    importance: "tertiary",
    renderCell: (row) => (Array.isArray(row.risks) && row.risks.length > 0 ? row.risks.map(String).join("; ") : "—"),
  },
  {
    id: "citations",
    header: "Evidence",
    importance: "secondary",
    renderCell: (row) => <CitationBadges ids={Array.isArray(row.citations) ? row.citations.map(String) : undefined} />,
  },
];

const weightColumns: ResourceColumnDefinition<Row, ReactNode>[] = [
  { id: "ticker", header: "Ticker", importance: "primary", renderCell: (row) => text(row.ticker) || text(row.figi) || "—" },
  { id: "name", header: "Name", importance: "tertiary", renderCell: (row) => text(row.name) || "—" },
  { id: "weight", header: "Weight", importance: "secondary", renderCell: (row) => formatPercent(number(row.weight), { digits: 2 }) },
  { id: "role", header: "Role", importance: "secondary", renderCell: (row) => humanize(text(row.role) || "—") },
  { id: "reason", header: "Reason", importance: "tertiary", renderCell: (row) => text(row.reason) || "—" },
];

const rowId = (row: Row, index: number) => `${text(row.ticker) || text(row.figi) || "row"}-${index}`;

function RevisionCard({ revision, full }: { revision: RevisionResource; full: boolean }) {
  const candidates = revision.candidates.map((row, index) => ({ ...row, __id: rowId(row, index) }));
  const weights = revision.weights.map((row, index) => ({ ...row, __id: rowId(row, index) }));
  const evidence = (revision.evidence ?? []).filter(isEvidenceItem);
  const knownIds = new Set(evidence.map((item) => item.id));
  const rationale = linkCitations(revision.rationale_md, knownIds, revision.uid);
  return (
    <SectionCard
      actions={
        <>
          <Badge variant="secondary">{humanize(revision.kind)}</Badge>
          <span className="hunch-item-meta">
            {formatDateTime(revision.created_at)} · by {revision.created_by}
            {revision.cash_weight !== null ? ` · cash ${formatPercent(revision.cash_weight, { digits: 1 })}` : ""}
          </span>
        </>
      }
      title={`Revision ${revision.revision}`}
    >
      <div className="hunch-stack">
        {rationale.trim() ? <Markdown>{rationale}</Markdown> : <EmptyNotice>No rationale recorded.</EmptyNotice>}
        {evidence.length > 0 ? (
          <details className="hunch-details" open>
            <summary>Evidence ({evidence.length})</summary>
            <EvidenceList anchorScope={revision.uid} items={evidence} />
          </details>
        ) : null}
        {revision.guardrail_notes.length > 0 ? (
          <InfoNotice tone="warning">
            <strong>Guardrails:</strong> {revision.guardrail_notes.join(" ")}
          </InfoNotice>
        ) : null}
        {full && candidates.length > 0 ? (
          <details className="hunch-details">
            <summary>Candidates ({candidates.length})</summary>
            <DataTable columns={candidateColumns} getId={(row) => String(row.__id)} items={candidates} presentation="auto" />
          </details>
        ) : null}
        {full && weights.length > 0 ? (
          <details className="hunch-details">
            <summary>Weights ({weights.length})</summary>
            <DataTable columns={weightColumns} getId={(row) => String(row.__id)} items={weights} presentation="auto" />
          </details>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function RevisionsSection({ uid, version, full }: { uid: string; version: number; full: boolean }) {
  const revisions = useQuery((signal) => api.takes.revisions(uid, signal), [uid, version]);
  if (revisions.loading) return <LoadingNotice label="Loading revisions…" />;
  if (revisions.error) return <ErrorNotice error={revisions.error} onRetry={revisions.refetch} />;
  const items = [...(revisions.data ?? [])].sort((a, b) => b.revision - a.revision);
  if (items.length === 0) return <EmptyNotice>No revisions yet. Each build and rebalance records one.</EmptyNotice>;
  return (
    <div className="hunch-stack">
      {items.map((revision) => (
        <RevisionCard full={full} key={revision.uid} revision={revision} />
      ))}
    </div>
  );
}
