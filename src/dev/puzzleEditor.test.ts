// @vitest-environment jsdom
// Drives the real editor page (dev/puzzles.html) against the real data files:
// build a prompt from a template, set levels and the CR, test a guess, and
// check the export passes the validator.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { validateAnimals, validatePuzzle } from '@/data/validate';

const read = (path: string) => readFileSync(path, 'utf8');
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const change = (el: HTMLInputElement | HTMLSelectElement, value?: string | boolean) => {
  if (typeof value === 'boolean') (el as HTMLInputElement).checked = value;
  else if (value !== undefined) el.value = value;
  el.dispatchEvent(new Event('change'));
};
const slot = (n: number) => document.querySelectorAll<HTMLElement>('.slot')[n]!;

let downloaded: string | null = null;

beforeAll(async () => {
  const html = read('dev/puzzles.html');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script'));
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const path = `public${new URL(url, 'http://localhost/').pathname}`;
      try {
        return Promise.resolve(
          new Response(read(path), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      } catch {
        return Promise.resolve(new Response('', { status: 404 }));
      }
    }),
  );
  // Capture the download instead of navigating.
  URL.createObjectURL = (blob: Blob) => {
    void blob.text().then((t) => (downloaded = t));
    return 'blob:test';
  };
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = () => {};
  await import('./puzzleEditor');
  await vi.waitFor(() => expect(document.querySelectorAll('.slot')).toHaveLength(7), {
    timeout: 10000,
  });
});

describe('puzzle editor', () => {
  it('shows the date, its weekday and that there is no theme yet', () => {
    expect($('#day').textContent).toMatch(
      /^Puzzle #\d+, \w+day: no theme yet \(one CR per prompt\)/,
    );
  });

  it('drafts answers from a template, groups first, with suggested levels', () => {
    change(slot(0).querySelector('select')!, 'class');
    change(slot(0).querySelectorAll('select')[1]!, 'bird');
    expect(slot(0).querySelector('.slot__text')!.textContent).toMatch(/^Name a bird class-bird/);
    const rows = [...slot(0).querySelectorAll('tbody tr')];
    expect(rows.length).toBeGreaterThan(100);
    expect(rows[0]!.children[1]!.textContent).toBe('group');
    // No suggested level is ever above VU.
    const levels = rows.map((r) => Number(r.querySelector<HTMLSelectElement>('select')!.value));
    expect(Math.max(...levels)).toBeLessThanOrEqual(3);
  });

  it('reports the missing CR, then passes once one is marked', () => {
    expect($('#checks').textContent).toMatch(/exactly one level-5 \(CR\) answer \(got 0\)/);
    const kakapo = [...slot(0).querySelectorAll('tbody tr')].find((r) =>
      r.textContent.includes('Kākāpō'),
    )!;
    change(kakapo.querySelector<HTMLInputElement>('input[type=radio]')!, true);
    // Bump one answer to EN by hand.
    const emu = [...slot(0).querySelectorAll('tbody tr')].find((r) =>
      r.textContent.includes('Emu'),
    )!;
    change(emu.querySelector('select')!, '4');
    expect($('#checks').textContent).toContain('Valid: ready to export.');
    expect($('#counts').textContent).toMatch(/All/);
  });

  it('tests a guess with the real matcher against the current answers', () => {
    $<HTMLInputElement>('#test-guess').value = 'kakapo';
    $('#test-form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect($('#test-log').textContent).toMatch(/"kakapo" → exact Kākāpō \(level 5/);
    $<HTMLInputElement>('#test-guess').value = 'pengiun';
    $('#test-form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect($('#test-log').firstElementChild!.textContent).toMatch(/close Penguin \(level 1, typo/);
  });

  it('exports a file the validator accepts, and autosaves the draft', async () => {
    $('#download').click();
    await vi.waitFor(() => expect(downloaded).not.toBeNull());
    const json = JSON.parse(downloaded!) as {
      date: string;
      prompts: { answers: { animalId: string; level: number }[] }[];
    };
    const animals = validateAnimals(JSON.parse(read('public/data/animals.json')), 'animals');
    const puzzle = validatePuzzle(json, { file: 'x', key: json.date, animals });
    expect(puzzle.prompts).toHaveLength(1);
    expect(json.prompts[0]!.answers).toContainEqual({ animalId: 'kakapo', level: 5 });
    expect(json.prompts[0]!.answers).toContainEqual({ animalId: 'emu', level: 4 });
    expect(localStorage.getItem(`tabimate.dev.puzzleDraft.${json.date}`)).toContain('kakapo');
  });
});
