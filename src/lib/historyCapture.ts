import { format } from 'svelte-i18n';
import { get } from 'svelte/store';
import { track } from './analytics';
import { populatedMiiIndices } from './mii/populated';
import { getString } from './sav/codec';
import { murmur3_x86_32, murmur3_x86_32_bytes } from './sav/hash';
import { parseSav } from './sav/parse';
import type { Entry } from './sav/types';
import { type HistorySaveFile, type HistoryUgcFile, saveSnapshot } from './historyStore';
import type { SaveKind } from './saveFile.svelte';
import { showToast } from './toast.svelte';

const PLAYER_NAME_HASH = murmur3_x86_32('Player.Name') >>> 0;
const ISLAND_NAME_HASH = murmur3_x86_32('Player.IslandName') >>> 0;

function safeString(entry: Entry | undefined): string | null {
  if (!entry) return null;
  try {
    const value = getString(entry).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function indexEntries(entries: Entry[]): Map<number, Entry> {
  const map = new Map<number, Entry>();
  for (const e of entries) map.set(e.hash >>> 0, e);
  return map;
}

type Capture = { kind: SaveKind; name: string; bytes: Uint8Array };

const encoder = new TextEncoder();

function computeContentHash(saves: HistorySaveFile[], ugc: HistoryUgcFile[]): number {
  const items: { key: string; bytes: Uint8Array }[] = [
    ...saves.map((s) => ({ key: `s:${s.kind}:${s.name}`, bytes: s.bytes })),
    ...ugc.map((u) => ({ key: `u:${u.name}`, bytes: u.bytes })),
  ].sort((a, b) => a.key.localeCompare(b.key));
  let h = 0;
  for (const item of items) {
    h = murmur3_x86_32_bytes(encoder.encode(item.key), h);
    h = murmur3_x86_32_bytes(item.bytes, h);
  }
  return h >>> 0;
}

export async function recordSnapshot(
  captures: Capture[],
  ugcFiles: HistoryUgcFile[],
): Promise<void> {
  if (captures.length === 0 && ugcFiles.length === 0) return;

  let playerName: string | null = null;
  let islandName: string | null = null;
  let miiCount: number | null = null;

  for (const c of captures) {
    try {
      const parsed = parseSav(c.bytes);
      const byHash = indexEntries(parsed.entries);
      if (c.kind === 'player') {
        playerName = safeString(byHash.get(PLAYER_NAME_HASH));
        islandName = safeString(byHash.get(ISLAND_NAME_HASH));
      } else if (c.kind === 'mii') {
        miiCount = populatedMiiIndices(byHash).length;
      }
    } catch {
      /* best effort capture */
    }
  }

  const saves: HistorySaveFile[] = captures.map((c) => ({
    kind: c.kind,
    name: c.name,
    bytes: c.bytes,
  }));
  const contentHash = computeContentHash(saves, ugcFiles);

  const result = await saveSnapshot({
    saves,
    ugc: ugcFiles,
    contentHash,
    playerName,
    islandName,
    miiCount,
  });

  if (result.ok) {
    track('history_recorded', {
      kinds: saves.map((f) => f.kind).join(','),
      kind_count: saves.length,
      ugc_count: ugcFiles.length,
      total_bytes: result.snapshot.totalBytes,
    });
    return;
  }

  const t = get(format);
  if (result.reason === 'quota') {
    showToast('error', t('history.toast.quota_exceeded'));
  } else if (result.reason === 'error') {
    showToast('warn', t('history.toast.save_failed'));
  }
}
