import { WebSocketServer } from 'ws';
import { config } from '../lib/config.js';

const subs = new Map();

export function attachWebSocket(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
    });

    wss.on('connection', (socket, req) => {
        const sessionId = new URL(req.url ?? '', config.wsHost).searchParams.get('sessionId');

        if (!sessionId) {
            socket.close(1008, 'sessionId required');
            return;
        }

        const currentSession = subs.get(sessionId);
        const set = currentSession ? currentSession : new Set();

        set.add(socket);
        subs.set(sessionId, set);

        socket.on('close', () => {
            set.delete(socket);
        });
    });
    return wss;
}

export function emitFileEvent(sessionId, filesList) {
    const set = subs.get(sessionId);
    if (!set) return;

    const payload = JSON.stringify(filesList);
    for (const socket of set) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(payload);
        }
    }
}

export function emitFileList(sessionId, filesList) {
    const set = subs.get(sessionId);
    if (!set) return;

    const payload = JSON.stringify({ type: 'file.list', filesList });
    for (const socket of set) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(payload);
        }
    }
}
