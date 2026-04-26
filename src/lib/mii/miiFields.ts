import { DataType } from '../sav/dataType';
import { murmur3_x86_32 } from '../sav/hash';

export type MiiFieldKind = 'string' | 'uint' | 'int' | 'enum';

export type MiiFieldPresentation = 'input' | 'slider';

export type MiiField = {
  /** i18n key under `mii.fields.<labelKey>`. */
  labelKey: string;
  name: string;
  hash: number;
  kind: MiiFieldKind;
  expectedType: DataType;
  /** i18n key under `mii.fields.<hintKey>`, optional. */
  hintKey?: string;
  min?: number;
  max?: number;
  displayOffset?: number;
  presentation?: MiiFieldPresentation;
};

export type MiiSection = {
  /** i18n key under `mii.sections.<titleKey>`. */
  titleKey: string;
  /** i18n key under `mii.sections.<descriptionKey>`, optional. */
  descriptionKey?: string;
  fields: MiiField[];
  spoilerFields?: MiiField[];
  postSpoilerFields?: MiiField[];
};

function f(
  labelKey: string,
  name: string,
  kind: MiiFieldKind,
  expectedType: DataType,
  extras: Partial<
    Pick<MiiField, 'hintKey' | 'min' | 'max' | 'displayOffset' | 'presentation'>
  > = {},
): MiiField {
  return {
    labelKey,
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
    titleKey: 'level',
    fields: [
      f('level', 'Mii.MiiMisc.SatisfyInfo.Level', 'int', DataType.IntArray, {
        displayOffset: 1,
        min: 1,
      }),
      f('level_meter', 'Mii.MiiMisc.SatisfyInfo.Meter', 'int', DataType.IntArray, {
        min: 0,
        max: 100,
        presentation: 'slider',
        hintKey: 'level_meter_hint',
      }),
    ],
  },
  {
    titleKey: 'identity',
    fields: [
      f('name', 'Mii.Name.Name', 'string', DataType.WString32Array),
      f('first_person', 'Mii.Name.FirstPerson', 'string', DataType.WString32Array, {
        hintKey: 'first_person_hint',
      }),
      f('name_pronunciation', 'Mii.Name.HowToCallName', 'string', DataType.WString64Array, {
        hintKey: 'name_pronunciation_hint',
      }),
      f(
        'first_person_pronunciation',
        'Mii.Name.HowToCallFirstPerson',
        'string',
        DataType.WString64Array,
        { hintKey: 'first_person_pronunciation_hint' },
      ),
      f('pronoun_type', 'Mii.Name.PronounType', 'enum', DataType.EnumArray, {
        hintKey: 'pronoun_type_hint',
      }),
      f('gender', 'Mii.MiiMisc.FaceInfo.Gender', 'enum', DataType.EnumArray, {
        hintKey: 'gender_hint',
      }),
      f('name_language', 'Mii.Name.NameRegionLanguageID', 'enum', DataType.EnumArray),
      f(
        'first_person_language',
        'Mii.Name.FirstPersonRegionLanguageID',
        'enum',
        DataType.EnumArray,
      ),
    ],
  },
  {
    titleKey: 'wallet',
    fields: [
      f('money', 'Mii.Belongings.Money', 'uint', DataType.UIntArray, {
        min: 0,
        hintKey: 'money_hint',
      }),
    ],
  },
  {
    titleKey: 'birthday',
    fields: [
      f('birthday_day', 'Mii.MiiMisc.BirthdayInfo.Day', 'int', DataType.IntArray, {
        min: 1,
        max: 31,
      }),
      f('birthday_month', 'Mii.MiiMisc.BirthdayInfo.Month', 'int', DataType.IntArray, {
        min: 1,
        max: 12,
      }),
      f('birthday_year', 'Mii.MiiMisc.BirthdayInfo.Year', 'int', DataType.IntArray),
      f('direct_age', 'Mii.MiiMisc.BirthdayInfo.DirectAge', 'int', DataType.IntArray, {
        hintKey: 'direct_age_hint',
      }),
      f('age_type', 'Mii.MiiMisc.BirthdayInfo.AgeType', 'enum', DataType.EnumArray),
    ],
  },
  {
    titleKey: 'personality',
    fields: [
      f('activeness', 'Mii.CharacterParam.Activeness', 'int', DataType.IntArray),
      f('audaciousness', 'Mii.CharacterParam.Audaciousness', 'int', DataType.IntArray),
      f('common_sense', 'Mii.CharacterParam.Commonsense', 'int', DataType.IntArray),
      f('gaiety', 'Mii.CharacterParam.Gaiety', 'int', DataType.IntArray),
      f('sociability', 'Mii.CharacterParam.Sociability', 'int', DataType.IntArray),
    ],
  },
  {
    titleKey: 'mood',
    fields: [
      f('feeling', 'Mii.Feeling.Type', 'enum', DataType.EnumArray),
      f('bond_meter', 'Mii.MiiMisc.BondInfo.Meter', 'int', DataType.IntArray, {
        min: 0,
        max: 100,
      }),
    ],
  },
  {
    titleKey: 'food',
    fields: [
      f('eat_fullness', 'Mii.MiiMisc.EatInfo.EatFullness', 'int', DataType.IntArray, {
        min: 0,
        max: 100,
        presentation: 'slider',
      }),
    ],
    spoilerFields: [
      f('ultra_best_id', 'Mii.MiiMisc.EatInfo.UltraBestId', 'uint', DataType.UIntArray, {
        min: 0,
      }),
      f('best_id', 'Mii.MiiMisc.EatInfo.BestId', 'uint', DataType.UIntArray, {
        min: 0,
      }),
      f('ultra_worst_id', 'Mii.MiiMisc.EatInfo.UltraWorstId', 'uint', DataType.UIntArray, {
        min: 0,
      }),
      f('worst_id', 'Mii.MiiMisc.EatInfo.WorstId', 'uint', DataType.UIntArray, {
        min: 0,
      }),
    ],
    postSpoilerFields: [
      f('ranked_food_id', 'Mii.MiiMisc.EatInfo.RankedFoodId.Id', 'uint', DataType.UIntArray, {
        hintKey: 'ranked_food_id_hint',
      }),
      f('given_flag', 'Mii.MiiMisc.EatInfo.GivenFlag', 'uint', DataType.BinaryArray),
    ],
  },
];
