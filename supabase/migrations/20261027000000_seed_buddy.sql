-- Your seed (issue #13): the species you plant at onboarding grows into your avatar.
-- The list mirrors SEED_IDS in src/data/seeds.ts. Keep the two in sync.
-- Null means "never picked": the app derives a stable one from the id.
alter table public.profiles add column seed text
  check (seed is null or seed in ('sunflower', 'oak', 'lavender', 'poppy', 'tomato', 'fir'));

-- Lifetime Seeds per person, so friends see how far your plant has grown. The stage is derived
-- from this total, never written by the app. Mirrors seedsOf in src/store/app-store.ts:
-- the act's seeds, +10 for the daily challenge, +2 for every proof you verified.
-- Security definer so squad-only proofs count too; it only ever returns the total.
create or replace function public.profile_seeds(ids uuid[]) returns table (id uuid, seeds int)
language sql stable security definer set search_path = public as $$
  select p.id,
    (coalesce((select sum(public.action_seeds(x.action) + case when x.challenge_id is not null then 10 else 0 end)
               from public.posts x where x.author_id = p.id), 0)
     + 2 * (select count(*) from public.verifications v where v.user_id = p.id))::int
  from public.profiles p
  where p.id = any(ids[1:200])
$$;
revoke all on function public.profile_seeds(uuid[]) from public, anon;
grant execute on function public.profile_seeds(uuid[]) to authenticated;

-- Which of these handles are still free. Onboarding asks while you type, before there is a
-- session, so anon may call it. Profiles are public to signed-in users already; this reveals
-- no more than "taken or not" for at most 12 well-formed handles per call.
create or replace function public.free_handles(candidates text[]) returns setof text
language sql stable security definer set search_path = public as $$
  select c from unnest(candidates[1:12]) as c
  where c ~ '^[a-z0-9._]{2,24}$'
    and not exists (select 1 from public.profiles p where p.handle = c)
$$;
revoke all on function public.free_handles(text[]) from public;
grant execute on function public.free_handles(text[]) to anon, authenticated;
