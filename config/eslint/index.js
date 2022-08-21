const { graphqlExtends, graphqlRules } = require('./rules/graphql-rules');
const { jsRules } = require('./rules/js-rules');
const { reactExtends, reactRules } = require('./rules/react-rules');
const { tsExtends, tsRules } = require('./rules/ts-rules');
const { unicornExtends, unicornRules } = require('./rules/unicorn-rules');

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    project: [
      './tsconfig?(.eslint).json',
      './web/*/tsconfig?(.eslint).json',
      './scripts/tsconfig.json',
    ],
    tsconfigRootDir: '.',
    ecmaVersion: 8, // enable ES6+ features
  },
  extends: ['eslint:recommended'],
  overrides: [
    {
      files: ['**/*.js', '**/*.mjs'],
      parser: '@babel/eslint-parser',
      parserOptions: {
        sourceType: 'module',
      },
      env: {
        browser: false,
        node: true,
        es6: true,
      },
      plugins: ['import'],
      extends: ['eslint:recommended'],
      rules: Object.assign({}, jsRules, {
        'prefer-object-spread': 'off',
      }),
    },

    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      settings: {
        react: { version: '17.0.2' },
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
          typescript: {
            // always try to resolve types under `<root>@types` directory
            // even it doesn't contain any source code, like `@types/unist`
            alwaysTryTypes: true,
          },
        },
      },
      env: {
        browser: true,
        node: true,
        es6: true,
      },
      plugins: ['import'],
      extends: ['eslint:recommended']
        .concat(tsExtends)
        .concat(reactExtends)
        .concat(unicornExtends),
      rules: Object.assign({}, jsRules, tsRules, reactRules, unicornRules, {
        'unicorn/prevent-abbreviations': 'off',
        'unicorn/prefer-module': 'off',
        'unicorn/numeric-separators-style': 'off',
      }),
    },

    {
      files: ['**/*.graphql'],
      extends: graphqlExtends,
      rules: Object.assign({}, graphqlRules, {}),
    },
  ],
};
