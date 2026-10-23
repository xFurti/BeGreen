-- The title a person chose to show next to their name. The client checks the requirement;
-- the database only checks it's one of the catalog (src/data/badges.ts). Keep the two in sync.
alter table public.profiles add column badge_id text
  check (badge_id is null or badge_id in ('first-proof', 'streak-7', 'car-free-5', 'spotter', 'verifier-10', 'goals-10'));
