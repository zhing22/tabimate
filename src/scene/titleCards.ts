import type { BiomeId } from '@/config/biomes';
import { TITLE_CARD } from '@/config/render';
import { BIOME_STOPS, gatewayX } from './strip';

/** A biome's name card, shown as the player passes its gateway (the biome's start). */
export interface TitleCard {
  /** The biome being entered, or null when no card is up. */
  biome: BiomeId | null;
  /** Seconds since it appeared. */
  age: number;
}

/** The title card's state, and when it shows and clears. Pure: no Kaplay. */
export function createTitleCards() {
  const card: TitleCard = { biome: null, age: 0 };
  let quiet = false;
  return {
    card,
    /** The player moved from x `from` to `to` (never going back): show any gateway passed. */
    pass(from: number, to: number) {
      if (quiet) return;
      for (let i = 1; i < BIOME_STOPS.length; i++) {
        const gate = gatewayX(i);
        if (from < gate && gate <= to) {
          card.biome = BIOME_STOPS[i]!.id;
          card.age = 0;
        }
      }
    },
    update(dtS: number) {
      if (card.biome === null) return;
      card.age += dtS;
      if (card.age * 1000 >= TITLE_CARD.totalMs) card.biome = null;
    },
    clear() {
      card.biome = null;
    },
    /** No more cards (the run is over: the results name the biome reached). */
    silence() {
      quiet = true;
      card.biome = null;
    },
  };
}
