import { subRelationLabel } from '$lib/mii/miiLabelList.svelte';
import { subRelationKey } from './relations';
import type { EgoEdge, Pair } from './relationsModel';

export const SIZE = 720;
export const CENTER_X = SIZE / 2;
export const CENTER_Y = SIZE / 2;
export const NODE_RADIUS = 6;
export const NODE_RADIUS_FOCUS = 9;

const ARROW_OFFSET = 10;
const ARROW_SIZE = 7;
const LANE = 5;
const CURVE_BOW = 14;

type ArrowGeometry = { d: string; arrow: string };

export function arrowGeometry(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  sourceRadius: number,
  targetRadius: number,
): ArrowGeometry {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const startTrim = sourceRadius + 2;
  const endTrim = targetRadius + ARROW_OFFSET - NODE_RADIUS;

  const startX = sx + ux * startTrim + nx * LANE;
  const startY = sy + uy * startTrim + ny * LANE;
  const endX = ex - ux * endTrim + nx * LANE;
  const endY = ey - uy * endTrim + ny * LANE;
  const midX = (sx + ex) / 2 + nx * (LANE + CURVE_BOW);
  const midY = (sy + ey) / 2 + ny * (LANE + CURVE_BOW);

  const d = `M${startX.toFixed(1)},${startY.toFixed(1)} Q${midX.toFixed(
    1,
  )},${midY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`;

  const tx = endX - midX;
  const ty = endY - midY;
  const tlen = Math.hypot(tx, ty) || 1;
  const tux = tx / tlen;
  const tuy = ty / tlen;
  const baseX = endX - tux * ARROW_SIZE;
  const baseY = endY - tuy * ARROW_SIZE;
  const px = -tuy * (ARROW_SIZE / 2);
  const py = tux * (ARROW_SIZE / 2);
  const arrow = `${endX.toFixed(1)},${endY.toFixed(1)} ${(baseX + px).toFixed(
    1,
  )},${(baseY + py).toFixed(1)} ${(baseX - px).toFixed(1)},${(baseY - py).toFixed(1)}`;

  return { d, arrow };
}

export function localizedSub(
  type: string,
  meter: number,
  isFight: boolean,
  locale: string | null | undefined,
): string | null {
  const k = subRelationKey(type, meter, isFight);
  if (!k) return null;
  return subRelationLabel(k.key, locale);
}

function feeling(
  type: string,
  meter: number,
  isFight: boolean,
  locale: string | null | undefined,
): string {
  const sub = localizedSub(type, meter, isFight, locale);
  return sub ? ` - ${sub}` : '';
}

export function pairTooltip(
  p: Pair,
  localizeRelationType: (name: string) => string,
  locale: string | null | undefined,
  fightMarkerText: string,
): string {
  const fight = p.isFight ? `\n⚔︎ ${fightMarkerText}` : '';
  const tab = localizeRelationType(p.typeAB);
  const tba = localizeRelationType(p.typeBA);
  return `${p.nameA} → ${p.nameB}: ${tab} (${p.meterAB})${feeling(p.typeAB, p.meterAB, p.isFight, locale)}\n${p.nameB} → ${p.nameA}: ${tba} (${p.meterBA})${feeling(p.typeBA, p.meterBA, p.isFight, locale)}${fight}`;
}

export function egoEdgeTooltip(
  focusName: string,
  e: EgoEdge,
  localizeRelationType: (name: string) => string,
  locale: string | null | undefined,
  fightMarkerText: string,
): string {
  const fight = e.isFight ? `\n⚔︎ ${fightMarkerText}` : '';
  const tOut = localizeRelationType(e.outTypeName);
  const tIn = localizeRelationType(e.inTypeName);
  return `${focusName} → ${e.otherName}: ${tOut} (${e.outMeter})${feeling(e.outTypeName, e.outMeter, e.isFight, locale)}\n${e.otherName} → ${focusName}: ${tIn} (${e.inMeter})${feeling(e.inTypeName, e.inMeter, e.isFight, locale)}${fight}`;
}
