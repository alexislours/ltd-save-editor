import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const ROMFS = resolve(PROJECT_ROOT, 'game-data/romfs');

export const ICON_DIR = `${ROMFS}/Icon`;
export const RSDB_DIR = `${ROMFS}/RSDB`;
const MALS_DIR = `${ROMFS}/Mals`;
export const WALKING_GRID_DIR = `${ROMFS}/WalkingGrid`;
export const GAME_DATA_LIST = `${ROMFS}/GameData/GameDataList.Product.100.byml.yml`;

const STATIC_DIR = `${PROJECT_ROOT}/static`;

export type GameLocale =
  | 'CNzh'
  | 'EUde'
  | 'EUen'
  | 'EUes'
  | 'EUfr'
  | 'EUit'
  | 'EUnl'
  | 'JPja'
  | 'KRko'
  | 'TWzh'
  | 'USen'
  | 'USes'
  | 'USfr';

export const GAME_LOCALES: readonly GameLocale[] = [
  'CNzh',
  'EUde',
  'EUen',
  'EUes',
  'EUfr',
  'EUit',
  'EUnl',
  'JPja',
  'KRko',
  'TWzh',
  'USen',
  'USes',
  'USfr',
];

export function rsdb(name: string): string {
  return `${RSDB_DIR}/${name}.Product.100.rstbl.byml.yml`;
}

export function localeReplaceMsg(code: GameLocale, file: string): string {
  return `${MALS_DIR}/${code}.Product.100.sarc.d/ReplaceMsg/${file}.msbt.json`;
}

export function localeProgramMsg(code: GameLocale, file: string): string {
  return `${MALS_DIR}/${code}.Product.100.sarc.d/ProgramMsg/${file}.msbt.json`;
}

export function localeLayoutMsg(code: GameLocale, file: string): string {
  return `${MALS_DIR}/${code}.Product.100.sarc.d/LayoutMsg/${file}.msbt.json`;
}

export function staticOut(name: string): string {
  return `${STATIC_DIR}/${name}`;
}
