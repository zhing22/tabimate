// Which answer the audit types on each prompt, so every level's reveal is seen once.
import type { AuditState } from './targets';

export interface AuditPrompt {
  readonly answers: readonly { readonly animalId: string; readonly level: number }[];
}

export interface PlannedAnswer {
  /** The display name typed: an exact name always scores. */
  readonly text: string;
  /** The reveal to capture on this prompt, if it shows a level not seen yet. */
  readonly capture: AuditState | null;
}

const LEVELS = [1, 2, 3, 4, 5] as const;

/**
 * Each prompt answers the lowest level not yet captured that it has (else a
 * level 1), so a day where some prompt lacks a level still shows all five.
 */
export function planAnswers(
  prompts: readonly AuditPrompt[],
  displayOf: (animalId: string) => string,
): PlannedAnswer[] {
  const seen = new Set<number>();
  return prompts.map((prompt) => {
    const level = LEVELS.find((l) => !seen.has(l) && prompt.answers.some((a) => a.level === l));
    const answer = prompt.answers.find((a) => a.level === (level ?? 1)) ?? prompt.answers[0];
    if (!answer) throw new Error('A prompt with no answers');
    if (level) seen.add(level);
    return {
      text: displayOf(answer.animalId),
      capture: level ? (`reveal-${level}` as AuditState) : null,
    };
  });
}
