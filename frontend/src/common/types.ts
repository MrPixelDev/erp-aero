import { Dispatch, StateUpdater } from 'preact/hooks';

export type JWTTokens = {
    accessToken: string | null;
    refreshToken: string | null;
    sessionId: string | null;
};

export type ApiError = {
    error?: {
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
    };
};

export type Dispatcher = Dispatch<StateUpdater<string>> | ((msg: string) => unknown);

export type reqOptionsHelper<T> = {
    method: 'GET' | 'POST' | 'PUT' | 'UPDATE' | 'DELETE';
    headers: Record<string, string>;
    body: T;
};

export type FileRecord = {
    file_id?: string;
    fileId?: string;
    original_name?: string;
    originalName?: string;
    size_bytes?: number;
    sizeBytes?: number;
    mime_type?: string;
    mimeType?: string;
    updated_at?: string;
    updatedAt?: string;
};

export type FileEvent =
    | { type: 'file.list'; filesList: FileRecord[] }
    | { type: 'file.created'; file: FileRecord }
    | { type: 'file.updated'; file: FileRecord }
    | { type: 'file.deleted'; file: FileRecord }
    | { type: string; [key: string]: unknown };

export function isFileRecord(value: unknown): value is FileRecord {
    return typeof value === 'object' && value !== null;
}
