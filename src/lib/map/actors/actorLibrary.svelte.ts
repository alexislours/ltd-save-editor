import { actorDisplay, footprintRect, type ActorGroup } from './actors';
import { ACTOR_NAMES } from './generatedActorNames';

type LibraryEntry = {
  hash: number;
  key: string;
  label: string;
  group: ActorGroup;
  color: string;
  width: number;
  height: number;
};

let CACHE: LibraryEntry[] | null = null;

type LibrarySelection = {
  actorKey: number | null;
};

export const librarySelection = $state<LibrarySelection>({ actorKey: null });

export function selectLibraryActor(actorKey: number | null): void {
  librarySelection.actorKey = actorKey == null ? null : actorKey >>> 0;
}

export function libraryEntries(): readonly LibraryEntry[] {
  if (CACHE) return CACHE;
  const out: LibraryEntry[] = [];
  for (const [hash] of ACTOR_NAMES) {
    const d = actorDisplay(hash);
    const fp = footprintRect(hash, 0);
    out.push({
      hash: d.hash,
      key: d.key,
      label: d.label,
      group: d.group,
      color: d.color,
      width: fp.w,
      height: fp.h,
    });
  }
  const groupOrder: Record<ActorGroup, number> = {
    house: 0,
    facility: 1,
    deco: 2,
    step: 3,
    room: 4,
    ugc: 5,
    unknown: 6,
  };
  out.sort((a, b) => {
    const g = groupOrder[a.group] - groupOrder[b.group];
    if (g !== 0) return g;
    return a.label.localeCompare(b.label);
  });
  CACHE = out;
  return out;
}
