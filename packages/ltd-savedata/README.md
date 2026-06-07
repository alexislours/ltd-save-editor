# @alexislours/ltd-savedata

<div align="center">
  <a href="https://www.npmjs.com/package/@alexislours/ltd-savedata"><img alt="npm" src="https://img.shields.io/npm/v/@alexislours/ltd-savedata?style=for-the-badge&logo=npm"></a>
  <a href="https://github.com/alexislours/ltd-save-editor/actions/workflows/packages-ci.yml"><img alt="ci" src="https://img.shields.io/github/actions/workflow/status/alexislours/ltd-save-editor/packages-ci.yml?branch=dev&label=ci&style=for-the-badge&logo=githubactions"></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/npm/l/@alexislours/ltd-savedata?style=for-the-badge&logo=gnu"></a>
</div>

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
