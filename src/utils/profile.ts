import type { Post, Role } from "../data/types";

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student", teacher: "Teacher", association: "Association", comune: "Comune",
};

export function cleanProfile(name: string, handle: string, role: Role) {
  return { name: name.trim().slice(0, 50), handle: handle.trim().replace(/^@/, "").toLowerCase(), role };
}

export function validProfile(profile: ReturnType<typeof cleanProfile>) {
  return profile.name.length > 0 && /^[a-z0-9_]{2,24}$/.test(profile.handle);
}

// Keep the Monday-first calendar local to the device, including at month/year boundaries.
export function calendarMonth(date: Date, posts: Post[]) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const byDay = new Map<number, Post[]>();
  for (const post of [...posts].sort((a, b) => b.createdAt - a.createdAt)) {
    const d = new Date(post.createdAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      byDay.set(d.getDate(), [...(byDay.get(d.getDate()) ?? []), post]);
    }
  }
  const count = Math.ceil((lead + days) / 7) * 7;
  return { byDay, cells: Array.from({ length: count }, (_, i) => i >= lead && i < lead + days ? i - lead + 1 : null) };
}

export function hasLocation(post: Post): post is Post & { location: { lat: number; lon: number } } {
  const p = post.location;
  return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 85.0511 && Math.abs(p.lon) <= 180;
}

export type ProfileMapPin = { id: string; photo: Post["photo"]; latitude: number; longitude: number };
export type ProfileMapCamera = { latitude: number; longitude: number; zoom: number };

// These positions belong only to the demo, never to a proof with a private or missing area.
const DEMO_MAP_POSITIONS = [
  { latitude: 45.472, longitude: 9.181 },
  { latitude: 45.463, longitude: 9.199 },
  { latitude: 45.454, longitude: 9.178 },
  { latitude: 45.478, longitude: 9.203 },
];

export function profileMapPins(posts: Post[], demoPosts: Post[]): ProfileMapPin[] {
  const located = posts.filter(hasLocation).filter((post) => !post.id.startsWith("me-demo-"));
  if (located.length) return located.map((post) => ({
    id: post.id, photo: post.photo, latitude: post.location.lat, longitude: post.location.lon,
  }));
  return demoPosts.slice(0, DEMO_MAP_POSITIONS.length).map((post, i) => ({
    id: post.id, photo: post.photo, ...DEMO_MAP_POSITIONS[i],
  }));
}

export function profileMapCamera(pins: ProfileMapPin[]): ProfileMapCamera {
  if (!pins.length) return { latitude: 45.466, longitude: 9.19, zoom: 12 };
  const south = Math.min(...pins.map((pin) => pin.latitude));
  const north = Math.max(...pins.map((pin) => pin.latitude));
  const west = Math.min(...pins.map((pin) => pin.longitude));
  const east = Math.max(...pins.map((pin) => pin.longitude));
  const span = Math.max(north - south, east - west, 0.025);
  return { latitude: (south + north) / 2, longitude: (west + east) / 2, zoom: Math.max(2, Math.min(13, Math.log2(360 / span) - 1.5)) };
}

// Web Mercator pixels for a small, non-interactive OSM preview. Only visible tiles are requested.
export function mapPreview(lat: number, lon: number, width: number, height = 260, zoom = 12) {
  const world = 256 * 2 ** zoom;
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const sin = Math.sin(clamped * Math.PI / 180);
  const cx = (lon + 180) / 360 * world;
  const cy = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world;
  const left = cx - width / 2;
  const top = cy - height / 2;
  const tiles = [];
  const n = 2 ** zoom;
  for (let x = Math.floor(left / 256); x <= Math.floor((left + width - 1) / 256); x++) {
    for (let y = Math.floor(top / 256); y <= Math.floor((top + height - 1) / 256); y++) {
      if (y < 0 || y >= n) continue;
      tiles.push({ key: `${zoom}/${x}/${y}`, url: `https://tile.openstreetmap.org/${zoom}/${((x % n) + n) % n}/${y}.png`, left: x * 256 - left, top: y * 256 - top });
    }
  }
  return tiles;
}
