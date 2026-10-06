-- Česky krok za krokem: schema, sign-up allowlist, RLS and private storage.

-- Who may register, and with which role. Filled by the admin (SQL / service role only).
create table public.allowed_emails (
  email text primary key,
  role text not null check (role in ('teacher', 'student')),
  display_name text not null default ''
);
alter table public.allowed_emails enable row level security;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null check (role in ('teacher', 'student')),
  display_name text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

create policy "profiles: own or teacher" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_teacher());

-- Blocks sign-up for emails outside the allowlist and creates the profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a public.allowed_emails;
begin
  select * into a from public.allowed_emails where lower(email) = lower(new.email);
  if not found then
    raise exception 'Email % is not on the allowlist', new.email;
  end if;
  insert into public.profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    a.role,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), a.display_name)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Exercise attempts (one row per "Перевірити").
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_id text not null,
  step_id text not null,
  exercise_id text not null,
  score int not null,
  max int not null,
  items jsonb not null default '[]',
  duration_sec int not null default 0,
  created_at timestamptz not null default now()
);
create index attempts_user_lesson on public.attempts (user_id, lesson_id);
alter table public.attempts enable row level security;
create policy "attempts: insert own" on public.attempts
  for insert to authenticated with check (user_id = auth.uid());
create policy "attempts: own or teacher" on public.attempts
  for select to authenticated using (user_id = auth.uid() or public.is_teacher());

create table public.step_progress (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_id text not null,
  step_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id, step_id)
);
alter table public.step_progress enable row level security;
create policy "step_progress: own or teacher" on public.step_progress
  for select to authenticated using (user_id = auth.uid() or public.is_teacher());
create policy "step_progress: insert own" on public.step_progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "step_progress: update own" on public.step_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "step_progress: delete own" on public.step_progress
  for delete to authenticated using (user_id = auth.uid());

create table public.vocab_progress (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  lesson_id text not null,
  word_id text not null,
  known boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id, word_id)
);
alter table public.vocab_progress enable row level security;
create policy "vocab: own or teacher" on public.vocab_progress
  for select to authenticated using (user_id = auth.uid() or public.is_teacher());
create policy "vocab: insert own" on public.vocab_progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "vocab: update own" on public.vocab_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null,
  title text not null,
  instructions text not null default '',
  exercise_ref text,
  due_date date,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.homework enable row level security;
create policy "homework: read" on public.homework for select to authenticated using (true);
create policy "homework: teacher insert" on public.homework
  for insert to authenticated with check (public.is_teacher());
create policy "homework: teacher update" on public.homework
  for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy "homework: teacher delete" on public.homework
  for delete to authenticated using (public.is_teacher());

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework (id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  answer_text text not null default '',
  photo_paths text[] not null default '{}',
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  teacher_comment text,
  grade text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (homework_id, student_id)
);
alter table public.submissions enable row level security;
create policy "submissions: own or teacher" on public.submissions
  for select to authenticated using (student_id = auth.uid() or public.is_teacher());
create policy "submissions: insert own" on public.submissions
  for insert to authenticated with check (student_id = auth.uid());
create policy "submissions: update own or teacher" on public.submissions
  for update to authenticated
  using (student_id = auth.uid() or public.is_teacher())
  with check (student_id = auth.uid() or public.is_teacher());

-- Students may only change their answer; the teacher may only change the review.
create or replace function public.guard_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_teacher() then
    new.answer_text := old.answer_text;
    new.photo_paths := old.photo_paths;
    new.submitted_at := old.submitted_at;
    new.student_id := old.student_id;
  else
    new.teacher_comment := case when tg_op = 'UPDATE' then old.teacher_comment else null end;
    new.grade := case when tg_op = 'UPDATE' then old.grade else null end;
    new.reviewed_at := case when tg_op = 'UPDATE' then old.reviewed_at else null end;
    new.status := 'submitted';
  end if;
  return new;
end;
$$;

create trigger submissions_guard_update
  before update on public.submissions
  for each row execute function public.guard_submission();

create or replace function public.guard_submission_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.teacher_comment := null;
  new.grade := null;
  new.reviewed_at := null;
  new.status := 'submitted';
  return new;
end;
$$;

create trigger submissions_guard_insert
  before insert on public.submissions
  for each row execute function public.guard_submission_insert();

-- Private storage. Content and audio are uploaded with the service role.
insert into storage.buckets (id, name, public)
values ('content', 'content', false), ('audio', 'audio', false), ('homework', 'homework', false)
on conflict (id) do nothing;

create policy "content+audio: read when signed in" on storage.objects
  for select to authenticated using (bucket_id in ('content', 'audio'));

create policy "homework photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'homework' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "homework photos: own or teacher" on storage.objects
  for select to authenticated
  using (bucket_id = 'homework' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_teacher()));

create policy "homework photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'homework' and (storage.foldername(name))[1] = auth.uid()::text);
