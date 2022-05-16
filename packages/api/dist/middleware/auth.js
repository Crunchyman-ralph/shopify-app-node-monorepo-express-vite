"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const shopify_api_1 = require("@shopify/shopify-api");
const top_level_auth_redirect_js_1 = tslib_1.__importDefault(require("../helpers/top-level-auth-redirect.js"));
function applyAuthMiddleware(app) {
    app.get('/auth', (req, res) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (!req.signedCookies[app.get('top-level-oauth-cookie')]) {
            return res.redirect(`/auth/toplevel?${new URLSearchParams(req.query).toString()}`);
        }
        const redirectUrl = yield shopify_api_1.Shopify.Auth.beginAuth(req, res, req.query.shop, '/auth/callback', app.get('use-online-tokens'));
        res.redirect(redirectUrl);
    }));
    app.get('/auth/toplevel', (req, res) => {
        res.cookie(app.get('top-level-oauth-cookie'), '1', {
            signed: true,
            httpOnly: true,
            sameSite: 'strict',
        });
        res.set('Content-Type', 'text/html');
        res.send((0, top_level_auth_redirect_js_1.default)({
            apiKey: shopify_api_1.Shopify.Context.API_KEY,
            hostName: shopify_api_1.Shopify.Context.HOST_NAME,
            host: req.query.host,
            query: req.query,
        }));
    });
    app.get('/auth/callback', (req, res) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const session = yield shopify_api_1.Shopify.Auth.validateAuthCallback(req, res, req.query);
            const host = req.query.host;
            app.set('active-shopify-shops', Object.assign(app.get('active-shopify-shops'), {
                [session.shop]: session.scope,
            }));
            const response = yield shopify_api_1.Shopify.Webhooks.Registry.register({
                shop: session.shop,
                accessToken: session.accessToken,
                topic: 'APP_UNINSTALLED',
                path: '/webhooks',
            });
            if (!response.APP_UNINSTALLED.success) {
                console.log(`Failed to register APP_UNINSTALLED webhook: ${response.result}`);
            }
            // Redirect to app with shop parameter upon auth
            res.redirect(`/?shop=${session.shop}&host=${host}`);
        }
        catch (error) {
            switch (true) {
                case error instanceof shopify_api_1.Shopify.Errors.InvalidOAuthError:
                    res.status(400);
                    res.send(error.message);
                    break;
                case error instanceof shopify_api_1.Shopify.Errors.CookieNotFound:
                case error instanceof shopify_api_1.Shopify.Errors.SessionNotFound:
                    // This is likely because the OAuth session cookie expired before the merchant approved the request
                    res.redirect(`/auth?shop=${req.query.shop}`);
                    break;
                default:
                    res.status(500);
                    res.send(error.message);
                    break;
            }
        }
    }));
}
exports.default = applyAuthMiddleware;
//# sourceMappingURL=auth.js.map