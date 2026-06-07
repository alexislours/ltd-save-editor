import { MAP_SCHEMA, MII_SCHEMA, PLAYER_SCHEMA } from '../schema/index.js';

const SCHEMAS = [PLAYER_SCHEMA, MII_SCHEMA, MAP_SCHEMA];

export const TIME_LEAF_PATHS = [
  'Player.FirstBootTime',
  'DailyLog.LastUpdateTime',
  'Demo.DemoEndTimeAry.DemoEndTime',
  'Introduction.FocusLeadingInfo.LastTimeMii',
  'Introduction.FocusLeadingInfo.LastTimeObject',
  'Introduction.LectureInfo.PreparedTime',
  'Liberation.SeasonUnlockBeginTime',
  'MiiEvent.MiiEventInfo.InfoEnableGenerateGameTime',
  'MiiEvent.EnableGenerateGameTime',
  'MiiHistory.Info.Time',
  'News.Time',
  'PhotoStudio.LastSavePhotoTime',
  'Player.BuildingInfo2.FirstObtainedSec',
  'Player.BuildingInfo2.LastObtainedSec',
  'Player.ClothInfo.OwnInfoArray.FirstObtainedSec',
  'Player.ClothInfo.OwnInfoArray.LastObtainedSec',
  'Player.CommonDailyItem.LastUpdateTime',
  'Player.CoordinateInfo.OwnInfoArray.FirstObtainedSec',
  'Player.CoordinateInfo.OwnInfoArray.LastObtainedSec',
  'Player.FloorInfo.LastObtainedSec',
  'Player.FoodInfo.FirstObtainedSec',
  'Player.FoodInfo.LastObtainedSec',
  'Player.MarketUpdateInfo.LastEnterTime',
  'Player.MarketUpdateInfo.LastUpdateTime',
  'Player.MiiBirthdayNews.LastWatchedTime',
  'Player.TroubleInfo.LastGenerateTime',
  'Player.LastBazaarPurchasedTime',
  'Player.LastDonationGameTime',
  'Player.LastIslandEditTime',
  'Player.LastNewsWatchedTime',
  'Player.LastPenaltyTime',
  'Player.LastPlayerBirthdayTime',
  'Player.NextGeneratableTroubleIslandEditTime',
  'Player.SpecialSaleEndTime',
  'Player.SpecialSaleStartTime',
  'UGC.Cloth.LastObtainedSec',
  'UGC.Cloth.EntryTime',
  'UGC.Exterior.EntryTime',
  'UGC.Exterior.LastObtainedSec',
  'UGC.FacePaint.EntryTime',
  'UGC.FacePaint.LastObtainedSec',
  'UGC.Food.EntryTime',
  'UGC.Food.LastObtainedSec',
  'UGC.Goods.EntryTime',
  'UGC.Goods.LastObtainedSec',
  'UGC.Interior.EntryTime',
  'UGC.Interior.LastObtainedSec',
  'UGC.MapFloor.EntryTime',
  'UGC.MapFloor.LastObtainedSec',
  'UGC.MapObject.EntryTime',
  'UGC.MapObject.LastObtainedSec',
  'UGC.Text.TextData.AddTime',
  'Player.GoodsInfo2.*.LastObtainedSec',
  'Player.HabitInfo2.*.LastObtainedSec',
  'Player.InteriorRoomStyleInfo.*.FirstObtainedSec',
  'Player.InteriorRoomStyleInfo.*.LastObtainedSec',
  'Childcare.Pending.NextTime',
  'Childcare.Reserve.BirthTime',
  'Mii.Belongings.GoodsOwnInfoSlot.GetTime',
  'Mii.Belongings.ExteriorNextEmotionBallTime',
  'Mii.Belongings.InteriorNextEmotionBallTime',
  'Mii.Belongings.NextInteriorWantGameTime',
  'Mii.Feeling.FeelingEndGameTime',
  'Mii.HomeLiveTime.StartLiveTogetherTime',
  'Mii.MiiMisc.BalloonTalkInfo.LastTalkGameTime',
  'Mii.MiiMisc.EntryInfo.NewEntryGameTime',
  'Mii.MiiMisc.FaceInfo.HairChangeGameTime',
  'Mii.MiiMisc.FaceInfo.ReadyHairChangeGameTime',
  'Mii.MiiMisc.FaceInfo.RejectHairChangeGameTime',
  'Mii.MiiMisc.PatInfo.LastPatGameTime',
  'Mii.MiiMisc.SatisfyInfo.DepressGameTime',
  'Mii.MiiMisc.SatisfyInfo.LastMiiTouchGameTime',
  'Mii.MiiMisc.SleepInfo.WakeUpTime',
  'Mii.Trouble.Info.EndGameTime',
  'Mii.Trouble.Info.NextGameTime',
  'Mii.Trouble.ChildBirthBlockTime',
  'Relation.Info.DirectionalInfo.UpdateTimeRanking',
  'Relation.Info.TypeSetTime',
  'House.ExteriorNextEmotionBallTime',
  'House.InteriorNextEmotionBallTime',
  'MapObject.MapObjectMisc.AddGameTime',
] as const;

export const DURATION_LEAF_PATHS = [
  'Player.PlayTime',
  'Player.NoInputPlayTime',
  'DailyLog.DailyLastPlayTime',
  'DailyLog.DailyLastNoInputPlayTime',
] as const;

export type SchemaLeaf = { hash: number; type: number };

function isLeaf(v: unknown): v is SchemaLeaf {
  return typeof v === 'object' && v !== null && typeof (v as { hash?: unknown }).hash === 'number';
}

function nodeAt(node: unknown, segs: readonly string[]): unknown {
  let cur: unknown = node;
  for (const s of segs) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[s];
  }
  return cur;
}

export function expandLeaves(pattern: string): SchemaLeaf[] {
  const segs = pattern.split('.');
  const star = segs.indexOf('*');
  if (star === -1) {
    for (const schema of SCHEMAS) {
      const leaf = nodeAt(schema, segs);
      if (isLeaf(leaf)) return [leaf];
    }
    return [];
  }
  const after = segs.slice(star + 1);
  for (const schema of SCHEMAS) {
    const branch = nodeAt(schema, segs.slice(0, star));
    if (typeof branch !== 'object' || branch === null) continue;
    const out: SchemaLeaf[] = [];
    for (const child of Object.values(branch as Record<string, unknown>)) {
      const leaf = nodeAt(child, after);
      if (isLeaf(leaf)) out.push(leaf);
    }
    if (out.length) return out;
  }
  return [];
}

function expand(pattern: string): number[] {
  return expandLeaves(pattern).map((leaf) => leaf.hash >>> 0);
}

export const TIME_LEAF_HASHES: readonly number[] = [...new Set(TIME_LEAF_PATHS.flatMap(expand))];

export const DURATION_LEAF_HASHES: readonly number[] = [
  ...new Set(DURATION_LEAF_PATHS.flatMap(expand)),
];
