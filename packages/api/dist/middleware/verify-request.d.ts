export default function verifyRequest(app: any, { returnHeader }?: {
    returnHeader?: boolean | undefined;
}): (req: any, res: any, next: any) => Promise<any>;
