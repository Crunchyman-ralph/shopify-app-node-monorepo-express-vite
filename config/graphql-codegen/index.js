const path = require('path');
const glob = require('glob');

const basePath = process.env.CURRENT_CWD || process.env.INIT_CWD;
if (!basePath) {
  throw new Error('Env INIT_CWD or CURRENT_CWD not defined');
}

const getSchemaPath = () => {
  const schemaPath = process.argv[4];
  if (schemaPath) {
    return schemaPath;
  }

  return `${basePath}/schema.graphql`;
};

const pluginHeader = {
  add: {
    content: '// GENERATED FILE - DO NOT EDIT',
  },
};

const documentsPattern = path.join(basePath, 'src/graphql/**/*.graphql');

const hasDocuments = glob.sync(documentsPattern).length > 0;

module.exports = {
  overwrite: true,
  schema: getSchemaPath(),
  documents: hasDocuments ? documentsPattern : undefined,
  generates: {
    [path.join(basePath, 'src/graphql/types.generated.ts')]: {
      plugins: ['typescript', pluginHeader],
      config: {
        maybeValue: 'T | undefined',
        defaultScalarType: 'unknown',
        scalars: {
          DateTime: 'string',
        },
      },
    },
    [path.join(basePath, 'src/graphql/typePolicies.generated.ts')]: [
      'typescript-apollo-client-helpers',
      pluginHeader,
    ],
    [path.join(basePath, 'src/graphql/')]: {
      preset: 'near-operation-file',
      presetConfig: {
        baseTypesPath: 'types.generated.ts',
      },
      plugins: [
        'typescript-operations',
        'typescript-react-apollo',
        pluginHeader,
      ],
      config: {
        preResolveTypes: false,
        skipTypename: true,
        withRefetchFn: true,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier -w'],
  },
};
