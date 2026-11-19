import { LEVELS, type LevelId } from '@/config/levels';
import { h } from '../dom';
import type { Component } from './component';

export interface LevelBadgeOptions {
  readonly size?: 'sm' | 'lg';
  /** Just the short code ("VU"), for tight rows; the full name stays in the label. */
  readonly compact?: boolean;
}

/** A badge in the level's colour: "VU · Vulnerable". Colour comes from tokens.css. */
export function levelBadge(level: LevelId, options: LevelBadgeOptions = {}): Component {
  const def = LEVELS[level];
  const full = level === 0 ? def.name : `${def.shortName} · ${def.name}`;
  const text = options.compact && level !== 0 ? def.shortName : full;
  const el = h(
    'span',
    {
      // Small is the base style; only large has a modifier.
      class: options.size === 'lg' ? 'level-badge level-badge--lg' : 'level-badge',
      'data-level': level,
      style: `--badge: var(${def.colour}); --badge-ink: var(${def.colour}-ink)`,
      title: text === full ? null : def.name,
      'aria-label': text === full ? null : def.name,
    },
    text,
  );
  return { el, destroy: () => {} };
}
