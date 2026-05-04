// Maps a relation's internal name + meter (+ fight flag) to a sub-relation
// key understood by miiLabelList.subRelationLabel (e.g. "Couple_Fight_3").

type SubGroup = {
  thresholds: readonly number[];
  prefix: string;
  fightPrefix?: string;
};

const FAMILY_THRESHOLDS = [40, 60, 80, 120, 140, 160] as const;

const SUB_RELATIONS: Record<string, SubGroup> = {
  Couple: {
    thresholds: [50, 80, 90, 110, 120, 150],
    prefix: 'Couple',
    fightPrefix: 'Couple_Fight',
  },
  Divorce: {
    thresholds: [80, 90, 90, 110, 120, 160],
    prefix: 'Divorce',
  },
  ExFriend: {
    thresholds: [80, 90, 90, 110, 120, 160],
    prefix: 'ExFriend',
  },
  ExLover: {
    thresholds: [80, 90, 90, 110, 120, 160],
    prefix: 'ExLover',
  },
  Family: { thresholds: FAMILY_THRESHOLDS, prefix: 'Family' },
  Relative: { thresholds: FAMILY_THRESHOLDS, prefix: 'Family' },
  Parent: { thresholds: FAMILY_THRESHOLDS, prefix: 'Family' },
  Child: { thresholds: FAMILY_THRESHOLDS, prefix: 'Family' },
  BrotherSisterOlder: { thresholds: FAMILY_THRESHOLDS, prefix: 'Family' },
  BrotherSisterYounger: { thresholds: FAMILY_THRESHOLDS, prefix: 'Family' },
  GrandParent: { thresholds: FAMILY_THRESHOLDS, prefix: 'Family' },
  GrandChild: { thresholds: FAMILY_THRESHOLDS, prefix: 'Family' },
  Friend: {
    thresholds: [40, 60, 80, 120, 140, 160],
    prefix: 'Friend',
    fightPrefix: 'Friend_Fight',
  },
  FriendOneSideLove: {
    thresholds: [40, 60, 80, 120, 140, 160],
    prefix: 'OnesideLove',
    fightPrefix: 'OnesideLove_Fight',
  },
  Know: {
    thresholds: [40, 60, 80, 120, 160, 200],
    prefix: 'Know',
  },
  KnowOneSideLove: {
    thresholds: [40, 60, 80, 120, 160, 200],
    prefix: 'OnesideLove',
    fightPrefix: 'OnesideLove_Fight',
  },
  Lover: {
    thresholds: [50, 70, 80, 120, 130, 150],
    prefix: 'Lover',
    fightPrefix: 'Lover_Fight',
  },
};

type SubRelationKey = {
  key: string;
  index: number;
};

type SubRelationLevel = {
  index: number;
  meter: number;
  key: string;
};

function activePrefix(group: SubGroup, isFight: boolean): string {
  return isFight && group.fightPrefix ? group.fightPrefix : group.prefix;
}

export function hasFightVariant(internalName: string): boolean {
  return SUB_RELATIONS[internalName]?.fightPrefix !== undefined;
}

export function subRelationKey(
  internalName: string,
  meter: number,
  isFight: boolean,
): SubRelationKey | null {
  const def = SUB_RELATIONS[internalName];
  if (!def) return null;
  const prefix = activePrefix(def, isFight);
  for (let i = 0; i < def.thresholds.length; i++) {
    if (meter < def.thresholds[i]) return { key: `${prefix}_${i}`, index: i };
  }
  const last = def.thresholds.length;
  return { key: `${prefix}_${last}`, index: last };
}

export function subRelationLevels(
  internalName: string,
  isFight: boolean,
): SubRelationLevel[] | null {
  const def = SUB_RELATIONS[internalName];
  if (!def) return null;
  const prefix = activePrefix(def, isFight);
  const total = def.thresholds.length + 1;
  const out: SubRelationLevel[] = [];
  for (let i = 0; i < total; i++) {
    const meter = i === 0 ? 0 : def.thresholds[i - 1];
    out.push({ index: i, meter, key: `${prefix}_${i}` });
  }
  return out;
}
