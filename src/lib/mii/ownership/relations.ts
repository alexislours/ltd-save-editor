import { murmur3_x86_32 } from '@alexislours/ltd-savedata';
import { MII_SCHEMA } from '@alexislours/ltd-savedata/schema';
import type { MiiAccessor } from '$lib/mii/miiEditor.svelte';

const OTHER = murmur3_x86_32('Other') >>> 0;
const SECOND_PERSON = murmur3_x86_32('SecondPerson') >>> 0;
const JPJA = murmur3_x86_32('JPja') >>> 0;

const DIR = MII_SCHEMA.Relation.Info.DirectionalInfo;
const UNKNOWN_DIR = MII_SCHEMA.Unknown['0xFA21F70E'];

export function writeRelationDirection(mii: MiiAccessor, dir: number, meter: number): void {
  if (mii.has(DIR.Meter)) mii.setElement(DIR.Meter, dir, meter);
  if (mii.has(DIR.BaseRelationType)) mii.setElement(DIR.BaseRelationType, dir, OTHER);
  if (mii.has(DIR.BloodType)) mii.setElement(DIR.BloodType, dir, OTHER);
  if (mii.has(DIR.BitFlag)) mii.setElement(DIR.BitFlag, dir, 0);
  if (mii.has(DIR.NickNameToOtherType)) mii.setElement(DIR.NickNameToOtherType, dir, SECOND_PERSON);
  if (mii.has(DIR.SecondPersonRegionLanguageID)) {
    mii.setElement(DIR.SecondPersonRegionLanguageID, dir, JPJA);
  }
  if (mii.has(DIR.ThirdPersonRegionLanguageID)) {
    mii.setElement(DIR.ThirdPersonRegionLanguageID, dir, JPJA);
  }
  if (mii.has(DIR.UpdateTimeRanking)) mii.setElement(DIR.UpdateTimeRanking, dir, 0n);
  if (mii.has(DIR.NameSetBin)) {
    const bytes = mii.getElement(DIR.NameSetBin, dir);
    if (bytes) mii.setElement(DIR.NameSetBin, dir, new Uint8Array(bytes.length));
  }
  if (mii.has(UNKNOWN_DIR)) mii.setElement(UNKNOWN_DIR, dir, false);
}
