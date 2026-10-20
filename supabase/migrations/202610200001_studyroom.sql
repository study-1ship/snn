create extension if not exists pgcrypto;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null unique,
  created_at timestamptz not null default now()
);

insert into public.subjects (name, slug, sort_order) values
  ('PBA Chemistry', 'chemistry', 0),
  ('PBA Physics', 'physics', 1),
  ('PBA Computer Science', 'computer-science', 2),
  ('Existing subject 1', 'existing-subject-1', 3),
  ('Existing subject 2', 'existing-subject-2', 4),
  ('Existing subject 3', 'existing-subject-3', 5),
  ('Existing subject 4', 'existing-subject-4', 6)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (display_name is null or char_length(display_name) <= 80),
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  if requested_username !~ '^[a-zA-Z0-9_]{3,24}$' then
    raise exception 'Username must be 3-24 letters, numbers, or underscores.';
  end if;
  insert into public.profiles (id, username)
  values (new.id, requested_username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'Profile roles can only be changed by a trusted administrator.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_is_managed on public.profiles;
create trigger profiles_role_is_managed
  before update on public.profiles
  for each row execute procedure public.prevent_profile_role_change();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  class_grade text not null check (char_length(class_grade) between 1 and 80),
  topic text not null check (char_length(topic) between 1 and 120),
  resource_type text not null check (resource_type in ('notes', 'pba', 'past_paper', 'exam_prep')),
  description text check (description is null or char_length(description) <= 500),
  external_url text check (external_url is null or char_length(external_url) <= 2048),
  file_path text,
  file_name text check (file_name is null or char_length(file_name) <= 255),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint resource_has_source check (file_path is not null or external_url is not null),
  constraint resource_file_metadata check ((file_path is null) = (file_name is null)),
  constraint resource_external_url_scheme check (external_url is null or external_url ~* '^https?://')
);

create index if not exists resources_subject_filter_idx on public.resources (subject_id, class_grade, topic, resource_type);
create index if not exists resources_created_idx on public.resources (created_at desc);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_request_not_self check (requester_id <> recipient_id)
);

create unique index if not exists friend_request_pair_once_idx
  on public.friend_requests (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index if not exists friend_requests_recipient_status_idx on public.friend_requests (recipient_id, status);

create or replace function public.are_friends(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) in (first_user, second_user) and exists (
    select 1 from public.friend_requests
    where status = 'accepted'
      and ((requester_id = first_user and recipient_id = second_user)
        or (requester_id = second_user and recipient_id = first_user))
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_one uuid not null references public.profiles (id) on delete cascade,
  user_two uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversation_two_distinct_users check (user_one <> user_two),
  constraint conversation_sorted_users check (user_one < user_two),
  unique (user_one, user_two)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);

alter table public.subjects enable row level security;
alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.friend_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Subjects are readable by everyone" on public.subjects;
create policy "Subjects are readable by everyone" on public.subjects for select using (true);

drop policy if exists "Authenticated users can find profiles" on public.profiles;
create policy "Authenticated users can find profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "Users can update their own public profile" on public.profiles;
create policy "Users can update their own public profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.profiles from authenticated;
grant update (username, display_name) on public.profiles to authenticated;

drop policy if exists "Resources are readable by everyone" on public.resources;
create policy "Resources are readable by everyone" on public.resources for select using (true);
drop policy if exists "Admins can add resources" on public.resources;
create policy "Admins can add resources" on public.resources for insert to authenticated
  with check (public.is_admin() and created_by = (select auth.uid()));
drop policy if exists "Admins can edit resources" on public.resources;
create policy "Admins can edit resources" on public.resources for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete resources" on public.resources;
create policy "Admins can delete resources" on public.resources for delete to authenticated using (public.is_admin());

drop policy if exists "Users can view requests involving them" on public.friend_requests;
create policy "Users can view requests involving them" on public.friend_requests for select to authenticated
  using ((select auth.uid()) in (requester_id, recipient_id));
drop policy if exists "Users can request friendships" on public.friend_requests;
create policy "Users can request friendships" on public.friend_requests for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');
drop policy if exists "Recipients can respond to requests" on public.friend_requests;
create policy "Recipients can respond to requests" on public.friend_requests for update to authenticated
  using (recipient_id = (select auth.uid()) and status = 'pending')
  with check (recipient_id = (select auth.uid()) and status in ('accepted', 'rejected'));
revoke update on public.friend_requests from authenticated;
grant update (status) on public.friend_requests to authenticated;

drop policy if exists "Friends can view their conversations" on public.conversations;
create policy "Friends can view their conversations" on public.conversations for select to authenticated
  using ((select auth.uid()) in (user_one, user_two));
drop policy if exists "Friends can create their conversation" on public.conversations;
create policy "Friends can create their conversation" on public.conversations for insert to authenticated
  with check ((select auth.uid()) in (user_one, user_two) and public.are_friends(user_one, user_two));
drop policy if exists "Friends can keep their conversation current" on public.conversations;
revoke update, delete on public.conversations from authenticated;

drop policy if exists "Conversation participants can read messages" on public.messages;
create policy "Conversation participants can read messages" on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.user_one, c.user_two)
  ));
drop policy if exists "Friends can send conversation messages" on public.messages;
create policy "Friends can send conversation messages" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (select auth.uid()) in (c.user_one, c.user_two)
      and public.are_friends(c.user_one, c.user_two)
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-resources',
  'study-resources',
  true,
  26214400,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Study resources are publicly readable" on storage.objects;
create policy "Study resources are publicly readable" on storage.objects for select
  using (bucket_id = 'study-resources');
drop policy if exists "Admins can upload study resources" on storage.objects;
create policy "Admins can upload study resources" on storage.objects for insert to authenticated
  with check (bucket_id = 'study-resources' and public.is_admin());
drop policy if exists "Admins can update study resources" on storage.objects;
create policy "Admins can update study resources" on storage.objects for update to authenticated
  using (bucket_id = 'study-resources' and public.is_admin())
  with check (bucket_id = 'study-resources' and public.is_admin());
drop policy if exists "Admins can remove study resources" on storage.objects;
create policy "Admins can remove study resources" on storage.objects for delete to authenticated
  using (bucket_id = 'study-resources' and public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then
  null;
end;
$$;

grant select on public.subjects to anon, authenticated;
grant select on public.resources to anon, authenticated;
grant insert, update, delete on public.resources to authenticated;
grant select, update (username, display_name) on public.profiles to authenticated;
grant select, insert, update (status) on public.friend_requests to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;