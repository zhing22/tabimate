// The line index.html shows while the day's puzzle loads ("Packing your bag…").
// The theme is known from the date alone, so it can be named before anything
// has loaded.

export const LOADING_TEXT = 'Packing your bag…';

/** The loading text for a day: plain, or naming its theme. */
export const loadingText = (theme: { readonly name: string } | null): string =>
  theme ? `Packing your bag for ${theme.name}…` : LOADING_TEXT;

/** Updates the loading line in place (index.html's .loading), if it is still there. */
export function loadingLine(
  theme: { readonly name: string } | null,
  root: ParentNode = document,
): void {
  const line = root.querySelector('.loading');
  if (line) line.textContent = loadingText(theme);
}
