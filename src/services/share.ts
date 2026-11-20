import type { ShareOutcome } from '@/core/share';

export { MISS_EMOJI } from '@/config/game';
export { buildShareText, shareCard, type ShareCard, type ShareRun } from './shareText';
export type { ShareOutcome } from '@/core/share';

export interface ShareEnvironment {
  readonly navigator: {
    /** Missing on plain-HTTP pages (e.g. a phone testing over the LAN). */
    readonly clipboard?: Pick<Clipboard, 'writeText'> | undefined;
    readonly share?: Navigator['share'];
    /** Whether the sheet takes files (an image); missing on older browsers. */
    readonly canShare?: Navigator['canShare'];
  };
  /** Touch devices get the system share sheet; desktops copy (their sheets are clumsy). */
  readonly preferSheet: boolean;
  /** Last resort for old browsers without the clipboard API. */
  readonly copyByHand?: (text: string) => boolean;
}

/** The real browser: touch devices (pointer: coarse) prefer the share sheet. */
export const browserEnvironment = (): ShareEnvironment => ({
  navigator,
  preferSheet: window.matchMedia('(pointer: coarse)').matches,
  copyByHand(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
    }
  },
});

/**
 * The share data: the text, with the image file when it is ready and the sheet
 * takes files. Synchronous on purpose: nothing is awaited between the tap and
 * navigator.share, which browsers (Safari above all) only allow right after it.
 */
function shareData(
  text: string,
  nav: ShareEnvironment['navigator'],
  image?: () => File | null,
): ShareData {
  const file = image && typeof nav.canShare === 'function' ? image() : null;
  return file && nav.canShare?.({ files: [file] }) ? { text, files: [file] } : { text };
}

/**
 * Shares with the system sheet on phones (navigator.share), with the team
 * image attached where the sheet takes files; otherwise copies the text to the
 * clipboard. A dismissed sheet is 'cancelled'; a sheet that fails falls back
 * to copying. `image` returns the image if it is already made, else null (the
 * text goes alone rather than waiting for it).
 */
export async function share(
  text: string,
  env: ShareEnvironment = browserEnvironment(),
  image?: () => File | null,
): Promise<ShareOutcome> {
  const nav = env.navigator;
  if (env.preferSheet && typeof nav.share === 'function') {
    try {
      await nav.share(shareData(text, nav, image));
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // Not allowed or not supported here: copy instead.
    }
  }
  if (nav.clipboard) {
    try {
      await nav.clipboard.writeText(text);
      return 'copied';
    } catch {
      // Blocked (no permission, page not focused): try the old way below.
    }
  }
  return env.copyByHand?.(text) ? 'copied' : 'failed';
}
