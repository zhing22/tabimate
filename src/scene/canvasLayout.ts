import { MAX_VISIBLE_WIDTH, NATIVE_HEIGHT, RESIZE_DEBOUNCE_MS } from '@/config/render';
import { computeViewport, type Viewport } from './viewport';

/**
 * Keeps the fixed native-size canvas scaled to its container in whole device
 * pixels, re-laid out (debounced) on resize and rotation. `view` is current.
 */
export function watchCanvasLayout(container: HTMLElement, canvas: HTMLCanvasElement) {
  let view: Viewport = computeViewport(1, 1, 1);
  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    view = computeViewport(width, height, dpr);
    canvas.style.width = `${(MAX_VISIBLE_WIDTH * view.scale) / dpr}px`;
    canvas.style.height = `${(NATIVE_HEIGHT * view.scale) / dpr}px`;
    canvas.style.top = `${view.offsetY / dpr}px`;
  }
  layout();
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const relayout = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, RESIZE_DEBOUNCE_MS);
  };
  const observer = new ResizeObserver(relayout);
  observer.observe(container);
  window.addEventListener('orientationchange', relayout);

  return {
    get view() {
      return view;
    },
    dispose() {
      observer.disconnect();
      clearTimeout(resizeTimer);
      window.removeEventListener('orientationchange', relayout);
    },
  };
}
