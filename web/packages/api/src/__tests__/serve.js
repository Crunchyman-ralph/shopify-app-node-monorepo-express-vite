import path from 'path';

const port = 9528;

/**
 * @param {string} root
 * @param {boolean} isProd
 */
export const serve = async (root, isProd) => {
  if (isProd) {
    // build first
    const { build } = await import('vite');
    await build({
      root,
      logLevel: 'silent',
      build: {
        target: 'esnext',
        minify: false,
        ssrManifest: true,
        outDir: 'dist/client',
      },
    });
  }

  const { createServer } = await import(
    path.resolve(root, 'server', 'index.ts')
  );
  process.env.PORT = port.toString();
  return await createServer(root, isProd);
};
