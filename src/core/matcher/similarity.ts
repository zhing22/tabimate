// Reused between calls: the typo pass runs this hundreds of times per guess.
let rowA = new Int32Array(64);
let rowB = new Int32Array(64);
const FAR = 1 << 29;

/**
 * Edit distance between a and b. With `max`, only cells within `max` of the
 * diagonal are computed (no cheaper path can leave that band), and it returns
 * max + 1 as soon as the distance must exceed max.
 */
export function levenshtein(a: string, b: string, max = Number.POSITIVE_INFINITY): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (b.length + 1 > rowA.length) {
    rowA = new Int32Array(b.length + 1);
    rowB = new Int32Array(b.length + 1);
  }
  const band = Math.min(max, Math.max(a.length, b.length));
  let prev = rowA;
  let curr = rowB;
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    const lo = i - band > 1 ? i - band : 1;
    const hi = i + band < b.length ? i + band : b.length;
    const ch = a.charCodeAt(i - 1);
    let left = lo === 1 ? i : FAR;
    curr[lo - 1] = left;
    let rowMin = left;
    for (let j = lo; j <= hi; j++) {
      const diagonal = prev[j - 1]! + (ch === b.charCodeAt(j - 1) ? 0 : 1);
      const up = prev[j]! + 1;
      let value = left + 1;
      if (up < value) value = up;
      if (diagonal < value) value = diagonal;
      curr[j] = value;
      left = value;
      if (value < rowMin) rowMin = value;
    }
    if (hi < b.length) curr[hi + 1] = FAR;
    if (rowMin > max) return max + 1;
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  const distance = prev[b.length]!;
  return distance > max ? max + 1 : distance;
}

/** Padded character trigrams: "cat" -> {"  c", " ca", "cat", "at "}. */
export function trigrams(text: string): ReadonlySet<string> {
  const padded = `  ${text} `;
  const grams = new Set<string>();
  for (let i = 0; i + 3 <= padded.length; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}

/** Dice coefficient of two trigram sets, 0..1. */
export function gramSimilarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared++;
  return (2 * shared) / (a.size + b.size);
}

/** How alike two strings look, 0 (nothing shared) to 1 (identical). */
export function trigramSimilarity(a: string, b: string): number {
  return gramSimilarity(trigrams(a), trigrams(b));
}

/** 32-bit FNV-1a hash: stable across runs and browsers, for deterministic choices. */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
