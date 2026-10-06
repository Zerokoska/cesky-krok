-- Storage policy smoke test for homework photos. Aborts at the end: nothing persists.
-- Run: npx supabase db query --linked -f supabase/tests/storage_check.sql
begin;

insert into public.allowed_emails (email, role) values ('st-teacher@test.invalid', 'teacher'), ('st-student@test.invalid', 'student');
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'st-teacher@test.invalid', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'st-student@test.invalid', '{}', now(), now());

create temp table results (check_name text, ok boolean, detail text) on commit drop;
grant all on results to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b9","role":"authenticated"}', true);

do $$ begin
  insert into storage.objects (bucket_id, name, owner_id) values ('homework', '00000000-0000-0000-0000-0000000000b9/hw/1.jpg', '00000000-0000-0000-0000-0000000000b9');
  insert into results values ('student uploads to own folder', true, 'ok');
exception when others then insert into results values ('student uploads to own folder', false, sqlerrm);
end $$;

do $$ begin
  insert into storage.objects (bucket_id, name) values ('homework', '00000000-0000-0000-0000-0000000000a9/hw/evil.jpg');
  insert into results values ('student cannot upload to another folder', false, 'inserted');
exception when others then insert into results values ('student cannot upload to another folder', true, sqlerrm);
end $$;

do $$ begin
  insert into storage.objects (bucket_id, name) values ('content', 'lessons/evil.json');
  insert into results values ('student cannot write lesson content', false, 'inserted');
exception when others then insert into results values ('student cannot write lesson content', true, sqlerrm);
end $$;

insert into results select 'student reads lesson content', count(*) > 0, count(*)::text from storage.objects where bucket_id = 'content';

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a9","role":"authenticated"}', true);
insert into results select 'teacher sees student photo', count(*) = 1, count(*)::text from storage.objects where bucket_id = 'homework';

reset role;
do $$ begin
  raise exception 'STORAGE_RESULTS %', (select json_agg(json_build_object('check', check_name, 'ok', ok, 'detail', detail)) from results);
end $$;
