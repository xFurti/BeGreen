-- Two kinds of community: cities (territories anyone can find and join) and personal groups
-- (friends, classes, associations) that people join with an invite code. Every group gets a code,
-- public or private, any member can share it, and the code alone is enough to join.

alter table public.communities drop constraint communities_kind_check;
alter table public.communities add constraint communities_kind_check
  check (kind in ('territory', 'school', 'association', 'neighbourhood', 'friends'));

-- Groups created before this migration get their code now.
insert into public.community_codes (community_id, code)
select id, upper(substr(md5(random()::text || id), 1, 6)) from public.communities where kind <> 'territory'
on conflict do nothing;

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
  if p_kind <> 'territory' or p_visibility = 'private' then
    invite := upper(substr(md5(random()::text || c), 1, 6));
    insert into public.community_codes (community_id, code) values (c, invite);
  end if;
  return invite;
end
$$;

-- The invite code, for any member to share with friends.
create or replace function public.community_invite(c text) returns text
language sql stable security definer set search_path = public as $$
  select code from public.community_codes where community_id = c and public.is_community_member(c)
$$;

-- Join with a code alone: returns the community it opens, or null for an unknown code.
create or replace function public.join_by_code(invite text) returns text
language plpgsql security definer set search_path = public as $$
declare
  c text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select community_id into c from public.community_codes where code = upper(trim(coalesce(invite, '')));
  if c is null then
    return null;
  end if;
  insert into public.community_members (community_id, user_id) values (c, auth.uid()) on conflict do nothing;
  return c;
end
$$;

grant execute on function public.join_by_code(text) to authenticated;
