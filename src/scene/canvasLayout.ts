import {
  GROUND_Y,
  MAX_VISIBLE_WIDTH,
  NATIVE_HEIGHT,
  RESIZE_DEBOUNCE_MS,
  SCENE_FRAME,
} from '@/config/render';
import { computeViewport, type Viewport } from './viewport';

const px = (devicePx: number, dpr: number) => `${devicePx / dpr}px`;

/**
 * The stage behind the canvas: the part of the area the scene fills. Above
 * the canvas it shows the sky, below it the ground (--ground-from, base.css);
 * on a very wide area it is framed (sceneFrame.css) on a dim backdrop.
 */
function placeStage(stage: HTMLElement, view: Viewport, dpr: number) {
  const { x, y, width, height } = view.stage;
  Object.assign(stage.style, {
    left: px(x, dpr),
    top: px(y, dpr),
    width: px(width, dpr),
    height: px(height, dpr),
  });
  stage.style.setProperty('--ground-from', px(view.offsetY - y + NATIVE_HEIGHT * view.scale, dpr));
}

/**
 * Keeps the fixed native-size canvas scaled to its container in whole device
 * pixels, re-laid out (debounced) on resize and rotation. `view` is current.
 */
export function watchCanvasLayout(container: HTMLElement, canvas: HTMLCanvasElement) {
  const stage = document.createElement('div');
  stage.className = 'scene__stage';
  canvas.before(stage);
  container.style.setProperty('--frame-border', `${SCENE_FRAME.borderPx}px`);
  let view: Viewport = computeViewport(1, 1, 1);
  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    view = computeViewport(width, height, dpr);
    canvas.style.width = px(MAX_VISIBLE_WIDTH * view.scale, dpr);
    canvas.style.height = px(NATIVE_HEIGHT * view.scale, dpr);
    canvas.style.left = px(view.offsetX, dpr);
    canvas.style.top = px(view.offsetY, dpr);
    placeStage(stage, view, dpr);
    container.classList.toggle('scene--framed', view.framed);
    // Where the walk line is and how big a scene pixel is, for the UI's stage
    // decoration (ui/layout/stage.ts) to stand on the ground.
    const root = document.documentElement.style;
    root.setProperty('--scene-ground-y', px(view.offsetY + GROUND_Y * view.scale, dpr));
    root.setProperty('--scene-px', px(view.scale, dpr));
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
      stage.remove();
    },
  };
}
