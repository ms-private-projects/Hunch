import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ChatLauncher } from "@dev-mainsequence/command-center-ai";
import { ApplicationPage, ApplicationPageStack } from "@dev-mainsequence/command-center-sdk/layout";
import {
  resolveResourceDetailTabs,
  type ResourceDetailTabDefinition,
} from "@dev-mainsequence/command-center-sdk/resource";
import { ResourceDetailShell } from "@dev-mainsequence/command-center-sdk/views";

import { api } from "../../api/hunch";
import type { BuildResponse, ResearchResponse, TakeResource } from "../../api/types";
import { useQuery } from "../../api/useQuery";
import { useAssistant } from "../../app/assistant/AssistantProvider";
import { useIsOwner } from "../../app/config/ConfigurationContext";
import { useNotices } from "../../app/notices/NoticesProvider";
import { ErrorNotice, InfoNotice } from "../../components/Notices";
import { BasketSection } from "./sections/BasketSection";
import { FundingSection } from "./sections/FundingSection";
import { OverviewSection } from "./sections/OverviewSection";
import { PerformanceSection } from "./sections/PerformanceSection";
import { ResearchSection, sortResearch } from "./sections/ResearchSection";
import { ReviewsSection } from "./sections/ReviewsSection";
import { RevisionsSection } from "./sections/RevisionsSection";
import { TakeProposalsSection } from "./sections/TakeProposalsSection";
import { notifyBuild, TakeActions } from "./TakeActions";
import { TakeSummary } from "./TakeSummary";

/** A hosted research is a platform Job; its list is polled at this interval until it lands. */
const RESEARCH_POLL_MS = 20_000;
/** Stop polling after this long; a research Job on development takes about five minutes. */
const RESEARCH_PENDING_LIMIT_MS = 30 * 60_000;

const isDraft = (take: TakeResource) => take.status === "draft";

const SHARED_TABS: ResourceDetailTabDefinition<TakeResource>[] = [
  { id: "overview", label: "Overview" },
  { id: "research", label: "Research" },
  { id: "basket", label: "Basket", disabled: isDraft },
  { id: "performance", label: "Performance", disabled: (take) => !take.activated_at },
  { id: "revisions", label: "Revisions", disabled: isDraft },
  { id: "reviews", label: "Reviews", disabled: isDraft },
];

const OWNER_TABS: ResourceDetailTabDefinition<TakeResource>[] = [
  ...SHARED_TABS,
  { id: "funding", label: "Funding", disabled: isDraft },
  { id: "proposals", label: "Proposals", disabled: isDraft },
];

export function TakeDetailPage() {
  const { uid = "" } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const assistant = useAssistant();
  const take = useQuery((signal) => api.takes.get(uid, signal), [uid]);
  const isOwner = useIsOwner(take.data?.owner_user_uid);
  const { notify } = useNotices();
  const [version, setVersion] = useState(0);
  const bumpVersion = useCallback(() => setVersion((current) => current + 1), []);
  const setTake = take.setData;

  // The research list feeds both the header actions (a build needs research) and the Research tab.
  // While a hosted research Job runs, `researchPendingAfter` holds the latest number at its start.
  const [researchPendingAfter, setResearchPendingAfter] = useState<number | null>(null);
  const research = useQuery((signal) => api.takes.researchList(uid, signal), [uid, version], {
    enabled: Boolean(take.data),
    pollIntervalMs: researchPendingAfter !== null ? RESEARCH_POLL_MS : undefined,
  });
  const latestResearch = useMemo(() => sortResearch(research.data)[0] ?? null, [research.data]);
  // An API that cannot list research (older, or failing) still gets the Build action.
  const hasResearch = research.data ? latestResearch !== null : research.error ? true : null;

  useEffect(() => {
    if (researchPendingAfter === null || !latestResearch || latestResearch.number <= researchPendingAfter) return;
    setResearchPendingAfter(null);
    notify({
      title: `Research ${latestResearch.number} is ready`,
      description: `${latestResearch.candidates.length} candidate(s). Build from it to construct the basket.`,
      variant: "success",
    });
  }, [latestResearch, notify, researchPendingAfter]);

  useEffect(() => {
    if (researchPendingAfter === null) return;
    const timer = window.setTimeout(() => {
      setResearchPendingAfter(null);
      notify({ title: "Research has not landed yet", description: "Check its Job run, or use Research again.", variant: "info" });
    }, RESEARCH_PENDING_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [notify, researchPendingAfter]);

  const tabDefinitions = isOwner ? OWNER_TABS : SHARED_TABS;
  const { tabs, activeTab } = useMemo(
    () => resolveResourceDetailTabs(tabDefinitions, { activeTabId: params.get("tab"), resource: take.data }),
    [params, tabDefinitions, take.data],
  );

  const onTabChange = useCallback(
    (id: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set("tab", id);
          next.delete("welcome");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const onResearch = useCallback(
    (response: ResearchResponse) => {
      if (response.research) bumpVersion();
      else setResearchPendingAfter(latestResearch?.number ?? 0);
      onTabChange("research");
    },
    [bumpVersion, latestResearch, onTabChange],
  );

  const onBuilt = useCallback(
    (response: BuildResponse) => {
      setTake(response.take);
      bumpVersion();
      notifyBuild(notify, response);
    },
    [bumpVersion, notify, setTake],
  );

  const data = take.data;
  const welcome = params.get("welcome") === "1";
  const researchPending = researchPendingAfter !== null;

  return (
    <ApplicationPage maxWidth="wide">
      <ApplicationPageStack>
        {data && isOwner && data.status === "draft" ? (
          <InfoNotice>
            {welcome ? "Your take is saved as a private draft. " : "This take is a draft. "}
            {researchPending ? (
              <>
                Its research is running; <strong>Build</strong> appears when it lands.
              </>
            ) : hasResearch ? (
              <>
                Use <strong>Build</strong> above to apply your constraints to the latest research and publish the first basket.
              </>
            ) : (
              <>
                Use <strong>Research</strong> above to study the thesis against the target universe; <strong>Build</strong> then
                turns that research into the first basket.
              </>
            )}
          </InfoNotice>
        ) : null}
        <ResourceDetailShell<TakeResource>
          activeTabId={activeTab?.id}
          breadcrumbs={[
            { id: "takes", label: "Takes", onSelect: () => navigate("/takes") },
            { id: "take", label: data?.title ?? "Take" },
          ]}
          error={take.error ? <ErrorNotice error={take.error} onRetry={take.refetch} /> : undefined}
          headerActions={
            data ? (
              <div className="hunch-actions">
                <TakeActions
                  hasResearch={researchPending && !hasResearch ? null : hasResearch}
                  isOwner={isOwner}
                  onResearch={onResearch}
                  onSectionsChanged={bumpVersion}
                  onTake={setTake}
                  take={data}
                />
              </div>
            ) : undefined
          }
          loading={take.loading && !data}
          loadingDescription="Reading the take."
          loadingTitle="Loading take"
          onTabChange={onTabChange}
          summary={data ? <TakeSummary onOpenLink={(url) => navigate(url)} take={data} /> : undefined}
          tabs={tabs}
          tabsLabel="Take sections"
        >
          {data && activeTab?.id === "overview" ? (
            <OverviewSection canCritique={isOwner || data.visibility === "public"} take={data} />
          ) : null}
          {data && activeTab?.id === "research" ? (
            <ResearchSection canBuild={isOwner} onBuilt={onBuilt} pending={researchPending} research={research} uid={uid} />
          ) : null}
          {data && activeTab?.id === "basket" ? <BasketSection uid={uid} version={version} /> : null}
          {data && activeTab?.id === "performance" ? <PerformanceSection uid={uid} version={version} /> : null}
          {data && activeTab?.id === "revisions" ? <RevisionsSection full={isOwner} uid={uid} version={version} /> : null}
          {data && activeTab?.id === "reviews" ? <ReviewsSection showProposalLinks={isOwner} uid={uid} version={version} /> : null}
          {data && isOwner && activeTab?.id === "funding" ? <FundingSection uid={uid} version={version} /> : null}
          {data && isOwner && activeTab?.id === "proposals" ? (
            <TakeProposalsSection onChanged={bumpVersion} uid={uid} version={version} />
          ) : null}
        </ResourceDetailShell>
      </ApplicationPageStack>
      {assistant.enabled && !assistant.railOpen ? (
        <ChatLauncher label={`Ask ${assistant.displayName}`} onClick={assistant.openRail} />
      ) : null}
    </ApplicationPage>
  );
}
