// One run through the game in a browser window of one size, capturing each
// state on the way (screen states only: the steps that reach them live here).
import type { Browser, Page } from '@playwright/test';
import type { PlannedAnswer } from './answers';
import { checkNoJump, setKeyboard } from './keyboard';
import { collectionPage, results, summary } from './pages';
import { AUDIT, type AuditSize, type AuditState } from './targets';

export type Capture = (state: AuditState, page: Page) => Promise<void>;

/** The debug panel is for testers; players never see it, so it stays out of the shots. */
const HIDE_DEBUG = '.debug { display: none !important; }';

/** The day's puzzle and animals (public/data), not the app's own src/data modules. */
const isDayData = (url: URL) => url.pathname.startsWith('/data/');

const settle = (page: Page) => page.waitForTimeout(AUDIT.settleMs);

async function openGame(page: Page, url: string, capture: Capture) {
  // Hold the day's data back so the loading screen stays up to be captured.
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(isDayData, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(`${url}?debug=1&date=${AUDIT.date}`);
  await page.addStyleTag({ content: HIDE_DEBUG });
  await page.locator('.loading').waitFor();
  await settle(page);
  await capture('loading', page);
  release();
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  await page.unroute(isDayData);
  await settle(page);
  await capture('start', page);
}

async function keyboardShot(page: Page, size: AuditSize, capture: Capture) {
  if (!size.keyboardPx) return;
  // As on a phone: the box takes focus, then the keyboard covers the bottom of
  // the same layout (keyboard.ts). Then the "never jumps" check.
  await page.locator('.answer__input').focus();
  await setKeyboard(page, size.keyboardPx);
  await settle(page);
  await capture('prompt-keyboard', page);
  // Portrait only: a landscape panel fits what the keyboard leaves (shell.css).
  if (size.height > size.width) await checkNoJump(page, size.keyboardPx);
  await setKeyboard(page, 0);
  await settle(page);
}

async function answer(page: Page, planned: PlannedAnswer, capture: Capture) {
  await page.locator('.answer__input').fill(planned.text);
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await page.locator('.reveal--named').waitFor();
  await settle(page);
  if (planned.capture) await capture(planned.capture, page);
  await page.locator('.reveal__next').click();
  await page.locator('.reveal').waitFor({ state: 'detached' });
}

export async function auditOneSize(
  browser: Browser,
  url: string,
  size: AuditSize,
  plan: readonly PlannedAnswer[],
  capture: Capture,
  /** Where to save what the page showed if a step fails. */
  failedShot: string,
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.dpr,
    isMobile: size.touch,
    hasTouch: size.touch,
  });
  context.setDefaultTimeout(AUDIT.stepTimeoutMs);
  // tsx names functions with a __name helper; measurePage runs in the page, which has none.
  await context.addInitScript('globalThis.__name = (f) => f;');
  const page = await context.newPage();
  try {
    await openGame(page, url, capture);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.locator('.answer__input').waitFor();
    await settle(page);
    await capture('prompt', page);
    await keyboardShot(page, size, capture);
    for (const planned of plan) await answer(page, planned, capture);
    await results(page, capture);
    await collectionPage(page, 'Field Journal', '.journal', 'journal', capture);
    await collectionPage(page, 'Achievements', '.badge', 'achievements', capture);
    await collectionPage(page, 'History', '.calendar-legend', 'history', capture);
    await summary(page, capture);
  } catch (error) {
    await page.screenshot({ path: failedShot }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

/** One load before the sizes start together: Vite compiles the app once, not under parallel load. */
export async function warmUp(browser: Browser, url: string): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.goto(`${url}?debug=1&date=${AUDIT.date}`);
    await page
      .getByRole('button', { name: 'Play', exact: true })
      .waitFor({ timeout: AUDIT.warmUpTimeoutMs });
  } finally {
    await page.close();
  }
}
