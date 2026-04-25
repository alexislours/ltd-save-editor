import { DataType } from '../sav/dataType';
import { murmur3_x86_32 } from '../sav/hash';

export type MiiFieldKind = 'string' | 'uint' | 'int' | 'enum';

export type MiiFieldPresentation = 'input' | 'slider';

export type MiiField = {
  label: string;
  name: string;
  hash: number;
  kind: MiiFieldKind;
  expectedType: DataType;
  hint?: string;
  min?: number;
  max?: number;
  displayOffset?: number;
  presentation?: MiiFieldPresentation;
};

export type MiiSection = {
  title: string;
  description?: string;
  fields: MiiField[];
};

function f(
  label: string,
  name: string,
  kind: MiiFieldKind,
  expectedType: DataType,
  extras: Partial<Pick<MiiField, 'hint' | 'min' | 'max' | 'displayOffset' | 'presentation'>> = {},
): MiiField {
  return {
    label,
    name,
    hash: murmur3_x86_32(name) >>> 0,
    kind,
    expectedType,
    ...extras,
  };
}

export const NAME_FIELD_NAME = 'Mii.Name.Name';
export const NAME_FIELD_HASH = murmur3_x86_32(NAME_FIELD_NAME) >>> 0;

export const MII_SECTIONS: MiiSection[] = [
  {
    title: 'Level',
    fields: [
      f('Mii level', 'Mii.MiiMisc.SatisfyInfo.Level', 'int', DataType.IntArray, {
        displayOffset: 1,
        min: 1,
      }),
      f('Level %', 'Mii.MiiMisc.SatisfyInfo.Meter', 'int', DataType.IntArray, {
        min: 0,
        max: 100,
        presentation: 'slider',
        hint: 'Progress through the current level (0–100).',
      }),
    ],
  },
  {
    title: 'Identity',
    fields: [
      f('Name', 'Mii.Name.Name', 'string', DataType.WString32Array),
      f('First-person word', 'Mii.Name.FirstPerson', 'string', DataType.WString32Array, {
        hint: 'How this Mii refers to themselves (e.g. "I", "me", or in Japanese 私/僕/俺).',
      }),
      f('Name pronunciation', 'Mii.Name.HowToCallName', 'string', DataType.WString64Array, {
        hint: 'Phonetic spelling used by voice playback.',
      }),
      f(
        'First-person pronunciation',
        'Mii.Name.HowToCallFirstPerson',
        'string',
        DataType.WString64Array,
        { hint: 'Phonetic spelling of the first-person word above.' },
      ),
      f('Third-person pronoun', 'Mii.Name.PronounType', 'enum', DataType.EnumArray, {
        hint: 'How others refer to this Mii (he / she / they).',
      }),
      f('Name language', 'Mii.Name.NameRegionLanguageID', 'enum', DataType.EnumArray),
      f(
        'First-person word language',
        'Mii.Name.FirstPersonRegionLanguageID',
        'enum',
        DataType.EnumArray,
      ),
    ],
  },
  {
    title: 'Wallet',
    fields: [
      f('Money', 'Mii.Belongings.Money', 'uint', DataType.UIntArray, {
        min: 0,
        hint: "This Mii's wallet, distinct from the player's Money on the Player tab. Often 0 in early-game saves.",
      }),
    ],
  },
  {
    title: 'Birthday',
    fields: [
      f('Day', 'Mii.MiiMisc.BirthdayInfo.Day', 'int', DataType.IntArray, {
        min: 1,
        max: 31,
      }),
      f('Month', 'Mii.MiiMisc.BirthdayInfo.Month', 'int', DataType.IntArray, {
        min: 1,
        max: 12,
      }),
      f('Year', 'Mii.MiiMisc.BirthdayInfo.Year', 'int', DataType.IntArray),
      f('Direct age', 'Mii.MiiMisc.BirthdayInfo.DirectAge', 'int', DataType.IntArray, {
        hint: '-1 means "use Year"; a positive value overrides the calculated age.',
      }),
      f('Age type', 'Mii.MiiMisc.BirthdayInfo.AgeType', 'enum', DataType.EnumArray),
    ],
  },
  {
    title: 'Personality',
    fields: [
      f('Activeness', 'Mii.CharacterParam.Activeness', 'int', DataType.IntArray),
      f('Audaciousness', 'Mii.CharacterParam.Audaciousness', 'int', DataType.IntArray),
      f('Common sense', 'Mii.CharacterParam.Commonsense', 'int', DataType.IntArray),
      f('Gaiety', 'Mii.CharacterParam.Gaiety', 'int', DataType.IntArray),
      f('Sociability', 'Mii.CharacterParam.Sociability', 'int', DataType.IntArray),
    ],
  },
  {
    title: 'Mood',
    fields: [
      f('Feeling', 'Mii.Feeling.Type', 'enum', DataType.EnumArray),
      f('Bond meter', 'Mii.MiiMisc.BondInfo.Meter', 'int', DataType.IntArray, {
        min: 0,
        max: 100,
      }),
    ],
  },
];
