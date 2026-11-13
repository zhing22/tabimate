// Dev only: tune sprite palettes by eye (dev/palettes.html). Not in the build.
// Reuses the game's recolor and palette helpers, so what you see is what ships.
import type { HexColour } from '@/config/colour';
import type { Palette } from '@/config/render';
import { BIOMES } from '@/config/biomes';
import { createJsonLoader } from '@/data/jsonLoader';
import { loadSheetFiles, loadSpriteArt, type SpriteArt } from '@/data/spriteArtSource';
import { contrastRatio, deriveShades, snapToPalette } from '@/scene/sprites/paletteUtils';
import { readSheet } from '@/scene/sprites/pixelSpriteProvider';

const loader = createJsonLoader({ baseUrl: '/' });
import { createPreview, type Preview } from './palettePreview';

const SLOTS = ['Outline', 'Base', 'Shadow', 'Highlight', 'Accent', 'Eye'] as const;
const DRAFTS_KEY = 'tabimate.dev.paletteDrafts';
/** Below this the outline melts into the background behind it. */
const MIN_OUTLINE_CONTRAST = 1.8;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

type Drafts = Record<string, HexColour[]>;
function readDrafts(): Drafts {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '{}') as Drafts;
  } catch {
    return {};
  }
}
function writeDrafts(drafts: Drafts) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Private mode or full: drafts are a convenience, editing still works.
  }
}

function fillSelect(select: HTMLSelectElement, options: readonly string[]) {
  select.replaceChildren(
    ...options.map((name) =>
      Object.assign(document.createElement('option'), { value: name, textContent: name }),
    ),
  );
}

async function main(art: SpriteArt) {
  const archetype = $<HTMLSelectElement>('#archetype');
  const paletteSelect = $<HTMLSelectElement>('#palette');
  const derive = $<HTMLInputElement>('#derive');
  const snap = $<HTMLInputElement>('#snap');
  fillSelect(archetype, art.sheets);
  fillSelect(paletteSelect, [...art.palettes.keys()]);

  const rows = SLOTS.map((label, slot) => {
    const picker = Object.assign(document.createElement('input'), { type: 'color' });
    const text = Object.assign(document.createElement('input'), {
      type: 'text',
      size: 8,
      spellcheck: false,
    });
    const row = document.createElement('label');
    row.className = 'slot';
    row.append(`${slot} ${label}`, picker, text);
    $('#slots').append(row);
    picker.addEventListener('input', () => setColour(slot, picker.value as HexColour));
    text.addEventListener('change', () => {
      if (/^#[0-9a-f]{6}$/i.test(text.value))
        setColour(slot, text.value.toLowerCase() as HexColour);
      else text.value = colours[slot]!;
    });
    return { picker, text };
  });

  let colours: HexColour[] = [];
  let preview: Preview | null = null;

  function render() {
    rows.forEach(({ picker, text }, slot) => {
      picker.value = text.value = colours[slot]!;
      const derived = derive.checked && (slot === 2 || slot === 3);
      picker.disabled = text.disabled = derived;
    });
    const stray = preview?.setPalette(colours as unknown as Palette) ?? [];
    const warnings = BIOMES.flatMap((biome) =>
      (['skyBottom', 'ground'] as const).flatMap((where) => {
        const ratio = contrastRatio(colours[0]!, biome.palette[where]);
        return ratio < MIN_OUTLINE_CONTRAST
          ? [
              `Outline is hard to see on ${biome.name} ${where === 'ground' ? 'ground' : 'sky'} (${ratio.toFixed(2)}:1)`,
            ]
          : [];
      }),
    );
    if (stray.length) warnings.push(`Sheet has non-template colours: ${stray.join(' ')}`);
    $('#warnings').replaceChildren(
      ...warnings.map((w) => Object.assign(document.createElement('li'), { textContent: w })),
    );
    $('#json').textContent = `"${paletteSelect.value}": ${JSON.stringify(colours)}`;
  }

  /** Keeps an edit as a draft; one that matches palettes.json again is dropped. */
  function saveDraft() {
    const drafts = readDrafts();
    const file = art.palettes.get(paletteSelect.value) ?? [];
    const same = colours.length === file.length && colours.every((hex, i) => hex === file[i]);
    if (same) delete drafts[paletteSelect.value];
    else drafts[paletteSelect.value] = colours;
    writeDrafts(drafts);
    $('#draft-note').hidden = same;
  }

  function setColour(slot: number, hex: HexColour) {
    const fit = (h: HexColour) => (snap.checked ? snapToPalette(h, art.master) : h);
    colours[slot] = fit(hex);
    if (derive.checked && slot === 1) {
      const { shadow, highlight } = deriveShades(colours[1]!);
      colours[2] = fit(shadow);
      colours[3] = fit(highlight);
    }
    render();
    saveDraft(); // only a real edit makes a draft, never just opening a palette
  }

  function loadPalette(fromFile = false) {
    const saved = fromFile ? undefined : readDrafts()[paletteSelect.value];
    colours = [...(saved ?? art.palettes.get(paletteSelect.value) ?? [])];
    $('#draft-note').hidden = !saved;
    render();
  }

  async function loadArchetype() {
    preview?.destroy();
    preview = createPreview(
      $('#preview'),
      readSheet(await loadSheetFiles(loader, archetype.value)),
    );
    render();
  }

  archetype.addEventListener('change', () => void loadArchetype());
  paletteSelect.addEventListener('change', () => loadPalette());
  derive.addEventListener('change', () => setColour(1, colours[1]!));
  snap.addEventListener('change', () => colours.forEach((hex, slot) => setColour(slot, hex)));
  $('#reset').addEventListener('click', () => {
    const drafts = readDrafts();
    delete drafts[paletteSelect.value];
    writeDrafts(drafts);
    loadPalette(true);
  });
  $('#copy').addEventListener('click', () => {
    const text = $('#json').textContent ?? '';
    void navigator.clipboard.writeText(text).then(
      () => ($('#copy').textContent = 'Copied!'),
      () => ($('#copy').textContent = 'Select the text below to copy'),
    );
    setTimeout(() => ($('#copy').textContent = 'Copy as JSON'), 1500);
  });

  loadPalette();
  await loadArchetype();
}

loadSpriteArt(loader)
  .then(main)
  .catch((error: unknown) => {
    $('#warnings').textContent = `Could not load the art data: ${String(error)}`;
  });
