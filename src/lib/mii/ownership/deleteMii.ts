import { murmur3_x86_32 } from '@alexislours/ltd-savedata';
import { MII_SCHEMA, PLAYER_SCHEMA, type SchemaLeaf } from '@alexislours/ltd-savedata/schema';
import { miiAccessor, type MiiAccessor } from '$lib/mii/miiEditor.svelte';
import { playerAccessor, type PlayerAccessor } from '$lib/player/playerEditor.svelte';
import { evictForDeletion, recoverableRoomStyles } from '$lib/map/residents/residents.svelte';
import { nowSeconds } from '$lib/mii/trouble/troubleTime';
import { clearTroubleSlot, TROUBLE_FIELDS } from '$lib/mii/trouble/troubleFields';
import { populatedMiiIndices } from './populated';
import { writeRelationDirection } from './relations';

const INVALID_CLOTH = murmur3_x86_32('Invalid') >>> 0;

const REL = MII_SCHEMA.Relation.Info;

const MII_INDEX_REF_LEAVES = [
  MII_SCHEMA.Mii.MiiMisc.EntryInfo.BloodMiiIndex,
  MII_SCHEMA.Childcare.Pending.ParentMiiIndex,
  MII_SCHEMA.Childcare.Reserve.ParentMiiIndex,
];

export function deleteMii(miiIndex: number): void {
  const mii = miiAccessor();
  if (!mii) return;
  const recoveredStyles = recoverableRoomStyles(miiIndex);

  evictForDeletion(miiIndex);

  clearRelations(mii, miiIndex);
  clearMiiIndexReferences(mii, miiIndex);
  clearTroubleTargeting(mii, miiIndex);
  compactSortIndex(mii, miiIndex);
  clearSlot(mii, miiIndex);

  const player = playerAccessor();
  if (player) {
    compactMiiHistory(player, miiIndex);
    compactNews(player, miiIndex, populatedMiiIndices(mii));
    recoverInteriorStyles(player, recoveredStyles, nowSeconds());
  }
}

function clearMiiIndexReferences(mii: MiiAccessor, miiIndex: number): void {
  for (const leaf of MII_INDEX_REF_LEAVES) {
    if (!mii.has(leaf)) continue;
    const refs = mii.get(leaf);
    for (let i = 0; i < refs.length; i++) {
      if (refs[i] === miiIndex) mii.setElement(leaf, i, -1);
    }
  }
}

function clearRelations(mii: MiiAccessor, miiIndex: number): void {
  if (!mii.has(REL.RelationId.Id_a) || !mii.has(REL.RelationId.Id_b)) return;
  const idA = mii.get(REL.RelationId.Id_a);
  const idB = mii.get(REL.RelationId.Id_b);
  const count = Math.min(idA.length, idB.length);
  for (let slot = 0; slot < count; slot++) {
    if (idA[slot] === miiIndex || idB[slot] === miiIndex) resetRelationSlot(mii, slot);
  }
}

function resetRelationSlot(mii: MiiAccessor, slot: number): void {
  mii.setElement(REL.RelationId.Id_a, slot, -1);
  mii.setElement(REL.RelationId.Id_b, slot, -1);
  for (const dir of [2 * slot, 2 * slot + 1]) writeRelationDirection(mii, dir, 0);
  if (mii.has(REL.IsFight)) mii.setElement(REL.IsFight, slot, false);
  if (mii.has(REL.TypeSetTime)) mii.setElement(REL.TypeSetTime, slot, 0n);
  if (mii.has(REL.IsNotifiedBloodTypeCouple)) {
    mii.setElement(REL.IsNotifiedBloodTypeCouple, slot, false);
  }
}

function clearTroubleTargeting(mii: MiiAccessor, miiIndex: number): void {
  const tf = TROUBLE_FIELDS.targetMii;
  if (!mii.has(tf.leaf)) return;
  for (const host of populatedMiiIndices(mii)) {
    if (host === miiIndex) continue;
    let hits = false;
    for (let s = 0; s < tf.perMii; s++) {
      let target: number;
      try {
        target = mii.getElement(tf.leaf, host * tf.perMii + s) as number;
      } catch {
        continue;
      }
      if (target === miiIndex) {
        hits = true;
        break;
      }
    }
    if (hits) clearTroubleSlot(mii, host);
  }
}

function compactSortIndex(mii: MiiAccessor, miiIndex: number): void {
  const leaf = MII_SCHEMA.Mii.MiiMisc.EntryInfo.SortIndex;
  if (!mii.has(leaf)) return;
  const order = mii.get(leaf);
  const removed = order[miiIndex];
  if (removed === undefined) return;
  for (const i of populatedMiiIndices(mii)) {
    if (i === miiIndex) continue;
    if (order[i] > removed) mii.setElement(leaf, i, order[i] - 1);
  }
}

function clearSlot(mii: MiiAccessor, miiIndex: number): void {
  if (mii.has(MII_SCHEMA.Mii.CharInfoEx)) {
    const bytes = mii.getElement(MII_SCHEMA.Mii.CharInfoEx, miiIndex);
    mii.setElement(MII_SCHEMA.Mii.CharInfoEx, miiIndex, new Uint8Array(bytes.length));
  }
  if (mii.has(MII_SCHEMA.Mii.Name.Name)) mii.setElement(MII_SCHEMA.Mii.Name.Name, miiIndex, '');
  if (mii.has(MII_SCHEMA.Mii.Feeling.FeelingEndGameTime)) {
    mii.setElement(MII_SCHEMA.Mii.Feeling.FeelingEndGameTime, miiIndex, 0n);
  }
  clearTroubleSlot(mii, miiIndex);
}

const HISTORY = PLAYER_SCHEMA.MiiHistory.Info;
const NEWS = PLAYER_SCHEMA.News;

type RingField = {
  leaf: SchemaLeaf;
  stride: number;
  clear: number | bigint | boolean | null;
};

const HISTORY_FIELDS: RingField[] = [
  { leaf: HISTORY.DataStringId, stride: 1, clear: null },
  { leaf: HISTORY.ItemRawId, stride: 1, clear: null },
  { leaf: HISTORY.ItemType, stride: 1, clear: null },
  { leaf: HISTORY.MiiHistoryId, stride: 1, clear: -1n },
  { leaf: HISTORY.MiiIndexArray, stride: 4, clear: null },
  { leaf: HISTORY.Time, stride: 1, clear: null },
  { leaf: HISTORY.UgcTextIndex, stride: 1, clear: null },
];

const NEWS_FIELDS: RingField[] = [
  { leaf: NEWS.ASVariation, stride: 1, clear: 0 },
  { leaf: NEWS.BGSetId, stride: 1, clear: 0 },
  { leaf: NEWS.GeneralNumber, stride: 1, clear: 0 },
  { leaf: NEWS.IsLock, stride: 1, clear: false },
  { leaf: NEWS.NewsId, stride: 1, clear: 0 },
  { leaf: NEWS.Time, stride: 1, clear: 0n },
  { leaf: NEWS.UgcTextId, stride: 1, clear: 0 },
  { leaf: NEWS.CasterMii.ClothStyle, stride: 1, clear: INVALID_CLOTH },
  { leaf: NEWS.CasterMii.MiiIndex, stride: 1, clear: -1 },
  { leaf: NEWS.ContentMii.ClothStyle, stride: 10, clear: INVALID_CLOTH },
  { leaf: NEWS.ContentMii.MiiIndex, stride: 10, clear: -1 },
  { leaf: NEWS.IntervieweeMii.ASVariation, stride: 1, clear: 0 },
  { leaf: NEWS.IntervieweeMii.CommentNumber, stride: 1, clear: 0 },
  { leaf: NEWS.IntervieweeMii.MiiIndex, stride: 1, clear: -1 },
  { leaf: NEWS.TextOnlyMii.MiiIndex, stride: 1, clear: -1 },
  { leaf: NEWS.ItemInfo.PresetItemId, stride: 1, clear: 0 },
  { leaf: NEWS.ItemInfo.UgcItemIndex, stride: 1, clear: -1 },
];

function compactRing(
  player: PlayerAccessor,
  entryCount: number,
  survives: (entry: number) => boolean,
  fields: RingField[],
): number {
  const survivors: number[] = [];
  for (let e = 0; e < entryCount; e++) {
    if (survives(e)) survivors.push(e);
  }
  if (survivors.length === entryCount) return survivors.length;
  for (const { leaf, stride, clear } of fields) {
    if (!player.has(leaf)) continue;
    const arr = player.get(leaf) as unknown[];
    const kept: unknown[] = [];
    for (const e of survivors) {
      for (let s = 0; s < stride; s++) kept.push(arr[e * stride + s]);
    }
    for (let i = 0; i < kept.length; i++) player.setElement(leaf, i, kept[i] as never);
    if (clear !== null) {
      for (let i = survivors.length * stride; i < entryCount * stride; i++) {
        player.setElement(leaf, i, clear as never);
      }
    }
  }
  return survivors.length;
}

function compactMiiHistory(player: PlayerAccessor, miiIndex: number): void {
  if (!player.has(HISTORY.MiiHistoryId) || !player.has(HISTORY.MiiIndexArray)) return;
  const ids = player.get(HISTORY.MiiHistoryId) as bigint[];
  const refs = player.get(HISTORY.MiiIndexArray) as number[];
  const survives = (e: number): boolean => {
    if (ids[e] === -1n) return false;
    for (let s = 0; s < 4; s++) {
      if (refs[e * 4 + s] === miiIndex) return false;
    }
    return true;
  };
  compactRing(player, ids.length, survives, HISTORY_FIELDS);
}

const NEWS_REF_LEAVES = [
  NEWS.CasterMii.MiiIndex,
  NEWS.IntervieweeMii.MiiIndex,
  NEWS.TextOnlyMii.MiiIndex,
];

function compactNews(player: PlayerAccessor, miiIndex: number, candidates: number[]): void {
  if (!player.has(NEWS.NewsId)) return;
  const newsId = player.get(NEWS.NewsId) as number[];
  const content = player.has(NEWS.ContentMii.MiiIndex)
    ? (player.get(NEWS.ContentMii.MiiIndex) as number[])
    : null;
  const survives = (e: number): boolean => {
    if (newsId[e] === 0) return false;
    if (content) {
      for (let s = 0; s < 10; s++) {
        if (content[e * 10 + s] === miiIndex) return false;
      }
    }
    return true;
  };
  const survivorCount = compactRing(player, newsId.length, survives, NEWS_FIELDS);
  for (const leaf of NEWS_REF_LEAVES) {
    if (!player.has(leaf)) continue;
    const arr = player.get(leaf) as number[];
    for (let i = 0; i < survivorCount; i++) {
      if (arr[i] === miiIndex) player.setElement(leaf, i, randomMii(candidates));
    }
  }
}

function randomMii(candidates: number[]): number {
  if (candidates.length === 0) return -1;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const INTERIOR = PLAYER_SCHEMA.Player.InteriorRoomStyleInfo as Record<
  string,
  { OwnNum: SchemaLeaf; LastObtainedSec: SchemaLeaf }
>;

const STYLE_HASH_TO_INTERIOR = new Map<
  number,
  { OwnNum: SchemaLeaf; LastObtainedSec: SchemaLeaf }
>();
for (const [name, entry] of Object.entries(INTERIOR)) {
  if (entry && entry.OwnNum) STYLE_HASH_TO_INTERIOR.set(murmur3_x86_32(name) >>> 0, entry);
}

function recoverInteriorStyles(
  player: PlayerAccessor,
  styleHashes: Iterable<number>,
  nowSec: bigint,
): void {
  for (const hash of styleHashes) {
    const entry = STYLE_HASH_TO_INTERIOR.get(hash >>> 0);
    if (!entry || !player.has(entry.OwnNum)) continue;
    const owned = (player.get(entry.OwnNum) as number) ?? 0;
    player.set(entry.OwnNum, (owned + 1) as never);
    if (player.has(entry.LastObtainedSec)) player.set(entry.LastObtainedSec, nowSec as never);
  }
}
