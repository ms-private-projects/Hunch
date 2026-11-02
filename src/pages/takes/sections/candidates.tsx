import type { ReactNode } from "react";

import type { ResourceColumnDefinition } from "@dev-mainsequence/command-center-sdk/resource";
import { ResourceStatusCell } from "@dev-mainsequence/command-center-sdk/views";

import { CitationBadges } from "../../../components/EvidenceList";
import { formatPercent, humanize } from "../../../lib/format";

export type Row = Record<string, unknown>;

export const text = (value: unknown): string =>
  typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
export const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** The research's candidate instruments: ticker, role, conviction, case, risks and citations. */
export const candidateColumns: ResourceColumnDefinition<Row, ReactNode>[] = [
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

export const rowId = (row: Row, index: number) => `${text(row.ticker) || text(row.figi) || "row"}-${index}`;

/** Rows with a stable `__id` for `DataTable`. */
export const withRowIds = (rows: readonly Row[]): Row[] => rows.map((row, index) => ({ ...row, __id: rowId(row, index) }));
