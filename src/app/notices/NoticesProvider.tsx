import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@dev-mainsequence/command-center-sdk/controls";

export type NoticeVariant = "info" | "success" | "error";

export interface Notice {
  title: string;
  description?: string;
  variant?: NoticeVariant;
}

type NoticeEntry = Notice & { id: number };

interface NoticesValue {
  notify: (notice: Notice) => void;
}

const NOTICE_LIFETIME_MS = 7_000;
const NoticesContext = createContext<NoticesValue | null>(null);

/** Short messages at the top right: action results, and the chat's notices. */
export function NoticesProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<NoticeEntry[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setNotices((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const notify = useCallback(
    (notice: Notice) => {
      nextId.current += 1;
      const id = nextId.current;
      setNotices((current) => [...current.slice(-4), { ...notice, id }]);
      window.setTimeout(() => dismiss(id), NOTICE_LIFETIME_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NoticesContext value={value}>
      {children}
      <div aria-live="polite" className="hunch-notices" role="status">
        {notices.map((notice) => (
          <div
            className={`hunch-notice-toast hunch-notice-toast--${notice.variant ?? "info"}`}
            key={notice.id}
          >
            <strong>{notice.title}</strong>
            <Button
              aria-label="Dismiss"
              iconOnly
              onClick={() => dismiss(notice.id)}
              size="small"
              variant="ghost"
            >
              <X aria-hidden="true" />
            </Button>
            {notice.description ? <span>{notice.description}</span> : null}
          </div>
        ))}
      </div>
    </NoticesContext>
  );
}

export function useNotices(): NoticesValue {
  const value = useContext(NoticesContext);
  if (!value) throw new Error("useNotices needs a NoticesProvider.");
  return value;
}
