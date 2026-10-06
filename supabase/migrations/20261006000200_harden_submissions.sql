-- A submission stays attached to its homework, and the server stamps submission time.
create or replace function public.guard_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.homework_id := old.homework_id;
  new.student_id := old.student_id;
  if public.is_teacher() then
    new.answer_text := old.answer_text;
    new.photo_paths := old.photo_paths;
    new.submitted_at := old.submitted_at;
  else
    new.teacher_comment := old.teacher_comment;
    new.grade := old.grade;
    new.reviewed_at := old.reviewed_at;
    new.status := 'submitted';
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.guard_submission_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.teacher_comment := null;
  new.grade := null;
  new.reviewed_at := null;
  new.status := 'submitted';
  new.submitted_at := now();
  return new;
end;
$$;

revoke execute on function public.guard_submission() from public, anon, authenticated;
revoke execute on function public.guard_submission_insert() from public, anon, authenticated;

-- The teacher cleans up photos when deleting a homework.
create policy "homework photos: teacher delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'homework' and public.is_teacher());

-- Homework photos: images only, at most 10 MB each.
update storage.buckets
set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
where id = 'homework';
