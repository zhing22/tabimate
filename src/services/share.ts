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

/** The share data: the text, with the image as a file when the sheet takes one. */
async function shareData(
  text: string,
  nav: ShareEnvironment['navigator'],
  image?: () => Promise<Blob | null>,
): Promise<ShareData> {
  const blob = image && typeof nav.canShare === 'function' ? await image() : null;
  if (!blob) return { text };
  const files = [new File([blob], SHARE_IMAGE_NAME, { type: 'image/png' })];
  return nav.canShare?.({ files }) ? { text, files } : { text };
}

/** The share image's file name. */
export const SHARE_IMAGE_NAME = 'tabimate.png';

/**
 * Shares with the system sheet on phones (navigator.share), with the team
 * image attached where the sheet takes files; otherwise copies the text to the
 * clipboard. A dismissed sheet is 'cancelled'; a sheet that fails falls back
 * to copying. `image` should be ready (made when the results opened): browsers
 * only allow a share soon after the tap.
 */
export async function share(
  text: string,
  env: ShareEnvironment = browserEnvironment(),
  image?: () => Promise<Blob | null>,
): Promise<ShareOutcome> {
  const nav = env.navigator;
  if (env.preferSheet && typeof nav.share === 'function') {
    try {
      await nav.share(await shareData(text, nav, image));
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
