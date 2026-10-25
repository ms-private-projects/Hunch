import { useState } from "react";
import { Link } from "react-router-dom";

import { Badge, Button } from "@dev-mainsequence/command-center-sdk/controls";
import {
  ApplicationPage,
  ApplicationPageHeader,
  ApplicationPageStack,
} from "@dev-mainsequence/command-center-sdk/layout";

import { describeError } from "../../api/client";
import { api } from "../../api/hunch";
import type { NotificationResource } from "../../api/types";
import { useAction, useQuery } from "../../api/useQuery";
import { useNotices } from "../../app/notices/NoticesProvider";
import { useUnread } from "../../app/notifications/UnreadProvider";
import { Markdown } from "../../components/Markdown";
import { EmptyNotice, ErrorNotice, LoadingNotice } from "../../components/Notices";
import { formatDateTime, humanize } from "../../lib/format";
import { notificationKindTone, toBadgeVariant } from "../../lib/status";

function NotificationItem({ item, onRead, pending }: { item: NotificationResource; onRead: () => void; pending: boolean }) {
  const unread = item.read_at === null;
  return (
    <li className={`hunch-list-item${unread ? " hunch-list-item--unread" : ""}`}>
      <div className="hunch-item-head">
        <span className="hunch-inline-badges">
          <Badge variant={toBadgeVariant(notificationKindTone(item.kind))}>{humanize(item.kind)}</Badge>
          <h2 className="hunch-item-title">{item.title}</h2>
        </span>
        <span className="hunch-actions">
          <span className="hunch-item-meta">{formatDateTime(item.created_at)}</span>
          {unread ? (
            <Button onClick={onRead} pending={pending} size="small" variant="ghost">
              Mark read
            </Button>
          ) : null}
        </span>
      </div>
      {item.body_md.trim() ? (
        <details className="hunch-details">
          <summary>Details</summary>
          <Markdown>{item.body_md}</Markdown>
        </details>
      ) : null}
      {item.take_uid ? (
        <Link className="hunch-link hunch-item-meta" to={`/takes/${encodeURIComponent(item.take_uid)}`}>
          Open the take
        </Link>
      ) : null}
    </li>
  );
}

export function NotificationsPage() {
  const { notify } = useNotices();
  const unreadBadge = useUnread();
  const notifications = useQuery((signal) => api.notifications.list({ limit: 100 }, signal), []);
  const markAll = useAction();
  const [markingUid, setMarkingUid] = useState<string | null>(null);

  const items = [...(notifications.data ?? { items: [] }).items].sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
  const unread = notifications.data?.unread ?? 0;

  async function markRead(uids?: string[]) {
    if (uids) setMarkingUid(uids[0] ?? null);
    const response = await markAll.run(() => api.notifications.markRead(uids));
    setMarkingUid(null);
    if (response) {
      notifications.setData(response);
      unreadBadge.refresh();
    } else if (markAll.error) {
      notify({ title: "Could not mark as read", description: describeError(markAll.error), variant: "error" });
    }
  }

  return (
    <ApplicationPage maxWidth="content">
      <ApplicationPageHeader
        actions={
          <>
            <Button onClick={notifications.refetch} pending={notifications.refreshing} size="small" variant="outline">
              Refresh
            </Button>
            <Button disabled={unread === 0} onClick={() => void markRead()} pending={markAll.pending && markingUid === null} variant="primary">
              Mark all read
            </Button>
          </>
        }
        description={unread > 0 ? `${unread} unread.` : "Everything is read."}
        eyebrow="Inbox"
        title="Notifications"
      />
      <ApplicationPageStack>
        {notifications.error ? <ErrorNotice error={notifications.error} onRetry={notifications.refetch} /> : null}
        {notifications.loading ? <LoadingNotice label="Loading notifications…" /> : null}
        {!notifications.loading && !notifications.error && items.length === 0 ? (
          <EmptyNotice>Nothing yet. Builds, reviews, proposals and fundings write here as they happen.</EmptyNotice>
        ) : null}
        {items.length > 0 ? (
          <ul className="hunch-list" aria-label="Notifications">
            {items.map((item) => (
              <NotificationItem
                item={item}
                key={item.uid}
                onRead={() => void markRead([item.uid])}
                pending={markAll.pending && markingUid === item.uid}
              />
            ))}
          </ul>
        ) : null}
      </ApplicationPageStack>
    </ApplicationPage>
  );
}
