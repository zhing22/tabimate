import type { BiomeId } from '@/config/biomes';
import { FOLLOWER_SPACING, GROUND_Y, TITLE_CARD } from '@/config/render';
import { MAX_PROMPTS_PER_PUZZLE } from '@/config/game';
import { distanceFor } from '@/core/journey';
import { pointsFor } from '@/core/scoring';
import type { Animal, AnimalId, RoundResult } from '@/core/types';
import { createTrail, type Trail } from './entities/followerTrail';
import { createIdleMotion, type Pose } from './entities/idleMotion';
import { createPlayer, type Player } from './entities/player';
import { createFollower, stepPose, updateFollower, type Follower } from './follower';
import { BIOME_STOPS, createWorldState, gatewayX, worldStateAt, type WorldState } from './strip';

export type { Follower } from './follower';

/** A biome's name card, shown as the player passes its gateway (the border's middle). */
export interface TitleCard {
  /** The biome being entered, or null when no card is up. */
  biome: BiomeId | null;
  /** Seconds since it appeared. */
  age: number;
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
  /**
   * Where the player is on the strip, updated each frame: the biome, the next
   * one and the blend between them. With reduced motion blend stays 0, so the
   * scenery cuts at the border.
   */
  readonly state: WorldState;
  readonly titleCard: TitleCard;
  /** Rebuilds the scene from a saved run, without animation. */
  restore(results: readonly RoundResult[]): void;
  /**
   * An answer joins the journey now, animated: the animal pops in at the back
   * of the party and everyone walks on its points' distance, through any
   * border on the way. A miss leaves footprints and the party stays put.
   */
  join(result: RoundResult): void;
  update(dtS: number): void;
}

export interface WorldOptions {
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly reducedMotion: boolean;
}

export function createWorld(options: WorldOptions): World {
  const { reducedMotion } = options;
  const player = createPlayer({ reducedMotion });
  const playerIdle = createIdleMotion({ seed: 'player', reducedMotion });
  const playerPose: Pose = { dy: 0, scaleY: 1, angle: 0 };
  // Enough path for every follower to stand on, plus some slack.
  const trail = createTrail((MAX_PROMPTS_PER_PUZZLE + 2) * FOLLOWER_SPACING);
  const followers: Follower[] = [];
  const footprints = new Float32Array(MAX_FOOTPRINTS).fill(Number.NaN);
  let nextPrint = 0;
  const state = createWorldState();
  const titleCard: TitleCard = { biome: null, age: 0 };
  let lastX = 0;

  const locate = () => {
    worldStateAt(player.x, state);
    if (reducedMotion) state.blend = 0;
  };

  /** A result joins the journey: a follower for a hit, footprints for a miss. */
  function addToJourney(result: RoundResult, animate: boolean) {
    const animal =
      result.match.animalId === null ? undefined : options.animals.get(result.match.animalId);
    if (!animal) {
      footprints[nextPrint] = player.targetX;
      nextPrint = (nextPrint + 1) % MAX_FOOTPRINTS;
      return;
    }
    const { level } = result.match;
    followers.push(
      createFollower({ animal, level, index: followers.length, animate, reducedMotion }),
    );
    // The player's place is always distanceFor(score): the strip and the
    // score-based biome (and the results snapshot) can never disagree.
    const distance = distanceFor(pointsFor(level));
    if (animate) player.walkBy(distance);
    else player.placeAt(player.x + distance);
  }

  /** A title card when the player walks past a biome's gateway (never going back). */
  function checkGateways(from: number, to: number) {
    for (let i = 1; i < BIOME_STOPS.length; i++) {
      const gate = gatewayX(i);
      if (from < gate && gate <= to) {
        titleCard.biome = BIOME_STOPS[i]!.id;
        titleCard.age = 0;
      }
    }
  }

  return {
    player,
    playerPose,
    trail,
    followers,
    footprints,
    state,
    titleCard,

    restore(results) {
      followers.length = 0;
      footprints.fill(Number.NaN);
      nextPrint = 0;
      player.placeAt(0);
      for (const result of results) addToJourney(result, false);
      trail.reset(player.x, GROUND_Y);
      titleCard.biome = null;
      lastX = player.x;
      locate();
    },

    join(result) {
      addToJourney(result, true);
    },

    update(dtS) {
      player.update(dtS);
      trail.record(player.x, GROUND_Y);
      if (player.walking) stepPose(player.stepTime, playerPose);
      else playerIdle.update(dtS, playerPose);
      for (let i = 0; i < followers.length; i++) updateFollower(followers[i]!, i, player, dtS);
      checkGateways(lastX, player.x);
      lastX = player.x;
      locate();
      if (titleCard.biome !== null) {
        titleCard.age += dtS;
        if (titleCard.age * 1000 >= TITLE_CARD.totalMs) titleCard.biome = null;
      }
    },
  };
}
