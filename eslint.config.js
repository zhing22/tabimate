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

const restrictImports = (layers, message, packages = []) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { group: layers.flatMap(layer), message },
        ...(packages.length ? [{ group: packages.flatMap((p) => [p, `${p}/*`]), message }] : []),
      ],
    },
  ],
});

// core/ and config/ must run anywhere (tests in Node, future server validation),
// so they get no browser globals, no hidden clock and no hidden randomness.
const PURE_FILES = ['src/core/**/*.ts', 'src/config/**/*.ts'];
const injected = 'Inject it (Clock, Scheduler, StorageAdapter, PuzzleSource) instead.';
const pureRules = {
  'no-restricted-globals': [
    'error',
    ...[
      'window',
      'document',
      'navigator',
      'location',
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'fetch',
      'self',
      'globalThis',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'requestAnimationFrame',
      'cancelAnimationFrame',
    ].map((name) => ({ name, message: `Not allowed in pure code. ${injected}` })),
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Date', property: 'now', message: `Reads the real clock. ${injected}` },
    {
      object: 'Math',
      property: 'random',
      message: 'Results must be deterministic; derive randomness from a hash or seed.',
    },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: "NewExpression[callee.name='Date'][arguments.length=0]",
      message: `new Date() reads the real clock. ${injected}`,
    },
  ],
};

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'art/'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
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

  // Globals: browser for app code, none extra for pure code, Node for tooling.
  {
    files: ['src/**/*.ts'],
    ignores: PURE_FILES,
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: PURE_FILES,
    languageOptions: { globals: { ...globals.es2023 } },
    rules: pureRules,
  },

  // Layer boundaries (see CLAUDE.md "Architecture rules"). Dependency order:
  // config <- core <- (data, services, ui, scene) <- main.ts.
  {
    files: ['src/config/**/*.ts'],
    rules: restrictImports(
      ['core', 'data', 'services', 'ui', 'scene', 'dev'],
      'config/ is the bottom layer: it imports nothing but other config files.',
      ['kaplay'],
    ),
  },
  {
    files: ['src/core/**/*.ts'],
    rules: restrictImports(
      ['data', 'services', 'ui', 'scene', 'dev'],
      'core/ is pure: it may import only config/ and core/.',
      ['kaplay'],
    ),
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: restrictImports(['scene'], 'ui/ must not import scene/; talk through core events.'),
  },
  {
    files: ['src/scene/**/*.ts'],
    rules: restrictImports(['ui'], 'scene/ must not import ui/; talk through core events.'),
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
