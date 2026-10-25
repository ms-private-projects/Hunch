import { api } from "../../../api/hunch";
import { useQuery } from "../../../api/useQuery";
import { ErrorNotice, LoadingNotice } from "../../../components/Notices";
import { ProposalsBrowser } from "../../proposals/ProposalsBrowser";

export function TakeProposalsSection({ uid, version, onChanged }: { uid: string; version: number; onChanged: () => void }) {
  const proposals = useQuery((signal) => api.proposals.list({ take_uid: uid }, signal), [uid, version]);
  if (proposals.loading) return <LoadingNotice label="Loading proposals…" />;
  if (proposals.error) return <ErrorNotice error={proposals.error} onRetry={proposals.refetch} />;
  return (
    <ProposalsBrowser
      emptyMessage="No proposals for this take. Funding it creates the first one; reviews propose rebalances."
      onChanged={(updated) => {
        proposals.setData((current) => (current ?? []).map((item) => (item.uid === updated.uid ? updated : item)));
        onChanged();
      }}
      paramName="proposal"
      proposals={proposals.data ?? []}
      showTakeLink={false}
    />
  );
}
