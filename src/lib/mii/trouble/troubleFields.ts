import { MII_SCHEMA } from '$lib/sav/schema';
import type { SchemaLeaf } from '$lib/sav/schema/leaf';
import type { TroubleTargetKey } from '$lib/sav/lists/troubleList.svelte';

type TroubleField = {
  leaf: SchemaLeaf;
  perMii: number;
};

function f(leaf: SchemaLeaf, perMii = 1): TroubleField {
  return { leaf, perMii };
}

export const TROUBLE_FIELDS = {
  id: f(MII_SCHEMA.Mii.Trouble.Info.Id, 1),
  nextGameTime: f(MII_SCHEMA.Mii.Trouble.Info.NextGameTime, 1),
  endGameTime: f(MII_SCHEMA.Mii.Trouble.Info.EndGameTime, 1),
  targetMii: f(MII_SCHEMA.Mii.Trouble.Info.TargetMiiIndex, 4),
  targetItemType: f(MII_SCHEMA.Mii.Trouble.Info.TargetItemType, 1),
  targetFood: f(MII_SCHEMA.Mii.Trouble.Info.TargetFoodId, 1),
  targetGoods: f(MII_SCHEMA.Mii.Trouble.Info.TargetGoodsId, 1),
  targetCloth: f(MII_SCHEMA.Mii.Trouble.Info.TargetClothId, 1),
  targetCoordinate: f(MII_SCHEMA.Mii.Trouble.Info.TargetCoordinateId, 1),
  targetUgcFood: f(MII_SCHEMA.Mii.Trouble.Info.TargetUgcFoodIndex, 1),
  targetUgcGoods: f(MII_SCHEMA.Mii.Trouble.Info.TargetUgcGoodsIndex, 1),
  targetUgcText: f(MII_SCHEMA.Mii.Trouble.Info.TargetUgcTextIndex, 1),
  targetPreset: f(MII_SCHEMA.Mii.Trouble.Info.TargetPresetIndex, 1),
  mapObjId: f(MII_SCHEMA.Mii.Trouble.Info.TargetMapObject.MapObjectId, 5),
  mapObjX: f(MII_SCHEMA.Mii.Trouble.Info.TargetMapObject.GridPosX, 5),
  mapObjY: f(MII_SCHEMA.Mii.Trouble.Info.TargetMapObject.GridPosY, 5),
  isFirstDemoDone: f(MII_SCHEMA.Mii.Trouble.Info.IsFirstDemoDone, 1),
  childBirthBlockTime: f(MII_SCHEMA.Mii.Trouble.ChildBirthBlockTime, 1),
} as const;

export type TroubleFieldKey = keyof typeof TROUBLE_FIELDS;

export const ITEM_TYPE_VALUES = [-1, 0, 1, 2, 3, 4, 5, 6, 7] as const;
export type ItemTypeValue = (typeof ITEM_TYPE_VALUES)[number];

export const ITEM_TYPE_LABEL_KEY: Record<ItemTypeValue, string> = {
  [-1]: 'invalid',
  0: 'food',
  1: 'goods',
  2: 'cloth',
  3: 'coordinate',
  4: 'mapObject',
  5: 'mapFloor',
  6: 'ugcFood',
  7: 'ugcGoods',
};

export const TARGET_FIELD_KEYS: TroubleFieldKey[] = [
  'targetMii',
  'targetItemType',
  'targetFood',
  'targetGoods',
  'targetCloth',
  'targetCoordinate',
  'targetUgcFood',
  'targetUgcGoods',
  'targetUgcText',
  'targetPreset',
  'mapObjId',
  'mapObjX',
  'mapObjY',
];

export const TROUBLE_TARGET_FIELDS: Record<TroubleTargetKey, TroubleFieldKey[]> = {
  targetMii: ['targetMii'],
  targetItemType: ['targetItemType'],
  targetFood: ['targetFood'],
  targetGoods: ['targetGoods'],
  targetCloth: ['targetCloth'],
  targetCoordinate: ['targetCoordinate'],
  targetUgcFood: ['targetUgcFood'],
  targetUgcGoods: ['targetUgcGoods'],
  targetUgcText: ['targetUgcText'],
  targetPreset: ['targetPreset'],
  targetMapObject: ['mapObjId', 'mapObjX', 'mapObjY'],
};
