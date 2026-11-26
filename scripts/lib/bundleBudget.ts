// Which chunks a first visit runs, and whether they are within budget. Pure;
// scripts/check-bundle.ts reads the build's Vite manifest and prints the table.

/** One chunk in dist/.vite/manifest.json (build.manifest), keyed by its source. */
export interface ManifestChunk {
  readonly file: string;
  readonly isEntry?: boolean;
  readonly imports?: readonly string[];
  readonly dynamicImports?: readonly string[];
}

export type ViteManifest = Readonly<Record<string, ManifestChunk>>;

export type ChunkKind = 'entry' | 'initial' | 'lazy';

/** The keys given and everything they import statically, transitively. */
function withStaticImports(manifest: ViteManifest, keys: readonly string[]): Set<string> {
  const found = new Set<string>();
  const visit = (key: string) => {
    const chunk = manifest[key];
    if (found.has(key) || !chunk) return;
    found.add(key);
    chunk.imports?.forEach(visit);
  };
  keys.forEach(visit);
  return found;
}

/**
 * Each JavaScript chunk's kind: the entry (index.html's script), initial (what
 * the entry imports, and the eager chunks with what they import) or lazy.
 */
export function classifyChunks(
  manifest: ViteManifest,
  eagerSources: readonly string[],
): Map<string, ChunkKind> {
  const entries = Object.keys(manifest).filter((key) => manifest[key]?.isEntry);
  const initial = withStaticImports(manifest, [...entries, ...eagerSources]);
  const kinds = new Map<string, ChunkKind>();
  for (const [key, chunk] of Object.entries(manifest)) {
    if (!chunk.file.endsWith('.js')) continue;
    kinds.set(chunk.file, chunk.isEntry ? 'entry' : initial.has(key) ? 'initial' : 'lazy');
  }
  return kinds;
}

export interface Budget {
  readonly entryKb: number;
  readonly initialKb: number;
}

/** What breaks the budget, one line each (empty: within it). */
export function budgetProblems(entryKb: number, initialKb: number, budget: Budget): string[] {
  const problems: string[] = [];
  if (entryKb > budget.entryKb) {
    problems.push(`Entry chunk is ${entryKb.toFixed(1)} KB, over its ${budget.entryKb} KB budget.`);
  }
  if (initialKb > budget.initialKb) {
    problems.push(
      `Initial JS is ${initialKb.toFixed(1)} KB, over its ${budget.initialKb} KB budget.`,
    );
  }
  return problems;
}
