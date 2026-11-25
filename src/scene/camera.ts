import { CAMERA, FOLLOWER_SPACING } from '@/config/render';

/** How far the party trails behind the traveller (native px): one spacing per follower. */
export const partySpan = (followers: number): number => followers * FOLLOWER_SPACING;

/**
 * The camera's left edge (whole native px) that centres the party, from the
 * last follower to the traveller, in the visible width. Characters stand on
 * their centre, so with no followers the traveller is centred.
 */
export function partyCameraX(playerX: number, span: number, visibleWidth: number): number {
  return Math.round(playerX - span / 2 - visibleWidth / 2);
}

/**
 * Moves the framed span toward the party's real span over time, so a
 * follower joining eases the camera rather than jumping it. More than one
 * follower's change at once (a restored run) cuts straight there, as does
 * reduced motion.
 */
export function easeSpan(
  shown: number,
  target: number,
  dt: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion || Math.abs(target - shown) > FOLLOWER_SPACING) return target;
  const step = Math.min(1, CAMERA.easePerS * dt);
  const next = shown + (target - shown) * step;
  return Math.abs(target - next) < 0.5 ? target : next;
}
