import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Scrolls to `?ex=<id>` once the page content is rendered (homework links use it). */
export function useScrollToExercise(ready: boolean) {
  const [params] = useSearchParams();
  const ex = params.get('ex');
  useEffect(() => {
    if (!ready || !ex) return;
    const t = setTimeout(() => document.getElementById(`ex-${ex}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    return () => clearTimeout(t);
  }, [ready, ex]);
}
