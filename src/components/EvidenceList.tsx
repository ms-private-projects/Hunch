import type { BadgeVariant } from "@dev-mainsequence/command-center-sdk/controls";
import { Badge } from "@dev-mainsequence/command-center-sdk/controls";

import type { EvidenceItem } from "../api/types";
import { formatDate, humanize } from "../lib/format";

const KIND_VARIANT: Record<string, BadgeVariant> = { quant: "secondary", news: "primary", fundamental: "neutral" };

export function isEvidenceItem(value: unknown): value is EvidenceItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.ticker === "string" && typeof item.title === "string";
}

/** The DOM id of an evidence row, the target of a `[E3]` reference in a rationale. */
export function evidenceAnchor(scope: string, id: string): string {
  return `evidence-${scope}-${id}`;
}

/**
 * Rewrite `[E3]` and `[E3, E6]` in a rationale into links to the matching evidence rows. Ids the
 * revision does not carry stay plain text.
 */
export function linkCitations(markdown: string, known: ReadonlySet<string>, scope: string): string {
  if (known.size === 0) return markdown;
  return markdown.replace(/\[(E\d+(?:\s*,\s*E\d+)*)\]/g, (match, group: string) => {
    const ids = group.split(",").map((id) => id.trim());
    if (!ids.every((id) => known.has(id))) return match;
    return `[${ids.map((id) => `[${id}](#${evidenceAnchor(scope, id)})`).join(", ")}]`;
  });
}

export function CitationBadges({ ids }: { ids: readonly string[] | undefined }) {
  if (!ids || ids.length === 0) return <span className="hunch-muted">—</span>;
  return (
    <span className="hunch-inline-badges">
      {ids.map((id) => (
        <Badge key={id} variant="secondary">
          {id}
        </Badge>
      ))}
    </span>
  );
}

/** Numbered evidence rows; with `anchorScope` each row is an in-page link target. */
export function EvidenceList({ items, anchorScope }: { items: readonly EvidenceItem[]; anchorScope?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className="hunch-evidence">
      {items.map((item) => {
        const when = item.published_at ? formatDate(item.published_at) : null;
        return (
          <li className="hunch-evidence__item" id={anchorScope ? evidenceAnchor(anchorScope, item.id) : undefined} key={`${item.id}-${item.figi}`}>
            <div className="hunch-evidence__head">
              <Badge>{item.id}</Badge>
              <strong>{item.ticker}</strong>
              <Badge variant={KIND_VARIANT[item.kind] ?? "neutral"}>{humanize(item.kind)}</Badge>
              <span className="hunch-item-meta">
                {item.source}
                {when ? ` · ${when}` : ""}
              </span>
            </div>
            <div className="hunch-evidence__title">
              {item.url ? (
                <a className="hunch-link" href={item.url} rel="noreferrer noopener" target="_blank">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </div>
            {item.summary ? <div className="hunch-item-meta">{item.summary}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
