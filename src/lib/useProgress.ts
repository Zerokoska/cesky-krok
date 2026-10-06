import { useApp } from '../data/context';
import type { Attempt, StepProgress, VocabProgress } from '../data/types';
import { useAsync } from './useAsync';

export type ProgressData = { attempts: Attempt[]; steps: StepProgress[]; vocab: VocabProgress[] };

/** Progress for one lesson of `userId`, or of the current subject (the student, or yourself). */
export function useProgress(lessonId: string, userId?: string) {
  const { store, subjectId } = useApp();
  const who = userId ?? subjectId;
  return useAsync<ProgressData>(async () => {
    if (!who) return { attempts: [], steps: [], vocab: [] };
    const q = { userId: who, lessonId };
    const [attempts, steps, vocab] = await Promise.all([store.listAttempts(q), store.listStepProgress(q), store.listVocab(q)]);
    return { attempts, steps, vocab };
  }, [store, who, lessonId]);
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
