import { Router } from 'express';
import { requireString } from '../../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import {
    getUser,
    doesUserExists,
    createUser,
    verifyToken,
    createSession,
    refreshSession,
    revokeSession,
} from '../../services/auth_service.js';
import { requireId } from '../../lib/validation.js';
import { errorHandler } from '../../lib/errors.js';

export const authRouter = Router();

authRouter.post('/signin', async (req, res) => {
    try {
        const id = requireId(req.body?.id, 'id');
        const password = requireString(req.body?.password, 'password');

        const user = await getUser(id, password);
        if (!user) {
            res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
            return;
        }

        const tokens = await createSession(user.id, req.headers['user-agent']);
        res.status(200).json({ ...tokens, id: user.id });
    } catch (err) {
        errorHandler(err, req, res);
    }
});

authRouter.post('/signin/new_token', async (req, res) => {
    try {
        const refreshToken = requireString(req.body?.refreshToken, 'refreshToken');
        const payload = verifyToken(refreshToken);
        const tokens = await refreshSession(payload.sid, refreshToken);
        res.status(200).json(tokens);
    } catch (err) {
        errorHandler(err, req, res);
    }
});

authRouter.post('/signup', async (req, res) => {
    try {
        const id = requireId(req.body?.id, 'id');
        const exists = await doesUserExists(id);
        if (exists) throw new Error('User already exists.');

        const password = requireString(req.body?.password, 'password');
        const newUser = await createUser(id, password);
        if (newUser) {
            res.status(201).send({
                message: 'User successfully registered.\nNow you can login with your id and password.',
            });
        } else {
            throw new Error('Can not register.');
        }
    } catch (err) {
        errorHandler(err, req, res);
    }
});

authRouter.get('/logout/:sessionId', requireAuth, async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        if (sessionId) {
            await revokeSession(sessionId);
        }
        res.status(204).send();
    } catch (err) {
        errorHandler(err, req, res);
    }
});

authRouter.get('/info/:id', requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            throw new Error('No user id');
        }
        await doesUserExists(id);
        res.status(200).json({ id });
    } catch (err) {
        errorHandler(err, req, res);
    }
});
