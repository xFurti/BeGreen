// Runs the migrations on an in-memory Postgres (PGlite) with minimal stand-ins for Supabase's
// auth, storage and realtime, then checks the rules that keep the shared feed honest.
import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, test } from "node:test";

const dir = new URL("../migrations/", import.meta.url);
const db = new PGlite();
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
let day;
let challenge;

before(async () => {
  await db.exec(`
    create role authenticated nologin;
    create role anon nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
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
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(f, dir), "utf8"));
  await db.exec(`insert into auth.users values ('${A}'), ('${B}')`);
  day = (await db.query("select current_date::text as d")).rows[0].d;
  challenge = `6542283:${day}`;
});

async function as(uid, sql) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try {
    return (await db.query(sql)).rows;
  } finally {
    await db.exec("reset role;");
  }
}
const rejects = (uid, sql) => assert.rejects(() => as(uid, sql));

test("profiles: own row only, unique handles", async () => {
  await as(A, `insert into comuni (id, name, lat, lon) values ('6542283', 'Milano', 45.46, 9.19) on conflict do nothing`);
  await as(B, `insert into comuni (id, name, lat, lon) values ('6542283', 'Milano', 45.46, 9.19) on conflict do nothing`);
  await as(A, `insert into profiles (id, name, handle, comune_id) values ('${A}', 'Ada', 'ada', '6542283')`);
  await rejects(B, `insert into profiles (id, name, handle) values ('${B}', 'Bo', 'ada')`);
  await rejects(B, `insert into profiles (id, name, handle) values ('${A}', 'X', 'xx')`);
  await as(B, `insert into profiles (id, name, handle, comune_id) values ('${B}', 'Bo', 'bo', '6542283')`);
  assert.equal((await as(B, `update profiles set name = 'hacked' where id = '${A}' returning id`)).length, 0);
});

test("challenges: one per Comune per day, the first one wins", async () => {
  const insert = (uid, action) =>
    as(
      uid,
      `insert into challenges (id, comune_id, day, action, title, why, metric) values ('${challenge}', '6542283', '${day}', '${action}', 't', 'w', 'm') on conflict (id) do nothing returning id`,
    );
  assert.equal((await insert(A, "move")).length, 1);
  assert.equal((await insert(B, "refill")).length, 0);
  assert.equal((await as(B, `select action from challenges where id = '${challenge}'`))[0].action, "move");
  await rejects(A, `insert into challenges (id, comune_id, day, action, title, why, metric) values ('x', '6542283', '${day}', 'move', 't', 'w', 'm')`);
  await rejects(
    A,
    `insert into challenges (id, comune_id, day, action, title, why, metric) values ('6542283:2030-01-01', '6542283', '2030-01-01', 'move', 't', 'w', 'm')`,
  );
});

test("posts: shared in the Comune, one challenge proof each, peers verify", async () => {
  const [p] = await as(
    A,
    `insert into posts (author_id, comune_id, challenge_id, action, photo, proof) values ('${A}', '6542283', '${challenge}', 'move', 'asset:move.photo.0', 'asset:move.proof') returning id`,
  );
  await rejects(A, `insert into posts (author_id, comune_id, challenge_id, action, photo, proof) values ('${A}', '6542283', '${challenge}', 'move', 'p', 'v')`);
  await rejects(B, `insert into posts (author_id, comune_id, challenge_id, action, photo, proof) values ('${B}', '6542283', '${challenge}', 'sort', 'p', 'v')`);
  await rejects(B, `insert into posts (author_id, action, photo, proof) values ('${A}', 'sort', 'p', 'v')`);
  assert.equal((await as(B, `select id from posts where comune_id = '6542283'`)).length, 1);

  await rejects(A, `insert into verifications (post_id, user_id) values ('${p.id}', '${A}')`);
  await as(B, `insert into verifications (post_id) values ('${p.id}')`);
  await rejects(B, `insert into verifications (post_id) values ('${p.id}')`);
  await rejects(B, `insert into verifications (post_id, user_id) values ('${p.id}', '${A}')`);

  const react = (e) =>
    as(B, `insert into reactions (post_id, user_id, emoji) values ('${p.id}', '${B}', '${e}') on conflict (post_id, user_id) do update set emoji = excluded.emoji`);
  await react("💚");
  await react("🔥");
  assert.equal((await as(A, `select emoji from reactions where post_id = '${p.id}'`))[0].emoji, "🔥");
  await as(B, `insert into comments (post_id, text) values ('${p.id}', 'nice')`);
});

test("squads: points come from the server, squad posts stay in the squad", async () => {
  const quest = `jsonb_build_object('title','Car-free week','action','move','goal',10,'progress',0,'endsAt', now() + interval '7 days')`;
  await rejects(A, `insert into squads (name, kind, code, points, quest) values ('Cheat', 'class', 'CHEAT10', 999, ${quest})`);
  const [s] = await as(A, `insert into squads (name, kind, comune_id, code, quest) values ('Classe 4B', 'class', '6542283', 'CLASSE10', ${quest}) returning id`);
  await as(A, `insert into squad_members (squad_id) values ('${s.id}')`);
  await rejects(B, `insert into posts (author_id, action, photo, proof, audience, squad_id) values ('${B}', 'move', 'p', 'v', 'squad', '${s.id}')`);
  await as(A, `insert into posts (author_id, comune_id, action, photo, proof, audience, squad_id) values ('${A}', '6542283', 'move', 'p', 'v', 'squad', '${s.id}')`);

  const [row] = await as(A, `select points, (quest->>'progress')::int as progress, (monthly->>'move')::int as move from squads where id = '${s.id}'`);
  assert.deepEqual(row, { points: 20, progress: 1, move: 1 });

  assert.equal((await as(B, `select id from posts where audience = 'squad'`)).length, 0);
  await as(B, `insert into squad_members (squad_id) select id from squads where code = 'CLASSE10'`);
  assert.equal((await as(B, `select id from posts where audience = 'squad'`)).length, 1);
  await rejects(B, `update squads set points = 99999 where id = '${s.id}'`);
});

test("storage: uploads only into your own folder of a public bucket", async () => {
  await rejects(B, `insert into storage.objects (bucket_id, name) values ('proofs', '${A}/x.jpg')`);
  await as(B, `insert into storage.objects (bucket_id, name) values ('proofs', '${B}/x.jpg')`);
  assert.equal((await db.query(`select public from storage.buckets where id = 'proofs'`)).rows[0].public, true);
});
