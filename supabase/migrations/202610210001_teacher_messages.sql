create or replace function public.is_teacher_conversation(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) in (first_user, second_user)
    and exists (
      select 1
      from public.profiles
      where id in (first_user, second_user)
        and role = 'admin'
    );
$$;

revoke all on function public.is_teacher_conversation(uuid, uuid) from public;
grant execute on function public.is_teacher_conversation(uuid, uuid) to authenticated;

drop policy if exists "Teacher conversations can be created by participants" on public.conversations;
create policy "Teacher conversations can be created by participants" on public.conversations
  for insert to authenticated
  with check (
    (select auth.uid()) in (user_one, user_two)
    and public.is_teacher_conversation(user_one, user_two)
  );

drop policy if exists "Participants can send teacher messages" on public.messages;
create policy "Participants can send teacher messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1
      from public.conversations conversation
      where conversation.id = conversation_id
        and (select auth.uid()) in (conversation.user_one, conversation.user_two)
        and public.is_teacher_conversation(conversation.user_one, conversation.user_two)
    )
  );
