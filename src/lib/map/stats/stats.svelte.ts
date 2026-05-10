import { floorTiles, mapState } from '$lib/map/state/mapEditor.svelte';
import { liveRows, objectsState } from '$lib/map/state/mapObjectsEditor.svelte';
import {
  computeIssues,
  computeObjectCounts,
  computeTileCoverage,
  type IssueGroups,
  type ObjectCounts,
  type TileCoverageRow,
} from './statsCompute';

export type { OverlapIssue, UnknownTileIssue } from './statsCompute';

type CoverageCache = { rev: number; result: TileCoverageRow[] };
let coverageCache: CoverageCache | null = null;

export function tileCoverage(): readonly TileCoverageRow[] {
  void mapState.tileRev;
  const tiles = floorTiles();
  if (!tiles) {
    coverageCache = null;
    return [];
  }
  const rev = mapState.tileRev;
  if (coverageCache && coverageCache.rev === rev) return coverageCache.result;
  const result = computeTileCoverage(tiles);
  coverageCache = { rev, result };
  return result;
}

type CountsCache = { rev: number; result: ObjectCounts };
let countsCache: CountsCache | null = null;

export function objectCounts(): ObjectCounts {
  void objectsState.rev;
  const rev = objectsState.rev;
  if (countsCache && countsCache.rev === rev) return countsCache.result;
  const result = computeObjectCounts(liveRows(), objectsState.count);
  countsCache = { rev, result };
  return result;
}

type IssuesCache = { tileRev: number; objRev: number; result: IssueGroups };
let issuesCache: IssuesCache | null = null;

export function issues(): IssueGroups {
  void mapState.tileRev;
  void objectsState.rev;
  const tileRev = mapState.tileRev;
  const objRev = objectsState.rev;
  if (issuesCache && issuesCache.tileRev === tileRev && issuesCache.objRev === objRev) {
    return issuesCache.result;
  }
  const result = computeIssues(liveRows(), floorTiles());
  issuesCache = { tileRev, objRev, result };
  return result;
}
