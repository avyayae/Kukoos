import js from '@eslint/js'
import { fixupPluginRules } from '@eslint/compat'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const CONSTITUTION_PURE =
  'Constitution §3.2: src/domain must be pure TS (no UI, storage, DOM or I/O).'
const CONSTITUTION_RNG = 'Constitution §3.3: use createRng(seed) from @/domain/rng instead.'
const CHESS_ONLY_IN_DOMAIN =
  'Spec 014: chess rules live in src/domain/chess. Import @/domain/chess, not chess.js.'
const CHESS_LIB = { group: ['chess.js', 'chess.js/*'], message: CHESS_ONLY_IN_DOMAIN }

/** What pure domain code may never import (constitution §3.2). */
const IMPURE = [
  'react',
  'react-*',
  'react/*',
  'dexie',
  'dexie/*',
  'motion',
  'motion/*',
  '@/ui',
  '@/ui/*',
  '@/features',
  '@/features/*',
  '@/data',
  '@/data/*',
  '@/app',
  '@/app/*',
  '@/audio',
  '@/audio/*',
  '@/question-kinds',
  '@/question-kinds/*',
  '@/visuals',
  '@/visuals/*',
]

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
    'coverage',
    'playwright-report',
    'test-results',
    'blob-report',
    '.claude',
  ]),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },

  {
    files: ['src/**/*.tsx'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
    plugins: {
      // jsx-a11y doesn't declare ESLint 10 support yet; the compat shim adapts its rules.
      'jsx-a11y': fixupPluginRules(jsxA11y),
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },

  // Node-side config/tooling files
  {
    files: ['*.config.{js,ts}', 'tools/**/*.{js,ts}', 'tests/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.node },
  },

  // Storage boundary: only src/data talks to IndexedDB (spec 004 AC12).
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/**', 'src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['dexie', 'dexie/*', 'dexie-react-hooks'],
              message:
                'Spec 004: use the repositories from @/data (useRepos / data hooks), not Dexie directly.',
            },
            CHESS_LIB,
          ],
        },
      ],
    },
  },

  // Domain purity — enforced, not remembered
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: IMPURE,
              message: CONSTITUTION_PURE,
            },
            CHESS_LIB,
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: CONSTITUTION_RNG },
      ],
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'localStorage',
          'sessionStorage',
          'indexedDB',
          'fetch',
        ].map((name) => ({ name, message: CONSTITUTION_PURE })),
      ],
    },
  },

  // Chess rules: the only place chess.js may be imported (spec 014 AC1). Still pure.
  {
    files: ['src/domain/chess/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: IMPURE, message: CONSTITUTION_PURE }] },
      ],
    },
  },

  // src/data is outside the storage rule above; keep chess.js out of it too.
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [CHESS_LIB] }] },
  },

  prettier,
])
