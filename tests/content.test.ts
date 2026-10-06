import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { lesson as lessonSchema, lessonIndex, type AudioRef, type Exercise, type Lesson } from '../src/content/schema';
import { gapAnswers } from '../src/lib/gaps';

const root = path.resolve(import.meta.dirname, '..');
const lessonsDir = path.join(root, 'content', 'lessons');
const audioDir = process.env.AUDIO_DIR ?? path.resolve(root, '../cesky-krok-za-krokem-1-audionahravky');
const islands: Record<string, { duration: number }> = fs.existsSync(path.join(root, 'content/src/audio-islands.json'))
  ? JSON.parse(fs.readFileSync(path.join(root, 'content/src/audio-islands.json'), 'utf8'))
  : {};

// Content is private (git-ignored); skip where it isn't present, e.g. CI.
const present = fs.existsSync(path.join(lessonsDir, 'index.json'));
const files = present ? fs.readdirSync(lessonsDir).filter((f) => /^\d{2}\.json$/.test(f)) : [];

function audioRefs(ex: Exercise): AudioRef[] {
  const refs: AudioRef[] = ex.audio ? [ex.audio] : [];
  if (ex.type === 'choice') ex.items.forEach((i) => i.audio && refs.push(i.audio));
  if (ex.type === 'dictation') ex.items.forEach((i) => i.audio && refs.push(i.audio));
  return refs;
}

function allExercises(L: Lesson): Exercise[] {
  return [...L.steps.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'exercise' ? [b.exercise] : []))), ...L.test.exercises];
}

describe.skipIf(!present)('lesson content', () => {
  it('index lists every lesson file', () => {
    const index = lessonIndex.parse(JSON.parse(fs.readFileSync(path.join(lessonsDir, 'index.json'), 'utf8')));
    expect(index.map((l) => `${l.id}.json`).sort()).toEqual(files.sort());
  });

  for (const file of files) {
    describe(file, () => {
      const L = lessonSchema.parse(JSON.parse(fs.readFileSync(path.join(lessonsDir, file), 'utf8')));
      const exs = allExercises(L);

      it('has unique step, exercise and vocabulary ids', () => {
        const dup = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
        expect(dup(L.steps.map((s) => s.id))).toEqual([]);
        expect(dup(exs.map((e) => e.id))).toEqual([]);
        expect(dup(L.vocabulary.map((v) => v.id))).toEqual([]);
      });

      it('every exercise has a consistent key', () => {
        for (const ex of exs) {
          const where = `${ex.id}`;
          switch (ex.type) {
            case 'choice':
              ex.items.forEach((i) => {
                expect(i.answer, where).toBeLessThan(i.options.length);
                expect(new Set(i.options).size, `${where}: duplicate options`).toBe(i.options.length);
              });
              break;
            case 'multi':
              ex.groups.forEach((g) => g.answers.forEach((a) => expect(a, where).toBeLessThan(g.options.length)));
              break;
            case 'order':
              expect(new Set(ex.items).size, `${where}: duplicate lines`).toBe(ex.items.length);
              break;
            case 'classify': {
              const ids = new Set(ex.categories.map((c) => c.id));
              ex.items.forEach((i) => expect(ids.has(i.category), `${where}: ${i.text}`).toBe(true));
              break;
            }
            case 'gapfill':
              ex.items.forEach((i) => expect(gapAnswers(i.text).length, where).toBeGreaterThan(0));
              break;
            case 'table':
              ex.rows.forEach((r) => expect(r.cells.length, `${where}: ${r.label}`).toBe(ex.columns.length));
              ex.given.forEach(([r, c]) => expect(ex.rows[r]?.cells[c], where).toBeDefined());
              break;
            case 'dictation':
              ex.items.forEach((i) => expect(i.audio || i.say, where).toBeTruthy());
              break;
          }
        }
      });

      it('every audio reference points to an existing track and a valid segment', () => {
        const refs = [...L.steps.flatMap((s) => s.audio), ...exs.flatMap(audioRefs)];
        expect(refs.length).toBeGreaterThan(0);
        for (const a of refs) {
          expect(fs.existsSync(path.join(audioDir, `${a.track}.mp3`)), a.track).toBe(true);
          if (a.start !== undefined && a.end !== undefined) expect(a.end, a.track).toBeGreaterThan(a.start);
          const dur = islands[a.track]?.duration;
          if (dur && a.end !== undefined) expect(a.end, a.track).toBeLessThanOrEqual(dur + 0.01);
        }
      });

      it('links to the publisher online activities over https', () => {
        for (const s of L.steps)
          for (const o of s.online) expect(o.url.startsWith('https://') || o.url.startsWith('http://czechstepbystep.cz'), o.url).toBe(true);
      });
    });
  }
});
