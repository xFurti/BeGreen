-- Following: the accounts you follow are your friends. One row per follow, from you to them.
-- Who follows whom is visible to every signed-in user (like a profile), but only you can
-- add or remove your own follows.

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on public.follows (followee_id);

alter table public.follows enable row level security;

create policy "follows: read" on public.follows for select to authenticated using (true);
create policy "follows: follow" on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy "follows: unfollow" on public.follows for delete to authenticated using (follower_id = auth.uid());

grant select, insert, delete on public.follows to authenticated;

alter publication supabase_realtime add table public.follows;
