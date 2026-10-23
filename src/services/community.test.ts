import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ALTO_VICENTINO, challengeProgress, eventPhase, examplesFor, promptOf, type Spot } from "@/data/community";
import type { Post } from "@/data/types";
import { applyFilters, NO_FILTERS, parseQuery, searchSpots, weekendRange } from "@/services/community-search";
import { approximate, bboxAround, clusterPins, distanceKm, kmPerUnit, projector, tilesFor, tileZoom } from "@/services/geo";
import { rankOf, seedsFor, standings } from "@/services/leaderboard";
import { toPlaceHit } from "@/services/places";

const NOW = new Date(2026, 9, 23, 12).getTime(); // a Friday

function spot(p: Partial<Spot>): Spot {
  return {
    id: p.id ?? "s",
    communityId: "alto-vicentino",
    authorId: "a",
    kind: "discovery",
    category: "discover",
    title: "",
    body: "",
    precise: true,
    address: "",
    status: "active",
    family: false,
    visibility: "public",
    createdAt: NOW - 3600e3,
    updatedAt: NOW - 3600e3,
    saves: 0,
    going: 0,
    reactions: {},
    comments: [],
    lat: 45.713,
    lon: 11.359,
    ...p,
  };
}

const ctx = { now: NOW, friendIds: new Set(["friend"]), me: { lat: 45.713, lon: 11.359 } };

describe("geo", () => {
  it("projects like a web map: corners, round trip, real tiles", () => {
    const p = projector(ALTO_VICENTINO.bbox);
    assert.equal(p.w, 1000);
    const nw = p.toXY(45.79, 11.3);
    assert.deepEqual([Math.round(nw.x), Math.round(nw.y)], [0, 0]);
    const se = p.toXY(45.63, 11.58);
    assert.deepEqual([Math.round(se.x), Math.round(se.y)], [1000, p.h]);
    const back = p.toLatLon(p.toXY(45.71, 11.44).x, p.toXY(45.71, 11.44).y);
    assert.ok(Math.abs(back.lat - 45.71) < 1e-9 && Math.abs(back.lon - 11.44) < 1e-9);
    // Schio sits on the same OpenStreetMap tile every web map uses at zoom 14.
    const schio = p.toXY(45.713, 11.359);
    const [tile] = tilesFor(p, 14, { x0: schio.x, y0: schio.y, x1: schio.x, y1: schio.y });
    assert.equal(tile.key, "14/8708/5847");
    assert.ok(tile.left <= schio.x && schio.x < tile.left + tile.size && tile.top <= schio.y && schio.y < tile.top + tile.size);
    // The whole area at a low zoom is a handful of tiles; more points per unit means a closer zoom.
    assert.ok(tilesFor(p, 10, { x0: 0, y0: 0, x1: p.w, y1: p.h }).length <= 4);
    assert.ok(tileZoom(p, 4) > tileZoom(p, 1));
    assert.equal(tileZoom(p, 1e9), 18);
    // About 22 km across.
    assert.ok(Math.abs(kmPerUnit(p, 45.71) * 1000 - 21.8) < 0.5);
  });

  it("measures distance and blurs a spot to about 200 m", () => {
    const schio = { lat: 45.713, lon: 11.359 };
    const thiene = { lat: 45.708, lon: 11.478 };
    assert.ok(Math.abs(distanceKm(schio, thiene) - 9.3) < 0.3);
    const a = approximate({ lat: 45.71337, lon: 11.35912 });
    assert.ok(distanceKm(a, { lat: 45.71337, lon: 11.35912 }) < 0.2);
    assert.deepEqual(a, approximate({ lat: 45.7134, lon: 11.3594 }));
    const b = bboxAround(schio, 6);
    assert.ok(b.w < schio.lon && b.e > schio.lon && b.s < schio.lat && b.n > schio.lat);
  });

  it("clusters pins that would overlap, and keeps far ones apart", () => {
    const pins = [
      { id: "a", x: 10, y: 10 },
      { id: "b", x: 20, y: 14 },
      { id: "c", x: 200, y: 200 },
    ];
    const c = clusterPins(pins, 30, (p) => p.id);
    assert.equal(c.length, 2);
    assert.deepEqual(c[0].items.map((p) => p.id), ["a", "b"]);
    assert.equal(c[0].x, 15);
    assert.equal(clusterPins(pins, 5, (p) => p.id).length, 3);
  });
});

describe("map filters", () => {
  const spots = [
    spot({ id: "repair", kind: "useful", category: "repair", saves: 3 }),
    spot({ id: "past", kind: "event", category: "events", startsAt: NOW - 3 * 864e5 }),
    spot({ id: "next", kind: "event", category: "events", startsAt: NOW + 864e5, authorId: "friend" }),
    spot({ id: "open", kind: "report", category: "reports", createdAt: NOW - 30 * 864e5 }),
    spot({ id: "fixed", kind: "report", category: "reports", status: "resolved" }),
    spot({ id: "fam", family: true }),
    spot({ id: "famv", family: true, verifiedAt: NOW - 864e5, lat: 45.9, lon: 11.9 }),
    ...examplesFor(ALTO_VICENTINO, NOW),
  ];
  const ids = (f: Partial<typeof NO_FILTERS>) => applyFilters(spots, { ...NO_FILTERS, ...f }, ctx).map((s) => s.id);

  it("filters by layer, upcoming events, open reports and friends", () => {
    assert.deepEqual(ids({ categories: ["repair"], examples: false }), ["repair"]);
    assert.deepEqual(ids({ upcoming: true, examples: false }), ["next"]);
    assert.deepEqual(ids({ openReports: true, examples: false }), ["open"]);
    assert.deepEqual(ids({ friends: true }), ["next"]);
    assert.deepEqual(ids({ popular: true }), ["repair"]);
  });

  it("shows family-friendly only where verified, and new places from the last week", () => {
    assert.deepEqual(ids({ family: true }), ["famv"]);
    assert.ok(!ids({ fresh: true }).includes("open"));
  });

  it("filters by distance, and drops everything without your location", () => {
    assert.ok(!ids({ nearKm: 5 }).includes("famv"));
    assert.ok(ids({ nearKm: 5 }).includes("repair"));
    assert.deepEqual(applyFilters(spots, { ...NO_FILTERS, nearKm: 5 }, { ...ctx, me: null }), []);
  });

  it("hides examples when asked", () => {
    assert.ok(ids({}).some((id) => id.startsWith("example-")));
    assert.ok(!ids({ examples: false }).some((id) => id.startsWith("example-")));
  });
});

describe("search", () => {
  const text = (s: Spot) => `${s.title} ${s.body}`;
  const spots = [
    spot({ id: "bike", kind: "useful", category: "repair", title: "Ciclofficina popolare", body: "Ripara la tua bicicletta con i volontari" }),
    spot({ id: "cafe", kind: "useful", category: "repair", title: "Repair café", body: "Small appliances", lat: 45.9, lon: 11.9 }),
    spot({ id: "sat", kind: "event", category: "events", title: "Mercatino del riuso", startsAt: weekendRange(NOW).start + 10 * 3600e3 }),
    spot({ id: "later", kind: "event", category: "events", title: "Passeggiata", startsAt: NOW + 10 * 864e5 }),
    spot({ id: "park", title: "Parco nascosto" }),
  ];

  it("understands questions in Italian and English", () => {
    assert.deepEqual(parseQuery("Dove posso riparare una bicicletta?").categories, ["repair"]);
    assert.equal(parseQuery("Quali eventi ci sono questo weekend?").weekend, true);
    assert.equal(parseQuery("C'è un posto interessante vicino a me?").near, true);
    assert.deepEqual(parseQuery("Where can I fix a bike?").categories, ["repair"]);
  });

  it("ranks the bike workshop first for a bike repair", () => {
    assert.equal(searchSpots(spots, "Dove posso riparare una bicicletta?", ctx, text)[0].id, "bike");
  });

  it("finds this weekend's events only", () => {
    assert.deepEqual(searchSpots(spots, "Quali eventi ci sono questo weekend?", ctx, text).map((s) => s.id), ["sat"]);
  });

  it("finds nearby interesting places, and nothing for an empty query", () => {
    assert.deepEqual(searchSpots(spots, "posto interessante vicino a me", ctx, text).map((s) => s.id), ["park"]);
    assert.deepEqual(searchSpots(spots, "dove", ctx, text), []);
  });

  it("reads a real street or place from the OpenStreetMap geocoder", () => {
    const street = toPlaceHit({ geometry: { coordinates: [11.36, 45.71] }, properties: { osm_type: "W", osm_id: 1, street: "Via Pasubio", housenumber: "12", city: "Schio" } });
    assert.deepEqual(street, { id: "W1", name: "Via Pasubio 12", detail: "Schio", lat: 45.71, lon: 11.36 });
    const park = toPlaceHit({ geometry: { coordinates: [11.35, 45.72] }, properties: { osm_type: "N", osm_id: 2, name: "Parco Robinson", street: "Via Btg. Val Leogra", city: "Schio" } });
    assert.equal(park?.name, "Parco Robinson");
    assert.equal(park?.detail, "Via Btg. Val Leogra · Schio");
    const village = toPlaceHit({ geometry: { coordinates: [11.44, 45.67] }, properties: { street: "Via Pasubio", district: "Isola Vicentina", city: "Isola Vicentina" } });
    assert.equal(village?.detail, "Isola Vicentina");
    assert.equal(toPlaceHit({ geometry: { coordinates: [0, 0] }, properties: {} }), null);
  });
});

describe("community state", () => {
  it("knows when an event is coming, on, or over", () => {
    assert.equal(eventPhase({ startsAt: NOW + 3600e3 }, NOW), "upcoming");
    assert.equal(eventPhase({ startsAt: NOW - 3600e3 }, NOW), "ongoing");
    assert.equal(eventPhase({ startsAt: NOW - 2 * 864e5 }, NOW), "ended");
    assert.equal(eventPhase({ startsAt: NOW - 3 * 3600e3, endsAt: NOW - 3600e3 }, NOW), "ended");
    assert.equal(eventPhase({}, NOW), null);
  });

  it("counts a challenge's contributions and thanks its contributors", () => {
    const c = { id: "c", communityId: "x", title: "t", body: "", goal: 3, startsAt: NOW - 864e5, endsAt: NOW + 2.5 * 864e5, createdBy: "a" };
    const e = (id: string, userId: string, spotId?: string) => ({ id, challengeId: "c", userId, spotId, note: "", createdAt: NOW });
    const p = challengeProgress(c, [e("1", "a", "s1"), e("2", "b"), e("3", "a"), { ...e("4", "z"), challengeId: "other" }], NOW);
    assert.deepEqual({ count: p.count, people: p.people, places: p.places, done: p.done, open: p.open, daysLeft: p.daysLeft }, {
      count: 3,
      people: 2,
      places: 1,
      done: true,
      open: true,
      daysLeft: 3,
    });
    assert.deepEqual(p.contributors[0], { userId: "a", n: 2 });
  });

  it("rotates one daily prompt for everyone", () => {
    assert.equal(promptOf(NOW), promptOf(NOW + 3600e3));
    assert.notEqual(promptOf(NOW), promptOf(NOW + 864e5));
  });
});

describe("leaderboard", () => {
  const NOW_ = new Date(2026, 9, 23, 18).getTime();
  const post = (id: string, authorId: string, hoursAgo: number, p: Partial<Post> = {}): Post => ({
    id,
    authorId,
    action: "move",
    photo: "",
    proof: "",
    caption: "",
    place: "Schio",
    createdAt: NOW_ - hoursAgo * 3600e3,
    verifiedBy: [],
    reactions: {},
    comments: [],
    audience: "comune",
    ...p,
  });
  const posts = [
    post("a1", "ada", 2),
    post("a2", "ada", 30, { isDrop: true }),
    post("b1", "bo", 5),
    post("old", "bo", 24 * 8),
    post("demo", "ada", 1, { isDemo: true }),
    post("x1", "stranger", 1),
  ];

  it("ranks a group's members by this week's Seeds, members without proofs included", () => {
    const team = new Set(["me", "ada", "bo", "cy"]);
    const board = standings(posts, { me: "me", members: ["ada", "bo", "cy"], counts: (p) => team.has(p.authorId), now: NOW_ });
    assert.deepEqual(board.map((r) => r.userId), ["ada", "bo", "me", "cy"]);
    assert.equal(board[0].points, seedsFor(posts[0]) * 2 + 10);
    assert.equal(board[0].proofs, 2);
    assert.equal(board[1].proofs, 1);
    assert.ok(board[0].postedToday);
    const { rank, ahead } = rankOf(board);
    assert.equal(rank, 3);
    assert.equal(ahead?.userId, "bo");
  });

  it("lists only people who posted in a city, and you, with ties going to you", () => {
    const board = standings([post("m1", "me", 3), post("b1", "bo", 5)], { me: "me", counts: () => true, now: NOW_ });
    assert.deepEqual(board.map((r) => r.userId), ["me", "bo"]);
    assert.deepEqual(standings([], { me: "me", counts: () => true, now: NOW_ }).map((r) => r.userId), ["me"]);
  });
});
