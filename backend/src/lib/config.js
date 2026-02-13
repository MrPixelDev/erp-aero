import process from 'node:process';

function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}

export const config = {
    apiHost: process.env.API_HOST || 'http://localhost',
    wsHost: process.env.WS_HOST || 'localhost',
    port: Number(process.env.PORT ?? 3000),
    wsEnabled: (process.env.WS_ENABLED ?? 'true').toLowerCase() === 'true',
    db: {
        host: required('DB_HOST'),
        port: Number(process.env.DB_PORT ?? 3306),
        name: required('DB_NAME'),
        user: required('DB_USER'),
        password: required('DB_PASSWORD'),
    },
    jwt: {
        secret: required('JWT_SECRET'),
        accessTtl: process.env.JWT_ACCESS_TTL ?? '10m',
        refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    },
    storage: {
        root: required('FILE_STORAGE_ROOT'),
        maxSizeMb: Number(process.env.FILE_MAX_SIZE_MB ?? 100),
    },
};
