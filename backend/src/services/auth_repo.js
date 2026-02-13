import { db } from '../lib/db.js';

export class AuthRepo {
    constructor() {}

    async doesUserExists(id) {
        return await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    }

    async getUser(id, passwordHash) {
        const [rows] = await db.query('SELECT id, password_hash FROM users WHERE id = ? AND password_hash = ?', [
            id,
            passwordHash,
        ]);
        return rows[0] ?? null;
    }

    async createUser(userId, passwordHash) {
        return await db.query('INSERT INTO users (id, password_hash) VALUES (?, ?)', [userId, passwordHash]);
    }

    async createSession(record) {
        return await db.query(
            `INSERT INTO device_sessions
    (session_id, user_id, refresh_token_hash, user_agent, device_name, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                record.sessionId,
                record.userId,
                record.refreshTokenHash,
                record.userAgent ?? null,
                record.deviceName ?? null,
            ]
        );
    }

    async getSession(sessionId) {
        const [rows] = await db.query('SELECT * FROM device_sessions WHERE session_id = ? AND revoked_at IS NULL', [
            sessionId,
        ]);
        return rows[0] ?? null;
    }

    async rotateSession(sessionId, refreshTokenHash) {
        await db.query(
            'UPDATE device_sessions SET refresh_token_hash = ?, last_used_at = NOW() WHERE session_id = ? AND revoked_at IS NULL',
            [refreshTokenHash, sessionId]
        );
    }

    async revokeSession(sessionId) {
        await db.query('UPDATE device_sessions SET revoked_at = NOW() WHERE session_id = ?', [sessionId]);
    }
}
