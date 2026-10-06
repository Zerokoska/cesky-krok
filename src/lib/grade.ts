import type { Exercise } from '../content/schema';
import { gapAnswers, showKey } from './gaps';
import { compareText } from './normalize';

export type ItemResult = {
  correct: boolean;
  almost?: boolean;
  given: string;
  expected: string;
  /** Optional context for the teacher view, e.g. "ty · dělat". */
  label?: string;
};

export type GradeResult = { score: number; max: number; items: ItemResult[] };

/** What each exercise component hands to the grader. */
export type ResponseFor = {
  choice: (number | null)[];
  multi: number[][];
  order: number[];
  match: (number | null)[];
  classify: (string | null)[];
  gapfill: string[][];
  table: Record<string, string>;
  dictation: string[];
};
export type AnyResponse = ResponseFor[keyof ResponseFor];

const result = (items: ItemResult[]): GradeResult => ({
  score: items.filter((i) => i.correct).length,
  max: items.length,
  items,
});

const typed = (given: string | undefined, key: string, label?: string): ItemResult => {
  const v = compareText(given ?? '', key);
  return { correct: v.correct, almost: v.almost || undefined, given: given ?? '', expected: showKey(key), label };
};

export function grade(ex: Exercise, response: AnyResponse): GradeResult {
  switch (ex.type) {
    case 'choice': {
      const r = response as ResponseFor['choice'];
      return result(
        ex.items.map((it, i) => ({
          correct: r[i] === it.answer,
          given: r[i] == null ? '' : it.options[r[i]!],
          expected: it.options[it.answer],
          label: it.prompt.cs,
        })),
      );
    }
    case 'multi': {
      const r = response as ResponseFor['multi'];
      return result(
        ex.groups.map((g, i) => {
          const picked = [...(r[i] ?? [])].sort();
          const want = [...g.answers].sort();
          return {
            correct: picked.length === want.length && picked.every((v, k) => v === want[k]),
            given: picked.map((p) => g.options[p]).join(', '),
            expected: want.map((p) => g.options[p]).join(', '),
            label: g.label.cs,
          };
        }),
      );
    }
    case 'order': {
      const r = response as ResponseFor['order'];
      return result(
        ex.items.map((want, pos) => {
          const given = r[pos] == null ? '' : ex.items[r[pos]];
          return { correct: given === want, given, expected: want, label: `${pos + 1}.` };
        }),
      );
    }
    case 'match': {
      const r = response as ResponseFor['match'];
      return result(
        ex.pairs.map((p, i) => {
          const given = r[i] == null ? '' : ex.pairs[r[i]!].right;
          return { correct: given === p.right, given, expected: p.right, label: p.left };
        }),
      );
    }
    case 'classify': {
      const r = response as ResponseFor['classify'];
      const name = (id: string | null) => ex.categories.find((c) => c.id === id)?.label.cs ?? '';
      return result(
        ex.items.map((it, i) => ({
          correct: r[i] === it.category,
          given: name(r[i] ?? null),
          expected: name(it.category),
          label: it.text,
        })),
      );
    }
    case 'gapfill': {
      const r = response as ResponseFor['gapfill'];
      return result(
        ex.items.flatMap((it, i) => {
          const label = it.text.replace(/\{[^}]+\}/g, '___');
          return gapAnswers(it.text).map((key, g) => typed(r[i]?.[g], key, label));
        }),
      );
    }
    case 'table': {
      const r = response as ResponseFor['table'];
      const given = new Set(ex.given.map(([row, col]) => `${row}:${col}`));
      return result(
        ex.rows.flatMap((row, ri) =>
          row.cells.flatMap((key, ci) =>
            given.has(`${ri}:${ci}`) ? [] : [typed(r[`${ri}:${ci}`], key, `${row.label} · ${ex.columns[ci]}`)],
          ),
        ),
      );
    }
    case 'dictation': {
      const r = response as ResponseFor['dictation'];
      return result(ex.items.map((it, i) => typed(r[i], it.answer)));
    }
  }
}
