// @ts-check
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import {
  Shopify,
  LATEST_API_VERSION,
  SessionInterface,
} from '@shopify/shopify-api';

import applyAuthMiddleware from './middleware/auth';
import verifyRequest from './middleware/verifyRequest';
import { setupGDPRWebHooks } from './gdpr';
import productCreator from './helpers/productCreator';
// import { BillingInterval } from './helpers/ensureBilling';
import { AppInstallations } from './appInstallations';
import { LoadEnvs } from '@axe/common';

LoadEnvs.loadEnvs();

const USE_ONLINE_TOKENS = false;
const TOP_LEVEL_OAUTH_COOKIE = 'shopify_top_level_oauth';

const PORT = Number.parseInt(
  process.env.BACKEND_PORT! || process.env.PORT!,
  10
);

// TODO: There should be provided by env vars
const DEV_INDEX_PATH = `${process.cwd()}/../frontend/`;
const PROD_INDEX_PATH = `${process.cwd()}/../frontend/dist/`;

const DB_PATH = `${process.cwd()}/database.sqlite`;
// const DB_PATH = process.env.MONGO_DB_PATH;
const DB_NAME = process.env.MONGO_DB_NAME;

if (!DB_PATH || !DB_NAME) {
  console.log('DB_PATH', DB_PATH);
  throw new Error(
    'DB_PATH and DB_NAME must be provided, create a new .env file and enter the DB_PATH and DB_NAME'
  );
}

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY!,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET!,
  SCOPES: process.env.SCOPES!.split(','),
  HOST_NAME: process.env.HOST!.replace(/https?:\/\//, ''),
  HOST_SCHEME: process.env.HOST!.split('://')[0],
  API_VERSION: LATEST_API_VERSION,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  SESSION_STORAGE: new Shopify.Session.SQLiteSessionStorage(DB_PATH),
});

Shopify.Webhooks.Registry.addHandler('APP_UNINSTALLED', {
  path: '/api/webhooks',
  webhookHandler: async (_topic, shop, _body) => {
    await AppInstallations.delete(shop);
  },
});

// The transactions with Shopify will always be marked as test transactions, unless NODE_ENV is production.
// See the ensureBilling helper to learn more about billing in this template.
const BILLING_SETTINGS = {
  required: false,
  // This is an example configuration that would do a one-time charge for $5 (only USD is currently supported)
  // chargeName: "My Shopify One-Time Charge",
  // amount: 5.0,
  // currencyCode: "USD",
  // interval: BillingInterval.OneTime,
};

// This sets up the mandatory GDPR webhooks. You’ll need to fill in the endpoint
// in the “GDPR mandatory webhooks” section in the “App setup” tab, and customize
// the code when you store customer data.
//
// More details can be found on shopify.dev:
// https://shopify.dev/apps/webhooks/configuration/mandatory-webhooks
setupGDPRWebHooks('/api/webhooks');

// export for test use only
export const createServer = async (
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production',
  billingSettings = BILLING_SETTINGS
) => {
  const app = express();
  app.set('top-level-oauth-cookie', TOP_LEVEL_OAUTH_COOKIE);
  app.set('use-online-tokens', USE_ONLINE_TOKENS);

  app.use(cookieParser(Shopify.Context.API_SECRET_KEY));

  applyAuthMiddleware(app, {
    billing: billingSettings,
  });

  // Do not call app.use(express.json()) before processing webhooks with
  // Shopify.Webhooks.Registry.process().
  // See https://github.com/Shopify/shopify-api-node/blob/main/docs/usage/webhooks.md#note-regarding-use-of-body-parsers
  // for more details.
  app.post('/api/webhooks', async (req, res) => {
    try {
      await Shopify.Webhooks.Registry.process(req, res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error: any) {
      console.log(`Failed to process webhook: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).send(error.message);
      }
    }
  });

  // All endpoints after this point will require an active session
  app.use(
    '/api/*',
    verifyRequest(app, {
      billing: billingSettings,
    })
  );

  app.get('/api/products/count', async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get('use-online-tokens')
    );
    const { Product } = await import(
      `@shopify/shopify-api/dist/rest-resources/${Shopify.Context.API_VERSION}/index.js`
    );

    const countData = await Product.count({ session });
    res.status(200).send(countData);
  });

  app.get('/api/products/create', async (req, res) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get('use-online-tokens')
    );
    let status = 200;
    let errorReturn = null;

    try {
      await productCreator(session as SessionInterface);
    } catch (error: any) {
      console.log(`Failed to process products/create: ${error.message}`);
      status = 500;
      errorReturn = error.message;
    }
    res.status(status).send({ success: status === 200, error: errorReturn });
  });

  // All endpoints after this point will have access to a request.body
  // attribute, as a result of the express.json() middleware
  app.use(express.json());

  app.use((req, res, next) => {
    const shop = Shopify.Utils.sanitizeShop(req.query.shop as string);
    if (Shopify.Context.IS_EMBEDDED_APP && shop) {
      res.setHeader(
        'Content-Security-Policy',
        `frame-ancestors https://${encodeURIComponent(
          shop
        )} https://admin.shopify.com;`
      );
    } else {
      res.setHeader('Content-Security-Policy', `frame-ancestors 'none';`);
    }
    next();
  });

  if (isProd) {
    const compression = await import('compression').then(
      ({ default: fn }) => fn
    );
    const serveStatic = await import('serve-static').then(
      ({ default: fn }) => fn
    );
    app.use(compression());
    app.use(serveStatic(PROD_INDEX_PATH, { index: false }));
  }

  app.use('/*', async (req, res, next) => {
    const shop = Shopify.Utils.sanitizeShop(req.query.shop as string);
    if (!shop) {
      res.status(500);
      return res.send('No shop provided');
    }

    const appInstalled = await AppInstallations.includes(shop);

    if (shop && !appInstalled) {
      res.redirect(`/api/auth?shop=${encodeURIComponent(shop)}`);
    } else {
      const fs = await import('fs');
      const fallbackFile = path.join(
        isProd ? PROD_INDEX_PATH : DEV_INDEX_PATH,
        'index.html'
      );
      res
        .status(200)
        .set('Content-Type', 'text/html')
        .send(fs.readFileSync(fallbackFile));
    }
  });

  return { app };
};

// eslint-disable-next-line unicorn/prefer-top-level-await
createServer().then(({ app }) => app.listen(PORT));
