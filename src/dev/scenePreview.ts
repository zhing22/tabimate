// Dev only: drives the scene with a scripted run so it can be watched (and
// screenshotted) without playing. See dev/scene.html.
import type { AnswerTierId } from '@/config/tiers';
import { createBus, type GameEvents } from '@/core/events';
import { biomesEntered } from '@/core/journey';
import type { Animal, RoundResult, RunState } from '@/core/types';
import { createScene } from '@/scene/sceneManager';
import { createEmojiSpriteProvider } from '@/scene/sprites/emojiSpriteProvider';

const SCRIPT: readonly (readonly [string | null, AnswerTierId | 0])[] = [
  ['platypus', 2],
  ['snow-leopard', 3], // 75: Grassland
  ['tiger', 4], // 160: Forest
  [null, 0],
  ['sunda-pangolin', 5],
];
const STEP_MS = 2_500;

const resultOf = ([animalId, tier]: (typeof SCRIPT)[number]): RoundResult =>
  animalId === null || tier === 0
    ? { promptId: 'p', timeMs: 1, match: { tier: 0, animalId: null, strategy: null, input: 'x' } }
    : { promptId: 'p', timeMs: 1, match: { tier, animalId, strategy: 'exact', input: animalId } };

const points = [0, 10, 25, 50, 85, 100] as const;

async function main() {
  const params = new URLSearchParams(location.search);
  const animals = (await (await fetch('/data/animals.json')).json()) as Animal[];
  const bus = createBus<GameEvents>();
  const scene = createScene(document.querySelector<HTMLElement>('#scene')!, bus, {
    animals: new Map(animals.map((a) => [a.id, a])),
    puzzleDate: '2026-11-12',
    createSprites: (k) => createEmojiSpriteProvider(k),
  });
  document.querySelector('#stats')!.textContent = 'loading sprites';
  await scene.ready;

  let score = 0;
  const play = (i: number) => {
    const step = SCRIPT[i]!;
    const result = resultOf(step);
    bus.emit('answerMatched', { round: i, result });
    bus.emit('revealFinished', { index: i });
    const before = score;
    score += points[step[1]];
    for (const biome of biomesEntered(before, score)) bus.emit('biomeEntered', { biome });
  };

  if (params.has('restore')) {
    const results = SCRIPT.map(resultOf);
    const state: RunState = {
      mode: 'daily',
      puzzleDate: '2026-11-12',
      promptCount: results.length,
      results,
      status: 'finished',
      roundEndsAt: null,
    };
    bus.emit('runRestored', { state });
  } else {
    const jump = Number(params.get('step') ?? 0);
    for (let i = 0; i < Math.min(jump, SCRIPT.length); i++) play(i);
    for (let i = jump; i < SCRIPT.length; i++) setTimeout(() => play(i), (i - jump + 1) * STEP_MS);
  }
  showFrameStats();
}

/** Frames per second and the slowest frame over the last second. */
function showFrameStats() {
  const out = document.querySelector('#stats')!;
  let frames = 0;
  let worst = 0;
  let last = performance.now();
  let windowStart = last;
  const tick = (now: number) => {
    frames++;
    worst = Math.max(worst, now - last);
    last = now;
    if (now - windowStart >= 1_000) {
      out.textContent = `${frames} fps · worst ${worst.toFixed(1)} ms · ${innerWidth}x${innerHeight} @${devicePixelRatio}`;
      frames = 0;
      worst = 0;
      windowStart = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const report = (error: unknown) => {
  document.querySelector('#stats')!.textContent =
    `Error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`;
};
window.addEventListener('error', (event) => report(event.error));
window.addEventListener('unhandledrejection', (event) => report(event.reason));
main().catch(report);
