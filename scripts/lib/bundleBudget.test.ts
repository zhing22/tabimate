import { describe, expect, it } from 'vitest';
import { budgetVerdict, firstScripts } from './bundleBudget';

describe('firstScripts', () => {
  it('finds the module scripts and module preloads, once each, not other scripts or styles', () => {
    const html = `<head>
      <script type="module" crossorigin src="/assets/index-a.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/levels-b.js">
      <link rel="stylesheet" href="/assets/index.css">
      <script id="vite-plugin-pwa:register-sw" src="/registerSW.js"></script>
      <link rel="modulepreload" href="/assets/levels-b.js">
    </head>`;
    expect(firstScripts(html)).toEqual(['/assets/index-a.js', '/assets/levels-b.js']);
  });
});

describe('budgetVerdict', () => {
  const budget = { targetKb: 60, ceilingKb: 120 };

  it('passes within the target, warns between target and ceiling, fails above the ceiling', () => {
    expect(budgetVerdict(59, budget)).toMatchObject({ fail: false, warn: false });
    expect(budgetVerdict(118.4, budget)).toMatchObject({ fail: false, warn: true });
    expect(budgetVerdict(121, budget)).toMatchObject({ fail: true });
    expect(budgetVerdict(121, budget).message).toContain('120 KB ceiling');
  });
});
