import { useCallback, useEffect, useState, type DependencyList } from 'react';

export type Async<T> = { data: T | undefined; error: Error | null; loading: boolean; reload: () => void };

/** Runs `fn` whenever `deps` change; `reload()` re-runs it on demand. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): Async<T> {
  const [state, setState] = useState<{ data: T | undefined; error: Error | null; loading: boolean }>({
    data: undefined,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error) => alive && setState({ data: undefined, error: error instanceof Error ? error : new Error(String(error)), loading: false }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
