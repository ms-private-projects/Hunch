import { Badge } from "@dev-mainsequence/command-center-sdk/controls";
import { ApplicationCardGrid } from "@dev-mainsequence/command-center-sdk/layout";

import type { TakeResource } from "../../../api/types";
import { KeyValueList } from "../../../components/KeyValueList";
import { SectionCard } from "../../../components/Page";
import { formatPercent, humanize } from "../../../lib/format";
import { ThesisCritiqueCard } from "./ThesisCritiqueCard";

/** `canCritique`: the API critiques an owned take or a published one. */
export function OverviewSection({ take, canCritique }: { take: TakeResource; canCritique: boolean }) {
  const constraints = take.constraints;
  const triggers = (constraints.change_my_mind ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <div className="hunch-stack">
      <SectionCard title="Thesis">
        <p className="hunch-prose">{take.thesis_text}</p>
      </SectionCard>
      <ApplicationCardGrid minimumCardWidth="18rem">
        <SectionCard title="Constraints">
          <KeyValueList
            items={[
              { key: "horizon", label: "Horizon", value: `${constraints.horizon_months} months` },
              { key: "cash", label: "Cash buffer", value: formatPercent(constraints.cash_buffer, { digits: 0 }) },
              {
                key: "weight",
                label: "Max single name",
                value: formatPercent(constraints.max_single_name_weight, { digits: 0 }),
              },
              { key: "positions", label: "Max positions", value: String(constraints.max_positions) },
              { key: "risk", label: "Risk level", value: humanize(constraints.risk_level) },
              { key: "lev", label: "Leveraged ETFs", value: constraints.allow_leveraged_etf ? "Allowed" : "Excluded" },
              {
                key: "exclusions",
                label: "Exclusions",
                value:
                  constraints.exclusions.length > 0 ? (
                    <span className="hunch-inline-badges">
                      {constraints.exclusions.map((item) => (
                        <Badge key={item}>{item}</Badge>
                      ))}
                    </span>
                  ) : (
                    <span className="hunch-muted">None</span>
                  ),
              },
            ]}
          />
        </SectionCard>
        <SectionCard title="What would change my mind">
          {triggers.length > 0 ? (
            <ul className="hunch-prose">
              {triggers.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="hunch-muted hunch-empty-text">Nothing recorded. The daily review still checks the thesis.</p>
          )}
        </SectionCard>
      </ApplicationCardGrid>
      {canCritique ? <ThesisCritiqueCard key={take.uid} uid={take.uid} /> : null}
    </div>
  );
}
