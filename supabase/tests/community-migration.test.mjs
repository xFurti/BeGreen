import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { after, before, test } from "node:test";

const db = new PGlite();
const dir = new URL("../migrations/", import.meta.url);
const migration = new URL("20261028000000_unified_groups.sql", dir);
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";
const S = "00000000-0000-0000-0000-000000000010";
const G = `squad:${S}`;
let legacyPost;

async function as(uid, sql) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false)`);
  try {
    return (await db.query(sql)).rows;
  } finally {
    await db.exec("reset role");
  }
}

before(async () => {
  await db.exec(`
    create role authenticated nologin;
    create role anon nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    create publication supabase_realtime;
    grant usage on schema public, auth, storage to authenticated;
    grant select, insert on storage.objects to authenticated;
  `);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql") && f < "20261028000000").sort()) {
    await db.exec(readFileSync(new URL(f, dir), "utf8"));
  }
  await db.exec(`
    insert into auth.users values ('${A}'), ('${B}'), ('${C}');
    insert into comuni (id, name, lat, lon) values ('town', 'Schio', 45.71, 11.36);
    insert into profiles (id, name, handle, comune_id) values
      ('${A}', 'Ada', 'ada', 'town'), ('${B}', 'Bo', 'bo', 'town'), ('${C}', 'Cleo', 'cleo', 'town');
  `);
  await as(A, `select create_community('existing', 'Existing group', 'friends', '', 'Schio', 'private', 45.71, 11.36, '{"w":11,"e":12,"s":45,"n":46}', array['Schio'])`);
  await db.exec(`update community_codes set code = 'SHARED42' where community_id = 'existing'`);
  await as(A, `insert into squads (id, name, kind, place, comune_id, code, quest) values
    ('${S}', 'Classe 4B', 'class', 'Schio', 'town', 'SHARED42',
    jsonb_build_object('title','Car-free week','action','move','goal',10,'progress',0,'endsAt',now() + interval '7 days'))`);
  await as(A, `insert into squad_members (squad_id) values ('${S}')`);
  await as(B, `insert into squad_members (squad_id) values ('${S}')`);
  [legacyPost] = await as(A, `insert into posts (author_id, comune_id, action, photo, proof, audience, squad_id)
    values ('${A}', 'town', 'move', 'https://project.supabase.co/storage/v1/object/public/proofs/${A}/old.jpg',
    'https://project.supabase.co/storage/v1/object/public/proofs/${A}/old.mp4', 'squad', '${S}') returning id`);
  await as(B, `insert into comments (post_id, text) values ('${legacyPost.id}', 'Keep this comment')`);
  await as(B, `insert into verifications (post_id) values ('${legacyPost.id}')`);
  await db.exec(`insert into storage.objects (bucket_id, name) values ('proofs', '${A}/old.jpg'), ('proofs', '${A}/old.mp4')`);
  if (existsSync(migration)) await db.exec(readFileSync(migration, "utf8"));
});

after(() => db.close());

test("migration preserves squads as groups, memberships, history, post IDs and interactions", async () => {
  const [group] = await as(A, `select id, name, kind, visibility from communities where id = '${G}'`);
  assert.deepEqual(group, { id: G, name: "Classe 4B", kind: "school", visibility: "private" });
  const members = await as(A, `select user_id, role from community_members where community_id = '${G}' order by user_id`);
  assert.deepEqual(members, [{ user_id: A, role: "moderator" }, { user_id: B, role: "member" }]);
  const [p] = await as(B, `select id, group_id, audience from posts where id = '${legacyPost.id}'`);
  assert.deepEqual(p, { id: legacyPost.id, group_id: G, audience: "squad" });
  assert.equal((await as(B, `select text from comments where post_id = '${legacyPost.id}'`))[0].text, "Keep this comment");
  assert.equal((await as(A, `select user_id from verifications where post_id = '${legacyPost.id}'`))[0].user_id, B);
  const [progress] = await as(A, `select points, quest->>'progress' as progress, months->to_char(now(), 'YYYY-MM')->>'move' as moves from group_progress where community_id = '${G}'`);
  assert.deepEqual(progress, { points: 20, progress: "1", moves: "1" });
  assert.equal((await db.query(`select count(*)::int as n from squads where id = '${S}'`)).rows[0].n, 1);
});

test("colliding legacy invitations require a destination and never silently join the wrong group", async () => {
  const candidates = await as(C, `select id from resolve_group_invite(' shared42 ') order by id`);
  assert.deepEqual(candidates.map((r) => r.id), ["existing", G]);
  assert.equal((await as(C, `select join_by_code('SHARED42') as id`))[0].id, null);
  assert.equal((await as(C, `select join_group_by_code('SHARED42', '${G}') as id`))[0].id, G);
  assert.equal((await as(C, `select count(*)::int as n from community_members where community_id = 'existing' and user_id = '${C}'`))[0].n, 0);
  await as(C, `delete from community_members where community_id = '${G}' and user_id = '${C}'`);
});

test("explicit group posts require membership and never become public or appear in another group", async () => {
  const insert = (uid, group = G) => `insert into posts (author_id, comune_id, action, photo, proof, audience, group_id)
    values ('${uid}', 'town', 'refill', 'storage:proofs/${uid}/new.jpg', 'storage:proofs/${uid}/new.mp4', 'group', '${group}') returning id`;
  await assert.rejects(() => as(C, insert(C)));
  await assert.rejects(() => as(A, insert(A, "alto-vicentino")));
  await assert.rejects(() => as(A, `insert into posts (author_id, action, photo, proof, audience) values ('${A}', 'refill', 'p', 'v', 'group')`));
  await assert.rejects(() => as(A, `insert into posts (author_id, action, photo, proof, audience, group_id) values ('${A}', 'refill', 'p', 'v', 'public', '${G}')`));
  const [post] = await as(A, insert(A));
  assert.equal((await as(B, `select id from posts where id = '${post.id}'`)).length, 1);
  assert.equal((await as(C, `select id from posts where id = '${post.id}'`)).length, 0);
  assert.equal((await as(B, `select id from posts where group_id = 'existing' and id = '${post.id}'`)).length, 0);
  const [progress] = await as(B, `select points, months->to_char(now(), 'YYYY-MM')->>'refill' as refills from group_progress where community_id = '${G}'`);
  assert.deepEqual(progress, { points: 30, refills: "1" });
  await assert.rejects(() => as(B, `update group_progress set points = 999 where community_id = '${G}'`));
});

test("private posts protect comments, reactions, verifications and stored media", async () => {
  assert.equal((await as(C, `select code from squads where id = '${S}'`)).length, 0);
  await assert.rejects(() => as(C, `insert into squad_members (squad_id) values ('${S}')`));
  assert.equal((await as(C, `select id from comments where post_id = '${legacyPost.id}'`)).length, 0);
  assert.equal((await as(C, `select post_id from verifications where post_id = '${legacyPost.id}'`)).length, 0);
  await assert.rejects(() => as(C, `insert into comments (post_id, text) values ('${legacyPost.id}', 'Not a member')`));
  await assert.rejects(() => as(C, `insert into reactions (post_id, emoji) values ('${legacyPost.id}', 'like')`));
  await assert.rejects(() => as(C, `insert into verifications (post_id) values ('${legacyPost.id}')`));
  assert.equal((await db.query(`select public from storage.buckets where id = 'proofs'`)).rows[0].public, false);
  assert.equal((await as(B, `select name from storage.objects where name = '${A}/old.jpg'`)).length, 1);
  assert.equal((await as(C, `select name from storage.objects where name = '${A}/old.jpg'`)).length, 0);
  await assert.rejects(() => as(C, `insert into posts (author_id, action, photo, proof) values ('${C}', 'move', 'storage:proofs/${A}/old.jpg', 'p')`));
});

test("new public groups accept explicit proofs but do not import every member's activity", async () => {
  await as(A, `select create_community('public-group', 'Public group', 'friends', '', 'Schio', 'public', 45.71, 11.36, '{"w":11,"e":12,"s":45,"n":46}', array['Schio'])`);
  await assert.rejects(() => as(C, `insert into posts (author_id, action, photo, proof, audience, group_id) values ('${C}', 'move', 'p', 'v', 'group', 'public-group')`));
  const [p] = await as(A, `insert into posts (author_id, action, photo, proof, audience, group_id) values ('${A}', 'move', 'p', 'v', 'group', 'public-group') returning id`);
  assert.equal((await as(C, `select id from posts where id = '${p.id}'`)).length, 1);
  assert.equal((await as(C, `select points from group_progress where community_id = 'public-group'`))[0].points, 20);
  await as(A, `insert into posts (author_id, action, photo, proof, audience) values ('${A}', 'move', 'p', 'v', 'public')`);
  assert.equal((await as(C, `select points from group_progress where community_id = 'public-group'`))[0].points, 20);
});

test("leaving a migrated group revokes legacy access without deleting the author's proof", async () => {
  await as(B, `delete from community_members where community_id = '${G}' and user_id = '${B}'`);
  assert.equal((await as(B, `select id from posts where id = '${legacyPost.id}'`)).length, 0);
  assert.equal((await as(B, `select name from storage.objects where name = '${A}/old.jpg'`)).length, 0);
  assert.equal((await as(A, `select id from posts where id = '${legacyPost.id}'`)).length, 1);
});
