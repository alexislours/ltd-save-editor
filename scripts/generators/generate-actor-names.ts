import { writeFileSync } from 'node:fs';

import { PROJECT_ROOT, RSDB_DIR, WALKING_GRID_DIR } from '../lib/config.ts';
import { murmur3 } from '../lib/hash.ts';
import { loadMapping, loadSequence, type YamlEntry } from '../lib/yaml.ts';

const RSDB = `${RSDB_DIR}/Actor.Product.100.rstbl.byml.yml`;
const PASSABLE_COST = `${RSDB_DIR}/PassableCost.Product.100.rstbl.byml.yml`;
const OUT = `${PROJECT_ROOT}/src/lib/map/actors/generatedActorNames.ts`;

type ActorRow = { cat: string | null; key: string };
const rows: ActorRow[] = [];
for (const e of loadSequence(RSDB)) {
  const key = e.str('Key');
  if (!key) continue;
  rows.push({ cat: e.str('Category'), key });
}

const MAP_CATEGORIES = new Set([
  'MapObject_Obje_Island',
  'MapObject_Obje_Dressroom',
  'MapObject_Obje_FerrisWheel',
  'MapObject_IslandStep',
  'MapObject_House_Outer',
  'MapObject_Facility_Location',
  'MapObject_Facility_Shop',
  'MapObject_Facility_Contents',
  'MapObject_RoomDeco',
  'MapObject_RoomDeco_Wall',
  'MapObject_RoomDeco_Ceiling',
  'MapObject_RoomDeco_Floor',
  'MapObject_Ugc_House',
  'MapObject_Ugc_Obje',
]);

const filtered = rows.filter(
  (r): r is { cat: string; key: string } => r.cat != null && MAP_CATEGORIES.has(r.cat),
);
const byHash = new Map<number, { key: string; cat: string }>();
for (const { cat: c, key: k } of filtered) {
  const h = murmur3(k);
  const prev = byHash.get(h);
  if (prev && prev.key !== k) {
    throw new Error(`Hash collision on 0x${h.toString(16)}: ${prev.key} vs ${k}`);
  }
  byHash.set(h, { key: k, cat: c });
}

type Footprint = {
  x0: number;
  y0: number;
  w: number;
  h: number;
  goalX: number | null;
  goalY: number | null;
};

type OverrideEntry = {
  w: number;
  h: number;
  costs: number[];
};

function parseActorPassableCost(): {
  wgMap: Map<string, string>;
  overrideMap: Map<string, OverrideEntry>;
} {
  const wgMap = new Map<string, string>();
  const overrideMap = new Map<string, OverrideEntry>();
  for (const e of loadSequence(PASSABLE_COST)) {
    const actor = e.rowKey();
    if (!actor) continue;
    const wgPath = e.str('WalkingGrid');
    const wgMatch = wgPath?.match(/\/([^./]+)\.byml/);
    if (wgMatch) {
      wgMap.set(actor, wgMatch[1]);
      continue;
    }
    const sx = e.num('OverrideGridSizeX');
    const sz = e.num('OverrideGridSizeZ');
    if (sx == null || sz == null || sx <= 0 || sz <= 0) continue;
    const costs = e.array<number>('OverrideCostValueAryHash') ?? [];
    overrideMap.set(actor, { w: sx, h: sz, costs });
  }
  return { wgMap, overrideMap };
}

const COST_FRONT_EDGES = new Set([3297083986, 1306474371]);

const FOOTPRINT_OVERRIDES: Record<string, Footprint> = {
  FacilityFountainPark: {
    x0: -2,
    y0: -4,
    w: 6,
    h: 10,
    goalX: null,
    goalY: null,
  },
};

function parseWalkingGrid(name: string): Footprint | null {
  const path = `${WALKING_GRID_DIR}/${name}.byml.yml`;
  let m: YamlEntry | null;
  try {
    m = loadMapping(path);
  } catch {
    return null;
  }
  if (!m) return null;
  const xs = m.num('XStart');
  const xe = m.num('XEnd');
  const zs = m.num('ZStart');
  const ze = m.num('ZEnd');
  const xg = m.num('XGoal');
  const zg = m.num('ZGoal');
  if (xs == null || xe == null || zs == null || ze == null) return null;
  const wRaw = xe - xs + 1;
  const hRaw = ze - zs + 1;

  const grid = m.array<{ CostValueData: number }[]>('Grid');
  const vals = grid?.flat().map((c) => c.CostValueData) ?? [];

  let x0 = xs;
  let y0 = zs;
  let w = wRaw;
  let h = hRaw;
  if (vals.length === wRaw * hRaw) {
    const rowAllFront = (dz: number): boolean => {
      for (let dx = 0; dx < w; dx++) {
        if (!COST_FRONT_EDGES.has(vals[(y0 - zs + dz) * wRaw + (x0 - xs + dx)])) return false;
      }
      return true;
    };
    const colAllFront = (dx: number): boolean => {
      for (let dz = 0; dz < h; dz++) {
        if (!COST_FRONT_EDGES.has(vals[(y0 - zs + dz) * wRaw + (x0 - xs + dx)])) return false;
      }
      return true;
    };

    while (h > 0 && rowAllFront(0)) {
      y0 += 1;
      h -= 1;
    }
    while (h > 0 && rowAllFront(h - 1)) {
      h -= 1;
    }
    while (w > 0 && colAllFront(0)) {
      x0 += 1;
      w -= 1;
    }
    while (w > 0 && colAllFront(w - 1)) {
      w -= 1;
    }
  }

  const goalX = xg == null ? 0 : Math.max(x0, Math.min(x0 + w - 1, xg));
  const goalY = zg == null ? 0 : Math.max(y0, Math.min(y0 + h - 1, zg));

  return { x0, y0, w, h, goalX, goalY };
}

function footprintFromOverride(ov: OverrideEntry): Footprint | null {
  const wRaw = ov.w;
  const hRaw = ov.h;
  let x0 = 0;
  let y0 = 0;
  let w = wRaw;
  let h = hRaw;

  if (ov.costs.length === wRaw * hRaw) {
    const at = (dx: number, dz: number): number => ov.costs[(y0 + dz) * wRaw + (x0 + dx)];
    const rowAllFront = (dz: number): boolean => {
      for (let dx = 0; dx < w; dx++) if (!COST_FRONT_EDGES.has(at(dx, dz))) return false;
      return true;
    };
    const colAllFront = (dx: number): boolean => {
      for (let dz = 0; dz < h; dz++) if (!COST_FRONT_EDGES.has(at(dx, dz))) return false;
      return true;
    };
    while (h > 0 && rowAllFront(0)) {
      y0 += 1;
      h -= 1;
    }
    while (h > 0 && rowAllFront(h - 1)) {
      h -= 1;
    }
    while (w > 0 && colAllFront(0)) {
      x0 += 1;
      w -= 1;
    }
    while (w > 0 && colAllFront(w - 1)) {
      w -= 1;
    }
  }

  if (w <= 0 || h <= 0) return null;
  return { x0, y0, w, h, goalX: null, goalY: null };
}

const { wgMap: actorToWalkingGrid, overrideMap: actorToOverride } = parseActorPassableCost();
const walkingGridCache = new Map<string, Footprint | null>();
function footprintFor(actorKey: string): Footprint | null {
  const manual = FOOTPRINT_OVERRIDES[actorKey];
  if (manual) return manual;
  const wgName = actorToWalkingGrid.get(actorKey);
  if (wgName) {
    if (walkingGridCache.has(wgName)) return walkingGridCache.get(wgName) ?? null;
    const fp = parseWalkingGrid(wgName);
    walkingGridCache.set(wgName, fp);
    return fp;
  }
  const ov = actorToOverride.get(actorKey);
  if (ov) return footprintFromOverride(ov);
  const m = /^(.+)_\d{2}$/.exec(actorKey);
  if (m) return footprintFor(m[1]);
  return null;
}

const sorted = [...byHash.entries()].sort((a, b) => a[0] - b[0]);

const footprintEntries: [number, string, Footprint][] = [];
const missing: string[] = [];
for (const [h, info] of sorted) {
  const fp = footprintFor(info.key);
  if (!fp) continue;
  if (fp.w <= 0 || fp.h <= 0) continue;
  footprintEntries.push([h, info.key, fp]);
}
for (const { key: k, cat: c } of filtered) {
  if (actorToWalkingGrid.has(k)) continue;
  if (actorToOverride.has(k)) continue;
  if (c.startsWith('MapObject_Facility_') || c.startsWith('MapObject_House_')) {
    missing.push(`${k} [${c}]`);
  }
}

const lines: string[] = [];
lines.push('type ActorInfo = { key: string; category: string }');
lines.push('');
lines.push('export type ActorFootprint = {');
lines.push('  x0: number; y0: number; w: number; h: number');
lines.push('  goalX: number | null; goalY: number | null');
lines.push('}');
lines.push('');
lines.push('export const ACTOR_NAMES: ReadonlyMap<number, ActorInfo> = new Map([');
for (const [h, info] of sorted) {
  const hex = '0x' + h.toString(16).padStart(8, '0');
  lines.push(
    `  [${hex}, { key: ${JSON.stringify(info.key)}, category: ${JSON.stringify(info.cat)} }],`,
  );
}
lines.push('])');
lines.push('');
lines.push(
  'export const DEFAULT_FOOTPRINT: ActorFootprint = { x0: 0, y0: 0, w: 1, h: 1, goalX: 0, goalY: 0 }',
);
lines.push('');
lines.push('export const ACTOR_FOOTPRINT: ReadonlyMap<number, ActorFootprint> = new Map([');
for (const [h, k, fp] of footprintEntries) {
  const hex = '0x' + h.toString(16).padStart(8, '0');
  lines.push(
    `  [${hex}, { x0: ${fp.x0}, y0: ${fp.y0}, w: ${fp.w}, h: ${fp.h},` +
      ` goalX: ${fp.goalX}, goalY: ${fp.goalY} }], // ${k} (${fp.w}×${fp.h})`,
  );
}
lines.push('])');
lines.push('');

writeFileSync(OUT, lines.join('\n'));
console.log(
  `wrote ${OUT} (${byHash.size} actors, ${footprintEntries.length} with WalkingGrid footprints)`,
);
if (missing.length) {
  console.log(
    `note: ${missing.length} facility/house actors have no WalkingGrid (will render as 1x1):`,
  );
  for (const m of missing) console.log(`  - ${m}`);
}
