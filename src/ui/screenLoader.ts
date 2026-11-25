/**
 * Shows screens that load on first use (import()), keeping them out of the
 * first JavaScript: the collection pages and the results. One loader for
 * all of them, so only the screen asked for last shows, however the loads
 * finish (a slow results load can't cover a page opened after it). The
 * service worker precaches every chunk for offline play.
 */
export type OpenScreen = <T>(load: () => Promise<T>, show: (loaded: T) => void) => void;

export function createScreenLoader(): OpenScreen {
  let latest = 0;
  return (load, show) => {
    const asked = ++latest;
    load()
      .then((loaded) => {
        if (asked === latest) show(loaded);
      })
      .catch((error: unknown) => console.warn('A screen could not load.', error));
  };
}
