import type { DrawRectOpt, DrawTextOpt, KAPLAYCtx } from 'kaplay';
import { BIOMES, type BiomeId } from '@/config/biomes';
import { TITLE_CARD } from '@/config/render';
import type { TitleCard } from './world';

const NAMES = new Map<BiomeId, string>(BIOMES.map((b) => [b.id, b.name]));
const TOP = 10;
const PAD = 4;
const TEXT_SIZE = 10;

/** 0..1: fades in, holds, fades out over TITLE_CARD.totalMs. */
export function titleCardOpacity(ageS: number): number {
  const ms = ageS * 1000;
  const { fadeMs, totalMs } = TITLE_CARD;
  if (ms <= 0 || ms >= totalMs) return 0;
  return Math.min(1, ms / fadeMs, (totalMs - ms) / fadeMs);
}

/**
 * The biome's name on a paper card at the top of the scene, as the player
 * walks through its gateway. Screen space; one set of options, reused.
 */
export function createTitleCardRenderer(k: KAPLAYCtx) {
  const text: DrawTextOpt = {
    text: '',
    size: TEXT_SIZE,
    pos: k.vec2(0, TOP),
    anchor: 'top',
    color: k.rgb('#2b2134'),
    opacity: 1,
  };
  const card: DrawRectOpt = {
    width: 0,
    height: TEXT_SIZE + PAD * 2,
    pos: k.vec2(0, TOP - PAD),
    anchor: 'top',
    color: k.rgb('#f6e8c8'),
    outline: { width: 1, color: k.rgb('#2b2134') },
    opacity: 1,
  };
  return (title: TitleCard, width: number) => {
    if (title.biome === null) return;
    const opacity = titleCardOpacity(title.age);
    if (opacity <= 0) return;
    text.text = NAMES.get(title.biome) ?? '';
    text.pos!.x = card.pos!.x = Math.round(width / 2);
    card.width = Math.round(text.text.length * TEXT_SIZE * 0.6) + PAD * 2;
    card.opacity = text.opacity = opacity;
    k.drawRect(card);
    k.drawText(text);
  };
}
