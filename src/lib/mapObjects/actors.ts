import {
  ACTOR_FOOTPRINT,
  ACTOR_NAMES,
  DEFAULT_FOOTPRINT,
  type ActorFootprint,
  type ActorInfo,
} from './generatedActorNames';

export type ActorGroup = 'house' | 'facility' | 'deco' | 'room' | 'step' | 'unknown';

export type ActorDisplay = {
  hash: number;
  key: string;
  category: string;
  group: ActorGroup;
  label: string;
  color: string;
};

function groupForCategory(category: string): ActorGroup {
  if (category.startsWith('MapObject_House_')) return 'house';
  if (category.startsWith('MapObject_Facility_')) return 'facility';
  if (category.startsWith('MapObject_RoomDeco')) return 'room';
  if (category === 'MapObject_IslandStep') return 'step';
  if (category.startsWith('MapObject_Obje_')) return 'deco';
  return 'unknown';
}

export const GROUP_COLOR: Record<ActorGroup, string> = {
  house: '#e11d48', // rose-600
  facility: '#2563eb', // blue-600
  deco: '#16a34a', // green-600
  room: '#9333ea', // purple-600
  step: '#ca8a04', // amber-600
  unknown: '#ef4444', // red-500
};

function prettifyActorKey(key: string): string {
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
    unknown: 5,
  };
  items.sort((a, b) => {
    const g = groupOrder[a.group] - groupOrder[b.group];
    if (g !== 0) return g;
    return a.label.localeCompare(b.label);
  });
  ALL_CACHE = items;
  return items;
}

export function actorInfo(hash: number): ActorInfo | null {
  return ACTOR_NAMES.get(hash >>> 0) ?? null;
}

export type FootprintCell = { dx: number; dy: number };
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

export function footprintRect(hash: number, rotDeg: number): FootprintRect {
  const fp = rawFootprint(hash);
  const t = quarterTurnsFromDeg(rotDeg);
  if (t === 0)
    return {
      x0: fp.x0,
      y0: fp.y0,
      w: fp.w,
      h: fp.h,
      goalX: fp.goalX,
      goalY: fp.goalY,
    };

  const corners: Array<[number, number]> = [
    [fp.x0, fp.y0],
    [fp.x0 + fp.w - 1, fp.y0],
    [fp.x0, fp.y0 + fp.h - 1],
    [fp.x0 + fp.w - 1, fp.y0 + fp.h - 1],
  ];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [cx, cy] of corners) {
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

  return {
    x0: minX,
    y0: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
    goalX,
    goalY,
  };
}

export function footprintCells(hash: number, rotDeg: number): FootprintCell[] {
  const { x0, y0, w, h } = footprintRect(hash, rotDeg);
  const out: FootprintCell[] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      out.push({ dx: x0 + dx, dy: y0 + dy });
    }
  }
  return out;
}

export function isSingleCell(hash: number): boolean {
  const fp = rawFootprint(hash);
  return fp.w === 1 && fp.h === 1;
}

export function footprintSizeLabel(hash: number): string {
  const fp = rawFootprint(hash);
  return `${fp.w}×${fp.h}`;
}
