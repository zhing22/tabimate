import { TIERS, type TierId } from '@/config/tiers';
import { h } from '../dom';
import type { Component } from './component';

export interface TierBadgeOptions {
  readonly size?: 'sm' | 'lg';
  /** Just the short code ("VU"), for tight rows; the full name stays in the label. */
  readonly compact?: boolean;
}

/** A badge in the tier's colour: "VU · Vulnerable". Colour comes from tokens.css. */
export function tierBadge(tier: TierId, options: TierBadgeOptions = {}): Component {
  const def = TIERS[tier];
  const full = tier === 0 ? def.name : `${def.shortName} · ${def.name}`;
  const text = options.compact && tier !== 0 ? def.shortName : full;
  const el = h(
    'span',
    {
      class: `tier-badge tier-badge--${options.size ?? 'sm'}`,
      'data-tier': tier,
      style: `--badge: var(${def.colour}); --badge-ink: var(${def.colour}-ink)`,
      title: text === full ? null : def.name,
      'aria-label': text === full ? null : def.name,
    },
    text,
  );
  return { el, destroy: () => {} };
}
