import type { ReactNode } from "react";

export interface KeyValueItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
}

export function KeyValueList({ items }: { items: readonly KeyValueItem[] }) {
  return (
    <dl className="hunch-kv">
      {items.map((item) => (
        <div className="hunch-kv__row" key={item.key}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface StatItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  tone?: "positive" | "negative" | "default";
  meta?: ReactNode;
}

export function StatRow({ items }: { items: readonly StatItem[] }) {
  return (
    <div className="hunch-stat-row">
      {items.map((item) => (
        <div className="hunch-stat" key={item.key}>
          <div className="hunch-stat__label">{item.label}</div>
          <div
            className={`hunch-stat__value${item.tone === "positive" ? " hunch-positive" : item.tone === "negative" ? " hunch-negative" : ""}`}
          >
            {item.value}
          </div>
          {item.meta ? <div className="hunch-item-meta">{item.meta}</div> : null}
        </div>
      ))}
    </div>
  );
}

/** Compact, read-only rendering of a small JSON object. */
export function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="hunch-muted">—</span>;
  return <pre className="hunch-json">{JSON.stringify(value, null, 2)}</pre>;
}
