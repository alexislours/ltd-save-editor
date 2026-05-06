import { format } from 'svelte-i18n';
import { get } from 'svelte/store';
import { track } from '$lib/analytics';
import { populatedMiiIndices } from '$lib/mii/ownership/populated';
import type { DataType } from '$lib/sav/dataType';
import { murmur3_x86_32_bytes } from '$lib/sav/hash';
import { type Accessor, createMaterializedAccessor } from '$lib/sav/materialized/accessor';
import { decode } from '$lib/sav/materialized/decode';
import { parseSav } from '$lib/sav/parse';
import { MII_SCHEMA, PLAYER_SCHEMA } from '$lib/sav/schema';
import type { SchemaLeaf } from '$lib/sav/schema/leaf';
import { type HistorySaveFile, type HistoryUgcFile, saveSnapshot } from '$lib/session/historyStore';
import type { SaveKind } from '$lib/saveFile/saveFile.svelte';
import { showToast } from '$lib/toast/toast.svelte';

function safeAccessorString<K extends string>(
  accessor: Accessor<K>,
  leaf: SchemaLeaf<DataType.WString32>,
): string | null {
  try {
    const value = accessor.get(leaf).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
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
      if (c.kind === 'player') {
        const decoded = decode(PLAYER_SCHEMA, parsed);
        const player = createMaterializedAccessor<'player'>(PLAYER_SCHEMA, decoded);
        playerName = safeAccessorString(player, PLAYER_SCHEMA.Player.Name);
        islandName = safeAccessorString(player, PLAYER_SCHEMA.Player.IslandName);
      } else if (c.kind === 'mii') {
        const decoded = decode(MII_SCHEMA, parsed);
        const mii = createMaterializedAccessor<'mii'>(MII_SCHEMA, decoded);
        miiCount = populatedMiiIndices(mii).length;
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
