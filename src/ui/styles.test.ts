import { describe, expect, it } from 'vitest';
import { TIERS } from '@/config/tiers';
import tokens from './styles/tokens.css?raw';

const token = (name: string): string | undefined =>
  new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(tokens)?.[1];

// WCAG 2 relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe('tokens.css', () => {
  it.each(TIERS.map((t) => [t.id, t.colour] as const))(
    'defines tier %i colour %s and readable text on it',
    (_id, name) => {
      const bg = token(name);
      const ink = token(`${name}-ink`);
      expect(bg, `${name} missing`).toBeDefined();
      expect(ink, `${name}-ink missing`).toBeDefined();
      expect(contrast(bg!, ink!)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('body text is readable on the journal paper', () => {
    expect(contrast(token('--ink')!, token('--paper')!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--ink-soft')!, token('--paper')!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--accent-ink')!, token('--accent')!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--error')!, token('--paper')!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--hint')!, token('--paper')!)).toBeGreaterThanOrEqual(4.5);
  });

  it('turns motion off for people who ask for less', () => {
    expect(tokens).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});

const sheets = import.meta.glob<string>('./styles/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('style sheets', () => {
  it('index.css imports every sheet', () => {
    const index = sheets['./styles/index.css']!;
    for (const path of Object.keys(sheets)) {
      if (path.endsWith('/index.css')) continue;
      expect(index, `${path} is not imported`).toContain(
        `@import '${path.replace('./styles/', './')}'`,
      );
    }
  });

  // Effects are chosen by TIERS[].effectId; a selector on the tier number would bypass it.
  it('no selector styles a tier by its number', () => {
    for (const [path, css] of Object.entries(sheets)) {
      expect(css, path).not.toMatch(/\[data-tier=/);
    }
  });
});
