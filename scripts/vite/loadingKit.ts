// The loading kit in index.html (v3 Step 2 part 5): its PNG inlined as a data
// URI in a <style>, with the CSS that plays it (background-position steps at
// whole device pixels, pixelated), and a tiny inline script that picks today's
// animal and says the kit is there. So the loading screen's walkers paint at
// once, and the service worker has them with index.html (the app shell).
// No kit file (not built yet): nothing is added, and the loading screen shows
// the traveller only (ui/screens/loadingParty.ts).
import { existsSync, readFileSync } from 'node:fs';
import type { HtmlTagDescriptor, Plugin } from 'vite';
import { LOADING_KIT, type LoadingKitLayout } from '../../src/config/loadingKit.ts';
import { UI_SPRITE_SCALE } from '../../src/config/ui.ts';

/** On <html>: data-kit="ready" once the kit is in; data-kit-animal the row walking today. */
export const KIT_READY_ATTR = 'data-kit';
export const KIT_ANIMAL_ATTR = 'data-kit-animal';

/** The kit's CSS: .kit is one walker; .kit--animal is today's animal, else the traveller. */
export function loadingKitStyle(png: Uint8Array, layout: LoadingKitLayout): string {
  const { cell, frames, fps, rows } = layout;
  const uri = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
  const px = 'var(--kit-px)';
  const animals = rows
    .slice(2)
    .map((_, i) => `html[${KIT_ANIMAL_ATTR}="${i + 2}"] .kit--animal{--kit-row:${i + 2}}`);
  return [
    `:root{--kit-img:url("${uri}")}`,
    `.kit{--kit-px:calc(var(--kit-k,${UI_SPRITE_SCALE.loading})*1px);display:block;`,
    `width:calc(${cell.width}*${px});height:calc(${cell.height}*${px});`,
    `background:var(--kit-img) no-repeat;`,
    `background-size:calc(${cell.width * frames}*${px}) calc(${cell.height * rows.length}*${px});`,
    `background-position:0 calc(var(--kit-row,0)*${-cell.height}*${px});`,
    `image-rendering:pixelated;`,
    `animation:kit-walk ${frames / fps}s steps(${frames}) infinite}`,
    // Whole device pixels per sprite pixel, so each step is exactly one frame.
    `@supports (width:round(down,1.5px,1px)){.kit{--kit-px:calc(round(down,var(--kit-k,${UI_SPRITE_SCALE.loading})*var(--dpr,1),1)/var(--dpr,1)*1px)}}`,
    `.kit--animal{--kit-row:1}`,
    ...animals,
    `@keyframes kit-walk{to{background-position-x:calc(${-cell.width * frames}*${px})}}`,
    `@media (prefers-reduced-motion:reduce){.kit{animation:none}}`,
  ].join('');
}

/** The inline script: the device pixel ratio for the CSS, the kit's flag, and a random animal. */
export function loadingKitScript(animalCount: number): string {
  return [
    '(function(){try{var d=document.documentElement;',
    "d.style.setProperty('--dpr',String(window.devicePixelRatio||1));",
    `d.setAttribute(${JSON.stringify(KIT_READY_ATTR)},'ready');`,
    `d.setAttribute(${JSON.stringify(KIT_ANIMAL_ATTR)},String(1+Math.floor(Math.random()*${animalCount})));`,
    '}catch(e){}})();',
  ].join('');
}

/** The tags for index.html's head, or none without a built kit. */
export function loadingKitTags(
  png = LOADING_KIT.png,
  json = LOADING_KIT.json,
): HtmlTagDescriptor[] {
  if (!existsSync(png) || !existsSync(json)) return [];
  const layout = JSON.parse(readFileSync(json, 'utf8')) as LoadingKitLayout;
  return [
    { tag: 'style', children: loadingKitStyle(readFileSync(png), layout), injectTo: 'head' },
    { tag: 'script', children: loadingKitScript(layout.rows.length - 1), injectTo: 'head' },
  ];
}

export function loadingKit(): Plugin {
  return { name: 'tabimate-loading-kit', transformIndexHtml: () => loadingKitTags() };
}
