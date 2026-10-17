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

  // Domain purity — enforced, not remembered
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
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
              ],
              message: CONSTITUTION_PURE,
            },
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

  prettier,
])
