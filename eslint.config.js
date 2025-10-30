// eslint.config.js — flat-config для ESLint v9
import js from '@eslint/js';
import globals from 'globals';
import pluginImport from 'eslint-plugin-import';

export default [
  // игнор
  { ignores: ['dist/**', 'node_modules/**'] },

  // правила для всех .js (браузерные ES-модули)
  {
    files: ['**/*.js'],
    ignores: ['vite.config.js'], // отдельный блок ниже
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: { import: pluginImport },
    rules: {
      ...js.configs.recommended.rules,
      // позволяем "пустой catch" (у нас try { localStorage } catch {})
      'no-empty': ['error', { allowEmptyCatch: true }],
      // не ругаться на _ и на неиспользуемые переменные-аргументы
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'import/no-unresolved': 'off',
    },
  },

  // отдельные правила для vite.config.js (Node среда)
  {
    files: ['vite.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
