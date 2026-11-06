import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Build import patterns that catch a layer however it is reached:
// via the "@/" alias or via a relative path (../ui, ../../ui/...).
const layer = (name) => [
  `@/${name}`,
  `@/${name}/*`,
  `**/${name}`,
  `**/${name}/*`,
  `../${name}`,
  `../../${name}`,
  `../../../${name}`,
  `../${name}/*`,
  `../../${name}/*`,
  `../../../${name}/*`,
];

const forbid = (layers, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: layers.flatMap(layer), message }] }],
});

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'art/'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // CLAUDE.md: named exports only.
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // Layer boundaries (see CLAUDE.md "Architecture rules").
  {
    // config/ may use `import type` from core/types; it must not reach runtime layers.
    files: ['src/config/**/*.ts'],
    rules: forbid(
      ['ui', 'scene', 'services', 'data', 'dev'],
      'config/ holds plain values; it must not import runtime layers.',
    ),
  },
  {
    files: ['src/core/**/*.ts'],
    rules: forbid(
      ['ui', 'scene', 'services', 'data', 'dev'],
      'core/ is pure: it may import only config/ and core/.',
    ),
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: forbid(['scene'], 'ui/ must not import scene/; talk through core events.'),
  },
  {
    files: ['src/scene/**/*.ts'],
    rules: forbid(['ui'], 'scene/ must not import ui/; talk through core events.'),
  },

  // Tool config files must use default exports, and run in Node.
  {
    files: ['*.config.ts', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-exports': 'off' },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },

  prettier,
);
