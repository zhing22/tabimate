// The first JavaScript a page loads, and whether it is within budget. Pure;
// scripts/check-bundle.ts reads the build and prints the verdict.

/**
 * The scripts an HTML page loads before it can run: its module scripts and
 * the module preloads beside them, as their src/href (in page order, once each).
 */
export function firstScripts(html: string): string[] {
  const found: string[] = [];
  const tags = html.match(/<(script|link)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const isScript = /^<script/i.test(tag) && /type=["']module["']/i.test(tag);
    const isPreload = /^<link/i.test(tag) && /rel=["']modulepreload["']/i.test(tag);
    const url = /(?:src|href)=["']([^"']+)["']/i.exec(tag)?.[1];
    if ((isScript || isPreload) && url && !found.includes(url)) found.push(url);
  }
  return found;
}

export interface BudgetVerdict {
  /** Over the ceiling: the build fails. */
  readonly fail: boolean;
  /** Over the target, within the ceiling: a warning. */
  readonly warn: boolean;
  readonly message: string;
}

export function budgetVerdict(totalKb: number, budget: { targetKb: number; ceilingKb: number }) {
  const size = `${totalKb.toFixed(1)} KB gzipped`;
  if (totalKb > budget.ceilingKb)
    return {
      fail: true,
      warn: false,
      message: `First JS is ${size}, over the ${budget.ceilingKb} KB ceiling: something grew. Make it smaller (load more lazily) rather than raising the ceiling.`,
    } satisfies BudgetVerdict;
  if (totalKb > budget.targetKb)
    return {
      fail: false,
      warn: true,
      message: `First JS is ${size}: within the ${budget.ceilingKb} KB ceiling, still over the ${budget.targetKb} KB target.`,
    } satisfies BudgetVerdict;
  return {
    fail: false,
    warn: false,
    message: `First JS is ${size}, within the ${budget.targetKb} KB target.`,
  } satisfies BudgetVerdict;
}
