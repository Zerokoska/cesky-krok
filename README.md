# Krok za krokem

Private web app for learning Czech with the textbook *Česky krok za krokem 1*:
lesson steps keyed to textbook pages, the publisher's audio, interactive
exercises, vocabulary cards, homework with photo upload, and a teacher view
with methodology notes, answer keys and the student's results.

The textbook and workbook are not reproduced; the app references their pages.
Lesson content and audio are stored only in private Supabase Storage.

## Layout

- `src/` — React app (`content/schema.ts` defines the lesson format, `exercises/` the exercise types).
- `content/` — **git-ignored** lesson sources (`content/src/lesson-XX.mjs`) and built JSON.
- `supabase/migrations/` — schema, sign-up allowlist, RLS, private buckets.
- `scripts/` — content build/upload and admin helpers.

## Commands

```bash
npm run dev              # local app against Supabase (needs .env.local)
npm run dev:demo         # local demo mode: localStorage, role picker, local content files
npm test                 # graders + content checks
npm run content          # content/src/*.mjs → content/lessons/*.json (validated)
npm run upload-content   # push lessons + their audio to Supabase Storage
node scripts/allow-email.ts someone@example.com student "Name"
npx supabase db query --linked -f supabase/tests/rls_check.sql   # RLS smoke test (rolls back)
```

`app/.env.local` (never committed) holds `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_DB_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Adding a lesson

1. Write `content/src/lesson-NN.mjs` (see lesson 01; `seg()` cuts audio segments by silence detection).
2. `npm run content && npm test && npm run upload-content`.

No redeploy is needed: the app reads the lesson list from Storage.
