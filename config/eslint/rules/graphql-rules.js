/**
 * GraphQL rules
 *
 * @see https://github.com/B2o5T/graphql-eslint
 */
module.exports = {
  graphqlExtends: [
    'plugin:@graphql-eslint/schema-recommended',
    'plugin:@graphql-eslint/operations-recommended',
  ],
  graphqlRules: {
    '@graphql-eslint/naming-convention': 'off',

    '@graphql-eslint/no-anonymous-operations': 'error',
    '@graphql-eslint/match-document-filename': [
      'error',
      {
        query: 'PascalCase',
        mutation: 'PascalCase',
        subscription: 'PascalCase',
        fragment: 'PascalCase',
      },
    ],
    '@graphql-eslint/unique-fragment-name': 'error',
    '@graphql-eslint/unique-operation-name': 'error',
  },
};
