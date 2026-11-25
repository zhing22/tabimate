/**
 * Where each prompt's animal stands around the traveller in the results
 * line-up and the share image: the later half on the left, the earlier half
 * on the right, each side read outward from the traveller
 * (Q7 Q6 Q5 · traveller · Q4 Q3 Q2 Q1). Both sides are left to right.
 */
export function lineupSides<T>(byPrompt: readonly T[]): {
  readonly left: readonly T[];
  readonly right: readonly T[];
} {
  const split = Math.ceil(byPrompt.length / 2);
  return {
    left: byPrompt.slice(split).reverse(),
    right: byPrompt.slice(0, split).reverse(),
  };
}
