import type { KAPLAYCtx } from 'kaplay';
import { TIERS, type TierId } from '@/config/tiers';
import { EFFECTS } from './registry';
import type { EffectTarget } from './types';

/** Anything an effect can be attached to: a follower, as far as effects care. */
export interface Decorated {
  readonly tier: TierId;
  readonly target: EffectTarget;
}

export interface EffectsLayer {
  /** The scene's shake this frame, whole native pixels; the renderer offsets by it. */
  readonly offset: { readonly x: number; readonly y: number };
  /** Runs every effect's drawing step; the renderer calls it after the characters. */
  drawFront(): void;
  /**
   * Starts effects for followers that don't have one (with their entrance if
   * `burst`) and stops those of followers that are gone (after a restore).
   */
  sync(followers: readonly Decorated[], burst: boolean): void;
  dispose(): void;
}

export interface EffectsLayerOptions {
  readonly reducedMotion: boolean;
  readonly random?: () => number;
}

/** Owns every follower's tier effect, the screen shake, and the effect draw steps. */
export function createEffectsLayer(k: KAPLAYCtx, options: EffectsLayerOptions): EffectsLayer {
  const random = options.random ?? Math.random;
  const steps = new Set<() => void>();
  const live = new Map<Decorated, () => void>();
  const offset = { x: 0, y: 0 };
  let shakePx = 0;
  let shakeLeftS = 0;

  const shaking = k.onUpdate(() => {
    shakeLeftS = Math.max(0, shakeLeftS - k.dt());
    if (shakeLeftS <= 0) {
      offset.x = offset.y = 0;
      return;
    }
    offset.x = Math.round((random() * 2 - 1) * shakePx);
    offset.y = Math.round((random() * 2 - 1) * shakePx);
  });

  const optionsFor = (burst: boolean) => ({
    burst,
    reducedMotion: options.reducedMotion,
    random,
    shake(px: number, ms: number) {
      if (options.reducedMotion) return; // never shake for someone who asked for less motion
      shakePx = Math.max(px, shakeLeftS > 0 ? shakePx : 0);
      shakeLeftS = Math.max(shakeLeftS, ms / 1000);
    },
    draw(step: () => void) {
      steps.add(step);
      return () => void steps.delete(step);
    },
  });

  return {
    offset,
    drawFront() {
      for (const step of steps) step();
    },
    sync(followers, burst) {
      const current = new Set(followers);
      for (const [follower, stop] of live) {
        if (current.has(follower)) continue;
        stop();
        live.delete(follower);
      }
      for (const follower of followers) {
        if (live.has(follower)) continue;
        const effect = EFFECTS[TIERS[follower.tier].effectId];
        live.set(follower, effect(k, follower.target, optionsFor(burst)));
      }
    },
    dispose() {
      for (const stop of live.values()) stop();
      live.clear();
      steps.clear();
      shaking.cancel();
    },
  };
}
