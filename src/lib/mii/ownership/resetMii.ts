import { murmur3_x86_32 } from '@alexislours/ltd-savedata';
import { MII_SCHEMA, type SchemaLeaf } from '@alexislours/ltd-savedata/schema';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';
import { playerAccessor } from '$lib/player/playerEditor.svelte';
import { evictForDeletion, recoverableRoomStyles } from '$lib/map/residents/residents.svelte';
import { randomizeFoodRanks } from '$lib/mii/randomizeFoodRanks';
import { nowSeconds } from '$lib/mii/trouble/troubleTime';
import { clearTroubleSlot } from '$lib/mii/trouble/troubleFields';
import {
  CLOTH_OWN_STRIDE,
  CLOTH_OWN_SUBINDICES,
  COORDINATE_OWN_STRIDE,
  STARTER_COORDINATE,
  clearBelongings,
  linkMii,
} from './addMii';
import { clearTroubleTargeting, recoverInteriorStyles } from './deleteMii';
import { populatedMiiIndices } from './populated';

const M = MII_SCHEMA.Mii;
const EAT = M.MiiMisc.EatInfo;
const CLOTH = M.MiiMisc.ClothInfo;

const MALE_STYLE = murmur3_x86_32('Male') >>> 0;
const FEMALE_STYLE = murmur3_x86_32('Female') >>> 0;
const FEMALE_GENDER = murmur3_x86_32('Female') >>> 0;

const DEFAULT_BOND_METER = 30;
const TASTE_TYPE_COUNT = 4;

const WORN_CLOTH_SLOTS = [
  CLOTH.All,
  CLOTH.Tops,
  CLOTH.Topslong,
  CLOTH.BottomsA,
  CLOTH.BottomsB,
  CLOTH.Shoes,
  CLOTH.Headwear,
  CLOTH.Accessory,
];

const CLOTH_UGC_LEAVES: readonly SchemaLeaf[] = [
  CLOTH.TopsUGCIndex,
  CLOTH.BottomsUGCIndex,
  CLOTH.HeadwearUGCIndex,
];

function clothStyleForGender(mii: MiiAccessor, index: number): number {
  if (!mii.has(M.MiiMisc.FaceInfo.Gender)) return MALE_STYLE;
  const gender = mii.getElement(M.MiiMisc.FaceInfo.Gender, index) >>> 0;
  return gender === FEMALE_GENDER ? FEMALE_STYLE : MALE_STYLE;
}

function resetExperience(mii: MiiAccessor, index: number): void {
  if (mii.has(M.MiiMisc.SatisfyInfo.Level)) mii.setElement(M.MiiMisc.SatisfyInfo.Level, index, 0);
  if (mii.has(M.MiiMisc.SatisfyInfo.Meter)) mii.setElement(M.MiiMisc.SatisfyInfo.Meter, index, 0);
  if (mii.has(M.MiiMisc.SatisfyInfo.LastMiiTouchGameTime)) {
    mii.setElement(M.MiiMisc.SatisfyInfo.LastMiiTouchGameTime, index, 0n);
  }
  if (mii.has(M.MiiMisc.SatisfyInfo.DepressGameTime)) {
    mii.setElement(M.MiiMisc.SatisfyInfo.DepressGameTime, index, 0n);
  }
  if (mii.has(M.MiiMisc.BondInfo.Meter)) {
    mii.setElement(M.MiiMisc.BondInfo.Meter, index, DEFAULT_BOND_METER);
  }
}

function resetFood(mii: MiiAccessor, index: number): void {
  if (mii.has(EAT.GivenFlag)) mii.setElement(EAT.GivenFlag, index, new Uint8Array(128));
  if (mii.has(EAT.GivenUgcFlag)) mii.setElement(EAT.GivenUgcFlag, index, new Uint8Array(16));
  if (mii.has(EAT.EatFullness)) mii.setElement(EAT.EatFullness, index, 0);
  if (mii.has(EAT.LastEatId.Id)) mii.setElement(EAT.LastEatId.Id, index, 0);
  if (mii.has(EAT.LastEatId.UgcIndex)) mii.setElement(EAT.LastEatId.UgcIndex, index, -1);
  if (mii.has(EAT.LastFoodGiveTime)) mii.setElement(EAT.LastFoodGiveTime, index, 0n);
  for (let s = 0; s < 3; s++) {
    if (mii.has(EAT.RankedFoodId.Id)) mii.setElement(EAT.RankedFoodId.Id, index * 3 + s, 0);
    if (mii.has(EAT.RankedFoodId.UgcIndex))
      mii.setElement(EAT.RankedFoodId.UgcIndex, index * 3 + s, -1);
  }
  if (mii.has(EAT.TasteType)) {
    mii.setElement(EAT.TasteType, index, Math.floor(Math.random() * TASTE_TYPE_COUNT));
  }
  randomizeFoodRanks(mii, index);
}

function resetClothing(mii: MiiAccessor, index: number): void {
  if (mii.has(CLOTH.ClothStyle)) {
    mii.setElement(CLOTH.ClothStyle, index, clothStyleForGender(mii, index));
  }
  if (mii.has(CLOTH.Coordinate.KeyHash)) {
    mii.setElement(CLOTH.Coordinate.KeyHash, index, STARTER_COORDINATE);
  }
  if (mii.has(CLOTH.Coordinate.ColorIndex)) mii.setElement(CLOTH.Coordinate.ColorIndex, index, 0);
  for (const slot of WORN_CLOTH_SLOTS) {
    if (mii.has(slot.KeyHash)) mii.setElement(slot.KeyHash, index, 0);
    if (mii.has(slot.ColorIndex)) mii.setElement(slot.ColorIndex, index, 0);
  }
  for (const leaf of CLOTH_UGC_LEAVES) {
    if (mii.has(leaf)) mii.setElement(leaf, index, -1);
  }
  if (mii.has(CLOTH.IsTopsIn)) mii.setElement(CLOTH.IsTopsIn, index, false);
  if (mii.has(CLOTH.NextClothWantGameTime)) mii.setElement(CLOTH.NextClothWantGameTime, index, 0n);

  if (mii.has(M.Belongings.ClothOwnInfo)) {
    const base = index * CLOTH_OWN_STRIDE;
    for (const sub of CLOTH_OWN_SUBINDICES)
      mii.setElement(M.Belongings.ClothOwnInfo, base + sub, 1);
  }
  if (mii.has(M.Belongings.CoordinateOwnInfo)) {
    mii.setElement(M.Belongings.CoordinateOwnInfo, index * COORDINATE_OWN_STRIDE, 1);
  }
}

function clearFeeling(mii: MiiAccessor, index: number): void {
  if (mii.has(M.Feeling.Type)) mii.setElement(M.Feeling.Type, index, 0);
  if (mii.has(M.Feeling.FeelingEndGameTime)) {
    mii.setElement(M.Feeling.FeelingEndGameTime, index, 0n);
  }
  if (mii.has(M.Feeling.MiiHistoryId)) mii.setElement(M.Feeling.MiiHistoryId, index, -1n);
}

function resetHousing(mii: MiiAccessor, index: number): void {
  if (mii.has(M.Location.HouseMapId)) mii.setElement(M.Location.HouseMapId, index, -1);
  if (mii.has(M.Location.RoomIndex)) mii.setElement(M.Location.RoomIndex, index, -1);
  if (mii.has(M.HomeLiveTime.CacheMapId)) mii.setElement(M.HomeLiveTime.CacheMapId, index, -1);
  if (mii.has(M.HomeLiveTime.CacheOwnerNum)) mii.setElement(M.HomeLiveTime.CacheOwnerNum, index, 0);
  if (mii.has(M.HomeLiveTime.StartLiveTogetherTime)) {
    mii.setElement(M.HomeLiveTime.StartLiveTogetherTime, index, 0n);
  }
}

export function resetMii(mii: MiiAccessor, index: number): void {
  const capacity = mii.has(M.Name.Name) ? mii.get(M.Name.Name).length : 0;
  const now = nowSeconds();

  const recoveredStyles = recoverableRoomStyles(index);
  evictForDeletion(index);

  clearBelongings(mii, index, capacity);

  resetExperience(mii, index);
  resetFood(mii, index);
  resetClothing(mii, index);
  resetHousing(mii, index);
  clearFeeling(mii, index);

  if (mii.has(M.MiiMisc.EntryInfo.NewEntryGameTime)) {
    mii.setElement(M.MiiMisc.EntryInfo.NewEntryGameTime, index, now);
  }
  if (mii.has(M.MiiMisc.FaceInfo.HairChangeOrdered)) {
    mii.setElement(M.MiiMisc.FaceInfo.HairChangeOrdered, index, 0);
  }
  if (mii.has(M.MiiMisc.FaceInfo.PrevHairChangeCharInfo)) {
    mii.setElement(M.MiiMisc.FaceInfo.PrevHairChangeCharInfo, index, new Uint8Array(152));
  }
  if (mii.has(M.MiiMisc.BalloonTalkInfo.LastTalkGameTime)) {
    mii.setElement(M.MiiMisc.BalloonTalkInfo.LastTalkGameTime, index, 0n);
  }
  if (mii.has(M.MiiMisc.BalloonTalkInfo.LastTalkHistoryId)) {
    mii.setElement(M.MiiMisc.BalloonTalkInfo.LastTalkHistoryId, index, 0n);
  }
  if (mii.has(M.MiiMisc.PatInfo.LastPatGameTime)) {
    mii.setElement(M.MiiMisc.PatInfo.LastPatGameTime, index, 0n);
  }

  clearTroubleSlot(mii, index);
  clearTroubleTargeting(mii, index);
  if (mii.has(M.Trouble.Info.NextGameTime)) mii.setElement(M.Trouble.Info.NextGameTime, index, now);

  for (const other of populatedMiiIndices(mii)) {
    if (other === index) continue;
    linkMii(mii, Math.min(other, index), Math.max(other, index), capacity, now);
  }

  const player = playerAccessor();
  if (player) recoverInteriorStyles(player, recoveredStyles, now);
}
