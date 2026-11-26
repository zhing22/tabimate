// The audit's states after the run: the results, the list, the pages they open
// and the summary (flow.ts reaches them; settle and Capture come from there).
import type { Page } from '@playwright/test';
import { AUDIT, type AuditState } from './targets';

type Capture = (state: AuditState, page: Page) => Promise<void>;

const settle = (page: Page) => page.waitForTimeout(AUDIT.settleMs);

export async function results(page: Page, capture: Capture) {
  await page.locator('.team-card').waitFor();
  await settle(page);
  await capture('results', page);
  const first = page.locator('.team-card__summary').first();
  await first.click();
  await first.scrollIntoViewIfNeeded();
  await settle(page);
  await capture('results-list', page);
  const answer = page.locator('.answer__row').first();
  await answer.click();
  await page.locator('.answer__details:not([hidden])').first().waitFor();
  await settle(page);
  await capture('results-list-detail', page);
  await answer.click();
  await first.click();
}

export async function collectionPage(
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
  if (state === 'journal') await journalDetail(page, capture);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.locator('.team-card').waitFor();
}

/** One found animal's page in the Journal (closed with its own ×). */
async function journalDetail(page: Page, capture: Capture) {
  await page.locator('.journal-cell__button').first().click();
  await page.locator('.journal-detail').waitFor();
  await settle(page);
  await capture('journal-detail', page);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.locator('.journal-detail').waitFor({ state: 'detached' });
}

/** Back closes the results pop-up; the summary shows under the scene. */
export async function summary(page: Page, capture: Capture) {
  const close = page.getByRole('button', { name: 'Back', exact: true });
  if (!(await close.isVisible())) return;
  await close.click();
  await page.locator('.results-summary').waitFor();
  await settle(page);
  await capture('results-summary', page);
}
