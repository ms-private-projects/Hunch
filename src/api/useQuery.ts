import { useCallback, useEffect, useRef, useState } from "react";

import { isAbortError } from "./client";

export interface UseQueryOptions {
  /** False keeps the query idle (no request, no loading state). */
  enabled?: boolean;
  /** Re-run the fetcher at this interval while the document is visible. */
  pollIntervalMs?: number;
}

export interface QueryResult<T> {
  data: T | null;
  error: unknown;
  /** No data yet and a request in flight. */
  loading: boolean;
  /** A later request in flight while earlier data stays on screen. */
  refreshing: boolean;
  refetch: () => void;
  setData: (next: T | null | ((current: T | null) => T | null)) => void;
}

/**
 * A small fetch-on-render hook: it runs `fetcher` when `deps` change (compared by value), cancels
 * the obsolete request, keeps the last data while refreshing, and polls on request.
 */
export function useQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  options: UseQueryOptions = {},
): QueryResult<T> {
  const { enabled = true, pollIntervalMs } = options;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const hasDataRef = useRef(false);
  const lastKeyRef = useRef<string | null>(null);
  const key = JSON.stringify(deps);

  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const keyChanged = lastKeyRef.current !== null && lastKeyRef.current !== key;
    lastKeyRef.current = key;
    if (!hasDataRef.current || keyChanged) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    fetcherRef
      .current(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        hasDataRef.current = true;
        setDataState(() => next);
        setError(null);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted || isAbortError(failure)) return;
        setError(failure);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => controller.abort();
  }, [enabled, key, tick]);

  useEffect(() => {
    if (!enabled || !pollIntervalMs) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setTick((current) => current + 1);
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, pollIntervalMs]);

  const refetch = useCallback(() => setTick((current) => current + 1), []);
  const setData = useCallback<QueryResult<T>["setData"]>((next) => {
    hasDataRef.current = true;
    setDataState((current) => (typeof next === "function" ? (next as (c: T | null) => T | null)(current) : next));
  }, []);

  return { data, error, loading, refreshing, refetch, setData };
}

export interface ActionState {
  pending: boolean;
  error: unknown;
  clearError: () => void;
  /** Runs `work`, holds its error, and resolves `undefined` when it fails. */
  run: <R>(work: () => Promise<R>) => Promise<R | undefined>;
}

/** Pending and error state for one mutation at a time. */
export function useAction(): ActionState {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = useCallback(async <R,>(work: () => Promise<R>): Promise<R | undefined> => {
    setPending(true);
    setError(null);
    try {
      return await work();
    } catch (failure) {
      setError(failure);
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);
  const clearError = useCallback(() => setError(null), []);
  return { pending, error, clearError, run };
}
