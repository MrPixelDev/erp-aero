import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config.js';
import { AuthRepo } from './auth_repo.js';

const authRepo = new AuthRepo();

function signAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessTtl });
}

function signRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshTtl });
}

function hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashPassword(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export function verifyToken(token) {
    return jwt.verify(token, config.jwt.secret);
}

export async function getUser(id, password) {
    const passwordHash = hashPassword(password);
    return await authRepo.getUser(id, passwordHash);
}

export async function doesUserExists(id) {
    const [data] = await authRepo.doesUserExists(id);
    if (data && data[0]?.id) {
        return true;
    }
    return false;
}

export async function createUser(id, password) {
    const passwordHash = hashPassword(password);
    return await authRepo.createUser(id, passwordHash);
}

export async function createSession(userId, userAgent = null) {
    const sessionId = crypto.randomUUID();
    const refreshToken = signRefreshToken({ sub: userId, sid: sessionId });
    const refreshTokenHash = hashRefreshToken(refreshToken);

    await authRepo.createSession({ sessionId, userId, refreshTokenHash, userAgent });

    const accessToken = signAccessToken({ sub: userId, sid: sessionId });

    return { accessToken, refreshToken, sessionId };
}

export async function refreshSession(sessionId, refreshToken) {
    const session = await authRepo.getSession(sessionId);
    if (!session) {
        throw new Error('INVALID_SESSION');
    }

    const incomingHash = hashRefreshToken(refreshToken);
    if (incomingHash !== session.refreshTokenHash) {
        throw new Error('INVALID_REFRESH');
    }

    const newRefresh = signRefreshToken({ sub: session.userId, sid: sessionId });

    await authRepo.rotateSession(sessionId, hashRefreshToken(newRefresh));

    const accessToken = signAccessToken({ sub: session.userId, sid: sessionId });

    return { accessToken, refreshToken: newRefresh };
}

export async function revokeSession(sessionId) {
    await authRepo.revokeSession(sessionId);
}
