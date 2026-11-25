/**
 * The stage overlay (#stage-overlay, index.html): a layer exactly over the
 * scene area where screens put decoration that belongs in the scene, such as
 * the start screen's "Ready?" bubble or the loading path. It is aria-hidden
 * and takes no taps. scene/canvasLayout.ts publishes where the walk line is
 * (--scene-ground-y) and the size of a scene pixel (--scene-px) on <html>.
 *
 * Without an overlay (tests, a page without the scene) `el` goes into
 * `fallback` instead, so nothing is lost. Returns how to take it away.
 */
export function placeOnStage(el: HTMLElement, fallback: HTMLElement): () => void {
  const overlay = document.getElementById('stage-overlay');
  (overlay ?? fallback).append(el);
  return () => el.remove();
}
