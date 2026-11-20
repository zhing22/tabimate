// Where everything goes on the share image. Pure numbers, so it is tested
// without a canvas; shareImage.ts draws it.
import { BACKDROP, BACKDROP_GROUND_Y, BACKDROP_HEIGHT } from '@/config/render';
import { SHARE_IMAGE } from '@/config/ui';

export interface ShareImageLayout {
  readonly width: number;
  readonly height: number;
  /** The scene still: drawn at x (centred, may overhang), y, scaled up. */
  readonly scene: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
  /** Where the team's feet rest. */
  readonly groundY: number;
  /** Each member's centre x, left to right. */
  readonly slots: readonly number[];
  /** Top of the level badges, under the team. */
  readonly badgeY: number;
  /** Text baselines, top to bottom. */
  readonly text: {
    readonly title: number;
    readonly subtitle: number;
    readonly score: number;
    readonly biome: number;
    readonly footer: number;
  };
}

export function shareImageLayout(members: number): ShareImageLayout {
  const { width, height, sceneTop, sceneScale } = SHARE_IMAGE;
  const w = BACKDROP.width * sceneScale;
  const h = BACKDROP_HEIGHT * sceneScale;
  const groundY = sceneTop + BACKDROP_GROUND_Y * sceneScale;
  return {
    width,
    height,
    scene: { x: Math.round((width - w) / 2), y: sceneTop, w, h },
    groundY,
    // Evenly spaced, with half a gap at each edge.
    slots: Array.from({ length: members }, (_, i) => Math.round((width * (i + 0.5)) / members)),
    badgeY: sceneTop + h + 24,
    text: {
      title: 130,
      subtitle: 200,
      score: 350,
      biome: 430,
      footer: height - 50,
    },
  };
}
