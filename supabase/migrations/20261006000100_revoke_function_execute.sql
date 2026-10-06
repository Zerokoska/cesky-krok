-- Trigger functions are not meant to be called through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_submission() from public, anon, authenticated;
revoke execute on function public.guard_submission_insert() from public, anon, authenticated;

-- RLS policies call is_teacher() as the signed-in user, so only anon loses access.
revoke execute on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;
