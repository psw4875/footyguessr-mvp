function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function getDifficulty(q) {
  const v =
    q?.difficulty ??
    q?.Difficulty ??
    q?.meta?.difficulty ??
    q?.meta?.Difficulty ??
    q?.diff ??
    q?.meta?.diff ??
    3;

  const n = Number(v);
  return Number.isFinite(n) ? clamp(n, 1, 5) : 3;
}

function weightByTarget(diff, target) {
  const dist = Math.abs(diff - target); // 0~4
  const table = [1.0, 0.55, 0.25, 0.10, 0.03];
  return table[dist] ?? 0.03;
}

function weightedPickIndex(weights) {
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) return 0;
  let r = Math.random() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * questions: 전체 문제 배열
 * usedIds: Set (이미 출제된 id들)
 * targetDifficulty: 1~5
 */
export function pickAdaptiveQuestion(questions, usedIds, targetDifficulty) {
  const used = usedIds ?? new Set();

  const pool = (questions || []).filter((q) => q?.id && !used.has(q.id));
  if (pool.length === 0) {
    const fallback = (questions || []).filter((q) => q?.id);
    if (!fallback.length) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  const target = clamp(Number(targetDifficulty ?? 3), 1, 5);
  const weights = pool.map((q) => weightByTarget(getDifficulty(q), target));
  const idx = weightedPickIndex(weights);
  return pool[idx];
}
