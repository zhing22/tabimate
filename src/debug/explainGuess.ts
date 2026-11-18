import { MATCHER_CONFIG, type MatcherConfig } from '@/config/game';
import { judgeGuess, type Verdict } from '@/core/answering';
import { buildCandidates } from '@/core/matcher/candidates';
import { clampInput, runStrategies } from '@/core/matcher';
import { normalize } from '@/core/matcher/normalize';
import type { TieBreak, TieReason } from '@/core/matcher/types';
import type { Animal, AnimalId, Prompt, StrategyId } from '@/core/types';

/** How the matcher read one guess: for the debug panel, not for scoring. */
export interface GuessExplained {
  readonly input: string;
  /** What the strategies actually compared, after normalising. */
  readonly normalized: string;
  readonly strategy: StrategyId | null;
  /** When answers scored the same, which one it beat and the rule that decided ("tie with X: shorter name"). */
  readonly tie: string | null;
  /** 0..1, how sure that strategy was; null for no match. */
  readonly confidence: number | null;
  readonly animal: string | null;
  readonly level: number;
  /** What the game did with it: scored, offered the exact name, or said no. */
  readonly verdict: Verdict['kind'];
  /** Why a strategy's hit was still rejected (a list of animals), if it was. */
  readonly note: string | null;
}

const TIE_WORDS: Readonly<Record<TieReason, string>> = {
  'whole-word': 'the whole guess is a word of its name',
  'shorter-name': 'shorter name',
  group: 'a group over a species',
  'lower-level': 'lower level',
  hash: 'the fixed tie-break',
};

const describeTie = (tie: TieBreak, animals: ReadonlyMap<AnimalId, Animal>) =>
  `tie with ${animals.get(tie.over)?.display ?? tie.over}, won by ${TIE_WORDS[tie.reason]}`;

export function explainGuess(
  input: string,
  prompt: Prompt,
  animals: ReadonlyMap<AnimalId, Animal>,
  cfg: MatcherConfig = MATCHER_CONFIG,
): GuessExplained {
  const normalized = normalize(clampInput(input));
  const hit =
    normalized === ''
      ? null
      : runStrategies(
          { text: normalized, promptId: prompt.id },
          buildCandidates(prompt, animals),
          cfg,
        );
  const verdict = judgeGuess(input, prompt, animals, cfg).kind;
  const overruled = hit !== null && verdict === 'none';
  return {
    input,
    normalized,
    verdict,
    note: overruled ? 'rejected: names several animals, or too many words' : null,
    strategy: hit?.strategy ?? null,
    confidence: hit ? Math.round(hit.confidence * 100) / 100 : null,
    animal: hit ? (animals.get(hit.animalId)?.display ?? hit.animalId) : null,
    level: hit?.level ?? 0,
    tie: hit?.tie ? describeTie(hit.tie, animals) : null,
  };
}
