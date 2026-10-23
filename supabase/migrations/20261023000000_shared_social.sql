-- BeGreen shared social layer: real profiles, one daily challenge per Comune,
-- shared posts with peer verification, and squads.
-- Every user signs in anonymously (Supabase "anonymous sign-ins" must be enabled),
-- so every request runs as the `authenticated` role and RLS decides what it can touch.

-- ---------- helpers ----------

create or replace function public.is_action(a text) returns boolean
language sql immutable as $$
  select a in ('move', 'sort', 'pickup', 'refill', 'plant', 'spot', 'plate', 'rewear', 'save', 'crew')
$$;

-- Mirrors `seeds` in src/data/actions.ts. Keep the two in sync.
create or replace function public.action_seeds(a text) returns int
language sql immutable as $$
  select case a
    when 'move' then 20 when 'sort' then 10 when 'pickup' then 25 when 'refill' then 10
    when 'plant' then 30 when 'spot' then 20 when 'plate' then 10 when 'rewear' then 15
    when 'save' then 10 when 'crew' then 40 else 0 end
$$;

-- ---------- places ----------

create table public.comuni (
  id text primary key,            -- GeoNames id of the Comune (admin3), e.g. "6542283" for Milano
  name text not null,
  province text,
  region text,
  lat double precision not null,
  lon double precision not null,
  created_at timestamptz not null default now()
);

-- ---------- people ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  handle text not null unique check (handle ~ '^[a-z0-9._]{2,24}$'),
  role text not null default 'student' check (role in ('student', 'teacher', 'association', 'comune')),
  comune_id text references public.comuni (id),
  created_at timestamptz not null default now()
);

-- ---------- the daily challenge ----------

-- One row per Comune per day. The first client of the day builds it from the
-- Comune's live data and inserts it with ON CONFLICT DO NOTHING; everyone else reads it.
create table public.challenges (
  id text primary key,
  comune_id text not null references public.comuni (id),
  day date not null,
  action text not null check (public.is_action(action)),
  title text not null,
  why text not null,
  metric text not null,
  sources text[] not null default '{}',
  data jsonb not null default '{}',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (comune_id, day),
  check (id = comune_id || ':' || day::text)
);

-- ---------- squads ----------

create table public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 60),
  kind text not null check (kind in ('class', 'association', 'comune', 'friends')),
  place text not null default '',
  comune_id text references public.comuni (id),
  code text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
  points int not null default 0,
  -- { title, action, goal, progress, endsAt }
  quest jsonb not null,
  monthly jsonb not null default '{}',
  month text not null default to_char(now(), 'YYYY-MM'),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.squad_members (
  squad_id uuid not null references public.squads (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create or replace function public.is_squad_member(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.squad_members where squad_id = s and user_id = auth.uid())
$$;

-- ---------- posts ----------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  comune_id text references public.comuni (id),
  challenge_id text references public.challenges (id),
  action text not null check (public.is_action(action)),
  photo text not null,   -- public Storage URL, or "asset:<action>" for the bundled demo capture
  proof text not null,
  caption text not null default '' check (char_length(caption) <= 180),
  place text not null default '' check (char_length(place) <= 80),
  audience text not null default 'comune' check (audience in ('comune', 'squad', 'public')),
  squad_id uuid references public.squads (id) on delete set null,
  created_at timestamptz not null default now(),
  check (audience <> 'squad' or squad_id is not null)
);

-- One proof per person per challenge: you can't do the Drop twice.
create unique index posts_one_per_challenge on public.posts (author_id, challenge_id) where challenge_id is not null;
create index posts_comune_created on public.posts (comune_id, created_at desc);
create index posts_author_created on public.posts (author_id, created_at desc);
create index posts_squad_created on public.posts (squad_id, created_at desc);

create table public.verifications (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_post on public.comments (post_id, created_at);

-- Squad totals are server-side so a client can't award itself points.
create or replace function public.bump_squad() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m text := to_char(now(), 'YYYY-MM');
begin
  if new.squad_id is null then
    return new;
  end if;
  update public.squads s set
    points = s.points + public.action_seeds(new.action) + (case when new.challenge_id is not null then 10 else 0 end),
    monthly = (case when s.month = m then s.monthly else '{}'::jsonb end)
      || jsonb_build_object(new.action, coalesce(((case when s.month = m then s.monthly end) ->> new.action)::int, 0) + 1),
    month = m,
    quest = case
      -- An expired quest rolls over to a fresh week with the same act.
      when (s.quest ->> 'endsAt')::timestamptz <= now() then
        s.quest || jsonb_build_object(
          'endsAt', to_jsonb(now() + interval '7 days'),
          'progress', case when s.quest ->> 'action' = new.action then 1 else 0 end)
      when s.quest ->> 'action' = new.action then
        jsonb_set(s.quest, '{progress}', to_jsonb(coalesce((s.quest ->> 'progress')::int, 0) + 1))
      else s.quest
    end
  where s.id = new.squad_id;
  return new;
end
$$;

create trigger posts_bump_squad after insert on public.posts
for each row execute function public.bump_squad();

-- ---------- row level security ----------

alter table public.comuni enable row level security;
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.posts enable row level security;
alter table public.verifications enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;

create policy "comuni: read" on public.comuni for select to authenticated using (true);
create policy "comuni: add" on public.comuni for insert to authenticated with check (true);

create policy "profiles: read" on public.profiles for select to authenticated using (true);
create policy "profiles: create own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles: edit own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "challenges: read" on public.challenges for select to authenticated using (true);
create policy "challenges: create" on public.challenges for insert to authenticated
  with check (created_by = auth.uid() and day between current_date - 1 and current_date + 1);

create policy "squads: read" on public.squads for select to authenticated using (true);
create policy "squads: create" on public.squads for insert to authenticated
  with check (created_by = auth.uid() and points = 0 and monthly = '{}'::jsonb and coalesce((quest ->> 'progress')::int, 0) = 0);

create policy "members: read" on public.squad_members for select to authenticated using (true);
create policy "members: join" on public.squad_members for insert to authenticated with check (user_id = auth.uid());
create policy "members: leave" on public.squad_members for delete to authenticated using (user_id = auth.uid());

create policy "posts: read" on public.posts for select to authenticated
  using (audience <> 'squad' or author_id = auth.uid() or public.is_squad_member(squad_id));
create policy "posts: create own" on public.posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and (squad_id is null or public.is_squad_member(squad_id))
    and (challenge_id is null or exists (
      select 1 from public.challenges c where c.id = challenge_id and c.action = posts.action
    ))
  );
create policy "posts: delete own" on public.posts for delete to authenticated using (author_id = auth.uid());

create policy "verifications: read" on public.verifications for select to authenticated using (true);
create policy "verifications: verify others" on public.verifications for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

create policy "reactions: read" on public.reactions for select to authenticated using (true);
create policy "reactions: add own" on public.reactions for insert to authenticated with check (user_id = auth.uid());
create policy "reactions: change own" on public.reactions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reactions: remove own" on public.reactions for delete to authenticated using (user_id = auth.uid());

create policy "comments: read" on public.comments for select to authenticated using (true);
create policy "comments: add own" on public.comments for insert to authenticated with check (author_id = auth.uid());

grant select, insert on public.comuni, public.challenges to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.squads to authenticated;
grant select, insert, delete on public.squad_members, public.posts to authenticated;
grant select, insert on public.verifications, public.comments to authenticated;
grant select, insert, update, delete on public.reactions to authenticated;

-- ---------- media ----------

insert into storage.buckets (id, name, public) values ('proofs', 'proofs', true) on conflict (id) do nothing;

create policy "proofs: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- realtime ----------

alter publication supabase_realtime add table public.posts, public.verifications, public.comments, public.reactions;
