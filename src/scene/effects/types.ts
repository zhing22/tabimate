import type { KAPLAYCtx } from 'kaplay';

/**
 * What an effect decorates: a follower on screen. The renderer writes x and y
 * every frame (native px; x the sprite's centre, y its feet); an effect may set
 * glow (0..1), which the renderer draws as a halo behind the sprite.
 */
export interface EffectTarget {
  x: number;
  y: number;
  /** Sprite height in native px. */
  readonly size: number;
  glow: number;
}

export interface EffectOptions {
  /** True when the follower has just joined: play the big entrance, then idle. */
  readonly burst: boolean;
  /** prefers-reduced-motion: no shakes or particles, only fades. */
  readonly reducedMotion: boolean;
  /** Shakes the whole scene by up to `px` native pixels for `ms`. */
  shake(px: number, ms: number): void;
  /**
   * Adds a drawing step in front of the characters, inside the renderer's
   * frame (so it moves with the camera and the shake). Returns its remover.
   */
  draw(step: () => void): () => void;
  /** 0..1, like Math.random; injected so tests are repeatable. */
  readonly random: () => number;
}

/** Starts an effect on a target; returns the function that stops it. */
export type Effect = (k: KAPLAYCtx, target: EffectTarget, opts: EffectOptions) => () => void;
