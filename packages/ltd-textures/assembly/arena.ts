let bumpPtr: i32 = 0;
let bumpEnd: i32 = 0;

export function ensureArena(): void {
  if (bumpEnd == 0) {
    const initial = (<i32>memory.size()) << 16;
    bumpPtr = initial;
    bumpEnd = initial;
  }
}

export function alloc(size: i32): i32 {
  ensureArena();
  const aligned = (size + 15) & ~15;
  if (bumpPtr + aligned > bumpEnd) {
    const need = bumpPtr + aligned - bumpEnd;
    const pages = (need + 0xffff) >>> 16;
    if (memory.grow(pages) < 0) unreachable();
    bumpEnd += pages << 16;
  }
  const out = bumpPtr;
  bumpPtr += aligned;
  return out;
}

export function mark(): i32 {
  ensureArena();
  return bumpPtr;
}

export function release(m: i32): void {
  bumpPtr = m;
}
