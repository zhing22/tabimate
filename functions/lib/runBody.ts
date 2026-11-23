// Checking a POSTed run before it goes near the database: its shape, sizes,
// a UUID device id, and a date that is today's or yesterday's SGT puzzle (so
// a run finished just before noon still counts). Pure; tested.
import { STATS } from '../../src/config/stats.ts';
import { isDateKey, shiftKey } from '../../src/core/date.ts';
import type { RunAnswer, RunSubmission } from '../../src/core/stats.ts';
import type { DateKey } from '../../src/core/types.ts';

export type Checked<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isId = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= STATS.maxIdLength;

const fail = (error: string): Checked<never> => ({ ok: false, error });

/** Today's and yesterday's puzzle keys, the only dates a run may be for. */
export const acceptedDates = (today: DateKey): readonly DateKey[] => [today, shiftKey(today, -1)];

function parseAnswers(value: unknown): Checked<RunAnswer[]> {
  if (!Array.isArray(value) || value.length === 0 || value.length > STATS.maxAnswers)
    return fail(`answers must be a list of 1 to ${STATS.maxAnswers}`);
  const answers: RunAnswer[] = [];
  const seen = new Set<string>();
  for (const item of value as unknown[]) {
    if (!isObject(item) || !isId(item.promptId)) return fail('each answer needs a promptId');
    if (item.answerId !== null && !isId(item.answerId))
      return fail('answerId must be an id or null');
    if (seen.has(item.promptId)) return fail(`prompt ${item.promptId} is answered twice`);
    seen.add(item.promptId);
    answers.push({ promptId: item.promptId, answerId: item.answerId });
  }
  return { ok: true, value: answers };
}

/** A run from a parsed JSON body, checked against today's SGT puzzle key. */
export function parseRunBody(body: unknown, today: DateKey): Checked<RunSubmission> {
  if (!isObject(body)) return fail('body must be a JSON object');
  const { deviceId, dateKey } = body;
  if (typeof deviceId !== 'string' || !UUID.test(deviceId)) return fail('deviceId must be a UUID');
  if (typeof dateKey !== 'string' || !isDateKey(dateKey)) return fail('dateKey must be YYYY-MM-DD');
  if (!acceptedDates(today).includes(dateKey)) return fail("only today's or yesterday's puzzle");
  const answers = parseAnswers(body.answers);
  if (!answers.ok) return answers;
  return { ok: true, value: { deviceId: deviceId.toLowerCase(), dateKey, answers: answers.value } };
}
