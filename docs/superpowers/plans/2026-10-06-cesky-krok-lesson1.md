# Česky krok za krokem — lesson 1 app — Implementation Plan

> **For agentic workers:** executed inline by the author in the same session
> (user asked to proceed without further gates). Steps use checkbox syntax.

**Goal:** A private two-role (teacher/student) web app for lesson 1 of *Česky krok
za krokem 1*, deployed on GitHub Pages with Supabase behind it.

**Architecture:** Vite + React + TS SPA. Lesson content is JSON validated by zod
and loaded through a `ContentSource`. All persistence goes through a `DataStore`
interface with a localStorage implementation (dev) and a Supabase implementation
(prod). Exercise types are isolated components with pure graders.

**Tech stack:** Vite 7, React 19, TypeScript, react-router (HashRouter), zod,
@supabase/supabase-js, Vitest. Plain CSS with tokens.

---

## File map

```
app/
  content/                       (git-ignored; master copy of lesson data)
    lessons/01.json
  scripts/
    upload-content.mjs           push content + audio to Supabase Storage
    vite-local-content.ts        dev plugin: serves /__content and /__audio
  supabase/
    config.toml
    migrations/0001_init.sql     tables, trigger, RLS, buckets, policies
  src/
    main.tsx, App.tsx            router + providers
    styles/tokens.css, app.css
    content/schema.ts            zod schema + inferred types (Lesson, Step, Exercise…)
    content/source.ts            ContentSource interface + local + supabase impls
    data/types.ts                DataStore interface + row types
    data/local.ts                LocalDataStore (localStorage)
    data/supabase.ts             SupabaseDataStore
    data/context.tsx             React context: store, session, role
    lib/normalize.ts             answer normalisation + diacritics detection
    lib/grade.ts                 grade(exercise, response) → GradeResult
    lib/tts.ts                   Czech speech synthesis helper
    components/                  AudioPlayer, CzechKeyboard, Hint, BookRef, Layout…
    exercises/                   Choice, Multi, Order, Match, Classify, GapFill,
                                 Table, Dictation, ExerciseRunner
    pages/                       Login, Home, Lesson, Step, Vocabulary, Homework,
                                 TeacherDashboard, Test
  tests/
    normalize.test.ts, grade.test.ts, content.test.ts
  .github/workflows/deploy.yml
```

## Key contracts

```ts
// content/schema.ts (zod-inferred)
type Bilingual = { cs: string; uk?: string };
type AudioRef = { track: string; start?: number; end?: number; label?: string };
type Exercise =
  | { type: 'choice'; id; title: Bilingual; items: { prompt: Bilingual; audio?: AudioRef; options: string[]; answer: number }[] }
  | { type: 'multi'; id; title; audio?: AudioRef; groups: { label: Bilingual; options: string[]; answers: number[] }[] }
  | { type: 'order'; id; title; audio?: AudioRef; items: string[] }            // items in correct order
  | { type: 'match'; id; title; pairs: { left: string; right: string }[] }
  | { type: 'classify'; id; title; categories: { id: string; label: Bilingual }[]; items: { text: string; category: string }[] }
  | { type: 'gapfill'; id; title; bank?: string[]; items: { text: string /* "Já {jsem} student." */; uk?: string }[] }
  | { type: 'table'; id; title; columns: string[]; rows: { label: string; cells: string[] }[]; given: [row, col][] }
  | { type: 'dictation'; id; title; items: { audio: AudioRef; answer: string }[] };
type Step = { id; title: Bilingual; book: { page: number; exercises?: string }; audio: AudioRef[];
  intro?: Bilingual; grammar?: GrammarTable[]; exercises: Exercise[]; online: OnlineActivity[];
  teacher: { notes: string[]; activities: string[] } };
type Lesson = { id: string; number: number; title: Bilingual; pages: [number, number];
  goals: { communicative: string; grammar: string }; steps: Step[];
  vocabulary: { id: string; cs: string; uk: string; page: number; gender?: 'm'|'f'|'n' }[];
  test: Exercise[] };

// lib/grade.ts
type ItemResult = { index: number; correct: boolean; almost?: boolean; given: unknown; expected: unknown };
type GradeResult = { score: number; max: number; items: ItemResult[] };

// data/types.ts
interface DataStore {
  getSession(): Promise<Session | null>; signIn(email, password); signUp(email, password); signOut();
  saveAttempt(a: NewAttempt): Promise<void>; listAttempts(filter?: { userId?; lessonId? }): Promise<Attempt[]>;
  setStepDone(lessonId, stepId, done: boolean); listStepProgress(userId?);
  setVocab(lessonId, wordId, known: boolean); listVocab(userId?);
  listHomework(lessonId?); createHomework(h); deleteHomework(id);
  listSubmissions(filter?); submitHomework(s, photos: File[]); reviewSubmission(id, review);
  photoUrl(path): Promise<string>; listStudents(): Promise<Profile[]>;
}
```

## Tasks

### Task 1: Scaffold
- [ ] Vite React-TS app in `app/`, add deps (react-router-dom, zod, @supabase/supabase-js, vitest).
- [ ] `.gitignore` (node_modules, dist, content/, .env*), tokens + base CSS, `noindex` meta.
- [ ] Commit.

### Task 2: Normalisation + grading (TDD)
- [ ] Tests first: `normalize("  Já jsem. ")` → `"já jsem"`; `stripDiacritics("Těší mě")` → `"Tesi me"`;
      `compareText("tesi me", "Těší mě")` → `{correct:false, almost:true}`; graders for every exercise type.
- [ ] Implement `lib/normalize.ts`, `lib/grade.ts`; run `npx vitest run` → pass. Commit.

### Task 3: Content schema + source
- [ ] zod schema, `ContentSource` with local impl + Vite dev plugin serving `content/` and the audio folder.
- [ ] Content test: every lesson file parses, ids unique, every audio track exists on disk.
- [ ] Commit.

### Task 4: DataStore + LocalDataStore + context
- [ ] Interface, localStorage impl, dev role picker. Commit.

### Task 5: UI shell + components
- [ ] Layout (Ukrainian nav), Home (lessons list + progress), Lesson overview, Step page,
      AudioPlayer (segments), CzechKeyboard, Hint toggle, BookRef, OnlineActivity cards,
      teacher-only panels, "view as student" toggle. Commit.

### Task 6: Exercise components
- [ ] One component per type + ExerciseRunner (check, retry, show key for teacher, save attempt). Commit.

### Task 7: Vocabulary, Homework, Test, Teacher dashboard pages
- [ ] Flashcards with TTS + known/unknown; homework create/submit (text + photos)/review;
      test page; dashboard with per-step/per-exercise results and wrong items. Commit.

### Task 8: Lesson 1 content
- [ ] Transcribe audio locally (faster-whisper) for segment timestamps and question writing (not shipped).
- [ ] Extract lesson-1 vocabulary from the Ukrainian page-based slovníček (pp. 9–16).
- [ ] Write `content/lessons/01.json`: 8 steps + review, original exercises, teacher notes (UA summary of manual),
      online activity links, 30-item test. Content test passes. 

### Task 9: Supabase
- [ ] Migration (tables, trigger with allowlist, RLS, buckets/policies), `SupabaseDataStore`, `SupabaseContentSource`.
- [ ] Create project via CLI (user ran `supabase login`), push migration, auth config (no email confirm),
      seed allowlist, upload content + audio. Commit.

### Task 10: Deploy
- [ ] With user's permission create public repo, Actions workflow → Pages, set repo variables, push.
- [ ] Verify live site: sign-up blocked for non-allowlisted, teacher/student flows work.

### Task 11: Verification
- [ ] `npx vitest run`, `npx tsc -b`, `npm run build` clean; click through every step in both roles in the browser.
