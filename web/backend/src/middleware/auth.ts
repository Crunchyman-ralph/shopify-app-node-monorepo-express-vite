import { AuthQuery, Shopify } from '@shopify/shopify-api';
import { gdprTopics } from '@shopify/shopify-api/dist/webhooks/registry.js';
import { Express } from 'express';
import ensureBilling from '../helpers/ensureBilling';
import topLevelAuthRedirect from '../helpers/topLevelAuthRedirect';

export type BillingOptions = {
  required?: boolean;
  chargeName?: string;
  amount?: number;
  currencyCode?: string; // TODO: Change type to CurrencyCode from schema.graphql
  interval?: number;
};

type ApplyAuthMiddlewareOptions = {
  billing: BillingOptions;
};

const defaultOptions = {
  billing: {
    required: false,
  },
};

export default function applyAuthMiddleware(
  app: Express,
  { billing }: ApplyAuthMiddlewareOptions = defaultOptions
) {
  app.get('/api/auth', async (req, res) => {
    const shop = Shopify.Utils.sanitizeShop(req.query.shop as string);
    if (!shop) {
      res.status(500);
      return res.send('No shop provided');
    }

    if (!req.signedCookies[app.get('top-level-oauth-cookie')]) {
      return res.redirect(
        `/api/auth/toplevel?shop=${encodeURIComponent(shop)}`
      );
    }

    const redirectUrl = await Shopify.Auth.beginAuth(
      req,
      res,
      shop,
      '/api/auth/callback',
      app.get('use-online-tokens')
    );

    res.redirect(redirectUrl);
  });

  app.get('/api/auth/toplevel', (req, res) => {
    const shop = Shopify.Utils.sanitizeShop(req.query.shop as string);
    if (!shop) {
      res.status(500);
      return res.send('No shop provided');
    }

    res.cookie(app.get('top-level-oauth-cookie'), '1', {
      signed: true,
      httpOnly: true,
      sameSite: 'strict',
    });

    res.set('Content-Type', 'text/html');

    res.send(
      topLevelAuthRedirect({
        apiKey: Shopify.Context.API_KEY,
        hostName: Shopify.Context.HOST_NAME,
        shop: shop,
      })
    );
  });

  app.get('/api/auth/callback', async (req, res) => {
    try {
      console.log('begin validateAuthCallback');
      console.log('query:', req.query);
      const session = await Shopify.Auth.validateAuthCallback(
        req,
        res,
        req.query as unknown as AuthQuery
      );
      console.log('done with validateWebhookCallback');
      console.log('session:', session);

      const host = Shopify.Utils.sanitizeHost(req.query.host as string, true);

      // if (!session.accessToken) {
      //   return res.redirect(
      //     `/api/auth?shop=${encodeURIComponent(session.shop)}`
      //   );
      // }

      if (!host) {
        throw new Error('No host provided');
      }

      const responses = await Shopify.Webhooks.Registry.registerAll({
        shop: session.shop,
        accessToken: session.accessToken!,
      });

      Object.entries(responses).map(([topic, response]) => {
        // The response from registerAll will include errors for the GDPR topics.  These can be safely ignored.
        // To register the GDPR topics, please set the appropriate webhook endpoint in the
        // 'GDPR mandatory webhooks' section of 'App setup' in the Partners Dashboard.
        if (!response.success && !gdprTopics.includes(topic)) {
          console.log(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            `Failed to register ${topic} webhook: ${response.result.errors[0].message}`
          );
        }
        return false;
      });

      // If billing is required, check if the store needs to be charged right away to minimize the number of redirects.
      let redirectUrl = `/?shop=${encodeURIComponent(
        session.shop
      )}&host=${encodeURIComponent(host)}`;
      if (billing.required) {
        const [hasPayment, confirmationUrl] = await ensureBilling(
          session,
          billing
        );

        if (!hasPayment) {
          redirectUrl = confirmationUrl;
        }
      }

      // Redirect to app with shop parameter upon auth
      res.redirect(redirectUrl);
    } catch (error: any) {
      const shop = Shopify.Utils.sanitizeShop(req.query.shop as string);
      console.warn(error);
      switch (true) {
        case error instanceof Shopify.Errors.InvalidOAuthError:
          res.status(400);
          res.send(error.message);
          break;
        case error instanceof Shopify.Errors.CookieNotFound:
        case error instanceof Shopify.Errors.SessionNotFound:
          // This is likely because the OAuth session cookie expired before the merchant approved the request

          if (!shop) {
            res.status(500);
            return res.send('No shop provided');
          }

          res.redirect(`/api/auth?shop=${encodeURIComponent(shop)}`);
          break;
        default:
          res.status(500);
          res.send(error.message);
          break;
      }
    }
  });
}
