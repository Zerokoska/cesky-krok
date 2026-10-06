import { z } from 'zod';

/** Czech text with an optional Ukrainian translation shown behind the hint toggle. */
export const bilingual = z.object({ cs: z.string().min(1), uk: z.string().optional() });

/** A publisher recording, optionally a segment of it (seconds). */
export const audioRef = z.object({
  track: z.string().regex(/^CD[12]_track_\d{2}$/),
  start: z.number().nonnegative().optional(),
  end: z.number().positive().optional(),
  label: z.string().optional(),
});

const exerciseBase = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: bilingual,
  instructions: bilingual.optional(),
  audio: audioRef.optional(),
};

const choice = z.object({
  ...exerciseBase,
  type: z.literal('choice'),
  /** Keep options in the authored order (e.g. "formální / neformální"); otherwise they are shuffled. */
  fixed: z.boolean().optional(),
  items: z
    .array(
      z.object({
        prompt: bilingual,
        audio: audioRef.optional(),
        say: z.string().optional(),
        options: z.array(z.string().min(1)).min(2),
        answer: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

const multi = z.object({
  ...exerciseBase,
  type: z.literal('multi'),
  groups: z
    .array(
      z.object({
        label: bilingual,
        options: z.array(z.string().min(1)).min(2),
        answers: z.array(z.number().int().nonnegative()).min(1),
      }),
    )
    .min(1),
});

const order = z.object({
  ...exerciseBase,
  type: z.literal('order'),
  /** Items in the correct order; the UI shuffles them. */
  items: z.array(z.string().min(1)).min(2),
});

const match = z.object({
  ...exerciseBase,
  type: z.literal('match'),
  pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2),
});

const classify = z.object({
  ...exerciseBase,
  type: z.literal('classify'),
  categories: z
    .array(z.object({ id: z.string(), label: bilingual, tone: z.enum(['m', 'f', 'n', 'a', 'b', 'c']).optional() }))
    .min(2),
  items: z.array(z.object({ text: z.string().min(1), category: z.string() })).min(2),
});

/** `text` marks gaps with braces: "Já {jsem} student." Alternatives inside a gap use `|`. */
const gapfill = z.object({
  ...exerciseBase,
  type: z.literal('gapfill'),
  bank: z.array(z.string()).optional(),
  items: z
    .array(
      z.object({
        text: z.string().regex(/\{[^}]+\}/, 'needs at least one {gap}'),
        speaker: z.string().optional(),
        uk: z.string().optional(),
      }),
    )
    .min(1),
});

/** Conjugation-style table; cells listed in `given` are shown pre-filled. */
const table = z.object({
  ...exerciseBase,
  type: z.literal('table'),
  columns: z.array(z.string()).min(1),
  rows: z.array(z.object({ label: z.string(), cells: z.array(z.string()) })).min(1),
  given: z.array(z.tuple([z.number().int(), z.number().int()])).default([]),
});

/** Listen (publisher audio segment or Czech TTS via `say`) and type what you hear. */
const dictation = z.object({
  ...exerciseBase,
  type: z.literal('dictation'),
  items: z
    .array(
      z
        .object({ audio: audioRef.optional(), say: z.string().optional(), answer: z.string().min(1), hint: z.string().optional() })
        .refine((i) => i.audio || i.say, 'needs audio or say'),
    )
    .min(1),
});

export const exercise = z.discriminatedUnion('type', [choice, multi, order, match, classify, gapfill, table, dictation]);

const phraseItem = z.object({ cs: z.string(), uk: z.string().optional(), say: z.string().optional() });

export const block = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), title: bilingual.optional(), body: bilingual }),
  z.object({ kind: z.literal('note'), title: bilingual.optional(), body: bilingual }),
  z.object({ kind: z.literal('phrases'), title: bilingual.optional(), items: z.array(phraseItem).min(1) }),
  z.object({
    kind: z.literal('dialogue'),
    title: bilingual.optional(),
    lines: z.array(z.object({ speaker: z.string(), cs: z.string(), uk: z.string().optional() })).min(1),
  }),
  z.object({
    kind: z.literal('grammar'),
    title: bilingual,
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    note: bilingual.optional(),
  }),
  z.object({ kind: z.literal('exercise'), exercise }),
]);

export const onlineActivity = z.object({
  title: z.string(),
  url: z.url(),
  provider: z.enum(['wordwall', 'learningapps', 'padlet', 'kahoot', 'flippity', 'drive', 'other']),
  sound: z.boolean().optional(),
  note: z.string().optional(),
});

export const step = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: bilingual,
  book: z.object({ page: z.number().int(), exercises: z.string().optional() }),
  audio: z.array(audioRef).default([]),
  blocks: z.array(block).min(1),
  online: z.array(onlineActivity).default([]),
  teacher: z.object({
    notes: z.array(z.string()).default([]),
    activities: z.array(z.string()).default([]),
  }),
});

/** Gender colour-coding as in the book: ma/mi = masculine animate/inanimate, f, n. */
export const gender = z.enum(['ma', 'mi', 'f', 'n']);

export const vocabItem = z.object({
  id: z.string(),
  cs: z.string(),
  uk: z.string(),
  page: z.number().int(),
  gender: gender.optional(),
});

export const lesson = z.object({
  id: z.string().regex(/^\d{2}$/),
  number: z.number().int(),
  title: bilingual,
  pages: z.tuple([z.number().int(), z.number().int()]),
  goals: z.object({ communicative: z.string(), grammar: z.string() }),
  teacherIntro: z.array(z.string()).default([]),
  steps: z.array(step).min(1),
  vocabulary: z.array(vocabItem).default([]),
  test: z.object({ title: bilingual, exercises: z.array(exercise).min(1) }),
});

export const lessonIndex = z.array(
  z.object({ id: z.string(), number: z.number().int(), title: bilingual, pages: z.tuple([z.number(), z.number()]) }),
);

export type Bilingual = z.infer<typeof bilingual>;
export type AudioRef = z.infer<typeof audioRef>;
export type Exercise = z.infer<typeof exercise>;
export type ExerciseOf<T extends Exercise['type']> = Extract<Exercise, { type: T }>;
export type Block = z.infer<typeof block>;
export type OnlineActivity = z.infer<typeof onlineActivity>;
export type Step = z.infer<typeof step>;
export type VocabItem = z.infer<typeof vocabItem>;
export type Lesson = z.infer<typeof lesson>;
export type LessonIndex = z.infer<typeof lessonIndex>;

export function parseLesson(data: unknown): Lesson {
  return lesson.parse(data);
}
