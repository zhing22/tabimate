import { h } from '../dom';
import type { SoundSetting } from './settingsMenu';

/** What a full-screen page (Journal, Achievements, History) can do from its header. */
export interface PageActions {
  /** Back: one page back, to the screen the page was opened from. */
  close(): void;
  /** ×: closes every page (portrait), back to the start or the results summary. */
  dismiss?: (() => void) | undefined;
}

/** What every full-screen page shows in its header besides its own title. */
export interface PageProps {
  readonly sound?: SoundSetting | undefined;
}

/**
 * A page's title, which names the page (aria-labelledby) and takes focus as
 * it opens so screen readers start there.
 */
export const pageTitle = (id: string, text: string): HTMLElement =>
  h('h1', { id, class: 'title title--sm', tabindex: -1 }, text);
