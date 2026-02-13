import fs from 'node:fs';
import afs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../lib/config.js';
import { FileRepo } from './file_repo.js';
import { emitFileList } from '../ws/ws.js';

class Storage {
    constructor() {
        this.connected = false;
    }

    async init() {
        if (this.connected) return this;

        await this.createAppDirIfNotExists(config.storage.root);
        this.connected = true;
        return this;
    }

    async createAppDirIfNotExists(dir, recursive = true) {
        if (!fs.existsSync(dir)) {
            await afs.mkdir(dir, { recursive });
        }
    }

    async writeFileInStorage(userId, buffer) {
        const storageKey = crypto.randomUUID();
        const targetDir = path.join(config.storage.root, `${userId}/`);
        const targetPath = path.join(targetDir, storageKey);
        const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        await this.createAppDirIfNotExists(targetDir);
        await afs.writeFile(targetPath, buffer);
        return { storageKey, sizeBytes: buffer.length, checksumSha256 };
    }

    async replaceFileInStorage(userId, storageKey, buffer) {
        const targetPath = path.join(config.storage.root, `${userId}/`, storageKey);
        const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        await afs.writeFile(targetPath, buffer);
        return { storageKey, sizeBytes: buffer.length, checksumSha256 };
    }

    async deleteFileInStorage(userId, storageKey) {
        const targetPath = path.join(config.storage.root, `${userId}/`, storageKey);
        return await afs.rm(targetPath, { force: true });
    }

    async readFileInStorage(userId, storageKey) {
        const targetPath = path.join(config.storage.root, `${userId}/`, storageKey);
        console.log(`222target path: ${targetPath}`);
        return await afs.readFile(targetPath);
    }
}

const storage = new Storage();
await storage.init();

const fileRepo = new FileRepo();

export async function listFiles(userId) {
    return fileRepo.listByUser(userId);
}

export async function uploadFile(userId, sessionId, file) {
    if (!(file && file.buffer)) {
        throw new Error('BAD_REQUEST');
    }
    const existing = await fileRepo.findByUserAndName(userId, file.originalname);
    if (existing) {
        throw new Error('DUPLICATE_FILENAME');
    }

    const stored = await storage.writeFileInStorage(userId, file.buffer);
    const fileId = crypto.randomUUID();

    await fileRepo.insertFile({
        fileId,
        ownerUserId: userId,
        originalName: file.originalname,
        sizeBytes: stored.sizeBytes,
        mimeType: file.mimetype,
        checksumSha256: stored.checksumSha256,
        storageKey: stored.storageKey,
    });

    const record = await fileRepo.getById(userId, fileId);
    if (!record) {
        throw new Error('UPLOAD_FAILED');
    }

    const fileList = await listFiles(userId);
    emitFileList(sessionId, fileList);
    return record;
}

export async function getFile(userId, fileId) {
    const record = await fileRepo.getById(userId, fileId);
    if (!record) {
        throw new Error('NOT_FOUND');
    }
    return record;
}

export async function downloadFile(userId, fileId) {
    const record = await getFile(userId, fileId);
    const buffer = await storage.readFileInStorage(userId, record.storage_key);
    return buffer;
}

export async function deleteFile(userId, sessionId, fileId) {
    const record = await getFile(userId, fileId);
    await fileRepo.deleteFile(userId, fileId);
    await storage.deleteFileInStorage(userId, record.storage_key);
    const fileList = await listFiles(userId);
    emitFileList(sessionId, fileList);
}

export async function replaceFile(userId, sessionId, fileId, file) {
    if (!file || !file.buffer) {
        throw new Error('BAD_REQUEST');
    }
    const record = await getFile(userId, fileId);
    const stored = await storage.replaceFileInStorage(userId, record.storage_key, file.buffer);

    await fileRepo.updateFile({
        fileId: record.file_id,
        sizeBytes: stored.sizeBytes,
        mimeType: file.mimetype,
        checksumSha256: stored.checksumSha256,
        updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });

    const updated = await fileRepo.getById(userId, fileId);
    if (!updated) {
        throw new Error('NOT_FOUND');
    }

    const fileList = await listFiles(userId);
    emitFileList(sessionId, fileList);
    return updated;
}
