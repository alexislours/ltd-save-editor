export type MarqueeRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ViewLike = {
  zoom: number;
  panX: number;
  panY: number;
  stageW: number;
  stageH: number;
  dpr: number;
};

export function rectFromCorners(ax: number, ay: number, bx: number, by: number): MarqueeRect {
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  const w = Math.abs(bx - ax);
  const h = Math.abs(by - ay);
  return { x, y, w, h };
}

export function renderMarquee(
  ctx: CanvasRenderingContext2D,
  view: ViewLike,
  rect: MarqueeRect,
): void {
  if (rect.w < 1 && rect.h < 1) return;
  const dpr = view.dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.setLineDash([]);
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

  ctx.setLineDash([]);
  ctx.restore();
}
