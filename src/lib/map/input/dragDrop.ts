import { actorDisplay } from '$lib/map/actors/actors';

type DropTarget = {
  hitTest(clientX: number, clientY: number): boolean;
  drop(actorKey: number, clientX: number, clientY: number): void;
};

let target: DropTarget | null = null;

export function registerDropTarget(t: DropTarget | null): void {
  target = t;
}

const GHOST_SIZE_PX = 32;

function makeGhost(actorKey: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '9999';
  el.style.width = `${GHOST_SIZE_PX}px`;
  el.style.height = `${GHOST_SIZE_PX}px`;
  el.style.borderRadius = '4px';
  el.style.opacity = '0.7';
  el.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.95)';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.background = actorDisplay(actorKey).color;
  el.style.transition = 'none';
  return el;
}

let active = false;

export function startActorDrag(actorKey: number, ev: PointerEvent): void {
  if (active) return;
  ev.preventDefault();
  active = true;

  const key = actorKey >>> 0;
  const ghost = makeGhost(key);
  ghost.style.left = `${ev.clientX}px`;
  ghost.style.top = `${ev.clientY}px`;
  document.body.appendChild(ghost);

  const prevCursor = document.body.style.cursor;
  document.body.style.cursor = 'grabbing';

  const onMove = (e: PointerEvent): void => {
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
  };
  const onUp = (e: PointerEvent): void => {
    cleanup();
    if (target?.hitTest(e.clientX, e.clientY)) {
      target.drop(key, e.clientX, e.clientY);
    }
  };
  const onCancel = (): void => cleanup();

  function cleanup(): void {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    ghost.remove();
    document.body.style.cursor = prevCursor;
    active = false;
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}
