import { db } from '../lib/db.js';

export class FileRepo {
    constructor() {}

    async findByUserAndName(userId, name) {
        const [rows] = await db.query(
            'SELECT * FROM files WHERE owner_user_id = ? AND original_name = ? AND deleted_at IS NULL',
            [userId, name]
        );
        const list = rows;
        return list[0] ?? null;
    }

    async listByUser(userId, limit = 10, offset = 0) {
        const [rows] = await db.query(
            'SELECT * FROM files WHERE owner_user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT ? OFFSET ?',
            [userId, Number(limit), Number(offset)]
        );
        return rows;
    }

    async getById(userId, fileId) {
        const [rows] = await db.query(
            'SELECT * FROM files WHERE file_id = ? AND owner_user_id = ? AND deleted_at IS NULL',
            [fileId, userId]
        );
        return rows[0] ?? null;
    }

    async insertFile(record) {
        await db.query(
            `INSERT INTO files (file_id, owner_user_id, original_name, size_bytes, mime_type, checksum_sha256, storage_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                record.fileId,
                record.ownerUserId,
                record.originalName,
                record.sizeBytes,
                record.mimeType,
                record.checksumSha256,
                record.storageKey,
            ]
        );
    }

    async updateFile(record) {
        await db.query(
            `UPDATE files SET size_bytes = ?, mime_type = ?, checksum_sha256 = ?, updated_at = ? WHERE file_id = ?`,
            [record.sizeBytes, record.mimeType, record.checksumSha256, record.updatedAt, record.fileId]
        );
    }

    async deleteFile(userId, fileId) {
        await db.query('DELETE FROM files WHERE file_id = ? AND owner_user_id = ?', [fileId, userId]);
    }
}
