"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
// @ts-check
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const express_1 = tslib_1.__importDefault(require("express"));
const cookie_parser_1 = tslib_1.__importDefault(require("cookie-parser"));
const shopify_api_1 = require("@shopify/shopify-api");
require("dotenv/config");
const auth_js_1 = tslib_1.__importDefault(require("./middleware/auth.js"));
const verify_request_js_1 = tslib_1.__importDefault(require("./middleware/verify-request.js"));
const USE_ONLINE_TOKENS = true;
const TOP_LEVEL_OAUTH_COOKIE = 'shopify_top_level_oauth';
const PORT = Number.parseInt(process.env.PORT || '8081', 10);
const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD;
shopify_api_1.Shopify.Context.initialize({
    API_KEY: process.env.SHOPIFY_API_KEY,
    API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SCOPES.split(','),
    HOST_NAME: process.env.HOST.replace(/https:\/\//, ''),
    API_VERSION: shopify_api_1.ApiVersion.April22,
    IS_EMBEDDED_APP: true,
    // This should be replaced with your preferred storage strategy
    SESSION_STORAGE: new shopify_api_1.Shopify.Session.MemorySessionStorage(),
});
// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS = {};
shopify_api_1.Shopify.Webhooks.Registry.addHandler('APP_UNINSTALLED', {
    path: '/webhooks',
    webhookHandler: (topic, shop, body) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        delete ACTIVE_SHOPIFY_SHOPS[shop];
    }),
});
// export for test use only
const createServer = (root = process.cwd(), isProd = process.env.NODE_ENV === 'production') => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const app = (0, express_1.default)();
    app.set('top-level-oauth-cookie', TOP_LEVEL_OAUTH_COOKIE);
    app.set('active-shopify-shops', ACTIVE_SHOPIFY_SHOPS);
    app.set('use-online-tokens', USE_ONLINE_TOKENS);
    app.use((0, cookie_parser_1.default)(shopify_api_1.Shopify.Context.API_SECRET_KEY));
    (0, auth_js_1.default)(app);
    app.post('/webhooks', (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        try {
            yield shopify_api_1.Shopify.Webhooks.Registry.process(req, res);
            console.log(`Webhook processed, returned status code 200`);
        }
        catch (error) {
            console.log(`Failed to process webhook: ${error}`);
            if (!res.headersSent) {
                res.status(500).send(error.message);
            }
        }
    }));
    app.get('/products-count', (0, verify_request_js_1.default)(app), (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const session = yield shopify_api_1.Shopify.Utils.loadCurrentSession(req, res, true);
        const { Product } = yield Promise.resolve().then(() => tslib_1.__importStar(require(`@shopify/shopify-api/dist/rest-resources/${shopify_api_1.Shopify.Context.API_VERSION}/index.js`)));
        const countData = yield Product.count({ session });
        res.status(200).send(countData);
    }));
    app.post('/graphql', (0, verify_request_js_1.default)(app), (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        try {
            const response = yield shopify_api_1.Shopify.Utils.graphqlProxy(req, res);
            res.status(200).send(response.body);
        }
        catch (error) {
            res.status(500).send(error.message);
        }
    }));
    app.use(express_1.default.json());
    app.use((req, res, next) => {
        const shop = req.query.shop;
        if (shopify_api_1.Shopify.Context.IS_EMBEDDED_APP && shop) {
            res.setHeader('Content-Security-Policy', `frame-ancestors https://${shop} https://admin.shopify.com;`);
        }
        else {
            res.setHeader('Content-Security-Policy', `frame-ancestors 'none';`);
        }
        next();
    });
    app.use('/*', (req, res, next) => {
        const { shop } = req.query;
        // Detect whether we need to reinstall the app, any request from Shopify will
        // include a shop in the query parameters.
        if (app.get('active-shopify-shops')[shop] === undefined && shop) {
            res.redirect(`/auth?${new URLSearchParams(req.query).toString()}`);
        }
        else {
            next();
        }
    });
    /**
     * @type {import('vite').ViteDevServer}
     */
    let vite;
    if (!isProd) {
        // eslint-disable-next-line no-shadow
        vite = yield Promise.resolve().then(() => tslib_1.__importStar(require('vite'))).then(({ createServer }) => createServer({
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
        }));
        app.use(vite.middlewares);
    }
    else {
        const compression = yield Promise.resolve().then(() => tslib_1.__importStar(require('compression'))).then(({ default: fn }) => fn);
        const serveStatic = yield Promise.resolve().then(() => tslib_1.__importStar(require('serve-static'))).then(({ default: fn }) => fn);
        const fs = yield Promise.resolve().then(() => tslib_1.__importStar(require('node:fs')));
        app.use(compression());
        app.use(serveStatic(node_path_1.default.resolve('dist/client')));
        app.use('/*', (_req, res, _next) => {
            // Client-side routing will pick up on the correct route to render, so we always render the index here
            res
                .status(200)
                .set('Content-Type', 'text/html')
                .send(fs.readFileSync(`${process.cwd()}/dist/client/index.html`));
        });
    }
    return { app, vite };
});
exports.createServer = createServer;
if (!isTest) {
    (0, exports.createServer)().then(({ app }) => app.listen(PORT));
}
//# sourceMappingURL=index.js.map