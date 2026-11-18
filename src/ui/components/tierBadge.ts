import { LEVELS, type LevelId } from '@/config/tiers';
import { h } from '../dom';
import type { Component } from './component';

export interface TierBadgeOptions {
  readonly size?: 'sm' | 'lg';
  /** Just the short code ("VU"), for tight rows; the full name stays in the label. */
  readonly compact?: boolean;
}

/** A badge in the level's colour: "VU · Vulnerable". Colour comes from tokens.css. */
export function tierBadge(level: LevelId, options: TierBadgeOptions = {}): Component {
  const def = LEVELS[level];
  const full = level === 0 ? def.name : `${def.shortName} · ${def.name}`;
  const text = options.compact && level !== 0 ? def.shortName : full;
  const el = h(
    'span',
    {
      class: `level-badge level-badge--${options.size ?? 'sm'}`,
      'data-tier': level,
      style: `--badge: var(${def.colour}); --badge-ink: var(${def.colour}-ink)`,
      title: text === full ? null : def.name,
      'aria-label': text === full ? null : def.name,
    },
    text,
  );
  return { el, destroy: () => {} };
}
