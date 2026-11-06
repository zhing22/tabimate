// Guesses and names go through the same normalize(), so the rules only need to
// be consistent, not grammatically perfect ("platypus" -> "platypus" either way).

const IRREGULAR: Readonly<Record<string, string>> = {
  wolves: 'wolf',
  calves: 'calf',
  halves: 'half',
  leaves: 'leaf',
  loaves: 'loaf',
  knives: 'knife',
  wives: 'wife',
  geese: 'goose',
  mice: 'mouse',
  lice: 'louse',
  oxen: 'ox',
  feet: 'foot',
  teeth: 'tooth',
  octopi: 'octopus',
  cacti: 'cactus',
  fungi: 'fungus',
  children: 'child',
  people: 'person',
};

// Short words like "bus" or "gas" are left alone; stripping them helps nothing.
const MIN_PLURAL_LENGTH = 4;

/** Best-effort singular of one lowercase word: wolves -> wolf, foxes -> fox, cats -> cat. */
export function singularize(word: string): string {
  const irregular = IRREGULAR[word];
  if (irregular !== undefined) return irregular;
  if (word.length < MIN_PLURAL_LENGTH) return word;
  if (word.endsWith('ies') && word.length > MIN_PLURAL_LENGTH) return `${word.slice(0, -3)}y`;
  if (/(?:ch|sh|x|z|ss)es$/.test(word)) return word.slice(0, -2);
  // walrus, mantis, albatross: an "s" that is part of the word, not a plural.
  if (/(?:ss|us|is)$/.test(word)) return word;
  return word.endsWith('s') ? word.slice(0, -1) : word;
}

/**
 * Lowercase, strip accents, turn punctuation into spaces, collapse spaces and
 * singularise each word. "Killer-Whales!" -> "killer whale". Apostrophes are
 * dropped rather than spaced, so "Grévy's" -> "grevys".
 */
export function normalize(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter((word) => word !== '')
    .map(singularize)
    .join(' ');
}
