import { isDateKey } from '@/core/date';
import type { DateKey } from '@/core/types';

/**
 * The debug options in a page URL: whether the panel is on, and a date to
 * play. Kept apart from the panel so every page can read them without
 * downloading the panel (main.ts loads it only with ?debug=1).
 */
export function readDebugParams(search: string): { enabled: boolean; date: DateKey | null } {
  const params = new URLSearchParams(search);
  const enabled = params.get('debug') === '1';
  const date = params.get('date');
  return { enabled, date: enabled && date !== null && isDateKey(date) ? date : null };
}
