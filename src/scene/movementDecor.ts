import type { DrawCircleOpt, DrawEllipseOpt, KAPLAYCtx } from 'kaplay';
import { SKY, WATER } from '@/config/movement';
import type { Follower } from './follower';

/**
 * What goes with a follower that isn't walking: a shadow on the ground under
 * a sky animal, and a water animal's bubble on land (swelling and fading as it
 * pops in water). Option objects are made once and refilled.
 */
export function createMovementDecor(k: KAPLAYCtx) {
  const shadowPos = k.vec2(0, 0);
  const shadow: DrawEllipseOpt = {
    radiusX: 0,
    radiusY: 1.5,
    pos: shadowPos,
    color: k.rgb(0, 0, 0),
    opacity: SKY.shadowOpacity,
  };
  const bubblePos = k.vec2(0, 0);
  const bubble: DrawCircleOpt = {
    radius: 0,
    pos: bubblePos,
    fill: false,
    outline: { width: 1, color: k.rgb(255, 255, 255) },
    opacity: 0,
  };
  return {
    /** A shadow on the walk line at groundY, for a character `size` px across. */
    shadow(x: number, groundY: number, size: number) {
      shadowPos.x = x;
      shadowPos.y = groundY;
      shadow.radiusX = (size * SKY.shadowWidth) / 2;
      k.drawEllipse(shadow);
    },
    /** Around the follower's sprite (its effect target), while it has a bubble. */
    bubble(f: Follower) {
      if (f.bubble <= 0) return;
      bubblePos.x = f.target.x;
      bubblePos.y = f.target.y - f.target.size / 2;
      bubble.radius = f.target.size * WATER.bubbleRadius * (1 + (1 - f.bubble) * 0.6);
      bubble.opacity = f.bubble * WATER.bubbleOpacity;
      k.drawCircle(bubble);
    },
  };
}
