-- BeGreen Community: local communities, a shared map of places and experiences built by their
-- members, collective challenges, and the trust tools that keep a user-built map honest
-- (saves, flags, corrections, verification by moderators, blocking).

-- ---------- communities ----------

create table public.communities (
  id text primary key check (id ~ '^[a-z0-9:-]{3,60}$'),
  name text not null check (char_length(name) between 3 and 60),
  kind text not null check (kind in ('territory', 'school', 'association', 'neighbourhood')),
  description text not null default '' check (char_length(description) <= 400),
  area text not null default '' check (char_length(area) <= 80),
  -- Who can see posts and the map: everyone ('public') or members only ('private').
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  center_lat double precision not null,
  center_lon double precision not null,
  -- Bounding box of the shared map: {w, s, e, n}.
  bbox jsonb not null,
  -- Bundled illustrated base map (src/data/maps), if this territory has one.
  map_id text,
  -- Names of the comuni the community covers: their proofs show up in its feed.
  comuni text[] not null default '{}',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Invite codes for private communities. No client can read this table: joining goes through join_community().
create table public.community_codes (
  community_id text primary key references public.communities (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{4,12}$')
);

create table public.community_members (
  community_id text not null references public.communities (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create or replace function public.is_community_member(c text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.community_members where community_id = c and user_id = auth.uid())
$$;

create or replace function public.is_community_moderator(c text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.community_members where community_id = c and user_id = auth.uid() and role = 'moderator')
$$;

create or replace function public.community_is_public(c text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.communities where id = c and visibility = 'public')
$$;

-- Join a public community, or a private one with its invite code.
create or replace function public.join_community(c text, invite text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if not exists (select 1 from public.communities where id = c) then
    return false;
  end if;
  if not public.community_is_public(c)
     and not exists (select 1 from public.community_codes where community_id = c and code = upper(coalesce(invite, ''))) then
    return false;
  end if;
  insert into public.community_members (community_id, user_id) values (c, auth.uid()) on conflict do nothing;
  return true;
end
$$;

-- Create a community: its founder becomes its first moderator. Private ones get an invite code.
create or replace function public.create_community(
  c text, p_name text, p_kind text, p_description text, p_area text, p_visibility text,
  lat double precision, lon double precision, p_bbox jsonb, p_comuni text[]
) returns text
language plpgsql security definer set search_path = public as $$
declare
  invite text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.communities (id, name, kind, description, area, visibility, center_lat, center_lon, bbox, comuni, created_by)
  values (c, p_name, p_kind, p_description, p_area, p_visibility, lat, lon, p_bbox, coalesce(p_comuni, '{}'), auth.uid());
  insert into public.community_members (community_id, user_id, role) values (c, auth.uid(), 'moderator');
  if p_visibility = 'private' then
    invite := upper(substr(md5(random()::text || c), 1, 6));
    insert into public.community_codes (community_id, code) values (c, invite);
  end if;
  return invite;
end
$$;

-- The invite code, for the moderators who share it.
create or replace function public.community_invite(c text) returns text
language sql stable security definer set search_path = public as $$
  select code from public.community_codes where community_id = c and public.is_community_moderator(c)
$$;

-- ---------- places and experiences on the shared map ----------

create table public.spots (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references public.communities (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- What the person shared, and the map layer it sits on.
  kind text not null check (kind in ('discovery', 'useful', 'event', 'challenge', 'report', 'moment')),
  category text not null check (category in ('discover', 'repair', 'gardens', 'swap', 'events', 'reports', 'moments')),
  title text not null check (char_length(title) between 2 and 80),
  body text not null default '' check (char_length(body) <= 600),
  photo text,
  -- Optional: a moment can be shared without a place, and then stays off the map.
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  -- false: the author chose to show an approximate spot (~200 m) instead of the exact one.
  precise boolean not null default true,
  address text not null default '' check (char_length(address) <= 160),
  status text not null default 'active' check (status in ('active', 'toVerify', 'resolved', 'done')),
  starts_at timestamptz,
  ends_at timestamptz,
  -- Suitable for groups or families: only shown as a filter once a moderator has verified the place.
  family boolean not null default false,
  visibility text not null default 'public' check (visibility in ('public', 'community')),
  -- The daily prompt this moment answers ('YYYY-MM-DD').
  prompt_day date,
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((lat is null) = (lon is null)),
  check (kind <> 'event' or starts_at is not null),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create index spots_community_created on public.spots (community_id, created_at desc);

create or replace function public.can_see_spot(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.spots p
    where p.id = s
      and (p.author_id = auth.uid()
        or public.is_community_moderator(p.community_id)
        or (not p.hidden and (public.is_community_member(p.community_id)
          or (p.visibility = 'public' and public.community_is_public(p.community_id)))))
  )
$$;

-- A proof can point to the place it was taken.
alter table public.posts add column spot_id uuid references public.spots (id) on delete set null;

create table public.spot_saves (
  spot_id uuid not null references public.spots (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

create table public.spot_reactions (
  spot_id uuid not null references public.spots (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

create table public.spot_comments (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index spot_comments_spot on public.spot_comments (spot_id, created_at);

-- Who's going to an event.
create table public.spot_going (
  spot_id uuid not null references public.spots (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

-- Problems people report about a place: out of date, wrong, inappropriate, or (for a report) fixed.
create table public.spot_flags (
  spot_id uuid not null references public.spots (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('outdated', 'wrong', 'inappropriate', 'resolved')),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id, reason)
);

-- The community acts on flags without waiting for a moderator:
-- 3 people find it inappropriate → hidden until a moderator looks; 2 say it's out of date or wrong → "to verify";
-- 2 say a report is fixed → resolved. Nobody's flags count twice.
create or replace function public.apply_flags() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  -- "Out of date" and "wrong" share one threshold, counted in people: one person flagging both is still one.
  select count(distinct user_id) into n from public.spot_flags
  where spot_id = new.spot_id
    and (reason = new.reason or (new.reason in ('outdated', 'wrong') and reason in ('outdated', 'wrong')));
  if new.reason = 'inappropriate' and n >= 3 then
    update public.spots set hidden = true where id = new.spot_id;
  elsif new.reason in ('outdated', 'wrong') and n >= 2 then
    update public.spots set status = 'toVerify' where id = new.spot_id and status = 'active';
  elsif new.reason = 'resolved' and n >= 2 then
    update public.spots set status = 'resolved', updated_at = now() where id = new.spot_id and kind = 'report';
  end if;
  return new;
end
$$;

create trigger spot_flags_apply after insert on public.spot_flags
for each row execute function public.apply_flags();

-- Authors keep their information fresh; an edit clears "to verify". Verification and hiding stay with moderators.
create or replace function public.touch_spot() returns trigger
language plpgsql as $$
begin
  if (new.verified_at is distinct from old.verified_at or new.verified_by is distinct from old.verified_by or new.hidden is distinct from old.hidden)
     and not public.is_community_moderator(old.community_id)
     and current_user = 'authenticated' then
    raise exception 'only moderators can verify or hide places';
  end if;
  if current_user = 'authenticated' and old.author_id = auth.uid() then
    new.updated_at := now();
    -- Editing a place someone flagged as out of date counts as checking it again.
    if old.status = 'toVerify' and new.status = 'toVerify' then
      new.status := 'active';
    end if;
  end if;
  return new;
end
$$;

create trigger spots_touch before update on public.spots
for each row execute function public.touch_spot();

-- Moderators confirm a place is real and up to date.
create or replace function public.verify_spot(s uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.spots set verified_at = now(), verified_by = auth.uid(),
    status = case when status = 'toVerify' then 'active' else status end
  where id = s and public.is_community_moderator(community_id);
  if not found then
    raise exception 'not a moderator of this community';
  end if;
end
$$;

-- ---------- collective challenges ----------

create table public.community_challenges (
  id uuid primary key default gen_random_uuid(),
  community_id text not null references public.communities (id) on delete cascade,
  -- A starter template (src/data/community-challenges.ts) or free text.
  template text,
  title text not null check (char_length(title) between 3 and 80),
  body text not null default '' check (char_length(body) <= 400),
  category text check (category in ('discover', 'repair', 'gardens', 'swap', 'events', 'reports', 'moments')),
  goal int not null check (goal between 1 and 1000),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- One contribution to a challenge. A photo or a place is welcome but never required.
create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.community_challenges (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  spot_id uuid references public.spots (id) on delete set null,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index challenge_entries_challenge on public.challenge_entries (challenge_id);

create or replace function public.challenge_open(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.community_challenges x
    where x.id = c and now() between x.starts_at and x.ends_at and public.is_community_member(x.community_id)
  )
$$;

-- ---------- blocking ----------

create table public.blocks (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id),
  check (user_id <> blocked_id)
);

-- ---------- row level security ----------

alter table public.communities enable row level security;
alter table public.community_codes enable row level security;
alter table public.community_members enable row level security;
alter table public.spots enable row level security;
alter table public.spot_saves enable row level security;
alter table public.spot_reactions enable row level security;
alter table public.spot_comments enable row level security;
alter table public.spot_going enable row level security;
alter table public.spot_flags enable row level security;
alter table public.community_challenges enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.blocks enable row level security;

-- Anyone can explore a community before joining: its name, area and who can see its content.
create policy "communities: read" on public.communities for select to authenticated using (true);

-- Members of private communities are visible to members only.
create policy "members: read" on public.community_members for select to authenticated
  using (public.community_is_public(community_id) or public.is_community_member(community_id));
create policy "members: leave" on public.community_members for delete to authenticated using (user_id = auth.uid());

create policy "spots: read" on public.spots for select to authenticated
  using (
    author_id = auth.uid()
    or public.is_community_moderator(community_id)
    or (not hidden and (public.is_community_member(community_id) or (visibility = 'public' and public.community_is_public(community_id))))
  );
create policy "spots: add as member" on public.spots for insert to authenticated
  with check (
    author_id = auth.uid() and public.is_community_member(community_id)
    and not hidden and verified_at is null and verified_by is null and status in ('active', 'done')
  );
create policy "spots: edit own or moderate" on public.spots for update to authenticated
  using (author_id = auth.uid() or public.is_community_moderator(community_id))
  with check (author_id = auth.uid() or public.is_community_moderator(community_id));
create policy "spots: delete own or moderate" on public.spots for delete to authenticated
  using (author_id = auth.uid() or public.is_community_moderator(community_id));

create policy "saves: own" on public.spot_saves for select to authenticated using (public.can_see_spot(spot_id));
create policy "saves: add own" on public.spot_saves for insert to authenticated with check (user_id = auth.uid() and public.can_see_spot(spot_id));
create policy "saves: remove own" on public.spot_saves for delete to authenticated using (user_id = auth.uid());

create policy "spot reactions: read" on public.spot_reactions for select to authenticated using (public.can_see_spot(spot_id));
create policy "spot reactions: add own" on public.spot_reactions for insert to authenticated with check (user_id = auth.uid() and public.can_see_spot(spot_id));
create policy "spot reactions: change own" on public.spot_reactions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "spot reactions: remove own" on public.spot_reactions for delete to authenticated using (user_id = auth.uid());

create policy "spot comments: read" on public.spot_comments for select to authenticated using (public.can_see_spot(spot_id));
create policy "spot comments: add own" on public.spot_comments for insert to authenticated with check (author_id = auth.uid() and public.can_see_spot(spot_id));
create policy "spot comments: delete own" on public.spot_comments for delete to authenticated using (author_id = auth.uid());

create policy "going: read" on public.spot_going for select to authenticated using (public.can_see_spot(spot_id));
create policy "going: add own" on public.spot_going for insert to authenticated with check (user_id = auth.uid() and public.can_see_spot(spot_id));
create policy "going: remove own" on public.spot_going for delete to authenticated using (user_id = auth.uid());

-- Flags are private to whoever made them and the community's moderators.
create policy "flags: read own or moderate" on public.spot_flags for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.spots p where p.id = spot_id and public.is_community_moderator(p.community_id)));
create policy "flags: add own" on public.spot_flags for insert to authenticated with check (user_id = auth.uid() and public.can_see_spot(spot_id));

create policy "challenges: read" on public.community_challenges for select to authenticated
  using (public.community_is_public(community_id) or public.is_community_member(community_id));
create policy "challenges: launch as member" on public.community_challenges for insert to authenticated
  with check (created_by = auth.uid() and public.is_community_member(community_id));
create policy "challenges: end own or moderate" on public.community_challenges for delete to authenticated
  using (created_by = auth.uid() or public.is_community_moderator(community_id));

create policy "entries: read" on public.challenge_entries for select to authenticated
  using (exists (select 1 from public.community_challenges x where x.id = challenge_id
    and (public.community_is_public(x.community_id) or public.is_community_member(x.community_id))));
create policy "entries: add own while open" on public.challenge_entries for insert to authenticated
  with check (user_id = auth.uid() and public.challenge_open(challenge_id) and (spot_id is null or public.can_see_spot(spot_id)));
create policy "entries: remove own" on public.challenge_entries for delete to authenticated using (user_id = auth.uid());

create policy "blocks: own" on public.blocks for select to authenticated using (user_id = auth.uid());
create policy "blocks: add own" on public.blocks for insert to authenticated with check (user_id = auth.uid());
create policy "blocks: remove own" on public.blocks for delete to authenticated using (user_id = auth.uid());

grant select on public.communities, public.community_members to authenticated;
grant delete on public.community_members to authenticated;
grant select, insert, delete on public.spots to authenticated;
-- Column grants: verification and hiding go through verify_spot() and moderators, never a plain update.
grant update (kind, category, title, body, photo, lat, lon, precise, address, status, starts_at, ends_at, family, visibility, hidden, updated_at)
  on public.spots to authenticated;
grant select, insert, delete on public.spot_saves, public.spot_going, public.spot_comments, public.blocks to authenticated;
grant select, insert, update, delete on public.spot_reactions to authenticated;
grant select, insert on public.spot_flags to authenticated;
grant select, insert, delete on public.community_challenges, public.challenge_entries to authenticated;
grant execute on function public.join_community(text, text), public.create_community(text, text, text, text, text, text, double precision, double precision, jsonb, text[]),
  public.community_invite(text), public.verify_spot(uuid) to authenticated;

-- ---------- the first community ----------

insert into public.communities (id, name, kind, description, area, visibility, center_lat, center_lon, bbox, map_id, comuni) values (
  'alto-vicentino', 'Alto Vicentino', 'territory',
  'From the Pasubio to the plain: Schio, Thiene and the valleys around them. Places worth discovering, things worth repairing, and what we want to fix together.',
  'Alto Vicentino · Provincia di Vicenza', 'public', 45.71, 11.44,
  '{"w": 11.3, "s": 45.63, "e": 11.58, "n": 45.79}', 'alto-vicentino',
  array['Arsiero', 'Breganze', 'Caltrano', 'Calvene', 'Carrè', 'Chiuppano', 'Cogollo del Cengio', 'Fara Vicentino', 'Laghi', 'Lugo di Vicenza',
    'Malo', 'Marano Vicentino', 'Monte di Malo', 'Montecchio Precalcino', 'Pedemonte', 'Piovene Rocchette', 'Posina', 'Salcedo',
    'San Vito di Leguzzano', 'Santorso', 'Sarcedo', 'Schio', 'Thiene', 'Tonezza del Cimone', 'Torrebelvicino', 'Valdastico',
    'Valli del Pasubio', 'Velo d''Astico', 'Villaverla', 'Zanè', 'Zugliano']
) on conflict (id) do nothing;

-- ---------- realtime ----------

alter publication supabase_realtime add table public.spots, public.spot_comments, public.spot_reactions, public.challenge_entries;
