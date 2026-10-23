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
  assert.deepEqual((await as(A, `update profiles set badge_id = 'spotter' where id = '${A}' returning badge_id`))[0], { badge_id: "spotter" });
  await rejects(A, `update profiles set badge_id = 'legend' where id = '${A}'`);
  assert.equal((await as(A, `update profiles set badge_id = null where id = '${A}' returning badge_id`))[0].badge_id, null);
  assert.equal((await as(B, `update profiles set badge_id = 'spotter' where id = '${A}' returning id`)).length, 0);
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

test("challenge reward survives a database round trip and is credited once to the squad", async () => {
  for (const [action, base] of [["refill", 10], ["sort", 10], ["move", 20]]) {
    const comune = `reward-${action}`;
    const challengeId = `${comune}:${day}`;
    await as(A, `insert into comuni (id, name, lat, lon) values ('${comune}', 'Reward test', 45, 9)`);
    await as(A, `insert into challenges (id, comune_id, day, action, title, why, metric) values ('${challengeId}', '${comune}', '${day}', '${action}', 't', 'w', 'm')`);
    const [s] = await as(A, `insert into squads (name, kind, comune_id, code, quest) values ('Reward test', 'class', '${comune}', '${action.toUpperCase()}10', jsonb_build_object('title','Test','action','${action}','goal',10,'progress',0,'endsAt',now() + interval '7 days')) returning id`);
    await as(A, `insert into squad_members (squad_id) values ('${s.id}')`);
    const [p] = await as(A, `insert into posts (author_id, comune_id, challenge_id, action, photo, proof, audience, squad_id) values ('${A}', '${comune}', '${challengeId}', '${action}', 'p', 'v', 'squad', '${s.id}') returning id`);
    assert.equal((await as(A, `select challenge_id from posts where id = '${p.id}'`))[0].challenge_id, challengeId);
    assert.equal((await as(A, `select points from squads where id = '${s.id}'`))[0].points, base + 10);
    await rejects(A, `insert into posts (author_id, comune_id, challenge_id, action, photo, proof, audience, squad_id) values ('${A}', '${comune}', '${challengeId}', '${action}', 'p', 'v', 'squad', '${s.id}')`);
    assert.equal((await as(A, `select points from squads where id = '${s.id}'`))[0].points, base + 10);
    await as(A, `insert into posts (author_id, comune_id, action, photo, proof, audience, squad_id) values ('${A}', '${comune}', '${action}', 'p', 'v', 'squad', '${s.id}')`);
    assert.equal((await as(A, `select points from squads where id = '${s.id}'`))[0].points, base * 2 + 10);
  }
});

test("community: explore before joining, members add places, private stays private", async () => {
  const C = "00000000-0000-0000-0000-00000000000c";
  await db.exec(`insert into auth.users values ('${C}') on conflict do nothing`);
  await as(C, `insert into profiles (id, name, handle) values ('${C}', 'Cleo', 'cleo')`);

  // Anyone can read the community before joining; nobody can just insert a membership.
  assert.equal((await as(A, `select name from communities where id = 'alto-vicentino'`))[0].name, "Alto Vicentino");
  await rejects(A, `insert into community_members (community_id, user_id) values ('alto-vicentino', '${A}')`);
  const spot = `insert into spots (community_id, kind, category, title, lat, lon) values ('alto-vicentino', 'useful', 'repair', 'Ciclofficina', 45.71, 11.36) returning id`;
  await rejects(A, spot);

  assert.equal((await as(A, `select join_community('alto-vicentino') as ok`))[0].ok, true);
  assert.equal((await as(B, `select join_community('alto-vicentino') as ok`))[0].ok, true);
  const [s] = await as(A, spot);
  // Verification and hiding are not the author's to set.
  await rejects(A, `insert into spots (community_id, kind, category, title, verified_at) values ('alto-vicentino', 'discovery', 'discover', 'x', now())`);
  await rejects(A, `update spots set verified_at = now() where id = '${s.id}'`);
  await rejects(A, `select verify_spot('${s.id}')`);
  assert.equal((await as(B, `update spots set title = 'mine now' where id = '${s.id}' returning id`)).length, 0);
  // Events need a date; a place is optional only as a whole.
  await rejects(A, `insert into spots (community_id, kind, category, title) values ('alto-vicentino', 'event', 'events', 'Pulizia')`);
  await rejects(A, `insert into spots (community_id, kind, category, title, lat) values ('alto-vicentino', 'moment', 'moments', 'Hi', 45.7)`);

  // Saves, reactions and RSVPs are your own.
  await as(B, `insert into spot_saves (spot_id) values ('${s.id}')`);
  await rejects(B, `insert into spot_saves (spot_id, user_id) values ('${s.id}', '${A}')`);
  await as(B, `insert into spot_reactions (spot_id, user_id, emoji) values ('${s.id}', '${B}', '💚')`);
  await as(B, `insert into spot_comments (spot_id, text) values ('${s.id}', 'Open on Saturdays?')`);

  // Two people say it's out of date → to verify; the author's edit clears it.
  await as(B, `insert into spot_flags (spot_id, reason, note) values ('${s.id}', 'outdated', 'closed on Saturdays now')`);
  assert.equal((await as(A, `select status from spots where id = '${s.id}'`))[0].status, "active");
  assert.equal((await as(A, `select reason from spot_flags where spot_id = '${s.id}'`)).length, 0);
  await as(C, `select join_community('alto-vicentino')`);
  await as(C, `insert into spot_flags (spot_id, reason) values ('${s.id}', 'wrong')`);
  await as(C, `insert into spot_flags (spot_id, reason) values ('${s.id}', 'outdated')`);
  assert.equal((await as(A, `select status from spots where id = '${s.id}'`))[0].status, "toVerify");
  await as(A, `update spots set address = 'Via Pasubio 12, Schio', status = 'toVerify' where id = '${s.id}'`);
  assert.equal((await as(A, `select status from spots where id = '${s.id}'`))[0].status, "active");

  // A report two people say is fixed becomes resolved.
  const [r] = await as(A, `insert into spots (community_id, kind, category, title, lat, lon) values ('alto-vicentino', 'report', 'reports', 'Rifiuti abbandonati', 45.7, 11.4) returning id`);
  await as(B, `insert into spot_flags (spot_id, reason) values ('${r.id}', 'resolved')`);
  await as(C, `insert into spot_flags (spot_id, reason) values ('${r.id}', 'resolved')`);
  assert.equal((await as(A, `select status from spots where id = '${r.id}'`))[0].status, "resolved");

  // Three inappropriate flags hide a place from everyone but its author.
  const [bad] = await as(B, `insert into spots (community_id, kind, category, title) values ('alto-vicentino', 'moment', 'moments', 'Meh') returning id`);
  for (const u of [A, C]) await as(u, `insert into spot_flags (spot_id, reason) values ('${bad.id}', 'inappropriate')`);
  assert.equal((await as(A, `select id from spots where id = '${bad.id}'`)).length, 1);
  await db.exec(`insert into auth.users values ('00000000-0000-0000-0000-00000000000d') on conflict do nothing`);
  const D = "00000000-0000-0000-0000-00000000000d";
  await as(D, `insert into profiles (id, name, handle) values ('${D}', 'Dario', 'dario')`);
  await as(D, `select join_community('alto-vicentino')`);
  await as(D, `insert into spot_flags (spot_id, reason) values ('${bad.id}', 'inappropriate')`);
  assert.equal((await as(A, `select id from spots where id = '${bad.id}'`)).length, 0);
  assert.equal((await as(B, `select id from spots where id = '${bad.id}'`)).length, 1);

  // A moderator verifies.
  await db.exec(`update community_members set role = 'moderator' where community_id = 'alto-vicentino' and user_id = '${C}'`);
  await as(C, `select verify_spot('${s.id}')`);
  assert.ok((await as(B, `select verified_at from spots where id = '${s.id}'`))[0].verified_at);

  // Proofs can point to a place.
  await as(B, `insert into posts (author_id, action, photo, proof, spot_id) values ('${B}', 'rewear', 'p', 'v', '${s.id}')`);

  // A private community: name visible, content and members only after joining with the code.
  const [{ code }] = await as(
    A,
    `select create_community('classe-4b-schio', 'Classe 4B', 'school', 'Our class', 'Schio', 'private', 45.71, 11.36, '{"w":11.3,"s":45.6,"e":11.4,"n":45.8}', '{Schio}') as code`,
  );
  assert.match(code, /^[A-Z0-9]{6}$/);
  await as(A, `insert into spots (community_id, kind, category, title, lat, lon) values ('classe-4b-schio', 'discovery', 'discover', 'Cortile', 45.71, 11.36)`);
  assert.equal((await as(B, `select name from communities where id = 'classe-4b-schio'`)).length, 1);
  assert.equal((await as(B, `select id from spots where community_id = 'classe-4b-schio'`)).length, 0);
  assert.equal((await as(B, `select user_id from community_members where community_id = 'classe-4b-schio'`)).length, 0);
  await rejects(B, `select code from community_codes`);
  assert.equal((await as(B, `select community_invite('classe-4b-schio') as c`))[0].c, null);
  assert.equal((await as(B, `select join_community('classe-4b-schio', 'WRONG1') as ok`))[0].ok, false);
  assert.equal((await as(B, `select join_community('classe-4b-schio', '${code.toLowerCase()}') as ok`))[0].ok, true);
  assert.equal((await as(B, `select id from spots where community_id = 'classe-4b-schio'`)).length, 1);
  assert.equal((await as(A, `select community_invite('classe-4b-schio') as c`))[0].c, code);
});

test("groups: every group has a code, any member shares it, the code alone joins", async () => {
  // A public group of friends still gets a code; cities don't need one.
  const [{ code }] = await as(
    A,
    `select create_community('amici-schio-x1y', 'Amici di Schio', 'friends', '', 'Schio', 'public', 45.71, 11.36, '{"w":11.3,"s":45.6,"e":11.4,"n":45.8}', '{Schio}') as code`,
  );
  assert.match(code, /^[A-Z0-9]{6}$/);
  assert.equal(
    (await as(A, `select create_community('comune-3165185', 'Verona', 'territory', '', 'Verona', 'public', 45.44, 10.99, '{"w":10.9,"s":45.4,"e":11.1,"n":45.5}', '{Verona}') as code`))[0].code,
    null,
  );
  await rejects(A, `select create_community('club-x', 'Club', 'club', '', '', 'public', 45.7, 11.3, '{}', '{}')`);

  // Unknown codes open nothing; the right one, in any case and with spaces, joins.
  assert.equal((await as(B, `select community_invite('amici-schio-x1y') as c`))[0].c, null);
  assert.equal((await as(B, `select join_by_code('NOPE00') as id`))[0].id, null);
  assert.equal((await as(B, `select join_by_code(' ${code.toLowerCase()} ') as id`))[0].id, "amici-schio-x1y");
  assert.equal((await as(B, `select role from community_members where community_id = 'amici-schio-x1y' and user_id = '${B}'`))[0].role, "member");
  // Now B can invite others too; joining twice is harmless.
  assert.equal((await as(B, `select community_invite('amici-schio-x1y') as c`))[0].c, code);
  assert.equal((await as(B, `select join_by_code('${code}') as id`))[0].id, "amici-schio-x1y");
  await rejects(B, `select code from community_codes`);
});

test("community challenges: members launch them, contributions only while open", async () => {
  const [x] = await as(
    A,
    `insert into community_challenges (community_id, template, title, goal, ends_at) values ('alto-vicentino', 'fivePlaces', 'Five places', 5, now() + interval '14 days') returning id`,
  );
  const outsider = "00000000-0000-0000-0000-0000000000ee";
  await db.exec(`insert into auth.users values ('${outsider}') on conflict do nothing`);
  await as(outsider, `insert into profiles (id, name, handle) values ('${outsider}', 'Eve', 'eve')`);
  await rejects(outsider, `insert into community_challenges (community_id, title, goal, ends_at) values ('alto-vicentino', 'Nope', 3, now() + interval '1 day')`);
  await rejects(outsider, `insert into challenge_entries (challenge_id) values ('${x.id}')`);
  await as(B, `insert into challenge_entries (challenge_id, note) values ('${x.id}', 'Found the old mill')`);
  await rejects(B, `insert into challenge_entries (challenge_id, user_id) values ('${x.id}', '${A}')`);
  assert.equal((await as(outsider, `select id from challenge_entries where challenge_id = '${x.id}'`)).length, 1);

  const [old] = await as(
    A,
    `insert into community_challenges (community_id, title, goal, starts_at, ends_at) values ('alto-vicentino', 'Old one', 3, now() - interval '10 days', now() - interval '1 day') returning id`,
  );
  await rejects(B, `insert into challenge_entries (challenge_id) values ('${old.id}')`);
});

test("blocks: your list is yours alone", async () => {
  await as(A, `insert into blocks (blocked_id) values ('${B}')`);
  await rejects(A, `insert into blocks (blocked_id) values ('${A}')`);
  assert.equal((await as(B, `select * from blocks`)).length, 0);
  assert.equal((await as(A, `select blocked_id from blocks`))[0].blocked_id, B);
});
