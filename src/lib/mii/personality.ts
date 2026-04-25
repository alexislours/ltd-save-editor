const CHILD_GRID = [
  ['Observer', 'Thinker', 'Rogue', 'Maverick'],
  ['Strategist', 'Perfectionist', 'Achiever', 'Visionary'],
  ['Buddy', 'Daydreamer', 'Merrymaker', 'Dynamo'],
  ['Sweetie', 'Cheerleader', 'Charmer', 'Go-Getter'],
] as const;

const PARENT_GRID = [
  ['Reserved', 'Ambitious'],
  ['Considerate', 'Outgoing'],
] as const;

export type ChildArchetype = (typeof CHILD_GRID)[number][number];
export type ParentArchetype = (typeof PARENT_GRID)[number][number];

export type PersonalityInput = {
  gaiety: number;
  activeness: number;
  audaciousness: number;
  sociability: number;
};

export type Personality = {
  parent: ParentArchetype;
  child: ChildArchetype;
};

function quadrant(a: number, b: number): number {
  const ax = Math.max(0, Math.min(7, Math.round(a) - 1));
  const bx = Math.max(0, Math.min(7, Math.round(b) - 1));
  return (ax + bx + (bx >= 4 ? 1 : 0)) >> 2;
}

export function classifyPersonality(p: PersonalityInput): Personality {
  const col = quadrant(p.gaiety, p.activeness);
  const row = quadrant(p.audaciousness, p.sociability);
  return {
    parent: PARENT_GRID[row >> 1][col >> 1],
    child: CHILD_GRID[row][col],
  };
}
