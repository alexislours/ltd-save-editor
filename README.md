# Tomodachi Life: Living the Dream - Save Editor

![Tomodachi Life: Living the Dream - Save Editor](./public/og.png)

A browser-based save editor for _Tomodachi Life: Living the Dream_ (Nintendo Switch). Drop your `Mii.sav`, `Player.sav`, and `Map.sav` files in, edit, and download a patched copy. Everything runs locally - files never leave your machine.

## Features

- **Player tab** - global/player state from `Player.sav`.
- **Mii tab** - per-Mii editing from `Mii.sav`.
- **Map tab** - island layout from `Map.sav`, with placement-aware footprints sourced from the game's `WalkingGrid` data.
- **UGC editor** - replace UGC textures (clothes, food, goods, exteriors, interiors, map objects, map floors) with your own images.
- **ShareMii** - import and export Miis and UGC items between save files, compatible with the [ShareMii](https://github.com/Star-F0rce/ShareMii) file format created by Star-F0rce.
- **Advanced** - raw hash-keyed entry browser for fields the structured tabs don't cover yet.

## Adding a Localization

Translations live in `messages/<locale>.json`. `en-US` is the source of truth; locales are auto-discovered at build time.

1. **Create the file.** Copy `messages/en-US.json` to `messages/<locale>.json` (e.g. `de-DE.json`, `ja-JP.json`).
2. **Backfill keys.** Run `npm run i18n:sync` to mirror the `en-US` structure into your new file.
3. **Translate.** Edit the values.
4. **Verify.** Run `npm run i18n:check`, then `npm run dev` and pick the new language from the switcher.

## Credits

- [tlmodding/living-the-dream-save-editor](https://github.com/tlmodding/living-the-dream-save-editor) - For the base structure of the save file
- [tlmodding/ltd-gamedata](https://github.com/tlmodding/ltd-gamedata) - the hash list shipped to the client.

## Disclaimer

This is an unofficial, fan-made tool. _Tomodachi Life: Living the Dream_ is © Nintendo.

## License

[AGPL-3.0-or-later](./LICENSE)
