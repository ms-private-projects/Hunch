import { useState } from "react";

import { Badge, Button } from "@dev-mainsequence/command-center-sdk/controls";
import { DataTable } from "@dev-mainsequence/command-center-sdk/views";

import { describeError } from "../../../api/client";
import { api } from "../../../api/hunch";
import type { BuildResponse, ResearchResource } from "../../../api/types";
import type { QueryResult } from "../../../api/useQuery";
import { useNotices } from "../../../app/notices/NoticesProvider";
import { EvidenceList, isEvidenceItem, linkCitations } from "../../../components/EvidenceList";
import { KeyValueList, type KeyValueItem } from "../../../components/KeyValueList";
import { Markdown } from "../../../components/Markdown";
import { EmptyNotice, ErrorNotice, InfoNotice, LoadingNotice } from "../../../components/Notices";
import { SectionCard } from "../../../components/Page";
import { formatDateTime, humanize } from "../../../lib/format";
import { candidateColumns, withRowIds } from "./candidates";

const BRIEF_FIELDS: ReadonlyArray<[key: string, label: string]> = [
  ["claims", "Claims"],
  ["beneficiaries", "Beneficiaries"],
  ["losers", "Losers"],
  ["keywords", "Keywords"],
];

function briefItems(brief: Record<string, unknown>): KeyValueItem[] {
  const items: KeyValueItem[] = [];
  for (const [key, label] of BRIEF_FIELDS) {
    const values = Array.isArray(brief[key]) ? (brief[key] as unknown[]).map(String).filter(Boolean) : [];
    if (values.length === 0) continue;
    items.push({
      key,
      label,
      value:
        key === "claims" ? (
          <ul className="hunch-prose">
            {values.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        ) : (
          <span className="hunch-inline-badges">
            {values.map((value) => (
              <Badge key={value}>{value}</Badge>
            ))}
          </span>
        ),
    });
  }
  if (typeof brief.horizon_months === "number") {
    items.push({ key: "horizon", label: "Horizon", value: `${brief.horizon_months} months` });
  }
  return items;
}

function ResearchCard({
  research,
  latest,
  canBuild,
  building,
  onBuild,
}: {
  research: ResearchResource;
  latest: boolean;
  canBuild: boolean;
  building: boolean;
  onBuild: () => void;
}) {
  const evidence = (research.evidence ?? []).filter(isEvidenceItem);
  const knownIds = new Set(evidence.map((item) => item.id));
  const rationale = linkCitations(research.rationale_md, knownIds, research.uid);
  const brief = briefItems(research.brief ?? {});
  const model = research.model ? `${research.provider ? `${research.provider} / ` : ""}${research.model}` : null;
  return (
    <SectionCard
      actions={
        <>
          <Badge variant={research.mode === "inference" ? "primary" : "secondary"}>{humanize(research.mode)}</Badge>
          {latest ? <Badge variant="success">Latest</Badge> : null}
          <span className="hunch-item-meta">
            {formatDateTime(research.created_at)} · by {research.created_by}
            {model ? ` · ${model}` : ""}
          </span>
          {canBuild ? (
            <Button onClick={onBuild} pending={building} size="small" variant={latest ? "primary" : "outline"}>
              Build from this research
            </Button>
          ) : null}
        </>
      }
      title={`Research ${research.number}`}
    >
      <div className="hunch-stack">
        {rationale.trim() ? <Markdown>{rationale}</Markdown> : <EmptyNotice>No rationale recorded.</EmptyNotice>}
        {brief.length > 0 ? (
          <details className="hunch-details">
            <summary>Brief</summary>
            <KeyValueList items={brief} />
          </details>
        ) : null}
        {research.candidates.length > 0 ? (
          <details className="hunch-details" open={latest}>
            <summary>Candidates ({research.candidates.length})</summary>
            <DataTable columns={candidateColumns} getId={(row) => String(row.__id)} items={withRowIds(research.candidates)} presentation="auto" />
          </details>
        ) : (
          <EmptyNotice>This research proposed no candidates.</EmptyNotice>
        )}
        {evidence.length > 0 ? (
          <details className="hunch-details">
            <summary>Evidence ({evidence.length})</summary>
            <EvidenceList anchorScope={research.uid} items={evidence} />
          </details>
        ) : null}
      </div>
    </SectionCard>
  );
}

/** The take's research, latest first. */
export function sortResearch(items: readonly ResearchResource[] | null): ResearchResource[] {
  return [...(items ?? [])].sort((a, b) => b.number - a.number);
}

export interface ResearchSectionProps {
  uid: string;
  /** The take's research list, owned by the page so the header actions read it too. */
  research: QueryResult<ResearchResource[]>;
  /** The owner may construct a basket from any research. */
  canBuild: boolean;
  /** A hosted research Job is running; the page polls the list until it lands. */
  pending: boolean;
  onBuilt: (response: BuildResponse) => void;
}

/** The take's research, latest first: what the thesis says, the candidates, their evidence. */
export function ResearchSection({ uid, research, canBuild, pending, onBuilt }: ResearchSectionProps) {
  const { notify } = useNotices();
  const [buildingUid, setBuildingUid] = useState<string | null>(null);

  const items = sortResearch(research.data);
  const newest = items[0] ?? null;

  const build = async (item: ResearchResource) => {
    setBuildingUid(item.uid);
    try {
      onBuilt(await api.takes.build(uid, item.uid));
    } catch (error) {
      notify({ title: "Build failed", description: describeError(error), variant: "error" });
    } finally {
      setBuildingUid(null);
    }
  };

  if (research.loading) return <LoadingNotice label="Loading research…" />;
  if (research.error && !research.data) return <ErrorNotice error={research.error} onRetry={research.refetch} />;
  return (
    <div className="hunch-stack">
      {pending ? (
        <InfoNotice
          actions={
            <Button onClick={research.refetch} pending={research.refreshing} size="small" variant="outline">
              Check now
            </Button>
          }
        >
          Research is running as a platform Job. It usually takes a few minutes; this list updates when it lands.
        </InfoNotice>
      ) : null}
      {items.length === 0 ? (
        <EmptyNotice>
          No research yet. Research studies the thesis against the target universe and proposes candidates; a build then turns
          the chosen research into a basket.
        </EmptyNotice>
      ) : (
        items.map((item) => (
          <ResearchCard
            building={buildingUid === item.uid}
            canBuild={canBuild && (buildingUid === null || buildingUid === item.uid)}
            key={item.uid}
            latest={item.uid === newest?.uid}
            onBuild={() => void build(item)}
            research={item}
          />
        ))
      )}
    </div>
  );
}
