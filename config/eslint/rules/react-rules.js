/**
 * React rules
 *
 * @see https://github.com/yannickcr/eslint-plugin-react#list-of-supported-rules
 */
module.exports = {
  reactExtends: [
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  reactRules: {
    'react/no-array-index-key': ['error'],
    'react/no-this-in-sfc': ['error'],
    'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
    'react/prefer-stateless-function': ['error'],
    'react/self-closing-comp': ['error'],
    'react/void-dom-elements-no-children': ['error'],
    'react/jsx-boolean-value': ['error'],
    'react/jsx-curly-brace-presence': ['error', 'never'],
    'react/jsx-filename-extension': [
      'error',
      {
        allow: 'as-needed',
        extensions: ['.tsx'],
      },
    ],
    'react/jsx-fragments': ['error'],
    'react/jsx-no-constructed-context-values': ['error'],
    'react/jsx-no-useless-fragment': ['error'],
    'react/jsx-pascal-case': ['error'],

    // useless in TS context
    'react/prop-types': 'off',

    // false-positives with jsx returned by common functions
    'react/display-name': 'off',
  },
};
