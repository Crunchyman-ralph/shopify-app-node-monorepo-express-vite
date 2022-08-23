/**
 * Unicorn rules
 *
 * @see https://github.com/sindresorhus/eslint-plugin-unicorn
 */
module.exports = {
  unicornExtends: ['plugin:unicorn/recommended'],
  unicornRules: {
    'unicorn/prevent-abbreviations': 'off',
    'unicorn/prefer-module': 'off',
    'unicorn/numeric-separators-style': 'off',
    'unicorn/filename-case': ['off'],
    'unicorn/no-null': 'off',
    'unicorn/no-array-reduce': 'off',
    'unicorn/no-array-callback-reference': 'off',
    'unicorn/no-useless-undefined': 'off',
    'unicorn/no-array-for-each': 'off',

    // Not compatible with Next.js v12
    // @see https://github.com/vercel/next.js/issues/28774
    'unicorn/prefer-node-protocol': 'off',
  },
};
