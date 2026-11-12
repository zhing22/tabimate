import type { BiomeId } from '@/config/biomes';
import { BIOME_FADE_MS, FOLLOWER_SPACING, GROUND_Y, MISS_WALK, POP_IN_MS } from '@/config/render';
import { MAX_PROMPTS_PER_PUZZLE } from '@/config/game';
import { biomeFor, distanceFor, pointsFor, totalScore } from '@/core/journey';
import type { Animal, AnimalId, RoundResult } from '@/core/types';
import { createTrail, type Trail } from './entities/followerTrail';
import { createIdleMotion, type IdleMotion, type Pose } from './entities/idleMotion';
import { createPlayer, type Player } from './entities/player';

export interface Follower {
  readonly animal: Animal;
  readonly shiny: boolean;
  readonly idle: IdleMotion;
  /** This frame's idle pose. */
  readonly pose: Pose;
  /** 0 when it appears, 1 once fully popped in. */
  pop: number;
}

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
  /** The animal (or miss) joins once the reveal is over: see revealDone. */
  answered(result: RoundResult): void;
  revealDone(): void;
  enterBiome(id: BiomeId): void;
  update(dtS: number): void;
}

export interface WorldOptions {
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly reducedMotion: boolean;
}

const STEPS_PER_S = 5;

/** Walking: a 1 px bounce per step, upright. */
function stepPose(stepTime: number, out: Pose) {
  out.dy = -Math.round(Math.abs(Math.sin(stepTime * Math.PI * STEPS_PER_S)));
  out.scaleY = 1;
  out.angle = 0;
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
  let pending: RoundResult | null = null;

  const leaveFootprints = (x: number) => {
    footprints[nextPrint] = x;
    nextPrint = (nextPrint + 1) % MAX_FOOTPRINTS;
  };

  /** A result joins the journey: a follower for a hit, footprints for a miss. */
  function join(result: RoundResult, animate: boolean) {
    const animal =
      result.match.animalId === null ? undefined : options.animals.get(result.match.animalId);
    if (animal) {
      followers.push({
        animal,
        shiny: result.match.tier === 5,
        idle: createIdleMotion({
          seed: `${animal.id}|${followers.length}`,
          reducedMotion: options.reducedMotion,
        }),
        pose: { dy: 0, scaleY: 1, angle: 0 },
        pop: animate ? 0 : 1,
      });
    } else {
      leaveFootprints(player.x);
    }
    const distance = result.match.tier === 0 ? MISS_WALK : distanceFor(pointsFor(result));
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
      pending = null;
      player.placeAt(0);
      for (const result of results) join(result, false);
      trail.reset(player.x, GROUND_Y);
      biome.from = null;
      biome.to = biomeFor(totalScore(results)).id as BiomeId;
      biome.progress = 1;
    },

    answered(result) {
      pending = result;
    },

    revealDone() {
      if (pending) join(pending, true);
      pending = null;
    },

    enterBiome(id) {
      if (id === biome.to) return;
      biome.from = biome.to;
      biome.to = id;
      biome.progress = 0;
    },

    update(dtS) {
      player.update(dtS);
      trail.record(player.x, GROUND_Y);
      if (player.walking) stepPose(player.stepTime, playerPose);
      else playerIdle.update(dtS, playerPose);
      for (let i = 0; i < followers.length; i++) {
        const follower = followers[i]!;
        // Walk in step with the player, each a little out of time with the next.
        if (player.walking) stepPose(player.stepTime + (i + 1) * 0.13, follower.pose);
        else follower.idle.update(dtS, follower.pose);
        if (follower.pop < 1) follower.pop = Math.min(1, follower.pop + (dtS * 1000) / POP_IN_MS);
      }
      if (biome.progress < 1) {
        biome.progress = Math.min(1, biome.progress + (dtS * 1000) / BIOME_FADE_MS);
        if (biome.progress === 1) biome.from = null;
      }
    },
  };
}
