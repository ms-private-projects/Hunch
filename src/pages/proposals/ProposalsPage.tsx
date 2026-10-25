import { useSearchParams } from "react-router-dom";

import { Button } from "@dev-mainsequence/command-center-sdk/controls";
import {
  ApplicationPage,
  ApplicationPageHeader,
  ApplicationPageStack,
} from "@dev-mainsequence/command-center-sdk/layout";
import { ResourcePicker } from "@dev-mainsequence/command-center-sdk/views";

import { api } from "../../api/hunch";
import { useQuery } from "../../api/useQuery";
import { ErrorNotice, LoadingNotice } from "../../components/Notices";
import { humanize } from "../../lib/format";
import { ProposalsBrowser } from "./ProposalsBrowser";

const ANY = "__any__";
const STATUSES = ["proposed", "approved", "submitted", "partially_filled", "filled", "rejected", "expired", "failed"];

export function ProposalsPage() {
  const [params, setParams] = useSearchParams();
  const openOnly = params.get("open") !== "0";
  const status = params.get("status") ?? "";

  const update = (changes: Record<string, string>) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        next.delete("uid");
        return next;
      },
      { replace: true },
    );
  };

  const proposals = useQuery(
    (signal) => api.proposals.list({ open_only: openOnly && !status, ...(status ? { status } : {}) }, signal),
    [openOnly, status],
  );

  return (
    <ApplicationPage maxWidth="wide">
      <ApplicationPageHeader
        actions={
          <>
            <Button
              aria-pressed={openOnly && !status}
              onClick={() => update({ status: "", open: openOnly && !status ? "0" : "" })}
              size="small"
              variant={openOnly && !status ? "primary" : "outline"}
            >
              Open only
            </Button>
            <ResourcePicker
              ariaLabel="Status"
              fitContent
              mode="single"
              onValueChange={(value) => update({ status: value === ANY ? "" : value, open: "" })}
              options={[{ value: ANY, label: "Any status" }, ...STATUSES.map((item) => ({ value: item, label: humanize(item) }))]}
              presentation="auto"
              value={status || ANY}
            />
            <Button onClick={proposals.refetch} pending={proposals.refreshing} size="small" variant="outline">
              Refresh
            </Button>
          </>
        }
        description="Trades Hunch proposes for your funded takes. Approve them, reject them, or sync their orders from the venue."
        eyebrow="Execution"
        title="Proposals"
      />
      <ApplicationPageStack>
        {proposals.error ? <ErrorNotice error={proposals.error} onRetry={proposals.refetch} /> : null}
        {proposals.loading ? (
          <LoadingNotice label="Loading proposals…" />
        ) : (
          <ProposalsBrowser
            emptyMessage={
              openOnly && !status
                ? "No open proposals. Fund a take, or run a review on a funded one, and its trades show up here."
                : "No proposals match this filter."
            }
            onChanged={(updated) =>
              proposals.setData((current) => (current ?? []).map((item) => (item.uid === updated.uid ? updated : item)))
            }
            paramName="uid"
            proposals={proposals.data ?? []}
          />
        )}
      </ApplicationPageStack>
    </ApplicationPage>
  );
}
