import type { BBox } from "@/data/community";

// Small, dependency-free geography for the community map. Pure, so it's unit tested.

export type LatLon = { lat: number; lon: number };

// Web Mercator, the projection of every web map: map units are world pixels scaled so the bbox is
// `width` units wide, so real map tiles line up with the pins exactly.
const mercX = (lon: number) => (lon + 180) / 360;
const mercY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};

export type Projector = ReturnType<typeof projector>;

export function projector(b: BBox, width = 1000) {
  const x0 = mercX(b.w);
  const y0 = mercY(b.n);
  // Map units for the whole world: tile maths below works in these.
  const world = width / (mercX(b.e) - x0);
  const height = Math.round((mercY(b.s) - y0) * world);
  return {
    w: width,
    h: height,
    world,
    origin: { x: x0 * world, y: y0 * world },
    toXY: (lat: number, lon: number) => ({ x: (mercX(lon) - x0) * world, y: (mercY(lat) - y0) * world }),
    toLatLon: (x: number, y: number): LatLon => {
      const n = Math.PI * (1 - 2 * (y / world + y0));
      return { lat: (Math.atan(Math.sinh(n)) * 180) / Math.PI, lon: (x / world + x0) * 360 - 180 };
    },
  };
}

// Kilometres per map unit at a latitude (Mercator stretches towards the poles).
export function kmPerUnit(p: Projector, lat: number) {
  return (40075.017 * Math.cos((lat * Math.PI) / 180)) / p.world;
}

export const TILE_MAX_ZOOM = 18;

// The tile zoom whose 256-point tiles best match `k` screen points per map unit.
export function tileZoom(p: Projector, k: number) {
  return Math.max(0, Math.min(TILE_MAX_ZOOM, Math.round(Math.log2((p.world * k) / 256))));
}

export type Tile = { key: string; z: number; x: number; y: number; left: number; top: number; size: number };

// The tiles covering a rectangle of the map (in map units) at zoom `z`, positioned in map units.
export function tilesFor(p: Projector, z: number, view: { x0: number; y0: number; x1: number; y1: number }): Tile[] {
  const n = 2 ** z;
  const size = p.world / n;
  const col = (x: number) => Math.min(n - 1, Math.max(0, Math.floor((x + p.origin.x) / size)));
  const row = (y: number) => Math.min(n - 1, Math.max(0, Math.floor((y + p.origin.y) / size)));
  const out: Tile[] = [];
  for (let y = row(view.y0); y <= row(view.y1); y++)
    for (let x = col(view.x0); x <= col(view.x1); x++) out.push({ key: `${z}/${x}/${y}`, z, x, y, left: x * size - p.origin.x, top: y * size - p.origin.y, size });
  return out;
}

export function distanceKm(a: LatLon, b: LatLon) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// About 200 m: enough to find the area, not the doorstep.
const APPROX = 0.002;
export function approximate(p: LatLon): LatLon {
  const r = (v: number) => Math.round(v / APPROX) * APPROX;
  return { lat: Number(r(p.lat).toFixed(4)), lon: Number(r(p.lon).toFixed(4)) };
}

// A square box of `km` around a point: the area a city or a group's map covers.
export function bboxAround(p: LatLon, km = 6): BBox {
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((p.lat * Math.PI) / 180));
  const r = (v: number) => Number(v.toFixed(4));
  return { w: r(p.lon - dLon), s: r(p.lat - dLat), e: r(p.lon + dLon), n: r(p.lat + dLat) };
}

export function inBBox(p: LatLon, b: BBox) {
  return p.lat >= b.s && p.lat <= b.n && p.lon >= b.w && p.lon <= b.e;
}

export type Cluster<T> = { key: string; x: number; y: number; items: T[] };

// Groups pins closer than `cell` screen points, so a busy map stays readable.
// Greedy: each pin joins the first cluster within reach, else starts its own.
export function clusterPins<T extends { x: number; y: number }>(pins: T[], cell: number, id: (p: T) => string): Cluster<T>[] {
  const out: Cluster<T>[] = [];
  for (const p of pins) {
    const c = out.find((q) => Math.abs(q.x - p.x) < cell && Math.abs(q.y - p.y) < cell);
    if (c) {
      c.items.push(p);
      c.x = c.items.reduce((a, q) => a + q.x, 0) / c.items.length;
      c.y = c.items.reduce((a, q) => a + q.y, 0) / c.items.length;
    } else out.push({ key: id(p), x: p.x, y: p.y, items: [p] });
  }
  return out;
}
