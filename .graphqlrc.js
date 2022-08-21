const schema = 'web/api/schema.graphql';
const documents = [
  'web/*/src/graphql/**/*.graphql',
  //  'src/graphql/**/*.graphql'
];

const endpoints = {
  default: {
    url: 'http://localhost:3333/graphql',
  },
};

module.exports = {
  projects: {
    'web-app': {
      schema,
      documents,
      extensions: {
        endpoints,
      },
    },
    api: {
      schema,
      documents,
      extensions: {
        // codegen: [
        //     {
        //         generator: "graphql-binding",
        //         language: "typescript",
        //         output: {
        //             binding: "src/generated/db.ts",
        //         },
        //     },
        // ],
        endpoints,
      },
    },
  },
};
