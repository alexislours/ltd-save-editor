import type { CoupleBlock, CoupleConstraints, CrushBlock } from './relations';

export const FIXED_METER_TYPES: ReadonlySet<string> = new Set(['Other', 'Invalid']);

type ChipTone = 'romance' | 'crush' | 'danger';

type ChipKind =
  | 'gender'
  | 'blood'
  | 'self_paired'
  | 'other_paired'
  | 'crush_type'
  | 'crush_fight'
  | 'crush_gender'
  | 'crush_blood'
  | 'crush_other';

export type ChipDescriptor = {
  kind: ChipKind;
  tone: ChipTone;
};

export function detectChips(
  c: CoupleConstraints | null,
  crushTypeAllowed: boolean,
  crushBlockedByFight: boolean,
  crushBlockedByPair: boolean,
  crushBlock: CrushBlock | null,
  crushBlockedByOther: boolean,
): ChipDescriptor[] {
  const out: ChipDescriptor[] = [];
  if (c) {
    if (c.gender) out.push({ kind: 'gender', tone: 'danger' });
    if (c.blood) out.push({ kind: 'blood', tone: 'romance' });
    if (c.selfActiveSlot !== null) out.push({ kind: 'self_paired', tone: 'romance' });
    if (c.otherActiveSlot !== null) out.push({ kind: 'other_paired', tone: 'romance' });
  }
  if (!crushTypeAllowed) {
    out.push({ kind: 'crush_type', tone: 'crush' });
  } else if (crushBlockedByFight) {
    out.push({ kind: 'crush_fight', tone: 'crush' });
  } else if (crushBlockedByPair && crushBlock) {
    const dupGender = crushBlock.reason === 'gender_incompatible' && c?.gender;
    const dupBlood = crushBlock.reason === 'blood_related' && c?.blood;
    if (!dupGender && !dupBlood) {
      out.push({
        kind: crushBlock.reason === 'gender_incompatible' ? 'crush_gender' : 'crush_blood',
        tone: 'crush',
      });
    }
  } else if (crushBlockedByOther) {
    out.push({ kind: 'crush_other', tone: 'crush' });
  }
  return out;
}

export type Translator = (key: string) => string;

type ChipText = { label: string; full: string; note?: string };

export type ChipView = ChipText & { tone: ChipTone };

export type ChipPopup = { title: string; body: string; note?: string };

const CHIP_LABEL_KEYS: Record<ChipKind, string> = {
  gender: 'mii.relations.chip.gender',
  blood: 'mii.relations.chip.blood',
  self_paired: 'mii.relations.chip.self_paired',
  other_paired: 'mii.relations.chip.other_paired',
  crush_type: 'mii.relations.chip.crush_type',
  crush_fight: 'mii.relations.chip.crush_fight',
  crush_gender: 'mii.relations.chip.crush_gender',
  crush_blood: 'mii.relations.chip.crush_blood',
  crush_other: 'mii.relations.chip.crush_other',
};

const CHIP_FULL_KEYS: Record<ChipKind, string> = {
  gender: 'mii.relations.couple_blocked_gender',
  blood: 'mii.relations.couple_blocked_blood',
  self_paired: 'mii.relations.couple_blocked_self_paired',
  other_paired: 'mii.relations.couple_blocked_other_paired',
  crush_type: 'mii.relations.crush_requires_friend_know',
  crush_fight: 'mii.relations.crush_blocked_by_fight',
  crush_gender: 'mii.relations.crush_blocked_gender',
  crush_blood: 'mii.relations.crush_blocked_blood',
  crush_other: 'mii.relations.crush_locked_existing',
};

const CHIP_KINDS_WITH_NOTE: ReadonlySet<ChipKind> = new Set(['gender', 'blood']);

export function chipText(d: ChipDescriptor, t: Translator): ChipText {
  const out: ChipText = {
    label: t(CHIP_LABEL_KEYS[d.kind]),
    full: t(CHIP_FULL_KEYS[d.kind]),
  };
  if (CHIP_KINDS_WITH_NOTE.has(d.kind)) out.note = t('mii.relations.popup_note_crush_too');
  return out;
}

export function blockReasonMessage(reason: CoupleBlock['reason'], t: Translator): string {
  switch (reason) {
    case 'gender_incompatible':
      return t('mii.relations.couple_blocked_gender');
    case 'blood_related':
      return t('mii.relations.couple_blocked_blood');
    case 'self_already_paired':
      return t('mii.relations.couple_blocked_self_paired');
    case 'other_already_paired':
      return t('mii.relations.couple_blocked_other_paired');
  }
}

export function unixSecsToDateTimeLocal(secs: bigint | null): string {
  if (secs === null || secs < 0n) return '';
  const n = Number(secs);
  if (!Number.isFinite(n)) return '';
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (x: number) => x.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function dateTimeLocalToUnixSecs(raw: string): bigint | null {
  const t = raw.trim();
  if (t.length === 0) return 0n;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  const secs = Math.floor(d.getTime() / 1000);
  if (!Number.isFinite(secs) || secs < 0) return null;
  return BigInt(secs);
}
