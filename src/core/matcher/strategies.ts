import { gramOverlap, minSharedGrams } from './gramIndex';
import { loose } from './loose';
import { lucky } from './lucky';
import { bestName, pickBest, type Scored } from './pick';
import { levenshtein } from './similarity';
import type { Candidate, Strategy, StrategyFn } from './types';

const SURE: Scored = { score: 1, confidence: 1 };

export const exact: StrategyFn = (input, candidates) =>
  pickBest(input, candidates, (c) => (c.names[0] === input.text ? SURE : null));

// Aliases are names too, but a separate strategy lets results report "you said orca".
export const alias: StrategyFn = (input, candidates) =>
  pickBest(input, candidates, (c) => (c.names.indexOf(input.text, 1) > 0 ? SURE : null));

export const typo: StrategyFn = (input, candidates, cfg) => {
  const max = cfg.typoMaxDistance;
  const text = input.text;
  const { names, shared, inputGramCount } = gramOverlap(candidates, text);
  const best = new Map<Candidate, Scored>();
  names.forEach(({ candidate, name, gramCount }, i) => {
    if (name.length < cfg.typoMinLength || Math.abs(name.length - text.length) > max) return;
    // Cheap proof that the name is out of reach, before paying for Levenshtein.
    if (shared[i]! < minSharedGrams(inputGramCount, gramCount, max)) return;
    const distance = levenshtein(text, name, max);
    if (distance > max) return;
    const score = -distance;
    if (score > (best.get(candidate)?.score ?? Number.NEGATIVE_INFINITY)) {
      best.set(candidate, { score, confidence: 1 - distance / name.length });
    }
  });
  return pickBest(input, candidates, (c) => best.get(c) ?? null);
};

/** Input inside a name ("whale" in "killer whale") or a name inside the input. */
export const partial: StrategyFn = (input, candidates, cfg) => {
  const text = input.text;
  const scoreName = (name: string): Scored | null => {
    const inName = text.length <= name.length;
    const short = inName ? text : name;
    if (short.length < cfg.partialMinLength) return null;
    if (!(inName ? name.includes(text) : text.includes(name))) return null;
    // Shortest matching name wins: "bear" should find "bear" before "polar bear".
    const long = inName ? name : text;
    return { score: -name.length, confidence: short.length / long.length };
  };
  return pickBest(input, candidates, (c) => bestName(c, scoreName));
};

export { loose, lucky };

/** Tried in order; the first hit wins. Add or reorder entries here, not in the pipeline. */
export const STRATEGIES: readonly Strategy[] = [
  { id: 'exact', match: exact },
  { id: 'alias', match: alias },
  { id: 'typo', match: typo },
  { id: 'partial', match: partial },
  { id: 'loose', match: loose },
  { id: 'lucky', match: lucky },
];
