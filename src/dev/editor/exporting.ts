// Getting a draft out of the editor: as a download, or saved into the project
// through the dev server (scripts/vite/devPuzzleApi.ts).
import { h } from '@/ui/dom';
import { toPuzzleJson } from './puzzleFile';
import type { EditorDraft } from './types';

export function downloadPuzzle(draft: EditorDraft): void {
  const text = `${JSON.stringify(toPuzzleJson(draft), null, 2)}\n`;
  const link = h('a', {
    href: URL.createObjectURL(new Blob([text], { type: 'application/json' })),
    download: `${draft.date}.json`,
  });
  link.click();
  URL.revokeObjectURL(link.href);
}

export interface SaveResult {
  readonly ok: boolean;
  /** "Saved: ..." or "Not saved: ...", ready to show. */
  readonly text: string;
}

/**
 * Saves through the dev server. Never throws: a network error, or a reply that
 * isn't the API's JSON (e.g. under vite preview, which has no API and answers
 * with HTML), comes back as "Not saved: ...".
 */
export async function savePuzzle(
  draft: EditorDraft,
  fetchFn: typeof fetch = (input, init) => fetch(input, init),
): Promise<SaveResult> {
  let response: Response;
  try {
    response = await fetchFn(`/__dev/puzzles/${draft.date}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPuzzleJson(draft)),
    });
  } catch (error) {
    return { ok: false, text: `Not saved: the dev server can't be reached (${String(error)})` };
  }
  let message: string;
  try {
    message = ((await response.json()) as { message?: unknown }).message as string;
    if (typeof message !== 'string') throw new Error('no message');
  } catch {
    return {
      ok: false,
      text: `Not saved: unexpected reply (HTTP ${response.status}); is this npm run dev?`,
    };
  }
  return response.ok
    ? { ok: true, text: `Saved: ${message}` }
    : { ok: false, text: `Not saved: ${message}` };
}
