// Turns a Wikipedia summary into a one-line description of 15 words or fewer,
// by rules alone (no model): take the first sentence, drop brackets, anything
// after a semicolon and the "X is a species of" boilerplate, then trim clauses
// until it fits. The result is a draft: a person reviews every one.
import { DESCRIPTION_MAX_WORDS } from '../../src/config/animals.ts';

// Abbreviations that end with a full stop but don't end a sentence.
const ABBREVIATIONS =
  /(?:\b(?:c|ca|e\.g|i\.e|etc|approx|St|Mt|sp|spp|var|subsp|cf|vs|no|Dr|Mr)|\b[A-Z])\.$/;

/** The first sentence of a text, not fooled by "c. 1900" or "A. thaliana". */
export function firstSentence(text: string): string {
  const parts = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z“"(])/);
  let sentence = '';
  for (const part of parts) {
    sentence = sentence ? `${sentence} ${part}` : part;
    if (!ABBREVIATIONS.test(sentence)) break;
  }
  return sentence;
}

/** Removes (...) and [...] runs, innermost first, and the spaces they leave. */
const dropBrackets = (text: string): string => {
  let out = text;
  for (let prev = ''; prev !== out;) {
    prev = out;
    out = out.replace(/\s*[([][^()[\]]*[)\]]/g, '');
  }
  return out;
};

// "The emperor penguin is the tallest..." -> "the tallest...". The subject may
// carry appositives ("The kākāpō, sometimes known as the owl-parrot, is ..."),
// so it runs to the first verb within SUBJECT_MAX_WORDS words; a later "is" is never cut.
const SUBJECT_MAX_WORDS = 30;
const VERB = /\s(is|are|was|were)\s+(?:also\s+)?/i;

/** Drops the subject and its verb. `plural` is true for "are"/"were" ("Penguins are ..."). */
function dropSubject(text: string): { rest: string; plural: boolean } {
  const verb = VERB.exec(text);
  if (!verb || text.slice(0, verb.index).split(' ').length > SUBJECT_MAX_WORDS) {
    return { rest: text, plural: false };
  }
  const plural = /^(?:are|were)$/i.test(verb[1]!);
  return { rest: text.slice(verb.index + verb[0].length), plural };
}
// "a species of bird" -> "a bird"; "a large species of owl" -> "a large owl".
const BOILERPLATE = /\b(?:species|subspecies|genus|family|order|group|kind|type) of (?:the )?/gi;
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'or',
  'of',
  'the',
  'in',
  'on',
  'to',
  'with',
  'from',
  'by',
  'for',
  'that',
  'which',
  'who',
  'is',
  'are',
  'its',
  'their',
  'as',
  'at',
]);

const words = (text: string) => text.split(' ').filter(Boolean);

/** "a owl" -> "an owl", "an bird" -> "a bird". */
const fixArticles = (text: string) =>
  text
    .replace(/\b([Aa]) (?=[aeiouAEIOU])/g, '$1n ')
    .replace(/\b([Aa])n (?=[^aeiouAEIOU\s])/g, '$1 ');

/** Cuts to at most `max` words: at a clause break if one is close enough, else at a word. */
function fitWords(text: string, max: number): string {
  if (words(text).length <= max) return text;
  // Prefer the last comma or " and " that still leaves a meaningful line.
  const clauses = [...text.matchAll(/,| and | which | that | with /g)]
    .map((m) => text.slice(0, m.index))
    .filter((head) => words(head).length >= 5 && words(head).length <= max);
  let out = clauses.at(-1) ?? words(text).slice(0, max).join(' ');
  const kept = words(out);
  while (kept.length > 1 && STOPWORDS.has(kept.at(-1)!.toLowerCase())) kept.pop();
  out = kept.join(' ');
  return out;
}

/**
 * A draft description of at most DESCRIPTION_MAX_WORDS words, from a Wikipedia
 * summary. Empty when nothing usable is left.
 */
export function shortenDescription(extract: string, max = DESCRIPTION_MAX_WORDS): string {
  let text = dropBrackets(firstSentence(extract));
  text = text.split(';')[0]!;
  const { rest, plural } = dropSubject(text);
  text = rest.replace(BOILERPLATE, '');
  // "Penguins are a group of flightless birds" -> "Flightless birds": no "a" for a plural.
  if (plural) text = text.replace(/^an? /i, '');
  text = fitWords(text.replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim(), max);
  text = fixArticles(text.replace(/[\s,:;.—–-]+$/, ''));
  if (text === '') return '';
  return `${text[0]!.toUpperCase()}${text.slice(1)}.`;
}
