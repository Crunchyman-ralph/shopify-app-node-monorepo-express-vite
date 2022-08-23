import { Shopify } from '@shopify/shopify-api';
import { NextFunction, Request, Response, Express } from 'express';
import ensureBilling, {
  BillingOptions,
  ShopifyBillingError,
} from '../helpers/ensure-billing';
import redirectToAuth from '../helpers/redirect-to-auth';

import returnTopLevelRedirection from '../helpers/return-top-level-redirection';

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

const defaultOptions: VerifyRequestOptions = {
  billing: {
    required: false,
    amount: 0,
    chargeName: 'default',
    currencyCode: 'USD',
    interval: 'EVERY_30_DAYS',
  },
  returnHeader: false,
};

export default function verifyRequest(
  app: Express,
  { billing }: Partial<VerifyRequestOptions> = defaultOptions
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
      return redirectToAuth(req, res, app);
    }

    if (session?.isActive()) {
      try {
        if (billing?.required) {
          // The request to check billing status serves to validate that the access token is still valid.
          const [hasPayment, confirmationUrl] = await ensureBilling(session, {
            ...billing,
          });

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
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          console.error(error.message, error.errorData[0]);
          res.status(500).end();
          return;
        } else {
          throw error;
        }
      }
    }

    const bearerPresent = req.headers.authorization?.match(/Bearer (.*)/);
    if (bearerPresent && !shop) {
      if (session) {
        shop = session.shop;
      } else if (Shopify.Context.IS_EMBEDDED_APP) {
        const payload = Shopify.Utils.decodeSessionToken(bearerPresent[1]);
        shop = payload.dest.replace('https://', '');
      }
    }

    returnTopLevelRedirection(
      req,
      res,
      `/api/auth?shop=${encodeURIComponent(shop!)}`
    );
  };
}
