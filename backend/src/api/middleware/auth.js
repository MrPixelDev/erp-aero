import { verifyToken } from '../../services/auth_service.js';
import { AuthRepo } from '../../services/auth_repo.js';

const authRepo = new AuthRepo();

export async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!(header && header.startsWith('Bearer '))) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
        return;
    }

    try {
        const token = header.slice('Bearer '.length);
        const payload = verifyToken(token);
        const session = await authRepo.getSession(payload.sid);
        if (!session) {
            res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Session revoked' } });
            return;
        }
        req.id = payload.sub;
        req.sessionId = payload.sid;
        next();
    } catch {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid access token' } });
    }
}
