import path from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import {
  Shopify,
  LATEST_API_VERSION,
  SessionInterface,
} from '@shopify/shopify-api';
import { LoadEnvs } from '@axe/common';

import applyAuthMiddleware from './middleware/auth';
import verifyRequest from './middleware/verify-request';
import { setupGDPRWebHooks } from './gdpr';
import productCreator from './helpers/product-creator';
import redirectToAuth from './helpers/redirect-to-auth';
import { BillingInterval, BillingOptions } from './helpers/ensure-billing';
import { AppInstallations } from './app_installations';

const USE_ONLINE_TOKENS = false;

const PORT = Number.parseInt(
  process.env.BACKEND_PORT! || process.env.PORT!,
  10
);

LoadEnvs.loadEnvs();

// TODO: There should be provided by env vars
const DEV_INDEX_PATH = `${process.cwd()}/../frontend/`;
const PROD_INDEX_PATH = `${process.cwd()}/frontend/dist/`;

const DB_PATH = process.env.MONGODB_URI as unknown as URL | undefined;
const DB_NAME = process.env.MONGODB_NAME;

if (!DB_PATH || !DB_NAME) {
  throw new Error(
    'MONGODB_URI and MONGODB_NAME must be provided, check your .env'
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
  SESSION_STORAGE: new Shopify.Session.MongoDBSessionStorage(DB_PATH, DB_NAME),
});

Shopify.Webhooks.Registry.addHandler('APP_UNINSTALLED', {
  path: '/api/webhooks',
  webhookHandler: async (_topic, shop, _body) => {
    await AppInstallations.delete(shop);
  },
});

// The transactions with Shopify will always be marked as test transactions, unless NODE_ENV is production.
// See the ensureBilling helper to learn more about billing in this template.
const BILLING_SETTINGS: BillingOptions = {
  required: false,
  amount: 0,
  chargeName: 'default',
  currencyCode: 'USD',
  interval: BillingInterval.Every30Days,
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
    let errorMessage = null;

    try {
      await productCreator(session as SessionInterface);
    } catch (error: any) {
      console.log(`Failed to process products/create: ${error.message}`);
      status = 500;
      errorMessage = error.message;
    }
    res.status(status).send({ success: status === 200, error: errorMessage });
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
    if (typeof req.query.shop !== 'string') {
      res.status(500);
      return res.send('No shop provided');
    }

    const shop = Shopify.Utils.sanitizeShop(req.query.shop);

    if (!shop) {
      res.status(500);
      return res.send('No shop provided');
    }

    const appInstalled = await AppInstallations.includes(shop);

    if (!appInstalled) {
      return redirectToAuth(req, res, app);
    }

    if (Shopify.Context.IS_EMBEDDED_APP && req.query.embedded !== '1') {
      const embeddedUrl = Shopify.Utils.getEmbeddedAppUrl(req);

      return res.redirect(embeddedUrl + req.path);
    }

    const htmlFile = path.join(
      isProd ? PROD_INDEX_PATH : DEV_INDEX_PATH,
      'index.html'
    );

    return res
      .status(200)
      .set('Content-Type', 'text/html')
      .send(readFileSync(htmlFile));
  });

  return { app };
};

// eslint-disable-next-line unicorn/prefer-top-level-await
createServer().then(({ app }) => app.listen(PORT));
