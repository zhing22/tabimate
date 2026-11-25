// One run through the game in a browser window of one size, capturing each
// state on the way (screen states only: the steps that reach them live here).
import type { Browser, Page } from '@playwright/test';
import type { PlannedAnswer } from './answers';
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
  await page.getByRole('button', { name: 'Play' }).waitFor();
  await page.unroute(isDayData);
  await settle(page);
  await capture('start', page);
}

async function keyboardShot(page: Page, size: AuditSize, capture: Capture) {
  if (!size.keyboardPx) return;
  // As on a phone: the box takes focus, then the keyboard takes its height.
  await page.locator('.answer__input').focus();
  await page.setViewportSize({ width: size.width, height: size.height - size.keyboardPx });
  await settle(page);
  await capture('prompt-keyboard', page);
  await page.setViewportSize({ width: size.width, height: size.height });
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

async function results(page: Page, capture: Capture) {
  await page.locator('.team-card').waitFor();
  await settle(page);
  await capture('results', page);
  const first = page.locator('.team-card__summary').first();
  await first.click();
  await first.scrollIntoViewIfNeeded();
  await settle(page);
  await capture('results-list', page);
  await first.click();
}

async function collectionPage(
  page: Page,
  button: string,
  ready: string,
  state: AuditState,
  capture: Capture,
) {
  await page.getByRole('button', { name: button, exact: true }).click();
  await page.locator(ready).first().waitFor();
  await settle(page);
  await capture(state, page);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.locator('.team-card').waitFor();
}

/** Portrait: × closes the results pop-up; the summary shows under the scene. */
async function summary(page: Page, capture: Capture) {
  const close = page.getByRole('button', { name: 'Close', exact: true });
  if (!(await close.isVisible())) return;
  await close.click();
  await page.locator('.results-summary').waitFor();
  await settle(page);
  await capture('results-summary', page);
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
    await page.getByRole('button', { name: 'Play' }).click();
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
    await page.getByRole('button', { name: 'Play' }).waitFor({ timeout: AUDIT.warmUpTimeoutMs });
  } finally {
    await page.close();
  }
}
