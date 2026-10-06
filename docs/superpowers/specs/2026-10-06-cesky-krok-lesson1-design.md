# Česky krok za krokem 1 — web app, lesson 1 (design)

Date: 2026-10-06. Status: approved by user ("Go").

## Goal

Private web app for two people: a teacher (Vasyl) and a student. It follows the
textbook *Česky krok za krokem 1* (paper copies on the desk) page by page. The app
adds the parts a paper book can't: official audio, interactive exercises with
instant checking, a lesson vocabulary trainer, homework with photo upload, and a
teacher view with methodology notes, answer keys and the student's results.

Lesson 1 only for now. Lessons 2–24 are added later as content files, without
code changes.

## Content rules (copyright)

- The textbook and workbook text are **not** reproduced. The app references them
  ("Učebnice s. 11, cv. 2", "Sešit s. X, cv. Y").
- Exercises are original, written for the app, covering the lesson's vocabulary,
  grammar and communicative goals.
- Publisher materials the user downloaded from czechstepbystep.cz (audio, the
  Ukrainian slovníček, the teacher manual) are used privately behind login.
  Teacher notes are Ukrainian summaries of the manual, not copies.
- The publisher's free online activities (Wordwall, LearningApps, Padlet, Kahoot,
  Flippity) are linked from the matching step.
- Lesson content and audio live only in private Supabase Storage. The public
  GitHub repo holds app code only (`content/` is git-ignored).

## Lesson 1 structure

Eight steps keyed to textbook pages 9–16, plus review:

| Step | Page | Topic | Audio (CD1) |
|---|---|---|---|
| 1 | 9 | Classroom phrases | 01 |
| 2 | 10 | Pronunciation, signs, international words, gender by ending | 02–04 |
| 3 | 11 | Formal dialogue (vykání) | 05–06 |
| 4 | 12 | Informal dialogue (tykání), vocative forms | 07–08 |
| 5 | 13 | Verbs být, dělat, rozumět, pracovat | 09 |
| 6 | 14 | Introducing others, doktor/doktorka, tykat | 10–11 |
| 7 | 15 | Numbers 0–10, phone number, mít, e-mail | 12–13 |
| 8 | 16 | Professions m/f | — |
| ✓ | — | Review: publisher Kahoot/Riskuj + original 30-item test | — |

Each step has: book reference, audio players, short intro (Czech, Ukrainian on
"hint"), exercises, grammar tables where relevant, links to online activities,
and teacher-only notes (methodology summary, offline game ideas, answer keys).

Also per lesson: vocabulary from the Ukrainian slovníček (pages 9–16) as
flashcards with known/unknown tracking, and homework.

## Language

Menus and buttons in Ukrainian. Exercise instructions and content in Czech, with
a Ukrainian translation behind a "hint" toggle (the book's method is
Czech-only teaching).

## Exercise engine

Exercise types, each a React component plus a pure grading function:

- `choice` — single-answer multiple choice (optional audio).
- `multi` — "Co slyšíte?" select all that apply.
- `order` — put items into sequence.
- `match` — connect left/right pairs.
- `classify` — sort items into categories (F/NF, rod).
- `gapfill` — sentences with gaps, typed or from a word bank.
- `table` — conjugation table with blank cells.
- `dictation` — listen to an audio segment, type what you hear.

Typed answers: case, extra spaces and final punctuation are ignored. Diacritics
are strict, but an answer wrong only in diacritics gets an "almost — check háčky
and čárky" message. A Czech-letter keyboard sits under every text field.

Audio refs can name a segment (`start`/`end` seconds) of a track, so one
recording feeds several items.

## Roles

- **Student:** lesson steps, exercises, vocabulary, homework, own progress.
- **Teacher:** everything above, plus methodology notes, answer keys, a
  "view as student" toggle, the student's results per exercise (score,
  wrong items, time), and homework creation and review.

## Architecture

- Frontend: Vite + React + TypeScript, HashRouter (GitHub Pages), plain CSS with
  design tokens, zod for content validation, Vitest for logic tests.
- `ContentSource` interface: `SupabaseContentSource` (prod, private Storage,
  signed audio URLs) and `LocalContentSource` (dev, served by a Vite plugin from
  `content/` and the local audio folder).
- `DataStore` interface (auth, attempts, step progress, vocab progress, homework,
  submissions): `SupabaseDataStore` (prod) and `LocalDataStore` (dev/demo,
  localStorage, role picker instead of login).
- Supabase:
  - Tables: `allowed_emails`, `profiles`, `attempts`, `step_progress`,
    `vocab_progress`, `homework`, `submissions`.
  - A trigger on `auth.users` blocks sign-up for emails not in `allowed_emails`
    and creates the profile with its role.
  - RLS: the student reads and writes only their own rows; the teacher reads
    everything, manages homework and reviews submissions.
  - Buckets (all private): `content`, `audio`, `homework` (student uploads to
    `<uid>/…`).
  - Auth: email + password, email confirmation off.
- `scripts/upload-content.mjs` pushes lesson JSON and that lesson's audio to
  Storage, using the service-role key from `.env.local` (never committed).
- Deploy: public GitHub repo, a GitHub Actions workflow builds with
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and publishes to Pages.
  `noindex` meta.

## Testing

- Vitest: grading functions (normalisation, diacritics detection, each type),
  content validation (lesson JSON passes the zod schema, every exercise has a
  key, every audio ref names an existing track).
- Manual browser run of every step in both roles before deploy.

## Out of scope (for now)

Lessons 2–24, live "teacher pushes the screen" sync, speech recognition,
spaced-repetition scheduling beyond known/unknown, offline/PWA.
