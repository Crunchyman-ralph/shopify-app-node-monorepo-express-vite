import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { Shopify, ApiVersion } from '@shopify/shopify-api';
import 'dotenv/config';

import applyAuthMiddleware from './middleware/auth';
import verifyRequest from './middleware/verify-request';

const USE_ONLINE_TOKENS = true;
const TOP_LEVEL_OAUTH_COOKIE = 'shopify_top_level_oauth';

const PORT = Number.parseInt(process.env.PORT || '8081', 10);
const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD;

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY!,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET!,
  SCOPES: process.env.SCOPES!.split(','),
  HOST_NAME: process.env.HOST!.replace(/https:\/\//, ''),
  API_VERSION: ApiVersion.April22,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS: { [key in string]: unknown } = {};
Shopify.Webhooks.Registry.addHandler('APP_UNINSTALLED', {
  path: '/webhooks',
  webhookHandler: async (topic, shop) => {
    delete ACTIVE_SHOPIFY_SHOPS[shop];
  },
});

// export for test use only
export const createServer = async (
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production'
) => {
  const app = express();
  app.set('top-level-oauth-cookie', TOP_LEVEL_OAUTH_COOKIE);
  app.set('active-shopify-shops', ACTIVE_SHOPIFY_SHOPS);
  app.set('use-online-tokens', USE_ONLINE_TOKENS);

  app.use(cookieParser(Shopify.Context.API_SECRET_KEY));

  applyAuthMiddleware(app);

  app.post('/webhooks', async (req, res) => {
    try {
      await Shopify.Webhooks.Registry.process(req, res);
      // eslint-disable-next-line no-console
      console.log(`Webhook processed, returned status code 200`);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.log(`Failed to process webhook: ${error}`);
      if (!res.headersSent) {
        res.status(500).send(error.message);
      }
    }
  });

  app.get('/products-count', verifyRequest(app), async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(req, res, true);
    const { Product } = await import(
      `@shopify/shopify-api/dist/rest-resources/${Shopify.Context.API_VERSION}/index.js`
    );

    const countData = await Product.count({ session });
    res.status(200).send(countData);
  });

  app.post('/graphql', verifyRequest(app), async (req, res) => {
    try {
      const response = await Shopify.Utils.graphqlProxy(req, res);
      res.status(200).send(response.body);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.use(express.json());

  app.use((req, res, next) => {
    const shop = req.query.shop;
    if (Shopify.Context.IS_EMBEDDED_APP && shop) {
      res.setHeader(
        'Content-Security-Policy',
        `frame-ancestors https://${shop} https://admin.shopify.com;`
      );
    } else {
      res.setHeader('Content-Security-Policy', `frame-ancestors 'none';`);
    }
    next();
  });

  app.use('/*', (req, res, next) => {
    const { shop } = req.query as any;

    // Detect whether we need to reinstall the app, any request from Shopify will
    // include a shop in the query parameters.
    if (app.get('active-shopify-shops')[shop] === undefined && shop) {
      res.redirect(
        `/auth?${new URLSearchParams(
          req.query as unknown as string
        ).toString()}`
      );
    } else {
      next();
    }
  });

  /**
   * @type {import('vite').ViteDevServer}
   */
  let vite;
  if (!isProd) {
    // eslint-disable-next-line no-shadow
    vite = await import('vite').then(({ createServer }) =>
      createServer({
        root,
        logLevel: isTest ? 'error' : 'info',
        server: {
          port: PORT,
          hmr: {
            protocol: 'ws',
            host: 'localhost',
            port: 64999,
            clientPort: 64999,
          },
          middlewareMode: 'html',
        },
      })
    );
    app.use(vite.middlewares);
  } else {
    const compression = await import('compression').then(
      ({ default: fn }) => fn
    );
    const serveStatic = await import('serve-static').then(
      ({ default: fn }) => fn
    );
    const fs = await import('node:fs');
    app.use(compression());
    app.use(serveStatic(path.resolve('dist/client')));
    app.use('/*', (_req, res, _next) => {
      // Client-side routing will pick up on the correct route to render, so we always render the index here
      res
        .status(200)
        .set('Content-Type', 'text/html')
        .send(fs.readFileSync(`${process.cwd()}/dist/client/index.html`));
    });
  }

  return { app, vite };
};

if (!isTest) {
  createServer().then(({ app }) => {
    // eslint-disable-next-line no-console
    console.log(`Listening on port ${PORT}`);
    app.listen(PORT);
  });
}
