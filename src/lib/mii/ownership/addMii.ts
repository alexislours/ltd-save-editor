import { DataType, murmur3_x86_32 } from '@alexislours/ltd-savedata';
import { MII_SCHEMA, type SchemaLeaf } from '@alexislours/ltd-savedata/schema';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';
import { nowSeconds } from '$lib/mii/trouble/troubleTime';
import { DEFAULT_CHAR_INFO_EX } from './defaultCharInfoEx';
import { isAllZero, populatedMiiIndices } from './populated';
import { writeRelationDirection } from './relations';

const M = MII_SCHEMA.Mii;
const NAME = M.Name.Name;
const CHAR = M.CharInfoEx;
const REL = MII_SCHEMA.Relation.Info;

const MALE = murmur3_x86_32('Male') >>> 0;
const USEN = murmur3_x86_32('USen') >>> 0;
const HE = murmur3_x86_32('He') >>> 0;
const BOY = murmur3_x86_32('Boy') >>> 0;
const JPJA = murmur3_x86_32('JPja') >>> 0;

export const CLOTH_OWN_STRIDE = 1200;
export const COORDINATE_OWN_STRIDE = 400;
export const CLOTH_OWN_SUBINDICES = [77, 246, 339, 382];
export const STARTER_COORDINATE = 6956255;
const RELATION_METER = 100;

function isSchemaLeaf(node: unknown): node is SchemaLeaf {
  return typeof node === 'object' && node !== null && 'hash' in node && 'type' in node;
}

function collectLeaves(node: unknown, out: SchemaLeaf[]): SchemaLeaf[] {
  if (isSchemaLeaf(node)) {
    out.push(node);
    return out;
  }
  if (typeof node === 'object' && node !== null) {
    for (const value of Object.values(node)) collectLeaves(value, out);
  }
  return out;
}

const BELONGINGS_LEAVES = collectLeaves(M.Belongings, []);

export function clearBelongings(mii: MiiAccessor, index: number, capacity: number): void {
  for (const leaf of BELONGINGS_LEAVES) {
    if (!mii.has(leaf)) continue;
    const len = (mii.get(leaf) as unknown[]).length;
    if (capacity === 0 || len % capacity !== 0) continue;
    const stride = len / capacity;
    let value: unknown;
    switch (leaf.type) {
      case DataType.BoolArray:
        value = false;
        break;
      case DataType.Int64Array:
      case DataType.UInt64Array:
        value = 0n;
        break;
      case DataType.UIntArray:
      case DataType.EnumArray:
        value = 0;
        break;
      case DataType.IntArray:
        value = -1;
        break;
      default:
        continue;
    }
    for (let s = 0; s < stride; s++) mii.setElement(leaf, index * stride + s, value as never);
  }
}

function relationSlot(a: number, b: number, capacity: number): number {
  return (a * (2 * capacity - a - 1)) / 2 + (b - a - 1);
}

export function linkMii(
  mii: MiiAccessor,
  a: number,
  b: number,
  capacity: number,
  now: bigint,
): void {
  if (!mii.has(REL.RelationId.Id_a) || !mii.has(REL.RelationId.Id_b)) return;
  const slot = relationSlot(a, b, capacity);
  mii.setElement(REL.RelationId.Id_a, slot, a);
  mii.setElement(REL.RelationId.Id_b, slot, b);
  if (mii.has(REL.TypeSetTime)) mii.setElement(REL.TypeSetTime, slot, now);
  if (mii.has(REL.IsFight)) mii.setElement(REL.IsFight, slot, false);
  if (mii.has(REL.IsNotifiedBloodTypeCouple)) {
    mii.setElement(REL.IsNotifiedBloodTypeCouple, slot, false);
  }
  for (const dir of [2 * slot, 2 * slot + 1]) writeRelationDirection(mii, dir, RELATION_METER);
}

export function firstEmptyMiiSlot(mii: MiiAccessor): number {
  if (!mii.has(NAME) || !mii.has(CHAR)) return -1;
  const names = mii.get(NAME);
  const chars = mii.get(CHAR);
  const limit = Math.min(names.length, chars.length);
  for (let i = 0; i < limit; i++) {
    if (names[i].length > 0) continue;
    if (isAllZero(chars[i])) return i;
  }
  return -1;
}

export function addMii(mii: MiiAccessor): number {
  const index = firstEmptyMiiSlot(mii);
  if (index < 0) return -1;
  const capacity = mii.get(NAME).length;
  const existing = populatedMiiIndices(mii);
  const order = existing.length;
  const now = nowSeconds();

  clearBelongings(mii, index, capacity);

  if (mii.has(M.HomeLiveTime.CacheOwnerNum)) mii.setElement(M.HomeLiveTime.CacheOwnerNum, index, 0);
  if (mii.has(M.HomeLiveTime.StartLiveTogetherTime)) {
    mii.setElement(M.HomeLiveTime.StartLiveTogetherTime, index, 0n);
  }
  if (mii.has(M.Location.HouseMapId)) mii.setElement(M.Location.HouseMapId, index, -1);

  if (mii.has(M.MiiMisc.BalloonTalkInfo.LastTalkGameTime)) {
    mii.setElement(M.MiiMisc.BalloonTalkInfo.LastTalkGameTime, index, 0n);
  }
  if (mii.has(M.MiiMisc.BalloonTalkInfo.LastTalkHistoryId)) {
    mii.setElement(M.MiiMisc.BalloonTalkInfo.LastTalkHistoryId, index, 0n);
  }
  if (mii.has(M.MiiMisc.ClothInfo.NextClothWantGameTime)) {
    mii.setElement(M.MiiMisc.ClothInfo.NextClothWantGameTime, index, 0n);
  }
  if (mii.has(M.MiiMisc.EatInfo.EatFullness))
    mii.setElement(M.MiiMisc.EatInfo.EatFullness, index, 0);
  if (mii.has(M.MiiMisc.EatInfo.LastEatId.Id)) {
    mii.setElement(M.MiiMisc.EatInfo.LastEatId.Id, index, 0);
  }
  if (mii.has(M.MiiMisc.EatInfo.LastEatId.UgcIndex)) {
    mii.setElement(M.MiiMisc.EatInfo.LastEatId.UgcIndex, index, -1);
  }
  if (mii.has(M.MiiMisc.EatInfo.LastFoodGiveTime)) {
    mii.setElement(M.MiiMisc.EatInfo.LastFoodGiveTime, index, 0n);
  }
  for (let s = 0; s < 3; s++) {
    if (mii.has(M.MiiMisc.EatInfo.RankedFoodId.Id)) {
      mii.setElement(M.MiiMisc.EatInfo.RankedFoodId.Id, index * 3 + s, 0);
    }
    if (mii.has(M.MiiMisc.EatInfo.RankedFoodId.UgcIndex)) {
      mii.setElement(M.MiiMisc.EatInfo.RankedFoodId.UgcIndex, index * 3 + s, -1);
    }
  }
  if (mii.has(M.MiiMisc.EatInfo.TasteType)) mii.setElement(M.MiiMisc.EatInfo.TasteType, index, 0);

  if (mii.has(M.MiiMisc.PatInfo.LastPatGameTime)) {
    mii.setElement(M.MiiMisc.PatInfo.LastPatGameTime, index, 0n);
  }
  if (mii.has(M.MiiMisc.SatisfyInfo.Level)) mii.setElement(M.MiiMisc.SatisfyInfo.Level, index, 0);
  if (mii.has(M.MiiMisc.SatisfyInfo.Meter)) mii.setElement(M.MiiMisc.SatisfyInfo.Meter, index, 0);
  if (mii.has(M.MiiMisc.SatisfyInfo.LastMiiTouchGameTime)) {
    mii.setElement(M.MiiMisc.SatisfyInfo.LastMiiTouchGameTime, index, 0n);
  }
  if (mii.has(M.MiiMisc.SatisfyInfo.DepressGameTime)) {
    mii.setElement(M.MiiMisc.SatisfyInfo.DepressGameTime, index, 0n);
  }

  mii.setElement(CHAR, index, new Uint8Array(DEFAULT_CHAR_INFO_EX));
  mii.setElement(NAME, index, `Mii ${index + 1}`);
  if (mii.has(M.Name.HowToCallName)) mii.setElement(M.Name.HowToCallName, index, '');
  if (mii.has(M.Name.FirstPersonRegionLanguageID)) {
    mii.setElement(M.Name.FirstPersonRegionLanguageID, index, JPJA);
  }
  if (mii.has(M.Name.NameRegionLanguageID)) {
    mii.setElement(M.Name.NameRegionLanguageID, index, USEN);
  }
  if (mii.has(M.Name.PronounType)) mii.setElement(M.Name.PronounType, index, HE);

  if (mii.has(M.CharacterParam.Activeness)) mii.setElement(M.CharacterParam.Activeness, index, 4);
  if (mii.has(M.CharacterParam.Audaciousness)) {
    mii.setElement(M.CharacterParam.Audaciousness, index, 4);
  }
  if (mii.has(M.CharacterParam.Commonsense)) mii.setElement(M.CharacterParam.Commonsense, index, 4);
  if (mii.has(M.CharacterParam.Gaiety)) mii.setElement(M.CharacterParam.Gaiety, index, 4);
  if (mii.has(M.CharacterParam.Sociability)) mii.setElement(M.CharacterParam.Sociability, index, 4);

  if (mii.has(M.HomeLiveTime.CacheMapId)) mii.setElement(M.HomeLiveTime.CacheMapId, index, -1);

  if (mii.has(M.MiiMisc.BirthdayInfo.Day)) mii.setElement(M.MiiMisc.BirthdayInfo.Day, index, 1);
  if (mii.has(M.MiiMisc.BirthdayInfo.Month)) mii.setElement(M.MiiMisc.BirthdayInfo.Month, index, 1);
  if (mii.has(M.MiiMisc.BirthdayInfo.Year)) {
    mii.setElement(M.MiiMisc.BirthdayInfo.Year, index, 2008);
  }

  if (mii.has(M.MiiMisc.BondInfo.Meter)) mii.setElement(M.MiiMisc.BondInfo.Meter, index, 30);

  if (mii.has(M.MiiMisc.ClothInfo.ClothStyle)) {
    mii.setElement(M.MiiMisc.ClothInfo.ClothStyle, index, MALE);
  }
  if (mii.has(M.MiiMisc.ClothInfo.Coordinate.KeyHash)) {
    mii.setElement(M.MiiMisc.ClothInfo.Coordinate.KeyHash, index, STARTER_COORDINATE);
  }

  if (mii.has(M.MiiMisc.EatInfo.BestId)) mii.setElement(M.MiiMisc.EatInfo.BestId, index, 483471761);
  if (mii.has(M.MiiMisc.EatInfo.WorstId)) {
    mii.setElement(M.MiiMisc.EatInfo.WorstId, index, 265872936);
  }
  if (mii.has(M.MiiMisc.EatInfo.UltraBestId)) {
    mii.setElement(M.MiiMisc.EatInfo.UltraBestId, index, 845726879);
  }
  if (mii.has(M.MiiMisc.EatInfo.UltraWorstId)) {
    mii.setElement(M.MiiMisc.EatInfo.UltraWorstId, index, 2599070240);
  }
  if (mii.has(M.MiiMisc.EatInfo.GivenFlag)) {
    mii.setElement(M.MiiMisc.EatInfo.GivenFlag, index, new Uint8Array(128));
  }
  if (mii.has(M.MiiMisc.EatInfo.GivenUgcFlag)) {
    mii.setElement(M.MiiMisc.EatInfo.GivenUgcFlag, index, new Uint8Array(16));
  }

  if (mii.has(M.MiiMisc.EntryInfo.NewEntryGameTime)) {
    mii.setElement(M.MiiMisc.EntryInfo.NewEntryGameTime, index, now);
  }
  if (mii.has(M.MiiMisc.EntryInfo.SortIndex)) {
    mii.setElement(M.MiiMisc.EntryInfo.SortIndex, index, order);
  }

  if (mii.has(M.MiiMisc.FaceInfo.Gender)) mii.setElement(M.MiiMisc.FaceInfo.Gender, index, MALE);
  if (mii.has(M.MiiMisc.FaceInfo.HairChangeOrdered)) {
    mii.setElement(M.MiiMisc.FaceInfo.HairChangeOrdered, index, 0);
  }
  if (mii.has(M.MiiMisc.FaceInfo.IsLoveGender)) {
    mii.setElement(M.MiiMisc.FaceInfo.IsLoveGender, index * 3 + 1, true);
  }
  if (mii.has(M.MiiMisc.FaceInfo.PrevHairChangeCharInfo)) {
    mii.setElement(M.MiiMisc.FaceInfo.PrevHairChangeCharInfo, index, new Uint8Array(152));
  }

  if (mii.has(M.Trouble.Info.NextGameTime)) {
    mii.setElement(M.Trouble.Info.NextGameTime, index, now);
  }

  if (mii.has(M.Voice.Formant)) mii.setElement(M.Voice.Formant, index, 28);
  if (mii.has(M.Voice.Pitch)) mii.setElement(M.Voice.Pitch, index, 28);
  if (mii.has(M.Voice.Speed)) mii.setElement(M.Voice.Speed, index, 25);
  if (mii.has(M.Voice.Tension)) mii.setElement(M.Voice.Tension, index, 5);
  if (mii.has(M.Voice.PresetType)) mii.setElement(M.Voice.PresetType, index, BOY);

  if (mii.has(M.Belongings.ClothOwnInfo)) {
    const base = index * CLOTH_OWN_STRIDE;
    for (const sub of CLOTH_OWN_SUBINDICES)
      mii.setElement(M.Belongings.ClothOwnInfo, base + sub, 1);
  }
  if (mii.has(M.Belongings.CoordinateOwnInfo)) {
    mii.setElement(M.Belongings.CoordinateOwnInfo, index * COORDINATE_OWN_STRIDE, 1);
  }

  for (const j of existing) {
    linkMii(mii, Math.min(j, index), Math.max(j, index), capacity, now);
  }

  return index;
}
