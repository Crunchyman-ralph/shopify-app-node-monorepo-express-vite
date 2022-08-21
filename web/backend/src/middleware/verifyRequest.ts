import { Shopify } from '@shopify/shopify-api';
import ensureBilling, { ShopifyBillingError } from '../helpers/ensureBilling';
import { Express, NextFunction, Response, Request } from 'express';

import returnTopLevelRedirection from '../helpers/returnTopLevelRedirection';
import { BillingOptions } from './auth';

const TEST_GRAPHQL_QUERY = `
{
  shop {
    name
  }
}`;

type VerifyRequestOptions = {
  billing: BillingOptions;
  returnHeader: boolean;
};

const defaultOptions = {
  billing: {
    required: false,
  },
};

export default function verifyRequest(
  app: Express,
  {
    billing = { required: false },
  }: Partial<VerifyRequestOptions> = defaultOptions
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await Shopify.Utils.loadCurrentSession(
      req,
      res,
      app.get('use-online-tokens')
    );

    let shop = Shopify.Utils.sanitizeShop(req.query.shop as string);
    if (session && shop && session.shop !== shop) {
      // The current request is for a different shop. Redirect gracefully.
      return res.redirect(`/api/auth?shop=${encodeURIComponent(shop)}`);
    }

    if (session?.isActive()) {
      try {
        if (billing.required) {
          // The request to check billing status serves to validate that the access token is still valid.
          const [hasPayment, confirmationUrl] = await ensureBilling(
            session,
            billing
          );

          if (!hasPayment) {
            returnTopLevelRedirection(req, res, confirmationUrl);
            return;
          }
        } else {
          // Make a request to ensure the access token is still valid. Otherwise, re-authenticate the user.
          const client = new Shopify.Clients.Graphql(
            session.shop,
            session.accessToken
          );
          await client.query({ data: TEST_GRAPHQL_QUERY });
        }
        return next();
      } catch (error: any) {
        if (
          error instanceof Shopify.Errors.HttpResponseError &&
          error.response.code === 401
        ) {
          // Re-authenticate if we get a 401 response
        } else if (error instanceof ShopifyBillingError) {
          console.error(error.message, error.errorData[0]);
          res.status(500).end();
          return;
        } else {
          throw error;
        }
      }
    }

    const bearerPresent = req.headers.authorization?.match(/Bearer (.*)/);
    if (bearerPresent) {
      if (!shop) {
        if (session) {
          shop = session.shop;
        } else if (Shopify.Context.IS_EMBEDDED_APP) {
          if (bearerPresent) {
            const payload = Shopify.Utils.decodeSessionToken(bearerPresent[1]);
            shop = payload.dest.replace('https://', '');
          }
        }
      }
    }

    returnTopLevelRedirection(
      req,
      res,
      `/api/auth?shop=${encodeURIComponent(shop!)}`
    );
  };
}
