-- RLS smoke test. Runs in one transaction and rolls back: nothing persists.
-- Run: npx supabase db query --linked -f supabase/tests/rls_check.sql
begin;

insert into public.allowed_emails (email, role, display_name) values
  ('rls-teacher@test.invalid', 'teacher', 'T'),
  ('rls-student@test.invalid', 'student', 'S'),
  ('rls-student2@test.invalid', 'student', 'S2');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-teacher@test.invalid', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-student@test.invalid', '{"display_name":"Olena"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-student2@test.invalid', '{}', now(), now());

create temp table results (check_name text, ok boolean, detail text) on commit drop;
grant all on results to authenticated;

-- as the student
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

insert into public.attempts (lesson_id, step_id, exercise_id, score, max) values ('01', 'slovesa', 'byt', 5, 7);
insert into results select 'student sees own attempts', count(*) = 1, count(*)::text from public.attempts;
insert into results select 'student sees only own profile', count(*) = 1, count(*)::text from public.profiles;
insert into results select 'profile name from sign-up metadata', display_name = 'Olena', display_name from public.profiles;

do $$ begin
  insert into public.homework (lesson_id, title) values ('01', 'hack');
  insert into results values ('student cannot create homework', false, 'inserted');
exception when others then
  insert into results values ('student cannot create homework', true, sqlerrm);
end $$;

do $$ begin
  insert into public.attempts (user_id, lesson_id, step_id, exercise_id, score, max)
  values ('00000000-0000-0000-0000-0000000000b2', '01', 'x', 'x', 1, 1);
  insert into results values ('student cannot write attempts for others', false, 'inserted');
exception when others then
  insert into results values ('student cannot write attempts for others', true, sqlerrm);
end $$;

-- as the teacher: create homework
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into public.homework (id, lesson_id, title) values ('00000000-0000-0000-0000-00000000c001', '01', 'Sešit s. 4');
insert into results select 'teacher sees student attempts', count(*) = 1, count(*)::text from public.attempts;
insert into results select 'teacher sees all profiles', count(*) = 3, count(*)::text from public.profiles;

-- student submits and tries to grade themselves
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
insert into public.submissions (homework_id, answer_text, grade, teacher_comment, status)
values ('00000000-0000-0000-0000-00000000c001', 'jsem, jsi', '10/10', 'self', 'reviewed');
insert into results select 'student cannot self-grade on insert', grade is null and status = 'submitted', coalesce(grade, '∅') || ' ' || status from public.submissions;
update public.submissions set grade = 'A+', answer_text = 'jsem, jsi, je';
insert into results select 'student update keeps grade empty', grade is null and answer_text = 'jsem, jsi, je', coalesce(grade, '∅') from public.submissions;

-- second student sees nothing of the first
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
insert into results select 'other student cannot see attempts', count(*) = 0, count(*)::text from public.attempts;
insert into results select 'other student cannot see submissions', count(*) = 0, count(*)::text from public.submissions;

-- teacher reviews; answer stays untouched
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
update public.submissions set grade = '9/10', teacher_comment = 'Dobře', status = 'reviewed', answer_text = 'teacher edit';
insert into results select 'teacher review saved, answer kept', grade = '9/10' and answer_text = 'jsem, jsi, je', grade || ' / ' || answer_text from public.submissions;

reset role;
-- Report by raising: the error aborts the transaction, so nothing above persists.
do $$ begin
  raise exception 'RLS_RESULTS %', (select json_agg(json_build_object('check', check_name, 'ok', ok, 'detail', detail)) from results);
end $$;
