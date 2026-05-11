import { canRedo, canUndo, pushAction, redo, undo } from '$lib/map/state/history.svelte';
import { emptyFootprintRect } from '$lib/map/actors/actors';
import { rowFootprintRectInto } from '$lib/map/actors/ugcDimensions.svelte';
import { liveRows } from '$lib/map/state/mapObjectsEditor.svelte';
import { showToast } from '$lib/toast/toast.svelte';
import { t } from '$lib/i18n/format';
import { BRUSH_SIZE_MAX, BRUSH_SIZE_MIN } from '../tools/brushKernel';
import { deleteAll, duplicate, nudge, rotate as rotateObjects } from '../tools/bulkOps';
import { close as closeFind, findStore, open as openFind } from '../find/findStore.svelte';
import { modeState, setMode, type Mode } from '../state/layers.svelte';
import { paintState, selectTileHash, setBrushSize, setPaintTool } from '../tools/paintState.svelte';
import { clear as clearSelection, selection, set as setSelection } from '../tools/selection.svelte';
import { clearTileSelection, setTileSelection, tileSelection } from '../tools/tileSelection.svelte';
import {
  cancelPaste,
  hasClipboard,
  setClipboard,
  startPaste,
  tileClipboardState,
} from '../tools/tileClipboard.svelte';
import {
  copyRegion,
  cutRegion,
  eraseRegion,
  mirrorX,
  mirrorY,
  rotateCCW,
  rotateCW,
} from '../tools/tileRegionOps';
import { MAP_HEIGHT, MAP_WIDTH, indexFromXY } from '$lib/map/state/mapEditor.svelte';
import { fit, setZoomTo, view, ZOOM_100 } from '../state/viewTransform.svelte';

export type KeyAction =
  | 'tool.brush'
  | 'tool.fill'
  | 'tool.rectangle'
  | 'tool.replace'
  | 'tool.picker'
  | 'tool.tileSelect'
  | 'mode.select'
  | 'view.fit'
  | 'view.zoom100'
  | 'brush.smaller'
  | 'brush.bigger'
  | 'palette.recent'
  | 'select.allVisible'
  | 'select.delete'
  | 'select.duplicate'
  | 'select.rotate'
  | 'select.rotateBack'
  | 'select.nudge'
  | 'tile.copy'
  | 'tile.cut'
  | 'tile.paste'
  | 'tile.mirrorX'
  | 'tile.mirrorY'
  | 'tile.rotate'
  | 'tile.rotateBack'
  | 'tile.erase'
  | 'tile.selectAll'
  | 'history.undo'
  | 'history.redo'
  | 'find.open'
  | 'help.open'
  | 'overlay.escape'
  | 'pan.hold';

type KeyGroup =
  | 'tools'
  | 'modes'
  | 'view'
  | 'edit'
  | 'selection'
  | 'tileSelection'
  | 'find'
  | 'misc';

type ActionDef = {
  id: KeyAction;
  labelKey: string;
  group: KeyGroup;
  binding: string;
  altBinding?: string;
};

const ACTIONS = [
  { id: 'tool.brush', labelKey: 'map.toolbar.tool_brush', group: 'tools', binding: 'B' },
  { id: 'tool.fill', labelKey: 'map.toolbar.tool_fill', group: 'tools', binding: 'F' },
  {
    id: 'tool.rectangle',
    labelKey: 'map.keymap.actions.tool.rectangle',
    group: 'tools',
    binding: 'R',
  },
  {
    id: 'tool.replace',
    labelKey: 'map.toolbar.tool_replace',
    group: 'tools',
    binding: 'E',
  },
  { id: 'tool.picker', labelKey: 'map.keymap.actions.tool.picker', group: 'tools', binding: 'I' },
  {
    id: 'tool.tileSelect',
    labelKey: 'map.keymap.actions.tool.tileSelect',
    group: 'tools',
    binding: 'S',
  },
  {
    id: 'mode.select',
    labelKey: 'map.keymap.actions.mode.select',
    group: 'modes',
    binding: 'V',
  },
  { id: 'pan.hold', labelKey: 'map.keymap.actions.pan.hold', group: 'modes', binding: 'Space' },
  { id: 'view.fit', labelKey: 'map.keymap.actions.view.fit', group: 'view', binding: '0' },
  {
    id: 'view.zoom100',
    labelKey: 'map.keymap.actions.view.zoom100',
    group: 'view',
    binding: '1',
  },
  {
    id: 'brush.smaller',
    labelKey: 'map.keymap.actions.brush.smaller',
    group: 'tools',
    binding: '[',
  },
  {
    id: 'brush.bigger',
    labelKey: 'map.keymap.actions.brush.bigger',
    group: 'tools',
    binding: ']',
  },
  {
    id: 'palette.recent',
    labelKey: 'map.keymap.actions.palette.recent',
    group: 'tools',
    binding: '1-9',
  },
  {
    id: 'select.allVisible',
    labelKey: 'map.keymap.actions.select.allVisible',
    group: 'selection',
    binding: 'Cmd+A',
  },
  {
    id: 'select.delete',
    labelKey: 'map.keymap.actions.select.delete',
    group: 'selection',
    binding: 'Backspace',
  },
  {
    id: 'select.duplicate',
    labelKey: 'map.keymap.actions.select.duplicate',
    group: 'selection',
    binding: 'D',
  },
  {
    id: 'select.rotate',
    labelKey: 'map.keymap.actions.select.rotate',
    group: 'selection',
    binding: 'R',
  },
  {
    id: 'select.rotateBack',
    labelKey: 'map.keymap.actions.select.rotateBack',
    group: 'selection',
    binding: 'Shift+R',
  },
  {
    id: 'select.nudge',
    labelKey: 'map.keymap.actions.select.nudge',
    group: 'selection',
    binding: 'Arrow',
    altBinding: 'Shift+Arrow ×10',
  },
  {
    id: 'tile.copy',
    labelKey: 'map.keymap.actions.tile.copy',
    group: 'tileSelection',
    binding: 'Cmd+C',
  },
  {
    id: 'tile.cut',
    labelKey: 'map.keymap.actions.tile.cut',
    group: 'tileSelection',
    binding: 'Cmd+X',
  },
  {
    id: 'tile.paste',
    labelKey: 'map.keymap.actions.tile.paste',
    group: 'tileSelection',
    binding: 'Cmd+V',
  },
  {
    id: 'tile.mirrorX',
    labelKey: 'map.keymap.actions.tile.mirrorX',
    group: 'tileSelection',
    binding: 'H',
  },
  {
    id: 'tile.mirrorY',
    labelKey: 'map.keymap.actions.tile.mirrorY',
    group: 'tileSelection',
    binding: 'V',
  },
  {
    id: 'tile.rotate',
    labelKey: 'map.keymap.actions.tile.rotate',
    group: 'tileSelection',
    binding: 'R',
  },
  {
    id: 'tile.rotateBack',
    labelKey: 'map.keymap.actions.tile.rotateBack',
    group: 'tileSelection',
    binding: 'Shift+R',
  },
  {
    id: 'tile.erase',
    labelKey: 'map.keymap.actions.tile.erase',
    group: 'tileSelection',
    binding: 'Backspace',
  },
  {
    id: 'tile.selectAll',
    labelKey: 'map.keymap.actions.tile.selectAll',
    group: 'tileSelection',
    binding: 'Cmd+A',
  },
  {
    id: 'history.undo',
    labelKey: 'map.keymap.actions.history.undo',
    group: 'edit',
    binding: 'Cmd+Z',
  },
  {
    id: 'history.redo',
    labelKey: 'map.keymap.actions.history.redo',
    group: 'edit',
    binding: 'Cmd+Shift+Z',
    altBinding: 'Cmd+Y',
  },
  { id: 'find.open', labelKey: 'map.keymap.actions.find.open', group: 'find', binding: 'Cmd+F' },
  { id: 'help.open', labelKey: 'map.help.title', group: 'misc', binding: '?' },
  {
    id: 'overlay.escape',
    labelKey: 'map.keymap.actions.overlay.escape',
    group: 'misc',
    binding: 'Esc',
  },
] as const satisfies readonly ActionDef[];

export type Action = (typeof ACTIONS)[number] & Pick<ActionDef, 'altBinding'>;

const ACTION_INDEX: Record<KeyAction, Action> = (() => {
  const out = {} as Record<KeyAction, Action>;
  for (const a of ACTIONS) out[a.id] = a;
  return out;
})();

export const GROUP_ORDER: readonly KeyGroup[] = [
  'tools',
  'modes',
  'view',
  'selection',
  'tileSelection',
  'edit',
  'find',
  'misc',
];

export function groupLabelKey<G extends KeyGroup>(group: G): `map.keymap.groups.${G}` {
  return `map.keymap.groups.${group}`;
}

const isMacPlatform =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');

export function getBindingFor(action: KeyAction): string {
  const def = ACTION_INDEX[action];
  if (!def) return '';
  return formatBinding(def.binding);
}

export function formatBinding(binding: string): string {
  return binding
    .replace(/Cmd/g, isMacPlatform ? '⌘' : 'Ctrl')
    .replace(/\+/g, isMacPlatform ? '' : '+');
}

export function getActionsByGroup(): Map<KeyGroup, Action[]> {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const out = new Map<KeyGroup, Action[]>();
  for (const g of GROUP_ORDER) out.set(g, []);
  for (const a of ACTIONS) out.get(a.group)?.push(a);
  return out;
}

type KeymapState = {
  helpOpen: boolean;
  spaceHeld: boolean;
};

export const keymapState = $state<KeymapState>({
  helpOpen: false,
  spaceHeld: false,
});

export function openHelp(): void {
  keymapState.helpOpen = true;
}

export function closeHelp(): void {
  keymapState.helpOpen = false;
}

type DispatchInput = {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat?: boolean;
};

type DispatchContext = {
  isMac: boolean;
  mode: Mode;
  selectionSize: number;
  tileSelectionSize: number;
  tileSelectActive: boolean;
  pasting: boolean;
  hasTileClipboard: boolean;
  inputFocused: boolean;
  modalOpen: boolean;
  findOpen: boolean;
  helpOpen: boolean;
  recentCount: number;
};

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

function resolveAction(input: DispatchInput, ctx: DispatchContext): KeyAction | null {
  const { key, code, metaKey, ctrlKey, shiftKey, altKey } = input;
  const meta = ctx.isMac ? metaKey : ctrlKey;

  if (ctx.helpOpen) {
    if (key === 'Escape' || key === '?') return 'overlay.escape';
    return null;
  }

  if (meta && !altKey && (key === 'z' || key === 'Z')) {
    return shiftKey ? 'history.redo' : 'history.undo';
  }
  if (meta && !shiftKey && !altKey && (key === 'y' || key === 'Y')) return 'history.redo';
  if (meta && !shiftKey && !altKey && (key === 'f' || key === 'F')) return 'find.open';
  if (key === 'Escape' && !meta && !altKey) return 'overlay.escape';

  if (ctx.findOpen) return null;

  if (code === 'Space' && !meta && !altKey && !shiftKey) return 'pan.hold';

  if (ctx.inputFocused || ctx.modalOpen) return null;

  if (meta && !shiftKey && !altKey && (key === 'c' || key === 'C')) {
    if (ctx.tileSelectActive && ctx.tileSelectionSize > 0) return 'tile.copy';
  }
  if (meta && !shiftKey && !altKey && (key === 'x' || key === 'X')) {
    if (ctx.tileSelectActive && ctx.tileSelectionSize > 0) return 'tile.cut';
  }
  if (meta && !shiftKey && !altKey && (key === 'v' || key === 'V')) {
    if (ctx.tileSelectActive && ctx.hasTileClipboard) return 'tile.paste';
  }
  if (meta && !shiftKey && !altKey && (key === 'a' || key === 'A')) {
    if (ctx.tileSelectActive) return 'tile.selectAll';
    return 'select.allVisible';
  }

  if (meta || altKey) return null;

  if (key === '?') return 'help.open';

  if (ARROW_KEYS.has(key)) {
    if (ctx.selectionSize > 0) return 'select.nudge';
    return null;
  }

  if (key === 'Backspace' || key === 'Delete') {
    if (ctx.tileSelectActive && ctx.tileSelectionSize > 0) return 'tile.erase';
    if (ctx.selectionSize > 0) return 'select.delete';
    return null;
  }

  if (!shiftKey) {
    if (key === '0') return 'view.fit';
    if (key === '1') {
      if (ctx.mode === 'paint' && !ctx.tileSelectActive && ctx.recentCount > 0)
        return 'palette.recent';
      return 'view.zoom100';
    }
    if (key >= '2' && key <= '9') {
      if (ctx.mode === 'paint' && !ctx.tileSelectActive && ctx.recentCount > 0)
        return 'palette.recent';
      return null;
    }
    if (key === '[') return 'brush.smaller';
    if (key === ']') return 'brush.bigger';
  }

  const lower = key.length === 1 ? key.toLowerCase() : key;

  if (ctx.tileSelectActive && ctx.hasTileClipboard) {
    if (!shiftKey && lower === 'h') return 'tile.mirrorX';
    if (!shiftKey && lower === 'v') return 'tile.mirrorY';
    if (lower === 'r') return shiftKey ? 'tile.rotateBack' : 'tile.rotate';
  }

  if (!shiftKey) {
    if (lower === 'b') return 'tool.brush';
    if (lower === 'f') return 'tool.fill';
    if (lower === 'e') return 'tool.replace';
    if (lower === 'v') return 'mode.select';
    if (lower === 'i') return 'tool.picker';
    if (lower === 's') return 'tool.tileSelect';
    if (lower === 'd') return 'select.duplicate';
  }

  if (lower === 'r') {
    if (ctx.mode === 'select' && ctx.selectionSize > 0) {
      return shiftKey ? 'select.rotateBack' : 'select.rotate';
    }
    if (!shiftKey) return 'tool.rectangle';
  }

  return null;
}

function isInputFocused(): boolean {
  const el = typeof document !== 'undefined' ? document.activeElement : null;
  if (!el) return false;
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function isModalOpen(): boolean {
  if (typeof document === 'undefined') return false;
  const dialog = document.querySelector('dialog[open]');
  return dialog != null;
}

function currentContext(): DispatchContext {
  return {
    isMac: isMacPlatform,
    mode: modeState.mode,
    selectionSize: selection.indices.size,
    tileSelectionSize: tileSelection.indices.size,
    tileSelectActive: modeState.mode === 'paint' && paintState.tool === 'tile-select',
    pasting: tileClipboardState.pasting,
    hasTileClipboard: tileClipboardState.clip != null,
    inputFocused: isInputFocused(),
    modalOpen: isModalOpen() && !keymapState.helpOpen,
    findOpen: findStore.open,
    helpOpen: keymapState.helpOpen,
    recentCount: paintState.recent.length,
  };
}

function viewportTileBounds(): { x0: number; y0: number; x1: number; y1: number } {
  const z = view.zoom || 1;
  return {
    x0: -view.panX / z,
    y0: -view.panY / z,
    x1: (view.stageW - view.panX) / z,
    y1: (view.stageH - view.panY) / z,
  };
}

function selectAllVisible(): void {
  const b = viewportTileBounds();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const out = new Set<number>();
  const fp = emptyFootprintRect();
  for (const r of liveRows()) {
    if (r.x < 0 || r.y < 0) continue;
    rowFootprintRectInto(r, fp);
    const fx0 = r.x + fp.x0;
    const fy0 = r.y + fp.y0;
    const fx1 = fx0 + fp.w;
    const fy1 = fy0 + fp.h;
    if (fx1 <= b.x0 || fx0 >= b.x1) continue;
    if (fy1 <= b.y0 || fy0 >= b.y1) continue;
    out.add(r.index);
  }
  setSelection(out);
}

function nudgeFromArrow(key: string, shift: boolean): void {
  const step = shift ? 10 : 1;
  let dx = 0;
  let dy = 0;
  if (key === 'ArrowLeft') dx = -step;
  else if (key === 'ArrowRight') dx = step;
  else if (key === 'ArrowUp') dy = -step;
  else if (key === 'ArrowDown') dy = step;
  if (dx === 0 && dy === 0) return;
  const action = nudge(selection.indices, dx, dy);
  if (action) pushAction(action);
}

function cycleBrushSize(direction: 1 | -1): void {
  const next = Math.max(BRUSH_SIZE_MIN, Math.min(BRUSH_SIZE_MAX, paintState.brushSize + direction));
  setBrushSize(next);
}

function quickPickRecent(slot: number): void {
  const i = slot - 1;
  if (i < 0 || i >= paintState.recent.length) return;
  selectTileHash(paintState.recent[i]);
}

function escapeOverlay(): boolean {
  if (keymapState.helpOpen) {
    closeHelp();
    return true;
  }
  if (findStore.open) {
    closeFind();
    return true;
  }
  if (tileClipboardState.pasting) {
    cancelPaste();
    return true;
  }
  if (tileSelection.indices.size > 0) {
    clearTileSelection();
    return true;
  }
  if (selection.indices.size > 0) {
    clearSelection();
    return true;
  }
  return false;
}

function selectAllTiles(): void {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const out = new Set<number>();
  for (let x = 0; x < MAP_WIDTH; x++) {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      out.add(indexFromXY(x, y));
    }
  }
  setTileSelection(out);
}

function dispatch(action: KeyAction, e: KeyboardEvent): boolean {
  switch (action) {
    case 'tool.brush':
      setMode('paint');
      setPaintTool('brush');
      return true;
    case 'tool.fill':
      setMode('paint');
      setPaintTool('fill');
      return true;
    case 'tool.rectangle':
      setMode('paint');
      setPaintTool('rectangle');
      return true;
    case 'tool.replace':
      setMode('paint');
      setPaintTool('replace');
      return true;
    case 'tool.picker':
      setMode('paint');
      setPaintTool('picker');
      return true;
    case 'tool.tileSelect':
      setMode('paint');
      setPaintTool('tile-select');
      return true;
    case 'mode.select':
      setMode('select');
      return true;
    case 'view.fit':
      fit();
      return true;
    case 'view.zoom100':
      setZoomTo(ZOOM_100);
      return true;
    case 'brush.smaller':
      cycleBrushSize(-1);
      return true;
    case 'brush.bigger':
      cycleBrushSize(1);
      return true;
    case 'palette.recent': {
      const slot = Number.parseInt(e.key, 10);
      if (Number.isFinite(slot) && slot >= 1 && slot <= 9) quickPickRecent(slot);
      return true;
    }
    case 'select.allVisible':
      selectAllVisible();
      return true;
    case 'select.delete': {
      const action = deleteAll(selection.indices);
      if (action) pushAction(action);
      clearSelection();
      return true;
    }
    case 'select.duplicate': {
      if (selection.indices.size === 0) return false;
      const result = duplicate(selection.indices, 1, 1);
      if (result == null) {
        showToast('error', t('map.objects.save_full'));
        return true;
      }
      pushAction(result.action);
      setSelection(result.newIndices);
      return true;
    }
    case 'select.rotate': {
      const a = rotateObjects(selection.indices, 90);
      if (a) pushAction(a);
      return true;
    }
    case 'select.rotateBack': {
      const a = rotateObjects(selection.indices, -90);
      if (a) pushAction(a);
      return true;
    }
    case 'select.nudge':
      nudgeFromArrow(e.key, e.shiftKey);
      return true;
    case 'tile.copy': {
      const clip = copyRegion(tileSelection.indices);
      if (clip) {
        setClipboard(clip);
        showToast(
          'success',
          t('map.toast.tile_copied', { values: { count: tileSelection.indices.size } }),
        );
      }
      return true;
    }
    case 'tile.cut': {
      const count = tileSelection.indices.size;
      const result = cutRegion(tileSelection.indices);
      if (result.clip) setClipboard(result.clip);
      if (result.changes.length > 0) pushAction({ kind: 'tile', changes: result.changes });
      if (result.clip) showToast('success', t('map.toast.tile_cut', { values: { count } }));
      return true;
    }
    case 'tile.paste': {
      if (hasClipboard()) startPaste();
      return true;
    }
    case 'tile.mirrorX': {
      if (tileClipboardState.clip) setClipboard(mirrorX(tileClipboardState.clip));
      return true;
    }
    case 'tile.mirrorY': {
      if (tileClipboardState.clip) setClipboard(mirrorY(tileClipboardState.clip));
      return true;
    }
    case 'tile.rotate': {
      if (tileClipboardState.clip) setClipboard(rotateCW(tileClipboardState.clip));
      return true;
    }
    case 'tile.rotateBack': {
      if (tileClipboardState.clip) setClipboard(rotateCCW(tileClipboardState.clip));
      return true;
    }
    case 'tile.erase': {
      const changes = eraseRegion(tileSelection.indices);
      if (changes.length > 0) pushAction({ kind: 'tile', changes });
      clearTileSelection();
      return true;
    }
    case 'tile.selectAll':
      selectAllTiles();
      return true;
    case 'history.undo':
      if (canUndo()) undo();
      return true;
    case 'history.redo':
      if (canRedo()) redo();
      return true;
    case 'find.open':
      if (!findStore.open) openFind();
      return true;
    case 'help.open':
      openHelp();
      return true;
    case 'overlay.escape':
      return escapeOverlay();
    case 'pan.hold':
      keymapState.spaceHeld = true;
      return true;
  }
  return false;
}

export function installKeymap(): () => void {
  function onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) {
      if (e.code === 'Space') e.preventDefault();
      return;
    }
    const action = resolveAction(
      {
        key: e.key,
        code: e.code,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        repeat: e.repeat,
      },
      currentContext(),
    );
    if (!action) return;
    const handled = dispatch(action, e);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space' && keymapState.spaceHeld) {
      keymapState.spaceHeld = false;
      e.preventDefault();
    }
  }

  function onBlur(): void {
    keymapState.spaceHeld = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
