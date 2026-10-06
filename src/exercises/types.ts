import type { Dispatch, SetStateAction } from 'react';
import type { Exercise, ExerciseOf } from '../content/schema';
import { gapAnswers } from '../lib/gaps';
import type { AnyResponse, GradeResult, ResponseFor } from '../lib/grade';

export type ExProps<T extends Exercise['type']> = {
  ex: ExerciseOf<T>;
  value: ResponseFor[T];
  /** Accepts an updater so rapid changes never overwrite each other. */
  onChange: Dispatch<SetStateAction<ResponseFor[T]>>;
  /** Set after "Перевірити"; components switch to feedback mode. */
  result: GradeResult | null;
  /** Show the key (teacher, or the student asked for answers). */
  reveal: boolean;
  /** Changes on every retry so shuffles differ. */
  seed: string;
};

export function initialResponse(ex: Exercise): AnyResponse {
  switch (ex.type) {
    case 'choice':
      return ex.items.map(() => null);
    case 'multi':
      return ex.groups.map(() => []);
    case 'order':
      return [];
    case 'match':
      return ex.pairs.map(() => null);
    case 'classify':
      return ex.items.map(() => null);
    case 'gapfill':
      return ex.items.map((it) => gapAnswers(it.text).map(() => ''));
    case 'table':
      return {};
    case 'dictation':
      return ex.items.map(() => '');
  }
}

export const KIND_LABEL: Record<Exercise['type'], string> = {
  choice: 'Vyberte',
  multi: 'Co slyšíte?',
  order: 'Seřaďte',
  match: 'Spojte',
  classify: 'Roztřiďte',
  gapfill: 'Doplňte',
  table: 'Doplňte tabulku',
  dictation: 'Diktát',
};

export type { ResponseFor };
