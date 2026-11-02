import { useState } from "react";

import { Badge, Button, type BadgeVariant } from "@dev-mainsequence/command-center-sdk/controls";

import { api } from "../../../api/hunch";
import type { ThesisCritiqueResource } from "../../../api/types";
import { useAction } from "../../../api/useQuery";
import { ErrorNotice, LoadingNotice } from "../../../components/Notices";
import { SectionCard } from "../../../components/Page";
import { humanize } from "../../../lib/format";

const STRENGTH_VARIANT: Record<string, BadgeVariant> = { strong: "success", moderate: "warning", weak: "danger" };
const CLARITY_VARIANT: Record<string, BadgeVariant> = { clear: "success", partly_clear: "warning", vague: "danger" };

const LISTS: ReadonlyArray<[key: keyof ThesisCritiqueResource, title: string]> = [
  ["assumptions", "Assumptions"],
  ["counterarguments", "Counterarguments"],
  ["risks", "Risks"],
  ["suggested_conditions", "What would show it wrong"],
  ["constraint_notes", "Tensions with the constraints"],
  ["questions", "Questions that would sharpen it"],
];

function Critique({ critique }: { critique: ThesisCritiqueResource }) {
  const model = critique.model ? `${critique.provider ? `${critique.provider} / ` : ""}${critique.model}` : humanize(critique.mode);
  return (
    <div className="hunch-stack">
      <div className="hunch-inline-badges">
        <Badge variant={CLARITY_VARIANT[critique.clarity] ?? "neutral"}>{humanize(critique.clarity)}</Badge>
        <span className="hunch-item-meta">{model}</span>
      </div>
      {critique.summary ? <p className="hunch-prose">{critique.summary}</p> : null}
      {critique.claims.length > 0 ? (
        <details className="hunch-details" open>
          <summary>Claims ({critique.claims.length})</summary>
          <ul className="hunch-prose">
            {critique.claims.map((claim) => (
              <li key={claim.claim}>
                <Badge variant={STRENGTH_VARIANT[claim.strength] ?? "neutral"}>{humanize(claim.strength)}</Badge> {claim.claim}
                {claim.note ? <span className="hunch-muted"> — {claim.note}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {LISTS.map(([key, title]) => {
        const values = critique[key];
        if (!Array.isArray(values) || values.length === 0) return null;
        return (
          <details className="hunch-details" key={key}>
            <summary>
              {title} ({values.length})
            </summary>
            <ul className="hunch-prose">
              {(values as string[]).map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </details>
        );
      })}
      {critique.disclaimers.length > 0 ? <p className="hunch-muted">{critique.disclaimers.join(" ")}</p> : null}
    </div>
  );
}

/** Analysis only: one bounded model call reads the thesis back; nothing about the take changes. */
export function ThesisCritiqueCard({ uid }: { uid: string }) {
  const action = useAction();
  const [critique, setCritique] = useState<ThesisCritiqueResource | null>(null);

  const run = async () => {
    const result = await action.run(() => api.takes.critique(uid));
    if (result) setCritique(result);
  };

  return (
    <SectionCard
      actions={
        <Button onClick={() => void run()} pending={action.pending} size="small" variant="outline">
          {critique ? "Critique again" : "Critique the thesis"}
        </Button>
      }
      title="Thesis critique"
    >
      {action.error ? <ErrorNotice error={action.error} onRetry={() => void run()} /> : null}
      {action.pending && !critique ? <LoadingNotice label="Reading the thesis (about 30 seconds)…" /> : null}
      {critique ? (
        <Critique critique={critique} />
      ) : !action.pending && !action.error ? (
        <p className="hunch-muted hunch-empty-text">
          What the thesis claims, what it assumes, the counterarguments and what would show it wrong. Nothing about the take
          changes.
        </p>
      ) : null}
    </SectionCard>
  );
}
