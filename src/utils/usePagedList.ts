import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/data/api/client';
import { PAGE_SIZE } from '@/data/amigosApi';

/**
 * A list that loads page by page: first page on mount (or when `resetKey` changes), more on `loadMore`, and
 * `refresh` for pull-to-refresh. `setItems` lets a screen drop or edit a row after an action without refetching.
 */
export function usePagedList<T>(fetchPage: (offset: number) => Promise<T[]>, resetKey: string = '') {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const run = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const count = useRef(0);
  count.current = items.length;

  const first = useCallback(async (pull: boolean) => {
    const id = ++run.current;
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const rows = await fetchRef.current(0);
      if (id !== run.current) return;
      setItems(rows);
      setDone(rows.length < PAGE_SIZE);
    } catch (e) {
      if (id !== run.current) return;
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      if (id === run.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setDone(false);
    first(false);
  }, [first, resetKey]);

  const loadMore = useCallback(async () => {
    if (done || loading || loadingMore || refreshing || error) return;
    const id = run.current;
    setLoadingMore(true);
    try {
      const rows = await fetchRef.current(count.current);
      if (id !== run.current) return;
      setItems((cur) => [...cur, ...rows]);
      setDone(rows.length < PAGE_SIZE);
    } catch {
      if (id === run.current) setDone(true); // stop retrying on a failing page; pull to refresh to try again
    } finally {
      setLoadingMore(false);
    }
  }, [done, loading, loadingMore, refreshing, error]);

  return { items, setItems, loading, refreshing, loadingMore, error, loadMore, refresh: () => first(true), reload: () => first(false) };
}
