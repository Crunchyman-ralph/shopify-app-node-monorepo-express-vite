import { AuthQuery, Shopify } from '@shopify/shopify-api';
import { gdprTopics } from '@shopify/shopify-api/dist/webhooks/registry';
import { Express, Request, Response } from 'express';

import ensureBilling, { BillingOptions } from '../helpers/ensure-billing';
import redirectToAuth from '../helpers/redirect-to-auth';

type ApplyAuthMiddlewareOptions = {
  billing: BillingOptions;
};

const defaultOptions: ApplyAuthMiddlewareOptions = {
  billing: {
    required: false,
    amount: 0,
    chargeName: 'default',
    currencyCode: 'USD',
    interval: 'EVERY_30_DAYS',
  },
};

export default function applyAuthMiddleware(
  app: Express,
  { billing }: ApplyAuthMiddlewareOptions = defaultOptions
) {
  app.get('/api/auth', async (req: Request, res: Response) =>
    redirectToAuth(req, res, app)
  );

  app.get('/api/auth/callback', async (req, res) => {
    try {
      const session = await Shopify.Auth.validateAuthCallback(
        req,
        res,
        req.query as unknown as AuthQuery
      );

      const responses = await Shopify.Webhooks.Registry.registerAll({
        shop: session.shop,
        accessToken: session.accessToken!,
      });

      Object.entries(responses).forEach(([topic, response]: any) => {
        // The response from registerAll will include errors for the GDPR topics.  These can be safely ignored.
        // To register the GDPR topics, please set the appropriate webhook endpoint in the
        // 'GDPR mandatory webhooks' section of 'App setup' in the Partners Dashboard.
        if (!response.success && !gdprTopics.includes(topic)) {
          console.log(
            `Failed to register ${topic} webhook: ${response.result.errors[0].message}`
          );
        }
      });

      // If billing is required, check if the store needs to be charged right away to minimize the number of redirects.
      if (billing.required) {
        const [hasPayment, confirmationUrl] = await ensureBilling(
          session,
          billing
        );

        if (!hasPayment) {
          return res.redirect(confirmationUrl);
        }
      }

      const host = Shopify.Utils.sanitizeHost(req.query.host as string);
      const redirectUrl = Shopify.Context.IS_EMBEDDED_APP
        ? Shopify.Utils.getEmbeddedAppUrl(req)
        : `/?shop=${session.shop}&host=${encodeURIComponent(host!)}`;

      res.redirect(redirectUrl);
    } catch (error: any) {
      console.warn(error);
      switch (true) {
        case error instanceof Shopify.Errors.InvalidOAuthError:
          res.status(400);
          res.send(error.message);
          break;
        case error instanceof Shopify.Errors.CookieNotFound:
        case error instanceof Shopify.Errors.SessionNotFound:
          // This is likely because the OAuth session cookie expired before the merchant approved the request
          return redirectToAuth(req, res, app);
          break;
        default:
          res.status(500);
          res.send(error.message);
          break;
      }
    }
  });
}
