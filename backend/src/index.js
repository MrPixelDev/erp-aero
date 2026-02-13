import { config } from './lib/config.js';

import express from 'express';
import http from 'node:http';
import { requestLogger } from './lib/logger.js';
import { attachWebSocket } from './ws/ws.js';
import { initializeSchema } from './lib/db.js';
import { authRouter } from './api/routes/auth.js';
import { fileRouter } from './api/routes/file.js';

const app = express();

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send();
        return;
    }
    next();
});
app.use(requestLogger);
app.use('/', authRouter);
app.use('/file', fileRouter);

try {
    await initializeSchema();
} catch (err) {
    console.error('Database connection failed', err);
    process.exit(1);
}

const server = http.createServer(app);
if (config.wsEnabled) {
    attachWebSocket(server);
}

server.listen(config.port, () => {
    console.log(`Server listening on ${config.port}`);
});
