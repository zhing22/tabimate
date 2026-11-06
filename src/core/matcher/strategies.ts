import type { MatcherConfig } from '@/config/game';
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

/** Edits a name of this length tolerates: a share of it, at least 1, at most the max. */
export const typoAllowance = (nameLength: number, cfg: MatcherConfig): number =>
  Math.min(cfg.typoMaxDistance, Math.max(1, Math.floor(nameLength * cfg.typoMaxShare)));

export const typo: StrategyFn = (input, candidates, cfg) => {
  const text = input.text;
  if (text.length < cfg.typoMinLength) return null;
  const { names, shared, inputGramCount } = gramOverlap(candidates, text);
  const best = new Map<Candidate, Scored>();
  names.forEach(({ candidate, name, gramCount }, i) => {
    if (name.length < cfg.typoMinLength) return;
    const max = typoAllowance(name.length, cfg);
    if (Math.abs(name.length - text.length) > max) return;
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

/**
 * The input starts a word of a name ("plat" -> "platypus", "whale" -> "killer
 * whale"), or a whole name appears as words in the input ("a red fox"). Matching
 * only at word starts, with a minimum length and coverage, stops tiny guesses
 * like "er" from landing inside "tiger" for everyone, every day.
 */
export const partial: StrategyFn = (input, candidates, cfg) => {
  const text = input.text;
  const spacedText = ` ${text} `;
  const scoreName = (name: string): Scored | null => {
    const inName = text.length <= name.length;
    const short = inName ? text : name;
    const long = inName ? name : text;
    const coverage = short.length / long.length;
    if (short.length < cfg.partialMinLength || coverage < cfg.partialMinCoverage) return null;
    const found = inName ? ` ${name}`.includes(` ${text}`) : spacedText.includes(` ${name} `);
    if (!found) return null;
    // Shortest matching name wins: "bear" should find "bear" before "polar bear".
    return { score: -name.length, confidence: coverage };
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
