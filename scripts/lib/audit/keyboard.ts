// The on-screen keyboard, simulated as iOS Safari has it: the window keeps its
// size and the visual viewport shrinks (the game reads it in ui/viewport.ts and
// moves the prompt card by --kb-inset). A grey block stands where the keys
// would be, so "prompt" and "prompt-keyboard" are the same layout, shot whole.
import type { Page } from '@playwright/test';

const KEYS_ID = 'audit-keyboard';
const KEYS_COLOUR = '#c9ccd3';

/** Opens (px > 0) or closes (0) the simulated keyboard. */
export async function setKeyboard(page: Page, px: number): Promise<void> {
  await page.evaluate(
    ({ px, id, colour }) => {
      const vv = window.visualViewport;
      if (!vv) throw new Error('no visualViewport to simulate a keyboard on');
      const full = window.innerHeight;
      Object.defineProperty(vv, 'height', { configurable: true, get: () => full - px });
      vv.dispatchEvent(new Event('resize'));
      document.getElementById(id)?.remove();
      if (px === 0) return;
      const keys = document.createElement('div');
      keys.id = id;
      keys.setAttribute('aria-hidden', 'true');
      Object.assign(keys.style, {
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        height: `${px}px`,
        background: colour,
        zIndex: '2147483647',
        pointerEvents: 'none',
      });
      document.body.append(keys);
    },
    { px, id: KEYS_ID, colour: KEYS_COLOUR },
  );
}

/** Where the prompt card is laid out (offsets ignore transforms: the keyboard's lift doesn't count). */
async function cardLayout(page: Page): Promise<string> {
  return page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.round');
    const ui = document.querySelector<HTMLElement>('#ui');
    const scene = document.querySelector<HTMLElement>('#scene');
    if (!card || !ui || !scene) return 'missing';
    const size = (el: HTMLElement) => `${el.offsetWidth}x${el.offsetHeight}`;
    return `${document.documentElement.className}|ui ${ui.offsetTop} ${size(ui)}|scene ${size(scene)}|card ${size(card)}`;
  });
}

const focused = (page: Page) =>
  page.evaluate(() => document.activeElement?.classList.contains('answer__input') ?? false);

/**
 * The spec's check: three wrong guesses with Go, then the keyboard dismissed
 * and opened again. The box must keep focus throughout and the layout must
 * never change (no typing state, no re-layout). Throws if it does.
 */
export async function checkNoJump(page: Page, keyboardPx: number): Promise<void> {
  const input = page.locator('.answer__input');
  const go = page.getByRole('button', { name: 'Go', exact: true });
  const before = await cardLayout(page);
  const expectSame = async (step: string) => {
    const now = await cardLayout(page);
    if (now !== before) throw new Error(`prompt layout jumped after ${step}: ${before} -> ${now}`);
  };
  for (let i = 1; i <= 3; i++) {
    await input.fill('zzzz');
    await go.click();
    if (!(await focused(page))) throw new Error(`wrong guess ${i} took focus from the box`);
    await expectSame(`wrong guess ${i}`);
  }
  await input.blur();
  await setKeyboard(page, 0);
  await expectSame('dismissing the keyboard');
  await input.focus();
  await setKeyboard(page, keyboardPx);
  await expectSame('opening the keyboard again');
  await input.fill('');
}
