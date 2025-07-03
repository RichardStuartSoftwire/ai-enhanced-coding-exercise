module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.eslint.json',
  },
  env: {
    browser: true,
    node: true,
    es6: true,
    jest: true,
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'jsx-a11y',
    'import',
  ],
  rules: {
    // Enforce strict typing
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/restrict-template-expressions': 'error',
    
    // React specific rules
    'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
    'react/prop-types': 'off', // We use TypeScript for prop validation
    'react/require-default-props': 'off', // TypeScript handles undefined props
    'react/jsx-props-no-spreading': 'error',
    'react/function-component-definition': ['error', {
      namedComponents: 'arrow-function',
      unnamedComponents: 'arrow-function',
    }],
    
    // Import rules
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'jest.config.js'],
    }],
    'import/extensions': ['error', 'never'],
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      'alphabetize': { order: 'asc', caseInsensitive: true },
    }],
    
    // General code style
    'max-len': ['error', { code: 100, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreComments: true }],
    'no-console': 'error',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
    'object-curly-spacing': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'arrow-body-style': ['error', 'as-needed'],
    'prefer-arrow-callback': 'error',
    'eol-last': ['error', 'always'],
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  ignorePatterns: ['node_modules', 'build', 'dist', 'coverage', '*.config.js'],
};
