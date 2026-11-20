// Pictures the UI and the share image draw from sprites (not the scene's canvas).
/** Screen pixels per sprite pixel in the UI's sprite pictures: whole numbers keep them crisp. */
export const UI_SPRITE_SCALE = {
  /** The results line-up (and its backdrop). */
  lineup: 2,
  /** The results team rows. */
  team: 2,
  /** The Field Journal grid. */
  journal: 2,
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
} as const;
