type FuzzyCandidate = {
  text: string;
  group?: string;
};

export function score(query: string, candidate: string | FuzzyCandidate): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const text = typeof candidate === 'string' ? candidate : candidate.text;
  const group = typeof candidate === 'string' ? '' : (candidate.group ?? '');
  const groupBonus = group ? scoreOne(q, group.toLowerCase()) * 0.5 : 0;
  const textScore = scoreOne(q, text.toLowerCase());
  if (textScore <= 0 && groupBonus <= 0) return 0;
  return textScore + groupBonus;
}

function scoreOne(q: string, t: string): number {
  if (!t) return 0;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500 + Math.max(0, 50 - (t.length - q.length));
  const direct = t.indexOf(q);
  if (direct >= 0) {
    const wordBoundary = direct === 0 || /[\s\-_/.]/.test(t[direct - 1] ?? '');
    return 200 + (wordBoundary ? 50 : 0) - direct;
  }
  let qi = 0;
  let lastHit = -1;
  let runs = 0;
  let totalRunLen = 0;
  let inRun = false;
  let s = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      const wordBoundary = ti === 0 || /[\s\-_/.]/.test(t[ti - 1] ?? '');
      s += 1 + (wordBoundary ? 4 : 0);
      if (qi > 0 && lastHit === ti - 1) {
        if (!inRun) {
          runs++;
          inRun = true;
        }
        totalRunLen++;
        s += 3;
      } else {
        inRun = false;
      }
      lastHit = ti;
      qi++;
    }
  }
  if (qi < q.length) return 0;
  return s + totalRunLen * 2 - Math.max(0, runs - 1);
}
