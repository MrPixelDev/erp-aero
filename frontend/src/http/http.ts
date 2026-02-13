import { JWTTokens, reqOptionsHelper } from '../common/types';

const STORAGE_KEY = import.meta.env?.VITE_STORAGE_KEY;

export function loadTokens(): JWTTokens {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { accessToken: null, refreshToken: null, sessionId: null };
        const parsed = JSON.parse(raw) as JWTTokens;
        return {
            accessToken: parsed.accessToken ?? null,
            refreshToken: parsed.refreshToken ?? null,
            sessionId: parsed.sessionId ?? null,
        };
    } catch {
        return { accessToken: null, refreshToken: null, sessionId: null };
    }
}

export function saveTokens(tokens: JWTTokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
    localStorage.removeItem(STORAGE_KEY);
}

async function refreshAccessToken(path: string, refreshToken: string) {
    const base = new URL(path).origin;
    const res = await fetch(`${base}/signin/new_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
        throw new Error('REFRESH_FAILED');
    }
    return res.json() as Promise<Omit<JWTTokens, 'sessionId'>>;
}

export async function request(
    path: string,
    tokens: Partial<JWTTokens> = {},
    options: Partial<reqOptionsHelper<any>> = {},
    allowRefresh = true
) {
    const stored = loadTokens();
    const merged: JWTTokens = {
        accessToken: stored.accessToken ?? tokens.accessToken ?? null,
        refreshToken: stored.refreshToken ?? tokens.refreshToken ?? null,
        sessionId: stored.sessionId ?? tokens.sessionId ?? null,
    };
    const headers = options.headers || {};
    if (merged.accessToken) {
        headers.Authorization = `Bearer ${merged.accessToken}`;
    }

    const res = await fetch(path, {
        ...options,
        headers,
    });

    if (res.status === 401 && allowRefresh && merged.refreshToken) {
        const refreshed = await refreshAccessToken(path, merged.refreshToken);
        const updated: JWTTokens = {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            sessionId: merged.sessionId ?? null,
        };
        saveTokens(updated);
        return request(path, updated, options, false);
    }

    try {
        if (path.includes('download')) {
            const blob = await res.blob();
            if (blob) return blob;
        } else {
            const data = await res.json();
            if (!res.ok) {
                if (data.error) {
                    throw data.error;
                } else {
                    return data;
                }
            }
            return data;
        }
    } catch (e) {
        return null;
    }
}

export async function requestRaw(
    path: string,
    tokens: Partial<JWTTokens> = {},
    options: Partial<reqOptionsHelper<any>> = {},
    allowRefresh = true
) {
    const stored = loadTokens();
    const merged: JWTTokens = {
        accessToken: stored.accessToken ?? tokens.accessToken ?? null,
        refreshToken: stored.refreshToken ?? tokens.refreshToken ?? null,
        sessionId: stored.sessionId ?? tokens.sessionId ?? null,
    };
    const headers = options.headers || {};
    if (merged.accessToken) {
        headers.Authorization = `Bearer ${merged.accessToken}`;
    }

    const res = await fetch(path, {
        ...options,
        headers,
    });

    if (res.status === 401 && allowRefresh && merged.refreshToken) {
        const refreshed = await refreshAccessToken(path, merged.refreshToken);
        const updated: JWTTokens = {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            sessionId: merged.sessionId ?? null,
        };
        saveTokens(updated);
        return requestRaw(path, updated, options, false);
    }

    return res;
}

export function initWS(sessionId: string, onEvent: (event: unknown) => void): () => void {
    let stopped = false;
    let retryMs = 1000;
    let retryN = 0;
    let maxRetry: number = 5;
    let socket: WebSocket | null = null;
    let timer: number | null = null;

    const connect = () => {
        if (stopped) return;
        retryN += 1;
        socket = new WebSocket(`ws://${import.meta.env.VITE_BACKEND_WS_BASE}/ws?sessionId=${sessionId}`);
        socket.onopen = () => {
            retryMs = 1000;
        };
        socket.onmessage = message => {
            try {
                const event = JSON.parse(message.data);
                onEvent(event);
            } catch {
                onEvent({ type: 'ws.unknown' });
            }
        };
        socket.onclose = () => {
            if (stopped) return;
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(connect, retryMs);
            retryMs = Math.min(retryMs * 2, 10000);
        };
    };

    connect();

    return () => {
        stopped = true;
        if (timer) window.clearTimeout(timer);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close();
        }
    };
}
