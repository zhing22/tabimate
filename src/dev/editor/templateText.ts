// What a prompt template is, and how one turns chosen values into prompt text
// and an id. The registry itself is TEMPLATES in ./templates.ts.
import type { AnimalFilter } from '@/core/traits';
import type { BlankOption } from './templateWords';

export type { BlankOption };

export interface Blank {
  readonly name: string;
  readonly label: string;
  /** The allowed values; absent means free text (typed in). */
  readonly options?: readonly BlankOption[];
}

export type BlankValues = Readonly<Record<string, string>>;

export interface PromptTemplate {
  readonly id: string;
  /** Shown in the template picker. */
  readonly label: string;
  /** Prompt text with {blank} placeholders. */
  readonly text: string;
  readonly blanks: readonly Blank[];
  /** The filter that drafts answers; null when answers are added by hand. */
  readonly toFilter: (values: BlankValues) => AnimalFilter | null;
}

/** The first option of every blank: what a newly picked template starts with. */
export const defaultValues = (template: PromptTemplate): BlankValues =>
  Object.fromEntries(template.blanks.map((b) => [b.name, b.options?.[0]?.value ?? '']));

/** Prompt text with each blank replaced by its value's label (free text as typed). */
export function fillText(template: PromptTemplate, values: BlankValues): string {
  return template.text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const blank = template.blanks.find((b) => b.name === name);
    const value = values[name] ?? '';
    return blank?.options?.find((o) => o.value === value)?.label ?? value;
  });
}

/** A prompt id from the template and values: "eats-carnivore", "name-starts-q". */
export function promptIdFor(template: PromptTemplate, values: BlankValues): string {
  const parts =
    template.id === 'free'
      ? [values.text ?? '']
      : [template.id, ...template.blanks.map((b) => values[b.name] ?? '')];
  return parts
    .join('-')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/, '');
}
