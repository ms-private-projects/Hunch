import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ChatLauncher } from "@dev-mainsequence/command-center-ai";
import { ApplicationPage, ApplicationPageStack } from "@dev-mainsequence/command-center-sdk/layout";
import {
  resolveResourceDetailTabs,
  type ResourceDetailTabDefinition,
} from "@dev-mainsequence/command-center-sdk/resource";
import { ResourceDetailShell } from "@dev-mainsequence/command-center-sdk/views";

import { api } from "../../api/hunch";
import type { TakeResource } from "../../api/types";
import { useQuery } from "../../api/useQuery";
import { useAssistant } from "../../app/assistant/AssistantProvider";
import { useIsOwner } from "../../app/config/ConfigurationContext";
import { ErrorNotice, InfoNotice } from "../../components/Notices";
import { BasketSection } from "./sections/BasketSection";
import { FundingSection } from "./sections/FundingSection";
import { OverviewSection } from "./sections/OverviewSection";
import { PerformanceSection } from "./sections/PerformanceSection";
import { ReviewsSection } from "./sections/ReviewsSection";
import { RevisionsSection } from "./sections/RevisionsSection";
import { TakeProposalsSection } from "./sections/TakeProposalsSection";
import { TakeActions } from "./TakeActions";
import { TakeSummary } from "./TakeSummary";

const isDraft = (take: TakeResource) => take.status === "draft";

const SHARED_TABS: ResourceDetailTabDefinition<TakeResource>[] = [
  { id: "overview", label: "Overview" },
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
  const [version, setVersion] = useState(0);
  const bumpVersion = useCallback(() => setVersion((current) => current + 1), []);

  const tabDefinitions = isOwner ? OWNER_TABS : SHARED_TABS;
  const { tabs, activeTab } = useMemo(
    () => resolveResourceDetailTabs(tabDefinitions, { activeTabId: params.get("tab"), resource: take.data }),
    [params, tabDefinitions, take.data],
  );

  const onTabChange = (id: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("tab", id);
        next.delete("welcome");
        return next;
      },
      { replace: true },
    );
  };

  const data = take.data;
  const welcome = params.get("welcome") === "1";

  return (
    <ApplicationPage maxWidth="wide">
      <ApplicationPageStack>
        {data && isOwner && data.status === "draft" ? (
          <InfoNotice>
            {welcome ? "Your take is saved as a private draft. " : "This take is a draft. "}
            Use <strong>Build</strong> above to research the thesis, apply your constraints and publish the first basket.
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
                <TakeActions isOwner={isOwner} onSectionsChanged={bumpVersion} onTake={(next) => take.setData(next)} take={data} />
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
          {data && activeTab?.id === "overview" ? <OverviewSection take={data} /> : null}
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
