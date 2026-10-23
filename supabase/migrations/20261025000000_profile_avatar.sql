-- The avatar catalog lives in src/data/avatars.ts. Keep the catalog and this constraint in sync.
alter table public.profiles add column avatar_id text
  check (avatar_id is null or avatar_id in ('leaf', 'sprout', 'tree', 'bug', 'drop', 'sun', 'bike', 'seed'));
