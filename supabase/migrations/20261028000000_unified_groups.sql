create table public.squad_community_links (
  squad_id uuid primary key references public.squads(id),
  community_id text not null unique references public.communities(id)
);

create table public.group_progress (
  community_id text primary key references public.communities(id) on delete cascade,
  points int not null default 0,
  quest jsonb,
  months jsonb not null default '{}'
);

alter table public.squad_community_links enable row level security;
alter table public.group_progress enable row level security;
create policy "group links: read" on public.squad_community_links for select to authenticated using (true);
create policy "group progress: read" on public.group_progress for select to authenticated
  using (public.community_is_public(community_id) or public.is_community_member(community_id));
grant select on public.squad_community_links, public.group_progress to authenticated;

create function public.migrate_squad_group(s uuid, new_group boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare
  q public.squads;
  c public.comuni;
  gid text := 'squad:' || s::text;
  invite text;
begin
  select * into q from public.squads where id = s;
  if not found then return null; end if;
  if exists (select 1 from public.squad_community_links where squad_id = s) then return gid; end if;
  select * into c from public.comuni where id = q.comune_id;
  insert into public.communities
    (id, name, kind, area, visibility, center_lat, center_lon, bbox, comuni, created_by, created_at)
  values
    (gid, q.name, case q.kind when 'class' then 'school' when 'comune' then 'neighbourhood' else q.kind end,
     q.place, 'private', coalesce(c.lat, 0), coalesce(c.lon, 0),
     jsonb_build_object('w',coalesce(c.lon,0)-0.04,'e',coalesce(c.lon,0)+0.04,'s',coalesce(c.lat,0)-0.04,'n',coalesce(c.lat,0)+0.04),
     case when c.name is null then '{}'::text[] else array[c.name] end, q.created_by, q.created_at)
  on conflict (id) do nothing;
  insert into public.squad_community_links values (s, gid) on conflict do nothing;
  insert into public.community_members (community_id, user_id, role, joined_at)
    select gid, user_id, case when user_id = q.created_by then 'moderator' else 'member' end, joined_at
    from public.squad_members where squad_id = s
  on conflict do nothing;
  if new_group then
    insert into public.community_members (community_id, user_id, role)
      values (gid, q.created_by, 'moderator') on conflict do nothing;
  end if;
  invite := q.code;
  while exists (select 1 from public.community_codes where code = invite and community_id <> gid) loop
    invite := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end loop;
  insert into public.community_codes values (gid, invite) on conflict (community_id) do nothing;
  insert into public.group_progress (community_id, points, quest, months)
    values (gid, q.points, q.quest, jsonb_build_object(q.month, q.monthly))
  on conflict (community_id) do update set points = excluded.points, quest = excluded.quest, months = excluded.months;
  return gid;
end
$$;
revoke all on function public.migrate_squad_group(uuid, boolean) from public, anon, authenticated;

select public.migrate_squad_group(id) from public.squads;

create function public.new_squad_group() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.migrate_squad_group(new.id, true);
  return new;
end
$$;
create trigger squads_group after insert on public.squads for each row execute function public.new_squad_group();

create function public.new_group_progress() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind <> 'territory' then
    insert into public.group_progress (community_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end
$$;
create trigger communities_progress after insert on public.communities for each row execute function public.new_group_progress();
insert into public.group_progress (community_id)
  select id from public.communities where kind <> 'territory' on conflict do nothing;

alter table public.posts add column group_id text references public.communities(id);
alter table public.posts drop constraint posts_audience_check;
alter table public.posts add constraint posts_audience_check check (audience in ('comune', 'squad', 'public', 'group'));
alter table public.posts add constraint posts_group_required check (audience <> 'group' or group_id is not null);
update public.posts p set group_id = l.community_id from public.squad_community_links l where l.squad_id = p.squad_id;
create index posts_group_created on public.posts (group_id, created_at desc);

create function public.proof_object_path(media text) returns text
language sql immutable set search_path = public as $$
  select case
    when media like 'storage:proofs/%' then substr(media, 16)
    when media like '%/storage/v1/object/public/proofs/%' then split_part(media, '/storage/v1/object/public/proofs/', 2)
    else null
  end
$$;

create function public.prepare_group_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.squad_id is not null then
    select community_id into new.group_id from public.squad_community_links where squad_id = new.squad_id;
  end if;
  if new.group_id is not null and (
    not public.is_community_member(new.group_id)
    or not exists (select 1 from public.communities where id = new.group_id and kind <> 'territory')
  ) then raise exception 'Group membership required'; end if;
  if new.audience in ('squad', 'group') and new.group_id is null then
    raise exception 'Choose a group';
  end if;
  if new.group_id is not null and new.squad_id is null and new.audience <> 'group' then
    raise exception 'A group proof needs a group audience';
  end if;
  if new.group_id is not null and new.spot_id is not null
    and not exists (select 1 from public.spots where id = new.spot_id and community_id = new.group_id)
  then raise exception 'The place belongs to another community'; end if;
  if new.spot_id is not null and not public.can_see_spot(new.spot_id) then
    raise exception 'Place not accessible';
  end if;
  if exists (
    select 1 from unnest(array[new.photo, new.proof]) media
    where public.proof_object_path(media) is not null
      and split_part(public.proof_object_path(media), '/', 1) <> new.author_id::text
  ) then raise exception 'Media must belong to the author'; end if;
  return new;
end
$$;
create trigger posts_group_before before insert on public.posts for each row execute function public.prepare_group_post();

create function public.can_read_post(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.posts where id = p and (
      author_id = auth.uid()
      or (audience in ('comune', 'public') and (spot_id is null or public.can_see_spot(spot_id)))
      or (audience in ('squad', 'group') and (
        public.is_community_member(group_id) or public.community_is_public(group_id)
      ))
    )
  )
$$;
alter policy "posts: read" on public.posts using (
  author_id = auth.uid()
  or (audience in ('comune', 'public') and (spot_id is null or public.can_see_spot(spot_id)))
  or (audience in ('squad', 'group') and (public.is_community_member(group_id) or public.community_is_public(group_id)))
);
alter policy "posts: create own" on public.posts with check (
  author_id = auth.uid()
  and (group_id is null or public.is_community_member(group_id))
  and (challenge_id is null or exists (select 1 from public.challenges c where c.id = challenge_id and c.action = posts.action))
);
alter policy "comments: read" on public.comments using (public.can_read_post(post_id));
alter policy "comments: add own" on public.comments with check (author_id = auth.uid() and public.can_read_post(post_id));
alter policy "reactions: read" on public.reactions using (public.can_read_post(post_id));
alter policy "reactions: add own" on public.reactions with check (user_id = auth.uid() and public.can_read_post(post_id));
alter policy "reactions: change own" on public.reactions
  using (user_id = auth.uid() and public.can_read_post(post_id))
  with check (user_id = auth.uid() and public.can_read_post(post_id));
alter policy "verifications: read" on public.verifications using (public.can_read_post(post_id));
alter policy "verifications: verify others" on public.verifications with check (
  user_id = auth.uid() and public.can_read_post(post_id)
  and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
);

create function public.bump_group() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p public.posts;
  direction int := case when tg_op = 'DELETE' then -1 else 1 end;
  m text;
begin
  if tg_op = 'DELETE' then p := old; else p := new; end if;
  if p.group_id is null then return p; end if;
  m := to_char(p.created_at, 'YYYY-MM');
  update public.group_progress g set
    points = greatest(0, g.points + direction * (public.action_seeds(p.action) + case when p.challenge_id is null then 0 else 10 end)),
    months = jsonb_set(g.months, array[m], coalesce(g.months->m, '{}'::jsonb)
      || jsonb_build_object(p.action, greatest(0, coalesce((g.months->m->>p.action)::int, 0) + direction))),
    quest = case
      when g.quest is null then null
      when direction = 1 and (g.quest->>'endsAt')::timestamptz <= now() then
        g.quest || jsonb_build_object('endsAt', now() + interval '7 days', 'progress', case when g.quest->>'action' = p.action then 1 else 0 end)
      when g.quest->>'action' = p.action and p.created_at >= (g.quest->>'endsAt')::timestamptz - interval '7 days' then
        jsonb_set(g.quest, '{progress}', to_jsonb(greatest(0, coalesce((g.quest->>'progress')::int, 0) + direction)))
      else g.quest
    end
  where g.community_id = p.group_id;
  return p;
end
$$;
create trigger posts_bump_group after insert or delete on public.posts for each row execute function public.bump_group();

create function public.resolve_group_invite(invite text) returns table(id text, name text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name from public.communities c where auth.uid() is not null and c.kind <> 'territory'
    and (
      exists (select 1 from public.community_codes k where k.community_id = c.id and k.code = upper(trim(invite)))
      or exists (select 1 from public.squad_community_links l join public.squads s on s.id = l.squad_id
        where l.community_id = c.id and s.code = upper(trim(invite)))
    )
$$;

create function public.join_group_by_code(invite text, target text default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  ids text[];
  c text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select array_agg(id) into ids from public.resolve_group_invite(invite);
  if target is not null and target = any(ids) then c := target;
  elsif target is null and array_length(ids, 1) = 1 then c := ids[1];
  else return null;
  end if;
  insert into public.community_members (community_id, user_id) values (c, auth.uid()) on conflict do nothing;
  return c;
end
$$;

create or replace function public.join_by_code(invite text) returns text
language sql security definer set search_path = public as $$
  select public.join_group_by_code(invite)
$$;

create or replace function public.join_community(c text, invite text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.communities where id = c) then return false; end if;
  if not public.community_is_public(c)
    and not exists (select 1 from public.resolve_group_invite(invite) where id = c)
    and not exists (select 1 from public.community_codes where community_id = c and code = upper(trim(invite)))
  then return false; end if;
  insert into public.community_members (community_id, user_id) values (c, auth.uid()) on conflict do nothing;
  return true;
end
$$;

update storage.buckets set public = false where id = 'proofs';
create function public.validate_spot_media() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.proof_object_path(new.photo) is not null
    and split_part(public.proof_object_path(new.photo), '/', 1) <> new.author_id::text
  then raise exception 'Media must belong to the author'; end if;
  return new;
end
$$;
create trigger spots_media before insert or update of photo on public.spots for each row execute function public.validate_spot_media();
create policy "proofs: authorized read" on storage.objects for select to authenticated using (
  bucket_id = 'proofs' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.posts p where public.can_read_post(p.id)
      and name in (public.proof_object_path(p.photo), public.proof_object_path(p.proof)))
    or exists (select 1 from public.spots s where public.can_see_spot(s.id) and public.proof_object_path(s.photo) = name)
  )
);

revoke all on function public.resolve_group_invite(text), public.join_group_by_code(text, text) from public, anon;
grant execute on function public.resolve_group_invite(text), public.join_group_by_code(text, text) to authenticated;
alter policy "squads: read" on public.squads using (
  created_by = auth.uid() or exists (
    select 1 from public.squad_community_links l where l.squad_id = squads.id and public.is_community_member(l.community_id)
  )
);
alter policy "members: read" on public.squad_members using (
  user_id = auth.uid() or exists (
    select 1 from public.squad_community_links l where l.squad_id = squad_members.squad_id and public.is_community_member(l.community_id)
  )
);
alter policy "members: join" on public.squad_members with check (
  user_id = auth.uid() and exists (
    select 1 from public.squad_community_links l where l.squad_id = squad_members.squad_id and public.is_community_member(l.community_id)
  )
);
alter publication supabase_realtime add table public.community_members, public.group_progress;
