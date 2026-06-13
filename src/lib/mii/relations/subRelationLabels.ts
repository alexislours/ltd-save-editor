type SubGroup = {
  prefix: string;
  fightPrefix?: string;
};

const RANK_THRESHOLDS = [11, 41, 81, 120, 160, 190] as const;

const SUB_RELATIONS: Record<string, SubGroup> = {
  Couple: { prefix: 'Couple', fightPrefix: 'Couple_Fight' },
  Divorce: { prefix: 'Divorce' },
  ExFriend: { prefix: 'ExFriend' },
  ExLover: { prefix: 'ExLover' },
  Family: { prefix: 'Family' },
  Relative: { prefix: 'Family' },
  Parent: { prefix: 'Family' },
  Child: { prefix: 'Family' },
  BrotherSisterOlder: { prefix: 'Family' },
  BrotherSisterYounger: { prefix: 'Family' },
  GrandParent: { prefix: 'Family' },
  GrandChild: { prefix: 'Family' },
  Friend: { prefix: 'Friend', fightPrefix: 'Friend_Fight' },
  FriendOneSideLove: { prefix: 'OnesideLove', fightPrefix: 'OnesideLove_Fight' },
  Know: { prefix: 'Know' },
  KnowOneSideLove: { prefix: 'OnesideLove', fightPrefix: 'OnesideLove_Fight' },
  Lover: { prefix: 'Lover', fightPrefix: 'Lover_Fight' },
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
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (meter < RANK_THRESHOLDS[i]) return { key: `${prefix}_${i}`, index: i };
  }
  const last = RANK_THRESHOLDS.length;
  return { key: `${prefix}_${last}`, index: last };
}

export function subRelationLevels(
  internalName: string,
  isFight: boolean,
): SubRelationLevel[] | null {
  const def = SUB_RELATIONS[internalName];
  if (!def) return null;
  const prefix = activePrefix(def, isFight);
  const total = RANK_THRESHOLDS.length + 1;
  const out: SubRelationLevel[] = [];
  for (let i = 0; i < total; i++) {
    const meter = i === 0 ? 0 : RANK_THRESHOLDS[i - 1];
    out.push({ index: i, meter, key: `${prefix}_${i}` });
  }
  return out;
}
