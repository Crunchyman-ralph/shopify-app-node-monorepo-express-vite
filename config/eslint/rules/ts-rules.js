/**
 * Common TS rules
 *
 * @see https://typescript-eslint.io/rules/
 */
module.exports = {
  tsExtends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  tsRules: {
    '@typescript-eslint/array-type': ['error'],
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    '@typescript-eslint/method-signature-style': ['error'],
    '@typescript-eslint/no-confusing-non-null-assertion': ['error'],
    '@typescript-eslint/no-extraneous-class': [
      'error',
      { allowWithDecorator: true },
    ],
    '@typescript-eslint/no-invalid-void-type': ['error'],
    '@typescript-eslint/no-meaningless-void-operator': ['error'],
    '@typescript-eslint/no-non-null-asserted-nullish-coalescing': ['error'],
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': ['error'],
    '@typescript-eslint/no-unnecessary-condition': ['error'],
    '@typescript-eslint/no-unnecessary-type-arguments': ['error'],
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
    '@typescript-eslint/non-nullable-type-assertion-style': ['error'],
    '@typescript-eslint/prefer-for-of': ['error'],
    '@typescript-eslint/prefer-includes': ['error'],
    // disabled since rule is quite broken
    // @see https://github.com/typescript-eslint/typescript-eslint/issues/1768
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/prefer-optional-chain': ['error'],
    '@typescript-eslint/prefer-regexp-exec': ['error'],
    '@typescript-eslint/prefer-string-starts-ends-with': ['error'],
    '@typescript-eslint/switch-exhaustiveness-check': ['error'],
    '@typescript-eslint/type-annotation-spacing': ['error'],
    '@typescript-eslint/unified-signatures': ['error'],
    '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],

    // Non-null assertion is useful when we know value being non-null (or should be)
    // Some example: Array.find() use, or graphql return data (data!.byPath!.prop!)
    // A null value is often easy to debug since it generally throws an error
    '@typescript-eslint/no-non-null-assertion': 'off',

    'import/no-relative-packages': 'error',
    'import/no-anonymous-default-export': [
      'error',
      { allowCallExpression: false },
    ],

    // This rule is not compatible with Next.js's <Link /> components
    'jsx-a11y/anchor-is-valid': 'off',
  },
};
