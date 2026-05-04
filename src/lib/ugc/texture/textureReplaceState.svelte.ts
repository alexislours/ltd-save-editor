import type { Matte } from '$lib/ugc/codec';

export type DecodedRgba = { width: number; height: number; rgba: Uint8ClampedArray };
export type FitMode = 'fill' | 'contain' | 'cover';
type MatteOption = 'transparent' | 'white' | 'black' | 'custom';

const SUPPORTED_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];

export function isSupportedImage(file: File): boolean {
  const name = file.name.toLowerCase();
  return SUPPORTED_IMAGE_EXTS.some((ext) => name.endsWith(ext));
}

export class TextureReplaceState {
  pendingDecoded = $state<DecodedRgba | null>(null);
  newPreview = $state<string | null>(null);
  fitMode = $state<FitMode>('cover');
  matteOption = $state<MatteOption>('transparent');
  customMatteHex = $state('#000000');

  matteColor = $derived.by<Matte | null>(() => {
    switch (this.matteOption) {
      case 'transparent':
        return null;
      case 'white':
        return { r: 255, g: 255, b: 255, a: 255 };
      case 'black':
        return { r: 0, g: 0, b: 0, a: 255 };
      case 'custom': {
        const hex = this.customMatteHex.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16) || 0;
        const g = parseInt(hex.slice(2, 4), 16) || 0;
        const b = parseInt(hex.slice(4, 6), 16) || 0;
        return { r, g, b, a: 255 };
      }
    }
  });

  #previewToken = 0;
  #onError: (err: unknown) => void;
  #onTransform: ((transform: 'rotateCw' | 'rotateCcw' | 'flipH' | 'flipV') => void) | undefined;

  constructor(
    onError: (err: unknown) => void,
    onTransform?: (transform: 'rotateCw' | 'rotateCcw' | 'flipH' | 'flipV') => void,
  ) {
    this.#onError = onError;
    this.#onTransform = onTransform;
  }

  revokeNewPreview(): void {
    if (this.newPreview) {
      URL.revokeObjectURL(this.newPreview);
      this.newPreview = null;
    }
  }

  reset(): void {
    this.revokeNewPreview();
    this.pendingDecoded = null;
  }

  async loadFile(file: File): Promise<void> {
    this.revokeNewPreview();
    this.pendingDecoded = null;
    try {
      const { pngFileToRgba } = await import('$lib/ugc/codec');
      this.pendingDecoded = await pngFileToRgba(file);
    } catch (e) {
      this.#onError(e);
    }
  }

  async rebuildNewPreview(): Promise<void> {
    const token = ++this.#previewToken;
    const decoded = this.pendingDecoded;
    const matte = this.matteColor;
    const fit = this.fitMode;
    this.revokeNewPreview();
    if (!decoded) return;
    try {
      const { buildFitPreviewBlob } = await import('$lib/ugc/codec');
      const blob = await buildFitPreviewBlob(decoded, 256, fit, matte);
      const stillCurrent = token === this.#previewToken && this.pendingDecoded === decoded;
      if (!stillCurrent) return;
      this.newPreview = URL.createObjectURL(blob);
    } catch (e) {
      this.#onError(e);
    }
  }

  async applyTransform(transform: 'rotateCw' | 'rotateCcw' | 'flipH' | 'flipV'): Promise<void> {
    if (!this.pendingDecoded) return;
    const codec = await import('$lib/ugc/codec');
    const fns = {
      rotateCw: codec.rotateRgbaCw,
      rotateCcw: codec.rotateRgbaCcw,
      flipH: codec.flipRgbaH,
      flipV: codec.flipRgbaV,
    };
    this.pendingDecoded = fns[transform](this.pendingDecoded);
    this.#onTransform?.(transform);
  }
}
