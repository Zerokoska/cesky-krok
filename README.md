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
npx supabase db query --linked -f supabase/tests/rls_check.sql   # RLS smoke test (rolls back)
```

`app/.env.local` (never committed) holds `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_DB_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Accounts

There is no sign-up (disabled in Supabase Auth). The sign-in screen offers two
roles plus a password; each role maps to an internal login in `src/config.ts`
(`ucitel@cesky-krok.invalid`, `studentka@cesky-krok.invalid`). Both are on the
`allowed_emails` list, which gives the account its role when it is created.

Create an account, or set a new password, from a terminal (the password is typed, hidden, and not stored):

```bash
node scripts/account.ts teacher   # or: student
node scripts/account.ts status
```

To add another role login: `node scripts/allow-email.ts <login> <teacher|student> "Name"` first.

## Adding a lesson

1. Write `content/src/lesson-NN.mjs` (see lesson 01; `seg()` cuts audio segments by silence detection).
2. `npm run content && npm test && npm run upload-content`.

No redeploy is needed: the app reads the lesson list from Storage.
