type SubRelation = {
  thresholds: readonly number[];
  labels: readonly string[];
  fightLabels?: readonly string[];
};

const FAMILY_LABELS = [
  'Not getting along',
  'Kinda getting along',
  'Getting along well',
  'Cares for',
  'Cares a lot for',
  'Cares deeply for',
  'Cherishes',
] as const;
const FAMILY_THRESHOLDS = [40, 60, 80, 120, 140, 160] as const;

const ONESIDE_LOVE_LABELS = [
  'Giving up',
  'Close to giving up',
  'Has some hope',
  'Likes a lot',
  'Crushing',
  'Head over heels',
  'Ready to risk it all',
] as const;
const ONESIDE_LOVE_FIGHT = [
  'Giving up?',
  'Close to giving up?',
  'Still interested?',
  'Still likes?',
  'Still crushing?',
  'Still head over heels?',
  'Still ready to risk it all?',
] as const;

const SUB_RELATIONS: Record<string, SubRelation> = {
  Couple: {
    thresholds: [50, 80, 90, 110, 120, 150],
    labels: [
      'Not getting along',
      'Making it work',
      'Happy',
      'In love',
      'Very in love',
      'Super in love',
      'Soulmates',
    ],
    fightLabels: [
      'Still trying?',
      'Making it work?',
      'Still happy?',
      'Still in love?',
      'Still very in love?',
      'Still super in love?',
      'Still soulmates?',
    ],
  },
  Divorce: {
    thresholds: [80, 90, 90, 110, 120, 160],
    labels: [
      'Enemies',
      'Tries to avoid',
      'Not speaking',
      'No hard feelings',
      'On good terms',
      'Still great friends',
      'Would try again',
    ],
  },
  ExFriend: {
    thresholds: [80, 90, 90, 110, 120, 160],
    labels: [
      'Enemies',
      'Tries to avoid',
      'Not speaking',
      'Strained',
      "It's complicated",
      'Thinks about often',
      'Hopes to make up',
    ],
  },
  ExLover: {
    thresholds: [80, 90, 90, 110, 120, 160],
    labels: [
      'Enemies',
      'Tries to avoid',
      'Not speaking',
      'No hard feelings',
      'On good terms',
      'Still great friends',
      'Would try again',
    ],
  },
  Family: { thresholds: FAMILY_THRESHOLDS, labels: FAMILY_LABELS },
  Relative: { thresholds: FAMILY_THRESHOLDS, labels: FAMILY_LABELS },
  Parent: { thresholds: FAMILY_THRESHOLDS, labels: FAMILY_LABELS },
  Child: { thresholds: FAMILY_THRESHOLDS, labels: FAMILY_LABELS },
  BrotherSisterOlder: {
    thresholds: FAMILY_THRESHOLDS,
    labels: FAMILY_LABELS,
  },
  BrotherSisterYounger: {
    thresholds: FAMILY_THRESHOLDS,
    labels: FAMILY_LABELS,
  },
  GrandParent: { thresholds: FAMILY_THRESHOLDS, labels: FAMILY_LABELS },
  GrandChild: { thresholds: FAMILY_THRESHOLDS, labels: FAMILY_LABELS },
  Friend: {
    thresholds: [40, 60, 80, 120, 140, 160],
    labels: [
      'Not getting along',
      'Kinda getting along',
      'Friends',
      'Good friends',
      'Great friends',
      'Best friends',
      'Ultra friends',
    ],
    fightLabels: [
      'Not getting along?',
      'Kinda getting along?',
      'Still friends?',
      'Still good friends?',
      'Still great friends?',
      'Still best friends?',
      'Still ultra friends?',
    ],
  },
  FriendOneSideLove: {
    thresholds: [40, 60, 80, 120, 140, 160],
    labels: ONESIDE_LOVE_LABELS,
    fightLabels: ONESIDE_LOVE_FIGHT,
  },
  Know: {
    thresholds: [40, 60, 80, 120, 160, 200],
    labels: [
      'Not interested',
      'Indifferent',
      'Some interest',
      'Getting familiar',
      'Seems like-minded',
      'Vibes with',
      'Wants to be friends',
    ],
  },
  KnowOneSideLove: {
    thresholds: [40, 60, 80, 120, 160, 200],
    labels: ONESIDE_LOVE_LABELS,
    fightLabels: ONESIDE_LOVE_FIGHT,
  },
  Lover: {
    thresholds: [50, 70, 80, 120, 130, 150],
    labels: [
      'Not getting along',
      'Kinda getting along',
      'Really likes',
      'Falling in love',
      'In love',
      'Super in love',
      'Wants to marry!',
    ],
    fightLabels: [
      'Not getting along?',
      'Kinda getting along?',
      'Still really likes?',
      'Still falling in love?',
      'Still in love?',
      'Still super in love?',
      'Still wants to marry?',
    ],
  },
};

export function subRelationLabel(
  internalName: string,
  meter: number,
  isFight: boolean,
): string | null {
  const def = SUB_RELATIONS[internalName];
  if (!def) return null;
  const labels = isFight && def.fightLabels ? def.fightLabels : def.labels;
  for (let i = 0; i < def.thresholds.length; i++) {
    if (meter < def.thresholds[i]) return labels[i];
  }
  return labels[labels.length - 1];
}

export type SubRelationLevel = {
  index: number;
  meter: number;
  label: string;
};

export function subRelationLevels(
  internalName: string,
  isFight: boolean,
): SubRelationLevel[] | null {
  const def = SUB_RELATIONS[internalName];
  if (!def) return null;
  const labels = isFight && def.fightLabels ? def.fightLabels : def.labels;
  const out: SubRelationLevel[] = [];
  for (let i = 0; i < labels.length; i++) {
    const meter = i === 0 ? 0 : def.thresholds[i - 1];
    out.push({ index: i, meter, label: labels[i] });
  }
  return out;
}

export function subRelationLevelIndex(internalName: string, meter: number): number | null {
  const def = SUB_RELATIONS[internalName];
  if (!def) return null;
  for (let i = 0; i < def.thresholds.length; i++) {
    if (meter < def.thresholds[i]) return i;
  }
  return def.thresholds.length;
}
