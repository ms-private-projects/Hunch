import { Link } from "react-router-dom";

import { Badge } from "@dev-mainsequence/command-center-sdk/controls";

import { api } from "../../../api/hunch";
import { useQuery } from "../../../api/useQuery";
import { JsonBlock } from "../../../components/KeyValueList";
import { Markdown } from "../../../components/Markdown";
import { EmptyNotice, ErrorNotice, LoadingNotice } from "../../../components/Notices";
import { SectionCard } from "../../../components/Page";
import { formatDate, humanize } from "../../../lib/format";
import { reviewOutcomeTone, toBadgeVariant } from "../../../lib/status";

export function ReviewsSection({ uid, version, showProposalLinks }: { uid: string; version: number; showProposalLinks: boolean }) {
  const reviews = useQuery((signal) => api.takes.reviews(uid, signal), [uid, version]);
  if (reviews.loading) return <LoadingNotice label="Loading reviews…" />;
  if (reviews.error) return <ErrorNotice error={reviews.error} onRetry={reviews.refetch} />;
  const items = reviews.data ?? [];
  if (items.length === 0) {
    return <EmptyNotice>No reviews yet. Active takes are reviewed every session day; the owner can also run one now.</EmptyNotice>;
  }
  return (
    <div className="hunch-stack">
      {items.map((review) => (
        <SectionCard
          actions={
            <>
              <Badge variant={toBadgeVariant(reviewOutcomeTone(review.outcome))}>{humanize(review.outcome)}</Badge>
              {showProposalLinks && review.proposal_uid ? (
                <Link className="hunch-link" to={`/takes/${encodeURIComponent(uid)}?tab=proposals&proposal=${encodeURIComponent(review.proposal_uid)}`}>
                  Proposal
                </Link>
              ) : null}
            </>
          }
          key={review.uid}
          title={formatDate(review.review_date)}
        >
          <div className="hunch-stack">
            {review.verdict ? <p className="hunch-prose">{review.verdict}</p> : null}
            <Markdown>{review.summary_md}</Markdown>
            {review.drift || review.thesis_check ? (
              <details className="hunch-details">
                <summary>Drift and thesis check</summary>
                <div className="hunch-stack">
                  {review.drift ? (
                    <div>
                      <div className="hunch-stat__label">Drift</div>
                      <JsonBlock value={review.drift} />
                    </div>
                  ) : null}
                  {review.thesis_check ? (
                    <div>
                      <div className="hunch-stat__label">Thesis check</div>
                      <JsonBlock value={review.thesis_check} />
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
