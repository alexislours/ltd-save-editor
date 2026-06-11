const T1 = [50, 10, 20, 30, 40, 60, 70, 80, 90] as const;
const T2 = [50, 5, 15, 25, 35, 65, 75, 85, 95] as const;

const QUARTILE_CONTRIBUTION = [-2, -1, 1, 2] as const;

type VibeStrength = 'normal' | 'weak' | 'strong';

export type ResidentVibeInput = {
  index: number;
  gaiety: number;
  activeness: number;
  audaciousness: number;
  sociability: number;
};

type ResidentContribution = ResidentVibeInput & {
  x: number;
  y: number;
  cx: number;
  cy: number;
};

export type IslandVibe = {
  sx: number;
  sy: number;
  residentCount: number;
  octant: number | null;
  angleDeg: number | null;
  strength: VibeStrength;
  key: string;
  residents: ResidentContribution[];
};

function score(table: readonly number[], slider: number): number {
  return table[slider >= 0 && slider <= 8 ? slider : 0];
}

function axisQuartile(value: number): number {
  if (value <= 50) return 0;
  if (value <= 100) return 1;
  if (value <= 150) return 2;
  return 3;
}

export function vibeOctant(sx: number, sy: number): number {
  const deg = (Math.atan2(sy, sx) * 180) / Math.PI;
  return Math.floor(((((deg + 22.5) % 360) + 360) % 360) / 45);
}

export function computeIslandVibe(residents: ResidentVibeInput[]): IslandVibe {
  let sx = 0;
  let sy = 0;
  const contributions: ResidentContribution[] = residents.map((r) => {
    const x = score(T1, r.gaiety) + score(T2, r.activeness);
    const y = score(T1, r.audaciousness) + score(T2, r.sociability);
    const cx = QUARTILE_CONTRIBUTION[axisQuartile(x)];
    const cy = QUARTILE_CONTRIBUTION[axisQuartile(y)];
    sx += cx;
    sy += cy;
    return { ...r, x, y, cx, cy };
  });

  const residentCount = residents.length;

  if (sx === 0 && sy === 0) {
    return {
      sx,
      sy,
      residentCount,
      octant: null,
      angleDeg: null,
      strength: 'normal',
      key: 'Normal',
      residents: contributions,
    };
  }

  const angleDeg = (Math.atan2(sy, sx) * 180) / Math.PI;
  const octant = vibeOctant(sx, sy);
  const strong = residentCount < 1.5 * Math.max(Math.abs(sx), Math.abs(sy));
  return {
    sx,
    sy,
    residentCount,
    octant,
    angleDeg,
    strength: strong ? 'strong' : 'weak',
    key: `${strong ? 'Strong' : 'Weak'}_0${octant}`,
    residents: contributions,
  };
}

export const OCTANT_COLORS = [
  '#c25cb4',
  '#e0474f',
  '#e4682f',
  '#e0902e',
  '#94a430',
  '#279e6f',
  '#2f9bb5',
  '#4f87e8',
] as const;

export const NORMAL_COLOR = '#8a8f98';

export const OCTANT_CATEGORY: Partial<Record<number, string>> = {
  1: 'Nori',
  3: 'Nagomi',
  5: 'Cool',
  7: 'Dry',
};

export function vibeColor(vibe: IslandVibe): string {
  return vibe.octant == null ? NORMAL_COLOR : OCTANT_COLORS[vibe.octant];
}
