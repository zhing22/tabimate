import { trigrams } from './similarity';
import type { Candidate } from './types';

export interface IndexedName {
  readonly candidate: Candidate;
  readonly name: string;
  readonly gramCount: number;
}

interface GramIndex {
  /** Every name of every candidate, flattened. */
  readonly names: readonly IndexedName[];
  /** Trigram -> positions in `names` of the names containing it. */
  readonly postings: ReadonlyMap<string, readonly number[]>;
}

export interface GramOverlap {
  readonly names: readonly IndexedName[];
  /** shared[i] = trigrams names[i] has in common with the input. */
  readonly shared: Int32Array;
  readonly inputGramCount: number;
}

// Comparing a guess with every name one by one was the slowest part of matching,
// so each candidate list is indexed once and only names sharing a trigram are visited.
const indexes = new WeakMap<readonly Candidate[], GramIndex>();

function indexOf(candidates: readonly Candidate[]): GramIndex {
  const cached = indexes.get(candidates);
  if (cached) return cached;
  const names: IndexedName[] = [];
  const postings = new Map<string, number[]>();
  for (const candidate of candidates) {
    candidate.grams.forEach((grams, n) => {
      for (const gram of grams) {
        const list = postings.get(gram);
        if (list) list.push(names.length);
        else postings.set(gram, [names.length]);
      }
      names.push({ candidate, name: candidate.names[n] ?? '', gramCount: grams.size });
    });
  }
  const index = { names, postings };
  indexes.set(candidates, index);
  return index;
}

// typo and loose both ask about the same guess, so the last answer is kept.
let last: { candidates: readonly Candidate[]; text: string; overlap: GramOverlap } | null = null;

/** How many trigrams `text` shares with each name of the candidates. */
export function gramOverlap(candidates: readonly Candidate[], text: string): GramOverlap {
  if (last?.candidates === candidates && last.text === text) return last.overlap;
  const { names, postings } = indexOf(candidates);
  const grams = trigrams(text);
  const shared = new Int32Array(names.length);
  for (const gram of grams) {
    for (const position of postings.get(gram) ?? []) shared[position]!++;
  }
  const overlap = { names, shared, inputGramCount: grams.size };
  last = { candidates, text, overlap };
  return overlap;
}

/**
 * Fewest trigrams two strings within `edits` edits must share. One edit removes
 * at most 3 trigrams from a string's set, so at most 3 * edits can be lost.
 */
export const minSharedGrams = (gramsA: number, gramsB: number, edits: number): number =>
  Math.max(gramsA, gramsB) - 3 * edits;
