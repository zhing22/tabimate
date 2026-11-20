// Bonus quiz files (public/data/bonus/{date}.json) for validate-data: every
// file must read with the game's own validator, every upcoming quiz day (its
// theme has bonusQuiz) needs one, and a file for any other day is flagged.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { themeFor } from '../../src/config/themes.ts';
import { validateBonus } from '../../src/data/validateBonus.ts';

export interface BonusCheck {
  readonly problems: string[];
  readonly warnings: string[];
  /** Each file's JSON by date, for the released-day freeze. */
  readonly files: ReadonlyMap<string, unknown>;
}

export function checkBonusFiles(dir: string, upcoming: readonly string[]): BonusCheck {
  const problems: string[] = [];
  const warnings: string[] = [];
  const files = new Map<string, unknown>();
  const names = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.json')) : [];
  for (const name of names) {
    const key = name.replace(/\.json$/, '');
    try {
      const json: unknown = JSON.parse(readFileSync(`${dir}/${name}`, 'utf8'));
      validateBonus(json, `data/bonus/${name}`, key);
      files.set(key, json);
      if (!themeFor(key)?.bonusQuiz)
        warnings.push(`bonus/${name}: ${key} has no bonus quiz, so it is never shown`);
    } catch (error) {
      problems.push(`bonus/${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const missing = upcoming.filter((key) => themeFor(key)?.bonusQuiz && !files.has(key));
  if (missing.length > 0) {
    problems.push(`missing bonus quizzes for upcoming quiz days: ${missing.join(', ')}`);
  }
  return { problems, warnings, files };
}
