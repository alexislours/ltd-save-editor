export type LayerKey = 'floor' | 'objects' | 'fence' | 'ugc' | 'diff' | 'grid' | 'tier';

type LayerState = {
  visible: boolean;
  opacity: number;
};

export type Mode = 'paint' | 'select';

type LayersState = {
  floor: LayerState;
  objects: LayerState;
  fence: LayerState;
  ugc: LayerState;
  diff: LayerState;
  grid: LayerState;
  tier: LayerState;
  rev: number;
};

export const layers = $state<LayersState>({
  floor: { visible: true, opacity: 1.0 },
  objects: { visible: true, opacity: 1.0 },
  fence: { visible: true, opacity: 1.0 },
  ugc: { visible: true, opacity: 1.0 },
  diff: { visible: false, opacity: 0.7 },
  grid: { visible: false, opacity: 0.4 },
  tier: { visible: false, opacity: 0.8 },
  rev: 0,
});

export const LAYER_ORDER: readonly LayerKey[] = [
  'floor',
  'objects',
  'fence',
  'ugc',
  'diff',
  'grid',
  'tier',
] as const;

export function setLayerVisible(key: LayerKey, visible: boolean): void {
  if (layers[key].visible === visible) return;
  layers[key].visible = visible;
  layers.rev = (layers.rev + 1) | 0;
}

export function setLayerOpacity(key: LayerKey, opacity: number): void {
  const clamped = opacity < 0 ? 0 : opacity > 1 ? 1 : opacity;
  if (layers[key].opacity === clamped) return;
  layers[key].opacity = clamped;
  layers.rev = (layers.rev + 1) | 0;
}

type ModeState = {
  mode: Mode;
  modeRev: number;
};

export const modeState = $state<ModeState>({
  mode: 'paint',
  modeRev: 0,
});

export function setMode(next: Mode): void {
  if (modeState.mode === next) return;
  modeState.mode = next;
  modeState.modeRev = (modeState.modeRev + 1) | 0;
}

type MiniMapState = {
  visible: boolean;
};

export const miniMapState = $state<MiniMapState>({
  visible: true,
});

export function setMiniMapVisible(visible: boolean): void {
  if (miniMapState.visible === visible) return;
  miniMapState.visible = visible;
}

type StageInteract = {
  painting: boolean;
};

export const stageInteract = $state<StageInteract>({
  painting: false,
});

export function setPainting(value: boolean): void {
  if (stageInteract.painting === value) return;
  stageInteract.painting = value;
}
