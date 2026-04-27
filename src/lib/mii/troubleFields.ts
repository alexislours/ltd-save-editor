import { DataType } from '../sav/dataType';
import { murmur3_x86_32 } from '../sav/hash';
import type { TroubleTargetKey } from '../sav/troubleList.svelte';

export type TroubleField = {
  name: string;
  hash: number;
  type: DataType;
  perMii: number;
};

function f(name: string, type: DataType, perMii = 1): TroubleField {
  return { name, hash: murmur3_x86_32(name) >>> 0, type, perMii };
}

export const TROUBLE_FIELDS = {
  id: f('Mii.Trouble.Info.Id', DataType.UIntArray, 1),
  nextGameTime: f('Mii.Trouble.Info.NextGameTime', DataType.UInt64Array, 1),
  endGameTime: f('Mii.Trouble.Info.EndGameTime', DataType.UInt64Array, 1),
  targetMii: f('Mii.Trouble.Info.TargetMiiIndex', DataType.IntArray, 4),
  targetItemType: f('Mii.Trouble.Info.TargetItemType', DataType.IntArray, 1),
  targetFood: f('Mii.Trouble.Info.TargetFoodId', DataType.UIntArray, 1),
  targetGoods: f('Mii.Trouble.Info.TargetGoodsId', DataType.UIntArray, 1),
  targetCloth: f('Mii.Trouble.Info.TargetClothId', DataType.UIntArray, 1),
  targetCoordinate: f('Mii.Trouble.Info.TargetCoordinateId', DataType.UIntArray, 1),
  targetUgcFood: f('Mii.Trouble.Info.TargetUgcFoodIndex', DataType.IntArray, 1),
  targetUgcGoods: f('Mii.Trouble.Info.TargetUgcGoodsIndex', DataType.IntArray, 1),
  targetUgcText: f('Mii.Trouble.Info.TargetUgcTextIndex', DataType.IntArray, 1),
  targetPreset: f('Mii.Trouble.Info.TargetPresetIndex', DataType.IntArray, 1),
  mapObjId: f('Mii.Trouble.Info.TargetMapObject.MapObjectId', DataType.UIntArray, 5),
  mapObjX: f('Mii.Trouble.Info.TargetMapObject.GridPosX', DataType.IntArray, 5),
  mapObjY: f('Mii.Trouble.Info.TargetMapObject.GridPosY', DataType.IntArray, 5),
  isFirstDemoDone: f('Mii.Trouble.Info.IsFirstDemoDone', DataType.BoolArray, 1),
  childBirthBlockTime: f('Mii.Trouble.ChildBirthBlockTime', DataType.UInt64Array, 1),
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
