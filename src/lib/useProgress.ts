import { useApp } from '../data/context';
import type { Attempt, StepProgress, VocabProgress } from '../data/types';
import { useAsync } from './useAsync';

export type ProgressData = { attempts: Attempt[]; steps: StepProgress[]; vocab: VocabProgress[] };

/** Progress of the current subject (the student, or yourself) for one lesson. */
export function useProgress(lessonId: string) {
  const { store, subjectId } = useApp();
  return useAsync<ProgressData>(async () => {
    if (!subjectId) return { attempts: [], steps: [], vocab: [] };
    const q = { userId: subjectId, lessonId };
    const [attempts, steps, vocab] = await Promise.all([store.listAttempts(q), store.listStepProgress(q), store.listVocab(q)]);
    return { attempts, steps, vocab };
  }, [store, subjectId, lessonId]);
}

/** Best score per exercise id. */
export function bestByExercise(attempts: Attempt[]) {
  const best = new Map<string, Attempt>();
  for (const a of attempts) {
    const b = best.get(a.exerciseId);
    if (!b || a.score / a.max > b.score / b.max) best.set(a.exerciseId, a);
  }
  return best;
}
