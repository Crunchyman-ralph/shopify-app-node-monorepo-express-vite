"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const shopify_api_1 = require("@shopify/shopify-api");
const TEST_GRAPHQL_QUERY = `
{
  shop {
    name
  }
}`;
function verifyRequest(app, { returnHeader = true } = {}) {
    return (req, res, next) => tslib_1.__awaiter(this, void 0, void 0, function* () {
        const session = yield shopify_api_1.Shopify.Utils.loadCurrentSession(req, res, app.get('use-online-tokens'));
        let shop = req.query.shop;
        if (session && shop && session.shop !== shop) {
            // The current request is for a different shop. Redirect gracefully.
            return res.redirect(`/auth?shop=${shop}`);
        }
        if (session === null || session === void 0 ? void 0 : session.isActive()) {
            try {
                // make a request to make sure oauth has succeeded, retry otherwise
                const client = new shopify_api_1.Shopify.Clients.Graphql(session.shop, session.accessToken);
                yield client.query({ data: TEST_GRAPHQL_QUERY });
                return next();
            }
            catch (e) {
                if (e instanceof shopify_api_1.Shopify.Errors.HttpResponseError &&
                    e.response.code === 401) {
                    // We only want to catch 401s here, anything else should bubble up
                }
                else {
                    throw e;
                }
            }
        }
        if (returnHeader) {
            if (!shop) {
                if (session) {
                    shop = session.shop;
                }
                else if (shopify_api_1.Shopify.Context.IS_EMBEDDED_APP) {
                    const authHeader = req.headers.authorization;
                    const matches = authHeader === null || authHeader === void 0 ? void 0 : authHeader.match(/Bearer (.*)/);
                    if (matches) {
                        const payload = shopify_api_1.Shopify.Utils.decodeSessionToken(matches[1]);
                        shop = payload.dest.replace('https://', '');
                    }
                }
            }
            if (!shop || shop === '') {
                return res
                    .status(400)
                    .send(`Could not find a shop to authenticate with. Make sure you are making your XHR request with App Bridge's authenticatedFetch method.`);
            }
            res.status(403);
            res.header('X-Shopify-API-Request-Failure-Reauthorize', '1');
            res.header('X-Shopify-API-Request-Failure-Reauthorize-Url', `/auth?shop=${shop}`);
            res.end();
        }
        else {
            res.redirect(`/auth?shop=${shop}`);
        }
    });
}
exports.default = verifyRequest;
//# sourceMappingURL=verify-request.js.map