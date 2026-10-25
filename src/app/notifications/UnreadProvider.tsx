import { createContext, useContext, useMemo, type ReactNode } from "react";

import { api } from "../../api/hunch";
import { useQuery } from "../../api/useQuery";

interface UnreadValue {
  unread: number;
  refresh: () => void;
}

const UnreadContext = createContext<UnreadValue>({ unread: 0, refresh: () => {} });
const UNREAD_POLL_MS = 60_000;

/** The unread-notification count for the navigation badge, polled every minute. */
export function UnreadProvider({ children }: { children: ReactNode }) {
  const query = useQuery(
    (signal) => api.notifications.list({ unread_only: true, limit: 1 }, signal),
    [],
    { pollIntervalMs: UNREAD_POLL_MS },
  );
  const value = useMemo(
    () => ({ unread: query.data?.unread ?? 0, refresh: query.refetch }),
    [query.data, query.refetch],
  );
  return <UnreadContext value={value}>{children}</UnreadContext>;
}

export function useUnread(): UnreadValue {
  return useContext(UnreadContext);
}
