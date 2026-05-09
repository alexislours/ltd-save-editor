import { mapSave } from '$lib/map/state/mapSave.svelte';
import { MAP_SCHEMA } from '$lib/sav/schema';

const MAP_ID_HASH = MAP_SCHEMA.House.MapId.hash >>> 0;
const ROOMMATE_GROUP_NAME_HASH = MAP_SCHEMA.House.RoommateGroupName.hash >>> 0;

type MapEntry = {
  id: number;
  name: string | null;
};

export function knownMapEntries(): MapEntry[] {
  const decoded = mapSave.decoded;
  if (!decoded) return [];
  const ids = decoded.values[MAP_ID_HASH] as number[] | undefined;
  if (!ids) return [];
  const names = decoded.values[ROOMMATE_GROUP_NAME_HASH] as string[] | undefined;
  const seen = new Set<number>();
  const out: MapEntry[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i] | 0;
    if (id < 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const raw = names?.[i];
    const name = typeof raw === 'string' && raw.trim() !== '' ? raw : null;
    out.push({ id, name });
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

function mapNameForId(id: number): string | null {
  if (!Number.isFinite(id) || id < 0) return null;
  for (const e of knownMapEntries()) {
    if (e.id === id) return e.name;
  }
  return null;
}

export function mapDisplayLabel(id: number): { label: string; muted: boolean } {
  if (!Number.isFinite(id) || id < 0) return { label: 'None', muted: true };
  const name = mapNameForId(id);
  if (name) return { label: name, muted: false };
  return { label: `Map ${id}`, muted: true };
}
