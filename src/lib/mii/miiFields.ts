import { DataType } from '$lib/sav/dataType';
import { MII_SCHEMA } from '$lib/sav/schema';
import type { SchemaLeaf } from '$lib/sav/schema/leaf';

type MiiFieldKind = 'string' | 'uint' | 'int' | 'enum' | 'binary';

type MiiFieldPresentation = 'input' | 'slider';

export type MiiField = {
  labelKey: string;
  leaf: SchemaLeaf;
  kind: MiiFieldKind;
  hintKey?: string;
  min?: number;
  max?: number;
  displayOffset?: number;
  presentation?: MiiFieldPresentation;
};

type MiiSection = {
  titleKey: string;
  descriptionKey?: string;
  fields: MiiField[];
  spoilerFields?: MiiField[];
  postSpoilerFields?: MiiField[];
};

const STRING_ARRAY_TYPES: ReadonlySet<DataType> = new Set([
  DataType.String16Array,
  DataType.String32Array,
  DataType.String64Array,
  DataType.WString16Array,
  DataType.WString32Array,
  DataType.WString64Array,
]);

function expectedTypeFor(kind: MiiFieldKind): DataType | ReadonlySet<DataType> {
  switch (kind) {
    case 'string':
      return STRING_ARRAY_TYPES;
    case 'uint':
      return DataType.UIntArray;
    case 'int':
      return DataType.IntArray;
    case 'enum':
      return DataType.EnumArray;
    case 'binary':
      return DataType.BinaryArray;
  }
}

function validateKind(kind: MiiFieldKind, type: DataType): void {
  const allowed = expectedTypeFor(kind);
  const ok = allowed instanceof Set ? allowed.has(type) : allowed === type;
  if (!ok) {
    throw new Error(`MiiField kind '${kind}' is incompatible with schema type ${type}`);
  }
}

function f(
  labelKey: string,
  leaf: SchemaLeaf,
  kind: MiiFieldKind,
  extras: Partial<
    Pick<MiiField, 'hintKey' | 'min' | 'max' | 'displayOffset' | 'presentation'>
  > = {},
): MiiField {
  validateKind(kind, leaf.type);
  return { labelKey, leaf, kind, ...extras };
}

export const MII_SECTIONS: MiiSection[] = [
  {
    titleKey: 'level',
    fields: [
      f('level', MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Level, 'int', {
        displayOffset: 1,
        min: 1,
      }),
      f('level_meter', MII_SCHEMA.Mii.MiiMisc.SatisfyInfo.Meter, 'int', {
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
      f('name', MII_SCHEMA.Mii.Name.Name, 'string'),
      f('first_person', MII_SCHEMA.Mii.Name.FirstPerson, 'string', {
        hintKey: 'first_person_hint',
      }),
      f('name_pronunciation', MII_SCHEMA.Mii.Name.HowToCallName, 'string', {
        hintKey: 'name_pronunciation_hint',
      }),
      f('first_person_pronunciation', MII_SCHEMA.Mii.Name.HowToCallFirstPerson, 'string', {
        hintKey: 'first_person_pronunciation_hint',
      }),
      f('pronoun_type', MII_SCHEMA.Mii.Name.PronounType, 'enum', {
        hintKey: 'pronoun_type_hint',
      }),
      f('gender', MII_SCHEMA.Mii.MiiMisc.FaceInfo.Gender, 'enum', {
        hintKey: 'gender_hint',
      }),
      f('name_language', MII_SCHEMA.Mii.Name.NameRegionLanguageID, 'enum'),
      f('first_person_language', MII_SCHEMA.Mii.Name.FirstPersonRegionLanguageID, 'enum'),
    ],
  },
  {
    titleKey: 'wallet',
    fields: [
      f('money', MII_SCHEMA.Mii.Belongings.Money, 'uint', {
        min: 0,
        hintKey: 'money_hint',
      }),
    ],
  },
  {
    titleKey: 'birthday',
    fields: [
      f('birthday_day', MII_SCHEMA.Mii.MiiMisc.BirthdayInfo.Day, 'int', {
        min: 1,
        max: 31,
      }),
      f('birthday_month', MII_SCHEMA.Mii.MiiMisc.BirthdayInfo.Month, 'int', {
        min: 1,
        max: 12,
      }),
      f('birthday_year', MII_SCHEMA.Mii.MiiMisc.BirthdayInfo.Year, 'int'),
      f('direct_age', MII_SCHEMA.Mii.MiiMisc.BirthdayInfo.DirectAge, 'int', {
        hintKey: 'direct_age_hint',
      }),
      f('age_type', MII_SCHEMA.Mii.MiiMisc.BirthdayInfo.AgeType, 'enum'),
    ],
  },
  {
    titleKey: 'personality',
    fields: [
      f('activeness', MII_SCHEMA.Mii.CharacterParam.Activeness, 'int'),
      f('audaciousness', MII_SCHEMA.Mii.CharacterParam.Audaciousness, 'int'),
      f('common_sense', MII_SCHEMA.Mii.CharacterParam.Commonsense, 'int'),
      f('gaiety', MII_SCHEMA.Mii.CharacterParam.Gaiety, 'int'),
      f('sociability', MII_SCHEMA.Mii.CharacterParam.Sociability, 'int'),
    ],
  },
  {
    titleKey: 'mood',
    fields: [
      f('feeling', MII_SCHEMA.Mii.Feeling.Type, 'enum'),
      f('bond_meter', MII_SCHEMA.Mii.MiiMisc.BondInfo.Meter, 'int', {
        min: 0,
        max: 100,
      }),
    ],
  },
  {
    titleKey: 'food',
    fields: [
      f('eat_fullness', MII_SCHEMA.Mii.MiiMisc.EatInfo.EatFullness, 'int', {
        min: 0,
        max: 100,
        presentation: 'slider',
      }),
    ],
    spoilerFields: [
      f('ultra_best_id', MII_SCHEMA.Mii.MiiMisc.EatInfo.UltraBestId, 'uint', { min: 0 }),
      f('best_id', MII_SCHEMA.Mii.MiiMisc.EatInfo.BestId, 'uint', { min: 0 }),
      f('ultra_worst_id', MII_SCHEMA.Mii.MiiMisc.EatInfo.UltraWorstId, 'uint', { min: 0 }),
      f('worst_id', MII_SCHEMA.Mii.MiiMisc.EatInfo.WorstId, 'uint', { min: 0 }),
    ],
    postSpoilerFields: [
      f('ranked_food_id', MII_SCHEMA.Mii.MiiMisc.EatInfo.RankedFoodId.Id, 'uint', {
        hintKey: 'ranked_food_id_hint',
      }),
      f('given_flag', MII_SCHEMA.Mii.MiiMisc.EatInfo.GivenFlag, 'binary'),
    ],
  },
];
