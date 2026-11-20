// Sprite colouring and the art to-do list (scripts/sprite-coverage.ts).

/**
 * A group answer ("penguin") is drawn as its representative species in plainer
 * colours: palettes.json's "<palette>-plain" if there is one, otherwise the
 * representative's palette with its saturation scaled by this much (outline
 * and eyes kept).
 */
export const PLAIN_PALETTE = { suffix: '-plain', saturation: 0.35 } as const;

/**
 * How much a puzzle day counts in the sprite coverage report: today and
 * upcoming days fully, older days halving every halfLifeDays (what players
 * saw lately still matters, last month's much less).
 */
export const COVERAGE = { halfLifeDays: 14, top: 20 } as const;
