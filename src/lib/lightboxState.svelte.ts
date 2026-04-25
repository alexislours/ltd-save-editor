type LightboxState = {
  src: string | null;
  alt: string;
};

export const lightbox = $state<LightboxState>({ src: null, alt: '' });

export function openLightbox(src: string, alt: string): void {
  lightbox.src = src;
  lightbox.alt = alt;
}

export function closeLightbox(): void {
  lightbox.src = null;
  lightbox.alt = '';
}
