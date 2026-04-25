export type ForceNode = { index: number };
export type ForceEdge = { a: number; b: number };
export type ForcePos = { x: number; y: number };

export type ForceParams = {
  size: number;
  iterations?: number;
  springLength?: number;
  springK?: number;
  repulsion?: number;
  centerK?: number;
  damping?: number;
  collisionRadius?: number;
  maxStep?: number;
};

function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function computeForceLayout(
  nodes: ForceNode[],
  edges: ForceEdge[],
  params: ForceParams,
): Map<number, ForcePos> {
  const {
    size,
    iterations = 500,
    springLength = 90,
    springK = 0.045,
    repulsion = 1600,
    centerK = 0.0035,
    damping = 0.82,
    collisionRadius = 22,
    maxStep = 0.06,
  } = params;

  const out = new Map<number, ForcePos>();
  if (nodes.length === 0) return out;

  type P = { x: number; y: number; vx: number; vy: number };
  const random = rng(nodes.length * 1009 + edges.length * 31);
  const cx = size / 2;
  const cy = size / 2;

  const ps: P[] = [];
  const indexOf = new Map<number, number>();
  const initRadius = size * 0.35;
  for (let i = 0; i < nodes.length; i++) {
    indexOf.set(nodes[i].index, i);
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * initRadius;
    ps.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
      vx: 0,
      vy: 0,
    });
  }

  const eList: { i: number; j: number }[] = [];
  for (const e of edges) {
    const i = indexOf.get(e.a);
    const j = indexOf.get(e.b);
    if (i == null || j == null || i === j) continue;
    eList.push({ i, j });
  }

  const collisionSq = collisionRadius * collisionRadius;
  const maxStepPx = size * maxStep;

  for (let it = 0; it < iterations; it++) {
    const temp = 1 - it / iterations;

    for (let i = 0; i < ps.length; i++) {
      const a = ps[i];
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = (random() - 0.5) * 0.5;
          dy = (random() - 0.5) * 0.5;
          d2 = dx * dx + dy * dy + 0.01;
        }
        const d = Math.sqrt(d2);
        const f = repulsion / d2;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    for (const { i, j } of eList) {
      const a = ps[i];
      const b = ps[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = springK * (d - springLength);
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const p of ps) {
      p.vx += (cx - p.x) * centerK;
      p.vy += (cy - p.y) * centerK;
    }

    for (let i = 0; i < ps.length; i++) {
      const a = ps[i];
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < collisionSq && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const overlap = (collisionRadius - d) * 0.5;
          const ux = dx / d;
          const uy = dy / d;
          a.x -= ux * overlap;
          a.y -= uy * overlap;
          b.x += ux * overlap;
          b.y += uy * overlap;
        }
      }
    }

    const stepCap = Math.max(0.5, maxStepPx * temp);
    let totalDisp = 0;
    for (const p of ps) {
      p.vx *= damping;
      p.vy *= damping;
      let dx = p.vx;
      let dy = p.vy;
      const dl = Math.hypot(dx, dy);
      if (dl > stepCap) {
        const k = stepCap / dl;
        dx *= k;
        dy *= k;
      }
      p.x += dx;
      p.y += dy;
      totalDisp += dl;
    }
    if (totalDisp < ps.length * 0.05 && it > iterations / 4) break;
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of ps) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const targetSpan = size * 0.78;
  const scale = Math.min(1.4, Math.min(targetSpan / w, targetSpan / h));
  const ox = cx - ((minX + maxX) / 2) * scale;
  const oy = cy - ((minY + maxY) / 2) * scale;

  for (let i = 0; i < nodes.length; i++) {
    out.set(nodes[i].index, {
      x: ps[i].x * scale + ox,
      y: ps[i].y * scale + oy,
    });
  }
  return out;
}
