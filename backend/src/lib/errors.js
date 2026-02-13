export function errorHandler(err, _, res) {
    const code = err.data || err.code || err.status || 'UNKNOWN_ERROR';
    const resStatus =
        code === 'NOT_FOUND'
            ? 404
            : code === 'DUPLICATE_FILENAME'
              ? 409
              : code === 'INVALID_SESSION' || code === 'INVALID_REFRESH'
                ? 401
                : code === 'PAYLOAD_TOO_LARGE'
                  ? 413
                  : 400;

    res.status(resStatus).json({
        error: {
            code,
            message: err.message,
        },
    });
}
