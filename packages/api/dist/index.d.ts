import 'dotenv/config';
export declare const createServer: (root?: string, isProd?: boolean) => Promise<{
    app: import("express-serve-static-core").Express;
    vite: any;
}>;
