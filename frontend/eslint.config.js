import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';

export default [
  // 1. Global Ignores
  {
    ignores: ['dist', 'assets', 'coverage', 'docs/assets', 'node_modules'],
  },

  // 2. Base Configuration
  js.configs.recommended,

  // 3. React Configuration
  {
    files: ['**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime'],
    settings: {
      react: {
        version: 'detect', // Auto-detect React version
      },
    },
  },

  // 4. Main Configuration & Plugins
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      // --- React Hooks Rules (Best Practices) ---
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error', // Enforce Rules of Hooks
      'react-hooks/exhaustive-deps': 'warn', // Warn about missing dependencies

      // --- React Refresh (HMR) ---
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // --- Unused Imports & Variables (Auto-Cleanup) ---
      'no-unused-vars': 'off', // Disable native rule to use unused-imports plugin
      'unused-imports/no-unused-imports': 'error', // Auto-remove unused imports on fix
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_', // Allow variables starting with _ (e.g. _unused)
          args: 'after-used',
          argsIgnorePattern: '^_', // Allow arguments starting with _
        },
      ],

      // --- Code Quality & Cleanliness ---
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }], // Discourage console.log in production
      'react/prop-types': 'off', // Disable prop-types validation (optional for modern projects)
      'react/jsx-no-target-blank': 'warn', // Security check for target="_blank"
      'no-empty': ['warn', { allowEmptyCatch: true }], // Allow empty catch blocks
      
      // --- Formatting ---
      // These rules prevent conflicts with Prettier
    },
  },

  // 5. Prettier Config (Must be last to override other formatting rules)
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      ...prettier.rules,
    },
  },
];
