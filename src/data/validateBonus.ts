import { BONUS } from '@/config/bonus';
import type { BonusItem, DateKey } from '@/core/types';
import { createJsonReader, field, item } from './jsonReader';

/** Words in a line of text, for the explanation limit. */
const wordCount = (text: string): number => text.trim().split(/\s+/).length;

/**
 * Reads a bonus quiz file (public/data/bonus/{date}.json): { date, items }
 * with exactly BONUS.questions items of { statement, answer, explanation },
 * each explanation BONUS.explanationWords words or fewer.
 */
export function validateBonus(json: unknown, file: string, key: DateKey): readonly BonusItem[] {
  const r = createJsonReader(file);
  const root = r.object(json, '');
  if (r.string(root.date, 'date') !== key) r.fail('date', `must be "${key}", the file's date`);
  const items = r.array(root.items, 'items');
  if (items.length !== BONUS.questions) {
    r.fail('items', `must have exactly ${BONUS.questions} questions (got ${items.length})`);
  }
  return items.map((value, i) => {
    const path = item('items', i);
    const o = r.object(value, path);
    const explanation = r.string(o.explanation, field(path, 'explanation'));
    if (wordCount(explanation) > BONUS.explanationWords) {
      r.fail(field(path, 'explanation'), `must be ${BONUS.explanationWords} words or fewer`);
    }
    return {
      statement: r.string(o.statement, field(path, 'statement')),
      answer: r.boolean(o.answer, field(path, 'answer')),
      explanation,
    };
  });
}
