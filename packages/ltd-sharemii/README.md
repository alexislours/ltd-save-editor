# @alexislours/ltd-sharemii

[![npm](https://img.shields.io/npm/v/@alexislours/ltd-sharemii)](https://www.npmjs.com/package/@alexislours/ltd-sharemii) [![ci](https://img.shields.io/github/actions/workflow/status/alexislours/ltd-save-editor/packages-ci.yml?branch=dev&label=ci)](https://github.com/alexislours/ltd-save-editor/actions/workflows/packages-ci.yml) [![license](https://img.shields.io/npm/l/@alexislours/ltd-sharemii)](./LICENSE)

Codec for the game's Mii and UGC (user-generated content) share format. Extracts a Mii or a UGC item (clothing, food, goods, painting, ...) out of a parsed save into a portable share file, and applies a share file back into a save. Depends only on [`@alexislours/ltd-savedata`](../ltd-savedata).

A share file is a small binary blob carved out of the save's typed fields. Textures and canvases that don't fit inline travel alongside it as named "sidecar" files. This package owns the binary codec and the apply/extract logic; how sidecars are packed for transport (a zip, a folder of files) is left to the caller.

## Install

```sh
npm install @alexislours/ltd-sharemii
```

## Usage

```ts
import { decode, parseSav } from '@alexislours/ltd-savedata';
import { MII_SCHEMA, PLAYER_SCHEMA } from '@alexislours/ltd-savedata/schema';
import { extractMii, applyMii, EMPTY_SIDECAR } from '@alexislours/ltd-sharemii';

const saves = {
  mii: decode(MII_SCHEMA, parseSav(miiBytes)),
  player: decode(PLAYER_SCHEMA, parseSav(playerBytes)),
};

const share = extractMii(saves, slot, EMPTY_SIDECAR);
applyMii(destSaves, destSlot, share.bytes, share.sidecar);
```

## Sidecars

The codec speaks `SidecarSource` (a `Map<string, Uint8Array>`) and `SidecarFile`, never files or archives. `isSidecarFileName` and `isJunkArchiveEntry` help a host filter incoming names. Packing those bytes into a zip or reading them from a dropped folder is a transport concern the host owns.

## License

AGPL-3.0-or-later
