import { defineConfig } from 'eslint/config';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([
  {
    extends: compat.extends(
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:@typescript-eslint/recommended',
      'prettier'
    ),

    plugins: {
      prettier
    },

    languageOptions: {
      globals: {
        ...globals.node
      },

      parser: tsParser
    },

    settings: {
      react: {
        version: 'detect'
      }
    },

    rules: {
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto'
        }
      ],

      'react/display-name': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'prefer-destructuring': 'error',
      'react/react-in-jsx-scope': 'off'
    }
  }
]);
