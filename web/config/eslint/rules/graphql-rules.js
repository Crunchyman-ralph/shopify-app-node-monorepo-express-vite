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
        query: 'kebab-case',
        mutation: 'kebab-case',
        subscription: 'kebab-case',
        fragment: 'kebab-case',
      },
    ],
    '@graphql-eslint/unique-fragment-name': 'error',
    '@graphql-eslint/unique-operation-name': 'error',
  },
};
