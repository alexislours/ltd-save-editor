# @alexislours/ltd-savedata

Reader, writer, and reverse-engineered field schema for the game's binary `.sav` save format. Zero runtime dependencies.

The save container is a flat list of entries keyed by murmur3 (x86, 32-bit) hashes of their field paths, each holding a typed value. This package parses that container into typed entries, exposes a schema for every known field, and re-encodes byte-for-byte.

## Install

```sh
npm install @alexislours/ltd-savedata
```

## Usage

```ts
import { parseSav, writeSav, decode, encode } from '@alexislours/ltd-savedata';
import { PLAYER_SCHEMA } from '@alexislours/ltd-savedata/schema';

const file = parseSav(bytes);
const save = decode(PLAYER_SCHEMA, file);
// ...mutate save...
const out = writeSav(encode(PLAYER_SCHEMA, save));
```

## Entry points

- `.` parsing, writing, value codecs, the materialized accessor, and the struct system.
- `./schema` the `MII_SCHEMA`, `PLAYER_SCHEMA`, and `MAP_SCHEMA` field trees. Kept on a separate entry so codec-only consumers tree-shake the schema out.

## License

AGPL-3.0-or-later
