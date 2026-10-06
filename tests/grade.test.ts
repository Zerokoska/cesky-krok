import { describe, expect, it } from 'vitest';
import { grade } from '../src/lib/grade';
import { parseGaps } from '../src/lib/gaps';
import type { Exercise } from '../src/content/schema';

const t = { cs: 'Test' };

describe('parseGaps', () => {
  it('splits text into plain parts and gaps', () => {
    expect(parseGaps('Já {jsem} z {Ukrajiny|Ukrajiny.}')).toEqual([
      { text: 'Já ' },
      { gap: 'jsem', index: 0 },
      { text: ' z ' },
      { gap: 'Ukrajiny|Ukrajiny.', index: 1 },
    ]);
  });
});

describe('grade', () => {
  it('choice: counts correct answers', () => {
    const ex: Exercise = {
      type: 'choice',
      id: 'c',
      title: t,
      items: [
        { prompt: { cs: 'Já … student.' }, options: ['jsem', 'jsi'], answer: 0 },
        { prompt: { cs: 'Ty … student.' }, options: ['jsem', 'jsi'], answer: 1 },
      ],
    };
    const r = grade(ex, [0, 0]);
    expect(r.score).toBe(1);
    expect(r.max).toBe(2);
    expect(r.items[1]).toMatchObject({ correct: false, given: 'jsem', expected: 'jsi' });
  });

  it('multi: a group is right only when the selection matches exactly', () => {
    const ex: Exercise = {
      type: 'multi',
      id: 'm',
      title: t,
      groups: [
        { label: { cs: 'jméno' }, options: ['Eva', 'Petr', 'Thomas'], answers: [0, 2] },
        { label: { cs: 'země' }, options: ['z Austrálie', 'z Ruska'], answers: [0] },
      ],
    };
    const r = grade(ex, [[2, 0], [0, 1]]);
    expect(r.items.map((i) => i.correct)).toEqual([true, false]);
    expect(r.score).toBe(1);
  });

  it('order: scores each position', () => {
    const ex: Exercise = { type: 'order', id: 'o', title: t, items: ['A', 'B', 'C'] };
    expect(grade(ex, [0, 1, 2]).score).toBe(3);
    const r = grade(ex, [1, 0, 2]);
    expect(r.score).toBe(1);
    expect(r.items[0]).toMatchObject({ correct: false, given: 'B', expected: 'A' });
  });

  it('match: compares right-hand text so duplicate answers are fine', () => {
    const ex: Exercise = {
      type: 'match',
      id: 'p',
      title: t,
      pairs: [
        { left: 'já', right: 'jsem' },
        { left: 'on', right: 'je' },
        { left: 'ona', right: 'je' },
      ],
    };
    expect(grade(ex, [0, 2, 1]).score).toBe(3);
    expect(grade(ex, [1, 0, null]).score).toBe(0);
  });

  it('classify: per item category', () => {
    const ex: Exercise = {
      type: 'classify',
      id: 'k',
      title: t,
      categories: [
        { id: 'f', label: { cs: 'formální' } },
        { id: 'nf', label: { cs: 'neformální' } },
      ],
      items: [
        { text: 'Dobrý den!', category: 'f' },
        { text: 'Ahoj!', category: 'nf' },
      ],
    };
    const r = grade(ex, ['f', 'f']);
    expect(r.score).toBe(1);
    expect(r.items[1]).toMatchObject({ given: 'formální', expected: 'neformální' });
  });

  it('gapfill: each gap is an item and diacritics slips are "almost"', () => {
    const ex: Exercise = {
      type: 'gapfill',
      id: 'g',
      title: t,
      items: [{ text: 'My {rozumíme} česky.' }, { text: 'Oni {pracují|pracujou} a {jsou} tady.' }],
    };
    const r = grade(ex, [['rozumime'], ['pracujou', 'jsou']]);
    expect(r.max).toBe(3);
    expect(r.score).toBe(2);
    expect(r.items[0]).toMatchObject({ correct: false, almost: true, expected: 'rozumíme' });
    expect(r.items[1]).toMatchObject({ correct: true, expected: 'pracují / pracujou' });
  });

  it('table: grades only the blank cells', () => {
    const ex: Exercise = {
      type: 'table',
      id: 'tb',
      title: t,
      columns: ['být', 'dělat'],
      rows: [
        { label: 'já', cells: ['jsem', 'dělám'] },
        { label: 'ty', cells: ['jsi', 'děláš'] },
      ],
      given: [[0, 0]],
    };
    const r = grade(ex, { '0:1': 'dělám', '1:0': 'jsi', '1:1': 'delas' });
    expect(r.max).toBe(3);
    expect(r.score).toBe(2);
    expect(r.items[2]).toMatchObject({ almost: true, label: 'ty · dělat' });
  });

  it('dictation: typed answers compared like gaps', () => {
    const ex: Exercise = {
      type: 'dictation',
      id: 'd',
      title: t,
      items: [
        { say: 'sedm', answer: '7|sedm' },
        { say: 'osm', answer: '8|osm' },
      ],
    };
    expect(grade(ex, ['7', 'osm']).score).toBe(2);
    expect(grade(ex, ['6', '']).score).toBe(0);
  });
});
