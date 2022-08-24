import dotenv from 'dotenv';

const defaultPaths = ['../../.env', '../../.env.local', '.env', '.env.local'];

const testPaths = ['../../.env.test', '.env.test'];

export const LoadEnvs = {
  loadEnvs: (context: 'default' | 'test' = 'default') => {
    const paths = context === 'test' ? testPaths : defaultPaths;

    const entries = paths
      .map((path) => dotenv.config({ path }).parsed || {})
      .flatMap(Object.entries);

    return entries.reduce((env: Record<string, string>, entry) => {
      env[entry[0]] = entry[1];

      return env;
    }, {});
  },
};
