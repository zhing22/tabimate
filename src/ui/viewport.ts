/**
 * Keeps the UI overlay inside the part of the screen the player can see. When
 * a phone keyboard opens, the visual viewport shrinks (and on iOS scrolls);
 * we expose its height and top as CSS variables so the overlay sits exactly
 * above the keyboard and the input is never hidden behind it.
 */
export function watchViewport(target: HTMLElement = document.documentElement): () => void {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  const update = () => {
    target.style.setProperty('--vv-height', `${vv.height}px`);
    target.style.setProperty('--vv-top', `${vv.offsetTop}px`);
  };
  update();
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
  };
}
