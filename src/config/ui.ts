// Pictures the UI and the share image draw from sprites (not the scene's canvas).
/** Screen pixels per sprite pixel in the UI's sprite pictures: whole numbers keep them crisp. */
export const UI_SPRITE_SCALE = {
  /** The results line-up (and its backdrop). */
  lineup: 2,
  /** The results team rows. */
  team: 2,
  /** The Field Journal grid. */
  journal: 2,
  /** The chosen animal on its journal page, moving. */
  journalDetail: 4,
} as const;

/**
 * The share image (services/shareImage.ts): a 4:5 portrait PNG. The scene where
 * the run ended (the results backdrop) is drawn sceneScale times its native
 * size from sceneTop, the team stands on its walk line at spriteScale.
 */
export const SHARE_IMAGE = {
  width: 1080,
  height: 1350,
  sceneTop: 500,
  sceneScale: 5,
  spriteScale: 4,
  /** Emoji drawn for a member without a sprite, px. */
  emojiPx: 96,
  /** Space kept clear at each side of a text line, px. */
  textMargin: 40,
  /** Text lines: baseline from the top (footer: from the bottom) and size, px. */
  text: {
    title: { y: 130, px: 88 },
    subtitle: { y: 200, px: 44 },
    score: { y: 350, px: 120 },
    biome: { y: 430, px: 52 },
    footer: { fromBottom: 50, px: 36 },
  },
  /** Level badges under the team: a box centred on each member, gap below the scene. */
  badge: { width: 112, height: 60, gap: 24, px: 40, baseline: 45 },
} as const;

/**
 * Colours used outside the style sheets: the PWA manifest and browser bar
 * (vite.config.ts, index.html) and the share image's fallback ink. They match
 * tokens.css (--night, --ink), which ui/styles.test.ts checks.
 */
export const APP_COLOURS = {
  night: '#1d2b3a',
  ink: '#2b2134',
} as const;
