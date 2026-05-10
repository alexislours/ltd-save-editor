import { isHouseActor, roomCountForActor } from '$lib/map/actors/actors';
import { mapSave } from '$lib/map/state/mapSave.svelte';
import { clearSlot, liveRows, snapshot } from '$lib/map/state/mapObjectsEditor.svelte';
import { pushAction } from '$lib/map/state/history.svelte';
import { miiAccessor, miiState, syncFromSave as syncMiiSave } from '$lib/mii/miiEditor.svelte';
import { populatedMiiIndices } from '$lib/mii/ownership/populated';
import { MAP_SCHEMA, MII_SCHEMA } from '$lib/sav/schema';

const HOUSE_LEAF = MII_SCHEMA.Mii.Location.HouseMapId;
const ROOM_LEAF = MII_SCHEMA.Mii.Location.RoomIndex;
const NAME_LEAF = MII_SCHEMA.Mii.Name.Name;

export type Resident = {
  miiIndex: number;
  name: string;
  houseMapId: number;
  roomIndex: number;
};

const state = $state({ rev: 0, loadId: -1 });

export const residentsState = state;

function bump(): void {
  state.rev = (state.rev + 1) | 0;
}

export function syncResidents(): void {
  syncMiiSave();
  if (miiState.loadId !== state.loadId) {
    state.loadId = miiState.loadId;
    bump();
  }
}

export function isMiiSaveAvailable(): boolean {
  void state.rev;
  void miiState.rev;
  const acc = miiAccessor();
  if (!acc) return false;
  return acc.has(HOUSE_LEAF) && acc.has(ROOM_LEAF) && acc.has(NAME_LEAF);
}

function readResident(miiIndex: number): Resident | null {
  const acc = miiAccessor();
  if (!acc) return null;
  if (!acc.has(HOUSE_LEAF) || !acc.has(ROOM_LEAF) || !acc.has(NAME_LEAF)) return null;
  const houseMapId = acc.getElement(HOUSE_LEAF, miiIndex);
  const roomIndex = acc.getElement(ROOM_LEAF, miiIndex);
  let name: string;
  try {
    name = acc.getElement(NAME_LEAF, miiIndex);
  } catch {
    name = '';
  }
  return {
    miiIndex,
    name,
    houseMapId: houseMapId | 0,
    roomIndex: roomIndex | 0,
  };
}

function allResidents(): Resident[] {
  void state.rev;
  void miiState.rev;
  const acc = miiAccessor();
  if (!acc) return [];
  if (!acc.has(HOUSE_LEAF) || !acc.has(ROOM_LEAF) || !acc.has(NAME_LEAF)) return [];
  const out: Resident[] = [];
  for (const i of populatedMiiIndices(acc)) {
    const r = readResident(i);
    if (r) out.push(r);
  }
  return out;
}

export function residentsForHouse(mapId: number): Resident[] {
  if (!Number.isFinite(mapId) || mapId < 0) return [];
  return allResidents()
    .filter((r) => r.houseMapId === mapId)
    .sort((a, b) => a.roomIndex - b.roomIndex || a.miiIndex - b.miiIndex);
}

export function getResident(miiIndex: number): Resident | null {
  void state.rev;
  void miiState.rev;
  return readResident(miiIndex);
}

function houseActorForMapId(mapId: number): number | null {
  if (!Number.isFinite(mapId) || mapId < 0) return null;
  for (const r of liveRows()) {
    if (r.link === mapId) return r.actor;
  }
  return null;
}

export function roomCountForHouse(mapId: number): number {
  const actor = houseActorForMapId(mapId);
  if (actor == null) return 0;
  return roomCountForActor(actor);
}

function lowestFreeRoom(mapId: number, excludeMiis: Iterable<number>): number {
  const count = roomCountForHouse(mapId);
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const ex = new Set(excludeMiis);
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const used = new Set<number>();
  for (const m of allIslandMiis()) {
    if (ex.has(m.miiIndex)) continue;
    if (m.houseMapId !== mapId) continue;
    if (m.roomIndex >= 0 && m.roomIndex < count) used.add(m.roomIndex);
  }
  for (let i = 0; i < count; i++) {
    if (!used.has(i)) return i;
  }
  return -1;
}

function writeLocation(miiIndex: number, houseMapId: number, roomIndex: number): boolean {
  const acc = miiAccessor();
  if (!acc) return false;
  if (!acc.has(HOUSE_LEAF) || !acc.has(ROOM_LEAF)) return false;
  let changed = false;
  if (acc.getElement(HOUSE_LEAF, miiIndex) !== houseMapId) {
    acc.setElement(HOUSE_LEAF, miiIndex, houseMapId);
    changed = true;
  }
  if (acc.getElement(ROOM_LEAF, miiIndex) !== roomIndex) {
    acc.setElement(ROOM_LEAF, miiIndex, roomIndex);
    changed = true;
  }
  return changed;
}

export function setHouseAssignment(
  miiIndex: number,
  houseMapId: number,
  roomIndex: number,
): boolean {
  const acc = miiAccessor();
  if (!acc) return false;
  if (!acc.has(HOUSE_LEAF) || !acc.has(ROOM_LEAF)) return false;
  const h = Number.isFinite(houseMapId) ? houseMapId | 0 : -1;
  let r = Number.isFinite(roomIndex) ? roomIndex | 0 : -1;
  if (h < 0) {
    r = -1;
  } else {
    const count = roomCountForHouse(h);
    if (count > 0) {
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const used = new Set<number>();
      for (const m of allIslandMiis()) {
        if (m.miiIndex === miiIndex) continue;
        if (m.houseMapId !== h) continue;
        if (m.roomIndex >= 0 && m.roomIndex < count) used.add(m.roomIndex);
      }
      const valid = r >= 0 && r < count && !used.has(r);
      if (!valid) {
        r = lowestFreeRoom(h, [miiIndex]);
        if (r < 0) return false;
      }
    }
  }
  const changed = writeLocation(miiIndex, h, r);
  if (changed) bump();
  return changed;
}

export function removeFromHouse(miiIndex: number): boolean {
  const changed = writeLocation(miiIndex, -1, -1);
  if (changed) bump();
  return changed;
}

export function setRoomIndex(miiIndex: number, roomIndex: number): boolean {
  const acc = miiAccessor();
  if (!acc || !acc.has(ROOM_LEAF)) return false;
  const r = Number.isFinite(roomIndex) ? roomIndex | 0 : -1;
  if (acc.getElement(ROOM_LEAF, miiIndex) === r) return false;
  acc.setElement(ROOM_LEAF, miiIndex, r);
  bump();
  return true;
}

export function swapResidents(a: number, b: number): boolean {
  if (a === b) return false;
  const ra = getResident(a);
  const rb = getResident(b);
  if (!ra || !rb) return false;
  const acc = miiAccessor();
  if (!acc || !acc.has(HOUSE_LEAF) || !acc.has(ROOM_LEAF)) return false;

  const aNewHouse = rb.houseMapId;
  const bNewHouse = ra.houseMapId;
  const aNewRoom = aNewHouse < 0 ? -1 : lowestFreeRoom(aNewHouse, [a, b]);
  const bNewRoom = bNewHouse < 0 ? -1 : lowestFreeRoom(bNewHouse, [a, b]);
  if (aNewHouse >= 0 && aNewRoom < 0) return false;
  if (bNewHouse >= 0 && bNewRoom < 0) return false;

  const ca = writeLocation(a, aNewHouse, aNewRoom);
  const cb = writeLocation(b, bNewHouse, bNewRoom);
  if (ca || cb) bump();
  return ca || cb;
}

export function moveToHouseRoom(
  miiIndex: number,
  toHouseMapId: number,
  toRoomIndex: number,
): { ok: boolean; displaced: number | null } {
  if (!Number.isFinite(toHouseMapId) || toHouseMapId < 0) return { ok: false, displaced: null };
  const occupant = residentsForHouse(toHouseMapId).find((r) => r.roomIndex === toRoomIndex);
  if (occupant && occupant.miiIndex !== miiIndex) {
    const ok = swapResidents(miiIndex, occupant.miiIndex);
    return { ok, displaced: occupant.miiIndex };
  }
  const ok = setHouseAssignment(miiIndex, toHouseMapId, toRoomIndex);
  return { ok, displaced: null };
}

export function vacateHouse(mapId: number): number {
  const list = residentsForHouse(mapId);
  let n = 0;
  for (const r of list) {
    if (removeFromHouse(r.miiIndex)) n++;
  }
  return n;
}

export type IslandMii = Resident & { housed: boolean };

const HOUSE_MAPID_HASH = MAP_SCHEMA.House.MapId.hash >>> 0;

function knownHouseMapIds(): Set<number> {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const out = new Set<number>();
  const decoded = mapSave.decoded;
  if (!decoded) return out;
  const ids = decoded.values[HOUSE_MAPID_HASH] as number[] | undefined;
  if (!ids) return out;
  for (const id of ids) {
    const v = id | 0;
    if (v >= 0) out.add(v);
  }
  return out;
}

export function allIslandMiis(): IslandMii[] {
  void state.rev;
  void miiState.rev;
  const acc = miiAccessor();
  if (!acc) return [];
  if (!acc.has(HOUSE_LEAF) || !acc.has(ROOM_LEAF) || !acc.has(NAME_LEAF)) return [];
  const valid = knownHouseMapIds();
  const out: IslandMii[] = [];
  for (const i of populatedMiiIndices(acc)) {
    const r = readResident(i);
    if (!r) continue;
    const housed = r.houseMapId >= 0 && valid.has(r.houseMapId);
    out.push({ ...r, housed });
  }
  return out;
}

export function unhousedMiis(): IslandMii[] {
  return allIslandMiis().filter((m) => !m.housed);
}

type HousingStats = {
  total: number;
  housed: number;
  unhoused: number;
};

export function housingStats(): HousingStats {
  const all = allIslandMiis();
  let housed = 0;
  for (const m of all) if (m.housed) housed++;
  return { total: all.length, housed, unhoused: all.length - housed };
}

type EmptyHouse = {
  index: number;
  actor: number;
  mapId: number;
  x: number;
  y: number;
};

export function emptyHouses(): EmptyHouse[] {
  void state.rev;
  const out: EmptyHouse[] = [];
  for (const r of liveRows()) {
    if (!isHouseActor(r.actor)) continue;
    if (r.link < 0) continue;
    if (residentsForHouse(r.link).length > 0) continue;
    out.push({ index: r.index, actor: r.actor, mapId: r.link, x: r.x, y: r.y });
  }
  return out;
}

export type HouseSummary = {
  mapId: number;
  roomCount: number;
  residents: Resident[];
};

export function allHouses(): HouseSummary[] {
  void state.rev;
  const out: HouseSummary[] = [];
  for (const r of liveRows()) {
    if (!isHouseActor(r.actor)) continue;
    if (r.link < 0) continue;
    const residents = residentsForHouse(r.link);
    const declared = roomCountForActor(r.actor);
    let observedMax = -1;
    for (const m of residents) if (m.roomIndex > observedMax) observedMax = m.roomIndex;
    out.push({
      mapId: r.link,
      roomCount: Math.max(declared, observedMax + 1),
      residents,
    });
  }
  out.sort((a, b) => a.mapId - b.mapId);
  return out;
}

export function findHouseRowByMapId(mapId: number): { index: number; actor: number } | null {
  if (!Number.isFinite(mapId) || mapId < 0) return null;
  for (const r of liveRows()) {
    if (!isHouseActor(r.actor)) continue;
    if (r.link === mapId) return { index: r.index, actor: r.actor };
  }
  return null;
}

export function deleteHouseByMapId(mapId: number): boolean {
  const found = findHouseRowByMapId(mapId);
  if (!found) return false;
  const before = snapshot(found.index);
  if (!before) return false;
  if (!clearSlot(found.index)) return false;
  const after = snapshot(found.index);
  if (!after) return false;
  pushAction({
    kind: 'object',
    changes: [{ index: found.index, before, after }],
  });
  bump();
  return true;
}
