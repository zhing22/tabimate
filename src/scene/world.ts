import type { BiomeId } from '@/config/biomes';
import { BIOME_FADE_MS, FOLLOWER_SPACING, GROUND_Y, MISS_WALK } from '@/config/render';
import { MAX_PROMPTS_PER_PUZZLE } from '@/config/game';
import { biomeFor, distanceFor } from '@/core/journey';
import { dayTotal, pointsFor } from '@/core/scoring';
import type { Animal, AnimalId, RoundResult } from '@/core/types';
import { createTrail, type Trail } from './entities/followerTrail';
import { createIdleMotion, type Pose } from './entities/idleMotion';
import { createPlayer, type Player } from './entities/player';
import { createFollower, stepPose, updateFollower, type Follower } from './follower';

export type { Follower } from './follower';

export interface BiomeFade {
  /** The biome being faded out, or null when none is. */
  from: BiomeId | null;
  to: BiomeId;
  /** 0 at the start of the crossfade, 1 when done. */
  progress: number;
}

/** Footprints left by misses; a fixed pool, oldest reused first. */
export const MAX_FOOTPRINTS = 16;

/**
 * Everything the scene shows, driven by game events and advanced by update().
 * No Kaplay and no DOM, so the journey logic is tested without a canvas.
 */
export interface World {
  readonly player: Player;
  /** Idle motion while standing, a step bounce while walking. */
  readonly playerPose: Pose;
  readonly trail: Trail;
  readonly followers: readonly Follower[];
  /** World x of each footprint pair; NaN for an unused slot. */
  readonly footprints: Float32Array;
  readonly biome: BiomeFade;
  /** Rebuilds the scene from a saved run, without animation. */
  restore(results: readonly RoundResult[]): void;
  /**
   * An answer joins the journey now, animated: the animal pops in at the back
   * of the party (a miss leaves footprints), everyone walks on, and if the
   * score has crossed a threshold the next biome fades in.
   */
  join(result: RoundResult): void;
  enterBiome(id: BiomeId): void;
  update(dtS: number): void;
}

export interface WorldOptions {
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly reducedMotion: boolean;
}

export function createWorld(options: WorldOptions): World {
  const player = createPlayer();
  const playerIdle = createIdleMotion({ seed: 'player', reducedMotion: options.reducedMotion });
  const playerPose: Pose = { dy: 0, scaleY: 1, angle: 0 };
  // Enough path for every follower to stand on, plus some slack.
  const trail = createTrail((MAX_PROMPTS_PER_PUZZLE + 2) * FOLLOWER_SPACING);
  const followers: Follower[] = [];
  const footprints = new Float32Array(MAX_FOOTPRINTS).fill(Number.NaN);
  let nextPrint = 0;
  const biome: BiomeFade = { from: null, to: biomeFor(0).id as BiomeId, progress: 1 };
  let score = 0;

  function enterBiome(id: BiomeId) {
    if (id === biome.to) return;
    biome.from = biome.to;
    biome.to = id;
    biome.progress = 0;
  }

  const leaveFootprints = (x: number) => {
    footprints[nextPrint] = x;
    nextPrint = (nextPrint + 1) % MAX_FOOTPRINTS;
  };

  /** A result joins the journey: a follower for a hit, footprints for a miss. */
  function addToJourney(result: RoundResult, animate: boolean) {
    const animal =
      result.match.animalId === null ? undefined : options.animals.get(result.match.animalId);
    if (animal) {
      const { level } = result.match;
      const { reducedMotion } = options;
      followers.push(
        createFollower({ animal, level, index: followers.length, animate, reducedMotion }),
      );
    } else {
      leaveFootprints(player.x);
    }
    const distance =
      result.match.level === 0 ? MISS_WALK : distanceFor(pointsFor(result.match.level));
    if (animate) player.walkBy(distance);
    else player.placeAt(player.x + distance);
  }

  return {
    player,
    playerPose,
    trail,
    followers,
    footprints,
    biome,

    restore(results) {
      followers.length = 0;
      footprints.fill(Number.NaN);
      nextPrint = 0;
      player.placeAt(0);
      score = dayTotal(results);
      for (const result of results) addToJourney(result, false);
      trail.reset(player.x, GROUND_Y);
      biome.from = null;
      biome.to = biomeFor(dayTotal(results)).id as BiomeId;
      biome.progress = 1;
    },

    join(result) {
      addToJourney(result, true);
      score += pointsFor(result.match.level);
      enterBiome(biomeFor(score).id as BiomeId);
    },

    enterBiome,

    update(dtS) {
      player.update(dtS);
      trail.record(player.x, GROUND_Y);
      if (player.walking) stepPose(player.stepTime, playerPose);
      else playerIdle.update(dtS, playerPose);
      for (let i = 0; i < followers.length; i++) updateFollower(followers[i]!, i, player, dtS);
      if (biome.progress < 1) {
        biome.progress = Math.min(1, biome.progress + (dtS * 1000) / BIOME_FADE_MS);
        if (biome.progress === 1) biome.from = null;
      }
    },
  };
}
