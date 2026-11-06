// Allowed values for animal fields. The lists are the source of truth: the types
// are derived from them, and the validator checks data files against them.

export const MOVEMENTS = ['land', 'sky', 'water'] as const;
export type Movement = (typeof MOVEMENTS)[number];

export const SIZE_CLASSES = ['S', 'M', 'L'] as const;
export type SizeClass = (typeof SIZE_CLASSES)[number];
