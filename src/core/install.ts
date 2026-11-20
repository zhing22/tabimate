/**
 * The "Install Tabimate" hint, as the UI sees it. The browser side (the
 * install prompt, whether it is installed, the dismissal) is services/install.ts.
 */
export interface InstallOffer {
  /** Enough days finished, not installed already, and not dismissed. */
  shouldShow(): boolean;
  /** The browser can show its own install dialog (Chrome, Edge, Android). */
  canPrompt(): boolean;
  /** Shows the browser's install dialog; true if the player accepted. */
  prompt(): Promise<boolean>;
  /** Never show the hint again. */
  dismiss(): void;
}
