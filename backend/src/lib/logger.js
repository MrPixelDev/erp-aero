import crypto from 'node:crypto';

export function requestLogger(req, res, next) {
    const requestId = crypto.randomUUID();

    res.setHeader('x-request-id', requestId);
    req.requestId = requestId;

    const entry = {
        level: 'info',
        msg: 'request',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
    };
    console.log(JSON.stringify(entry, null, 2));
    next();
}
