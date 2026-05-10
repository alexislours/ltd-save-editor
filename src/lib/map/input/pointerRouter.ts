type Pointer = {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startT: number;
};

type RouterPhase = 'idle' | 'single' | 'multi' | 'multi-tap';

type SwipeDir = 'left' | 'right' | 'up' | 'down';

export type RouterEmit =
  | { type: 'singleStart'; id: number; x: number; y: number; t: number }
  | { type: 'singleMove'; id: number; x: number; y: number }
  | { type: 'singleEnd'; id: number; x: number; y: number; canceled: boolean }
  | { type: 'longPress'; x: number; y: number }
  | { type: 'gestureStart' }
  | { type: 'panDelta'; dx: number; dy: number }
  | { type: 'pinchDelta'; scale: number; midX: number; midY: number }
  | { type: 'rotateDelta'; deltaDeg: number; snapped: boolean }
  | { type: 'gestureEnd' }
  | { type: 'multiFingerTap'; count: number }
  | { type: 'multiFingerSwipe'; count: number; dir: SwipeDir };

export type RouterInput =
  | { type: 'down'; id: number; x: number; y: number; t: number }
  | { type: 'move'; id: number; x: number; y: number; t: number }
  | { type: 'up'; id: number; x: number; y: number; t: number }
  | { type: 'cancel'; id: number; t: number }
  | { type: 'tick'; t: number };

export type RouterState = {
  pointers: Map<number, Pointer>;
  phase: RouterPhase;
  longPressFired: boolean;
  longPressCanceled: boolean;
  startDist: number;
  startAngle: number;
  startMid: { x: number; y: number };
  lastMid: { x: number; y: number };
  lastAngle: number;
  rotateLastChangeT: number;
  rotateFreeAngle: boolean;
  multiTapStartT: number;
  multiTapMoved: boolean;
  multiTapEndPositions: Map<number, { x: number; y: number; startX: number; startY: number }>;
};

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOL = 6;
const ROTATE_SNAP_DEG = 15;
const ROTATE_PAUSE_MS = 300;
const MULTI_TAP_MAX_MS = 300;
const MULTI_TAP_MOVE_TOL = 10;
const MULTI_SWIPE_MIN_PX = 40;

export function createRouter(): RouterState {
  return {
    pointers: new Map(),
    phase: 'idle',
    longPressFired: false,
    longPressCanceled: false,
    startDist: 0,
    startAngle: 0,
    startMid: { x: 0, y: 0 },
    lastMid: { x: 0, y: 0 },
    lastAngle: 0,
    rotateLastChangeT: 0,
    rotateFreeAngle: false,
    multiTapStartT: 0,
    multiTapMoved: false,
    multiTapEndPositions: new Map(),
  };
}

function pairMetrics(
  a: Pointer,
  b: Pointer,
): { dist: number; angle: number; mid: { x: number; y: number } } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return {
    dist: Math.hypot(dx, dy),
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

function normalizeAngle(d: number): number {
  let v = d;
  while (v > 180) v -= 360;
  while (v < -180) v += 360;
  return v;
}

export function step(s: RouterState, e: RouterInput): RouterEmit[] {
  const out: RouterEmit[] = [];

  if (e.type === 'down') {
    const p: Pointer = { id: e.id, x: e.x, y: e.y, startX: e.x, startY: e.y, startT: e.t };
    s.pointers.set(e.id, p);
    const n = s.pointers.size;
    if (n === 1) {
      s.phase = 'single';
      s.longPressFired = false;
      s.longPressCanceled = false;
      out.push({ type: 'singleStart', id: e.id, x: e.x, y: e.y, t: e.t });
    } else if (n === 2) {
      if (s.phase === 'single') {
        const single = [...s.pointers.values()].find((q) => q.id !== e.id);
        if (single) {
          out.push({ type: 'singleEnd', id: single.id, x: single.x, y: single.y, canceled: true });
        }
      }
      s.phase = 'multi';
      const pts = [...s.pointers.values()];
      const m = pairMetrics(pts[0], pts[1]);
      s.startDist = m.dist || 1;
      s.startAngle = m.angle;
      s.startMid = m.mid;
      s.lastMid = m.mid;
      s.lastAngle = m.angle;
      s.rotateLastChangeT = e.t;
      s.rotateFreeAngle = false;
      out.push({ type: 'gestureStart' });
    } else if (n === 3) {
      if (s.phase === 'multi') {
        out.push({ type: 'gestureEnd' });
      }
      s.phase = 'multi-tap';
      s.multiTapStartT = e.t;
      s.multiTapMoved = false;
      s.multiTapEndPositions.clear();
      for (const ptr of s.pointers.values()) {
        ptr.startX = ptr.x;
        ptr.startY = ptr.y;
        ptr.startT = e.t;
      }
    }
    return out;
  }

  if (e.type === 'move') {
    const p = s.pointers.get(e.id);
    if (!p) return out;
    p.x = e.x;
    p.y = e.y;
    if (s.phase === 'single') {
      const dx = p.x - p.startX;
      const dy = p.y - p.startY;
      if (!s.longPressCanceled && Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOL) {
        s.longPressCanceled = true;
      }
      out.push({ type: 'singleMove', id: e.id, x: e.x, y: e.y });
    } else if (s.phase === 'multi') {
      const pts = [...s.pointers.values()];
      if (pts.length < 2) return out;
      const m = pairMetrics(pts[0], pts[1]);
      const dxMid = m.mid.x - s.lastMid.x;
      const dyMid = m.mid.y - s.lastMid.y;
      if (dxMid !== 0 || dyMid !== 0) {
        out.push({ type: 'panDelta', dx: dxMid, dy: dyMid });
      }
      const cumScale = m.dist / s.startDist;
      out.push({ type: 'pinchDelta', scale: cumScale, midX: m.mid.x, midY: m.mid.y });
      const rawDelta = normalizeAngle(m.angle - s.startAngle);
      const angleChange = Math.abs(normalizeAngle(m.angle - s.lastAngle));
      if (angleChange > 0.5) {
        s.rotateLastChangeT = e.t;
      }
      if (!s.rotateFreeAngle && e.t - s.rotateLastChangeT > ROTATE_PAUSE_MS) {
        s.rotateFreeAngle = true;
      }
      const snapped = !s.rotateFreeAngle;
      const finalDelta = snapped
        ? Math.round(rawDelta / ROTATE_SNAP_DEG) * ROTATE_SNAP_DEG
        : rawDelta;
      out.push({ type: 'rotateDelta', deltaDeg: finalDelta, snapped });
      s.lastMid = m.mid;
      s.lastAngle = m.angle;
    } else if (s.phase === 'multi-tap') {
      const dx = p.x - p.startX;
      const dy = p.y - p.startY;
      if (Math.hypot(dx, dy) > MULTI_TAP_MOVE_TOL) {
        s.multiTapMoved = true;
      }
    }
    return out;
  }

  if (e.type === 'up' || e.type === 'cancel') {
    const p = s.pointers.get(e.id);
    if (!p) return out;
    const upX = e.type === 'up' ? e.x : p.x;
    const upY = e.type === 'up' ? e.y : p.y;
    if (s.phase === 'multi-tap') {
      s.multiTapEndPositions.set(e.id, { x: upX, y: upY, startX: p.startX, startY: p.startY });
    }
    s.pointers.delete(e.id);
    if (s.phase === 'single') {
      out.push({ type: 'singleEnd', id: e.id, x: upX, y: upY, canceled: e.type === 'cancel' });
      if (s.pointers.size === 0) s.phase = 'idle';
    } else if (s.phase === 'multi') {
      if (s.pointers.size < 2) {
        out.push({ type: 'gestureEnd' });
        s.phase = 'idle';
      }
    } else if (s.phase === 'multi-tap') {
      if (s.pointers.size === 0) {
        const elapsed = e.t - s.multiTapStartT;
        const positions = [...s.multiTapEndPositions.values()];
        if (!s.multiTapMoved && elapsed < MULTI_TAP_MAX_MS) {
          out.push({ type: 'multiFingerTap', count: positions.length });
        } else {
          let avgDx = 0;
          let avgDy = 0;
          for (const pp of positions) {
            avgDx += pp.x - pp.startX;
            avgDy += pp.y - pp.startY;
          }
          if (positions.length > 0) {
            avgDx /= positions.length;
            avgDy /= positions.length;
          }
          const absX = Math.abs(avgDx);
          const absY = Math.abs(avgDy);
          if (absX > MULTI_SWIPE_MIN_PX || absY > MULTI_SWIPE_MIN_PX) {
            const dir: SwipeDir =
              absX >= absY ? (avgDx > 0 ? 'right' : 'left') : avgDy > 0 ? 'down' : 'up';
            out.push({ type: 'multiFingerSwipe', count: positions.length, dir });
          }
        }
        s.multiTapEndPositions.clear();
        s.phase = 'idle';
      }
    }
    return out;
  }

  if (s.phase === 'single' && !s.longPressFired && !s.longPressCanceled && s.pointers.size === 1) {
    const p = s.pointers.values().next().value;
    if (p && e.t - p.startT >= LONG_PRESS_MS) {
      s.longPressFired = true;
      out.push({ type: 'longPress', x: p.startX, y: p.startY });
    }
  }
  return out;
}
