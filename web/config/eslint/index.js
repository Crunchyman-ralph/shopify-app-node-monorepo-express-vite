const { graphqlExtends, graphqlRules } = require('./rules/graphql-rules');
const { jsRules } = require('./rules/js-rules');
const { reactExtends, reactRules } = require('./rules/react-rules');
const { tsExtends, tsRules } = require('./rules/ts-rules');

const prettierRules = {
  'prettier/prettier': ['error', {}, { usePrettierrc: true }], // Includes .prettierrc.js rules
};

/**
 * Return Eslint config following given options.
 *
 * @param {{
 *   dirname: string;
 *   tsconfigPaths?: string[];
 * }} options
 * @returns Eslint config
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
      './packages/*/tsconfig?(.eslint).json',
    ],
    tsconfigRootDir: '.',
    ecmaVersion: 8, // to enable features such as async/await
  },
  extends: ['eslint:recommended'],
  overrides: [
    {
      files: ['**/*.js'],
      parser: '@babel/eslint-parser',
      env: {
        browser: false,
        node: true,
        es6: false,
      },
      plugins: ['import'],
      extends: [
        'eslint:recommended',
        'plugin:prettier/recommended', // Prettier plugin
      ],
      rules: Object.assign({}, prettierRules, jsRules, {
        'prefer-object-spread': 'off',
      }),
    },
    // This configuration will apply only to TypeScript files
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      settings: {
        react: { version: '18.0.0' },
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
      extends: [
        'eslint:recommended',
        'plugin:prettier/recommended', // Prettier plugin
        'plugin:unicorn/recommended',
      ]
        .concat(tsExtends)
        .concat(reactExtends),
      rules: Object.assign({}, prettierRules, jsRules, tsRules, reactRules, {
        'unicorn/prevent-abbreviations': 'off',
        'unicorn/prefer-module': 'off',
        'unicorn/numeric-separators-style': 'off',
        'unicorn/filename-case': ['error', { case: { pascalCase: true } }],
      }),
    },
    {
      files: ['**/*.graphql'],
      extends: graphqlExtends,
      rules: Object.assign({}, prettierRules, graphqlRules, {}),
    },
  ],
};
