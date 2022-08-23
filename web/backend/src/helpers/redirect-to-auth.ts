import { Shopify } from '@shopify/shopify-api';
import { Express, Request, Response } from 'express';

export default async function redirectToAuth(
  req: Request,
  res: Response,
  app: Express
) {
  if (!req.query.shop) {
    res.status(500);
    return res.send('No shop provided');
  }

  if (req.query.embedded === '1') {
    return clientSideRedirect(req, res);
  }

  return await serverSideRedirect(req, res, app);
}

const clientSideRedirect = (req: Request, res: Response) => {
  const shop = Shopify.Utils.sanitizeShop(req.query.shop as string);

  if (!shop) {
    res.status(500);
    return res.send('No shop provided');
  }

  const redirectUriParams = new URLSearchParams({
    shop: shop,
    host: req.query.host as string,
  }).toString();
  const queryParams = new URLSearchParams({
    ...req.query,
    shop,
    redirectUri: `https://${Shopify.Context.HOST_NAME}/api/auth?${redirectUriParams}`,
  }).toString();

  return res.redirect(`/exitiframe?${queryParams}`);
};

const serverSideRedirect = async (
  req: Request,
  res: Response,
  app: Express
) => {
  const redirectUrl = await Shopify.Auth.beginAuth(
    req,
    res,
    req.query.shop as string,
    '/api/auth/callback',
    app.get('use-online-tokens')
  );

  return res.redirect(redirectUrl);
};
