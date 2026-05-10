import { DataType } from './dataType';
import { GENERATED_ENUM_OPTION_NAMES, GENERATED_ENUM_OPTIONS_FOR } from './generatedNames';
import { murmur3_x86_32 } from './hash';
import { buildPathMap } from './materialized/schemaIndex';
import { MAP_SCHEMA, MII_SCHEMA, PLAYER_SCHEMA } from './schema';

type KnownKey = {
  name: string;
  hash: number;
  type?: DataType;
};

const CURATED_SEEDS: Omit<KnownKey, 'hash'>[] = [
  { name: 'Player.LastClockSnapshot', type: DataType.Int64 },
];

const CURATED_KEYS: readonly KnownKey[] = CURATED_SEEDS.map((k) => ({
  ...k,
  hash: murmur3_x86_32(k.name),
}));

const KNOWN_BY_HASH: ReadonlyMap<number, KnownKey> = new Map(CURATED_KEYS.map((k) => [k.hash, k]));

let SCHEMA_PATHS: ReadonlyMap<number, string> | null = null;
function schemaPaths(): ReadonlyMap<number, string> {
  if (SCHEMA_PATHS) return SCHEMA_PATHS;
  const merged = new Map<number, string>();
  for (const schema of [PLAYER_SCHEMA, MII_SCHEMA, MAP_SCHEMA]) {
    for (const [hash, path] of buildPathMap(schema)) {
      if (!merged.has(hash)) merged.set(hash, path);
    }
  }
  SCHEMA_PATHS = merged;
  return merged;
}

// Public API: hash → name, for labelling entries.
export function nameForHash(hash: number): string | null {
  return KNOWN_BY_HASH.get(hash)?.name ?? schemaPaths().get(hash) ?? null;
}

export type EnumOption = { hash: number; name: string; label?: string };

const ENUM_OPTION_LABELS: ReadonlyMap<number, ReadonlyMap<string, string>> = new Map(
  (
    [
      [
        'Mii.Name.PronounType',
        {
          He: 'He/Him',
          She: 'She/Her',
          They: 'They/Them',
        },
      ],
      [
        'Player.Region',
        {
          NorthAmerica: 'North America',
          SouthAmericaN: 'South America - Northern Hemisphere',
          SouthAmericaS: 'South America - Southern Hemisphere',
          Australia: 'Australia / New Zealand',
          Asia: 'Hong Kong / Taiwan / South Korea',
          OthersN: 'Other - Northern Hemisphere',
          OthersS: 'Other - Southern Hemisphere',
        },
      ],
    ] as const
  ).map(([key, m]) => [murmur3_x86_32(key) >>> 0, new Map(Object.entries(m))]),
);

export function enumOptionsFor(keyHash: number): EnumOption[] | null {
  const names = GENERATED_ENUM_OPTIONS_FOR.get(keyHash);
  if (!names) return null;
  const labels = ENUM_OPTION_LABELS.get(keyHash);
  return names.map((n) => {
    const label = labels?.get(n);
    return label
      ? { hash: murmur3_x86_32(n), name: n, label }
      : { hash: murmur3_x86_32(n), name: n };
  });
}

export function enumOptionName(valueHash: number): string | null {
  return GENERATED_ENUM_OPTION_NAMES.get(valueHash) ?? null;
}
