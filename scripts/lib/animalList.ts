// Reads scripts/input/animals.txt, the list the content scripts work from:
//
//   kind | Display name | key=value | key=value ...
//
// kind is "group" or "species". Keys, all optional:
//   id=<id>        when it isn't the display name as lowercase-with-dashes
//   wiki=<title>   English Wikipedia article (default: the display name)
//   parent=<id>    the group it belongs to
//   rep=<id>       a group's representative species (needed for a new group)
//   emoji=<emoji>  move=land|sky|water   (defaults come from the parent group)
// Blank lines and lines starting with # are ignored.
import { MOVEMENTS, type Movement } from '../../src/config/animals.ts';

export interface ListedAnimal {
  readonly id: string;
  readonly kind: 'group' | 'species';
  readonly display: string;
  readonly wikiTitle: string;
  readonly parent?: string;
  readonly representative?: string;
  readonly emoji?: string;
  readonly movement?: Movement;
  /** 1-based line in the file, for error messages. */
  readonly line: number;
}

/** "Grévy's zebra" -> "grevys-zebra": the id rule animals.json uses. */
export const idFor = (display: string): string =>
  display
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const KEYS = new Set(['id', 'wiki', 'parent', 'rep', 'emoji', 'move']);

function parseLine(text: string, line: number): ListedAnimal {
  const [kind, display, ...pairs] = text.split('|').map((s) => s.trim());
  const fail = (problem: string): never => {
    throw new Error(`animals.txt line ${line}: ${problem}`);
  };
  if (kind !== 'group' && kind !== 'species') return fail(`kind must be group or species`);
  if (!display) return fail('missing a display name');
  const keys: Record<string, string> = {};
  for (const pair of pairs) {
    const at = pair.indexOf('=');
    const key = pair.slice(0, at).trim();
    if (at < 1 || !KEYS.has(key)) fail(`unknown field "${pair}"`);
    keys[key] = pair.slice(at + 1).trim();
  }
  const move = keys.move;
  if (move !== undefined && !(MOVEMENTS as readonly string[]).includes(move)) {
    fail(`move must be one of ${MOVEMENTS.join(', ')}`);
  }
  return {
    id: keys.id ?? idFor(display),
    kind,
    display,
    wikiTitle: keys.wiki ?? display,
    line,
    ...(keys.parent ? { parent: keys.parent } : {}),
    ...(keys.rep ? { representative: keys.rep } : {}),
    ...(keys.emoji ? { emoji: keys.emoji } : {}),
    ...(move ? { movement: move as Movement } : {}),
  };
}

/** Every animal in the list, in file order. Throws on a malformed line or a repeated id. */
export function parseAnimalList(text: string): ListedAnimal[] {
  const seen = new Set<string>();
  return text.split(/\r?\n/).flatMap((raw, i) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return [];
    const animal = parseLine(line, i + 1);
    if (seen.has(animal.id))
      throw new Error(`animals.txt line ${i + 1}: "${animal.id}" is listed twice`);
    seen.add(animal.id);
    return [animal];
  });
}
