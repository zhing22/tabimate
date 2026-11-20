import type { DrawRectOpt, DrawTextOpt, KAPLAYCtx } from 'kaplay';
import { BIOMES, type BiomeId } from '@/config/biomes';
import { TITLE_CARD } from '@/config/render';
import type { TitleCard } from './titleCards';

const NAMES = new Map<BiomeId, string>(BIOMES.map((b) => [b.id, b.name]));

/** 0..1: fades in, holds, fades out over TITLE_CARD.totalMs. */
export function titleCardOpacity(ageS: number): number {
  const ms = ageS * 1000;
  const { fadeMs, totalMs } = TITLE_CARD;
  if (ms <= 0 || ms >= totalMs) return 0;
  return Math.min(1, ms / fadeMs, (totalMs - ms) / fadeMs);
}

/**
 * The biome's name on a paper card at the top of the scene, as the player
 * walks through its gateway. Screen space; one set of options, reused. Each
 * name is measured once, the first time its card shows, so it always fits.
 */
export function createTitleCardRenderer(k: KAPLAYCtx) {
  const { top, pad, textSize, ink, paper } = TITLE_CARD;
  const text: DrawTextOpt = {
    text: '',
    size: textSize,
    pos: k.vec2(0, top),
    anchor: 'top',
    color: k.rgb(ink),
    opacity: 1,
  };
  const card: DrawRectOpt = {
    width: 0,
    height: textSize + pad * 2,
    pos: k.vec2(0, top - pad),
    anchor: 'top',
    color: k.rgb(paper),
    outline: { width: 1, color: k.rgb(ink) },
    opacity: 1,
  };
  const widths = new Map<BiomeId, number>();
  const widthOf = (biome: BiomeId, name: string) => {
    let width = widths.get(biome);
    if (width === undefined) {
      width = Math.ceil(k.formatText({ text: name, size: textSize }).width) + pad * 2;
      widths.set(biome, width);
    }
    return width;
  };

  return (title: TitleCard, width: number) => {
    if (title.biome === null) return;
    const opacity = titleCardOpacity(title.age);
    if (opacity <= 0) return;
    text.text = NAMES.get(title.biome) ?? '';
    text.pos!.x = card.pos!.x = Math.round(width / 2);
    card.width = widthOf(title.biome, text.text);
    card.opacity = text.opacity = opacity;
    k.drawRect(card);
    k.drawText(text);
  };
}
