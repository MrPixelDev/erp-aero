import { Router } from 'express';
import multer from 'multer';
import { config } from '../../lib/config.js';
import { requireAuth } from '../middleware/auth.js';
import { listFiles, uploadFile, getFile, replaceFile, deleteFile, downloadFile } from '../../services/file_service.js';
import { errorHandler } from '../../lib/errors.js';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.storage.maxSizeMb * 1024 * 1024 },
});

export const fileRouter = Router();

fileRouter.use(requireAuth);
fileRouter.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('BAD_REQUEST');
        }
        const record = await uploadFile(req.id, req.sessionId, req.file);
        res.status(201).json(record);
    } catch (err) {
        errorHandler(err, req, res);
    }
});

fileRouter.get('/:id/:fileId', async (req, res) => {
    try {
        const record = await getFile(req.params.id, req.params.fileId);
        res.json(record);
    } catch (err) {
        errorHandler(err, req, res);
    }
});

fileRouter.put('/update/:fileId', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('BAD_REQUEST');
        }
        const id = req.id;
        const record = await replaceFile(id, req.sessionId, req.params.fileId, req.file);
        res.json(record);
    } catch (err) {
        errorHandler(err, req, res);
    }
});

fileRouter.delete('/delete/:fileId', async (req, res) => {
    try {
        const id = req.id;
        const record = await deleteFile(id, req.sessionId, req.params.fileId);
        res.status(204).send();
    } catch (err) {
        errorHandler(err, req, res);
    }
});

fileRouter.get('/download/:userId/:fileId', async (req, res) => {
    try {
        const id = req.params.userId;
        const record = await getFile(id, req.params.fileId);
        const data = await downloadFile(id, req.params.fileId);

        console.log(`data:\n\n${JSON.stringify(data)}`);

        res.setHeader('Content-Type', record.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${record.original_name}"`);
        res.send(data);
    } catch (err) {
        errorHandler(err, req, res);
    }
});

fileRouter.get('/list', async (req, res) => {
    try {
        const id = req.id;
        const listSizeRaw = Array.isArray(req.query?.list_size) ? req.query.list_size[0] : req.query?.list_size;
        const pageRaw = Array.isArray(req.query?.page) ? req.query.page[0] : req.query?.page;
        const listSize = Math.max(1, Math.min(100, Number(listSizeRaw ?? 10)));
        const page = Math.max(1, Number(pageRaw ?? 1));
        const offset = (page - 1) * listSize;
        const files = await listFiles(id, listSize, offset);
        res.json({ files, page, list_size: listSize });
    } catch (err) {
        errorHandler(err, req, res);
    }
});
