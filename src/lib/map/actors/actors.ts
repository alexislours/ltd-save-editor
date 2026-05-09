import {
  ACTOR_FOOTPRINT,
  ACTOR_NAMES,
  DEFAULT_FOOTPRINT,
  type ActorFootprint,
} from './generatedActorNames';

export type ActorGroup = 'house' | 'facility' | 'deco' | 'room' | 'step' | 'ugc' | 'unknown';

type ActorDisplay = {
  hash: number;
  key: string;
  category: string;
  group: ActorGroup;
  label: string;
  color: string;
};

function groupForCategory(category: string): ActorGroup {
  if (category.startsWith('MapObject_Ugc_')) return 'ugc';
  if (category.startsWith('MapObject_House_')) return 'house';
  if (category.startsWith('MapObject_Facility_')) return 'facility';
  if (category.startsWith('MapObject_RoomDeco')) return 'room';
  if (category === 'MapObject_IslandStep') return 'step';
  if (category.startsWith('MapObject_Obje_')) return 'deco';
  return 'unknown';
}

const GROUP_COLOR: Record<ActorGroup, string> = {
  house: '#e11d48', // rose-600
  facility: '#2563eb', // blue-600
  deco: '#16a34a', // green-600
  room: '#9333ea', // purple-600
  step: '#ca8a04', // amber-600
  ugc: '#a78bfa', // violet-400, matches ugcEditor tier 0
  unknown: '#ef4444', // red-500
};

function prettifyActorKey(key: string): string {
  const ugc = /^(House|Obj)Ugc(\d+)(?:_(\d+))?$/.exec(key);
  if (ugc) {
    const kind = ugc[1] === 'House' ? 'UGC house' : 'UGC item';
    const variant = ugc[3] ? `${ugc[2]}-${ugc[3]}` : ugc[2];
    return `${kind} ${variant}`;
  }
  let s = key;
  for (const p of ['Obj', 'Facility', 'House', 'Room', 'Deco']) {
    if (s.startsWith(p)) {
      s = s.slice(p.length);
      break;
    }
  }
  s = s.replace(/_/g, ' ');
  s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  s = s.replace(/\s+/g, ' ').trim();
  return s || key;
}

const DISPLAY_CACHE = new Map<number, ActorDisplay>();

export function actorDisplay(hash: number): ActorDisplay {
  const h = hash >>> 0;
  const cached = DISPLAY_CACHE.get(h);
  if (cached) return cached;

  const info = ACTOR_NAMES.get(h);
  const group = info ? groupForCategory(info.category) : 'unknown';
  const key = info?.key ?? '';
  const label = info ? prettifyActorKey(info.key) : `Unknown 0x${h.toString(16).padStart(8, '0')}`;
  const display: ActorDisplay = {
    hash: h,
    key,
    category: info?.category ?? '',
    group,
    label,
    color: GROUP_COLOR[group],
  };
  DISPLAY_CACHE.set(h, display);
  return display;
}

let ALL_CACHE: ActorDisplay[] | null = null;
export function allActors(): readonly ActorDisplay[] {
  if (ALL_CACHE) return ALL_CACHE;
  const items: ActorDisplay[] = [];
  for (const [h] of ACTOR_NAMES) items.push(actorDisplay(h));
  const groupOrder: Record<ActorGroup, number> = {
    house: 0,
    facility: 1,
    deco: 2,
    step: 3,
    room: 4,
    ugc: 5,
    unknown: 6,
  };
  items.sort((a, b) => {
    const g = groupOrder[a.group] - groupOrder[b.group];
    if (g !== 0) return g;
    return a.label.localeCompare(b.label);
  });
  ALL_CACHE = items;
  return items;
}

export type FootprintRect = {
  x0: number;
  y0: number;
  w: number;
  h: number;
  goalX: number | null;
  goalY: number | null;
};

function rawFootprint(hash: number): ActorFootprint {
  return ACTOR_FOOTPRINT.get(hash >>> 0) ?? DEFAULT_FOOTPRINT;
}

function quarterTurnsFromDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return ((Math.round(deg / 90) % 4) + 4) % 4;
}

function rotateOffset(dx: number, dy: number, t: number): [number, number] {
  for (let i = 0; i < t; i++) {
    const nx = dy;
    const ny = -dx;
    dx = nx;
    dy = ny;
  }
  return [dx, dy];
}

export function emptyFootprintRect(): FootprintRect {
  return { x0: 0, y0: 0, w: 0, h: 0, goalX: null, goalY: null };
}

export function rotateActorFootprintInto(
  fp: ActorFootprint,
  rotDeg: number,
  out: FootprintRect,
): FootprintRect {
  const t = quarterTurnsFromDeg(rotDeg);
  if (t === 0) {
    out.x0 = fp.x0;
    out.y0 = fp.y0;
    out.w = fp.w;
    out.h = fp.h;
    out.goalX = fp.goalX;
    out.goalY = fp.goalY;
    return out;
  }

  const x1 = fp.x0 + fp.w - 1;
  const y1 = fp.y0 + fp.h - 1;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < 4; i++) {
    const cx = i & 1 ? x1 : fp.x0;
    const cy = i & 2 ? y1 : fp.y0;
    const [rx, ry] = rotateOffset(cx, cy, t);
    if (rx < minX) minX = rx;
    if (ry < minY) minY = ry;
    if (rx > maxX) maxX = rx;
    if (ry > maxY) maxY = ry;
  }

  let goalX: number | null = null,
    goalY: number | null = null;
  if (fp.goalX != null && fp.goalY != null) {
    [goalX, goalY] = rotateOffset(fp.goalX, fp.goalY, t);
  }

  out.x0 = minX;
  out.y0 = minY;
  out.w = maxX - minX + 1;
  out.h = maxY - minY + 1;
  out.goalX = goalX;
  out.goalY = goalY;
  return out;
}

export function rotateActorFootprint(fp: ActorFootprint, rotDeg: number): FootprintRect {
  return rotateActorFootprintInto(fp, rotDeg, emptyFootprintRect());
}

export function footprintRectInto(hash: number, rotDeg: number, out: FootprintRect): FootprintRect {
  return rotateActorFootprintInto(rawFootprint(hash), rotDeg, out);
}

export function footprintRect(hash: number, rotDeg: number): FootprintRect {
  return rotateActorFootprint(rawFootprint(hash), rotDeg);
}

const HOUSE_ROOM_COUNT = new Map<number, number>([
  [0xe3ec5c38, 8], // HouseDollHouse
  [0xef367ada, 1], // HouseOneRoom
]);

export function isHouseActor(hash: number): boolean {
  return actorDisplay(hash).group === 'house';
}

export function isFenceActor(hash: number): boolean {
  const key = actorDisplay(hash).key;
  return key.startsWith('ObjFence') || key.startsWith('ObjGuardrail');
}

export function roomCountForActor(hash: number): number {
  return HOUSE_ROOM_COUNT.get(hash >>> 0) ?? 0;
}
