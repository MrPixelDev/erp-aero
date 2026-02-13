import { h, JSX, render } from 'preact';
import { useRef, useState } from 'preact/hooks';

import './style.css';
import { FileEvent, FileRecord, isFileRecord, JWTTokens } from './common/types';
import { initWS, request, loadTokens, saveTokens, clearTokens } from './http/http';
import { log, validateUsername } from './common/utils';

export function App(): JSX.Element {
    const [id, setId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [tokens, setTokens] = useState<JWTTokens>(loadTokens());
    const [output, setOutput] = useState('');
    const [fileId, setFileId] = useState('');
    const [files, setFiles] = useState<FileRecord[]>([]);
    const wsCloseRef = useRef<null | (() => void)>(null);

    const getFileId = (record: FileRecord) => record.fileId ?? record.file_id ?? '';

    const applyFileEvent = (event: FileEvent) => {
        if (event.type === 'file.list') {
            const list = Array.isArray(event.filesList) ? event.filesList.filter(isFileRecord) : [];
            setFiles(list);
            setFileId(prev => {
                if (!prev) return '';
                return list.some(item => getFileId(item) === prev) ? prev : '';
            });
            log(`Files synced (${list.length})`, [setOutput]);
            return;
        }
        if (event.type === 'file.created' || event.type === 'file.updated') {
            const record = isFileRecord(event.file) ? event.file : null;
            if (!record) return;
            const idValue = getFileId(record);
            if (!idValue) return;
            setFiles(prev => {
                const filtered = prev.filter(item => getFileId(item) !== idValue);
                return [record, ...filtered];
            });
            log(`File ${event.type === 'file.created' ? 'uploaded' : 'updated'}`, [setOutput]);
            return;
        }
        if (event.type === 'file.deleted') {
            const record = isFileRecord(event.file) ? event.file : null;
            if (!record) return;
            const idValue = getFileId(record);
            if (!idValue) return;
            setFiles(prev => prev.filter(item => getFileId(item) !== idValue));
            log('File deleted', [setOutput]);
        }
    };

    // Логин и подключение WebSocket для событий.
    const onSignin = async () => {
        try {
            const usernameError = validateUsername(id);
            if (usernameError) {
                log(usernameError, [setOutput]);
                return;
            }
            const data = await request(import.meta.env.VITE_BACKEND_API_BASE + '/signin', tokens, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, password }),
            });

            if (!(data && data.sessionId)) throw new Error('No data');

            const nextTokens = {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                sessionId: data.sessionId,
            };
            setTokens(nextTokens);
            saveTokens(nextTokens);
            setPassword('');

            if (wsCloseRef.current) {
                wsCloseRef.current();
            }
            const wsClose = initWS(data.sessionId, event => applyFileEvent(event as FileEvent));
            wsCloseRef.current = wsClose;

            const filesList = await request(import.meta.env.VITE_BACKEND_API_BASE + '/file/list', tokens, {
                method: 'GET',
            });
            applyFileEvent({ type: 'file.list', filesList: filesList.files });

            log(data, [setOutput]);
        } catch (err) {
            log(err, [setOutput]);
        }
    };

    const onSignup = async () => {
        try {
            const usernameError = validateUsername(id);
            if (usernameError) {
                log(usernameError, [setOutput]);
                return;
            }
            const data = await request(
                import.meta.env.VITE_BACKEND_API_BASE + '/signup',
                {},
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, password }),
                }
            );

            if (!(data && data.message)) throw new Error('No data');
            setPassword('');
            log(data.message, [setOutput]);
        } catch (err) {
            log(err, [setOutput]);
        }
    };

    const onLogout = async () => {
        try {
            await request(import.meta.env.VITE_BACKEND_API_BASE + '/logout/' + tokens.sessionId, tokens, {
                method: 'GET',
            });
        } catch (err) {
            log(err, [setOutput]);
        } finally {
            clearTokens();
            setTokens({ accessToken: null, refreshToken: null, sessionId: null });
            setFiles([]);

            if (wsCloseRef.current) {
                wsCloseRef.current();
                wsCloseRef.current = null;
            }
            log('logged out', [setOutput]);
        }
    };

    const onUpload = async (event: Event) => {
        try {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append('file', file);
            const data = await request(import.meta.env.VITE_BACKEND_API_BASE + '/file/upload', tokens, {
                method: 'POST',
                body: form,
            });
            input.value = '';
            log(data, [setOutput]);
        } catch (err) {
            log(err, [setOutput]);
        }
    };

    const onDetails = async () => {
        try {
            const data = await request(import.meta.env.VITE_BACKEND_API_BASE + `/file/${id}/${fileId}`, tokens, {
                method: 'GET',
            });
            log(data, [setOutput]);
        } catch (err) {
            log(err, [setOutput]);
        }
    };

    const onDownload = async () => {
        try {
            if (!fileId) {
                log('Select a file to download', [setOutput]);
                return;
            }
            const url = import.meta.env.VITE_BACKEND_API_BASE + `/file/download/${id}/${fileId}`;

            const blob = await request(url, tokens, {
                method: 'GET',
            });

            const link = document.createElement('a');
            const href = URL.createObjectURL(blob);
            link.href = href;
            link.download = 'file';
            link.click();
            URL.revokeObjectURL(href);
            log({ size: blob.size }, [setOutput]);
        } catch (err) {
            log(err, [setOutput]);
        }
    };

    const onDelete = async () => {
        try {
            await request(import.meta.env.VITE_BACKEND_API_BASE + `/file/delete/${fileId}`, tokens, {
                method: 'DELETE',
            });
            log('deleted', [setOutput]);
        } catch (err) {
            log(err, [setOutput]);
        }
    };

    const onReplace = async (event: Event) => {
        try {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append('file', file);
            const data = await request(import.meta.env.VITE_BACKEND_API_BASE + `/file/update/${fileId}`, tokens, {
                method: 'PUT',
                body: form,
            });
            input.value = '';
            log(data, [setOutput]);
        } catch (err) {
            log(err, [setOutput]);
        }
    };

    return h(
        'div',
        {},
        h('h1', {}, 'ERP API Tester'),
        h(
            'section',
            {},
            h('h2', {}, 'Auth'),
            h(
                'label',
                {},
                'Id ',
                h('input', {
                    value: id,
                    placeholder: 'Email or 11-digit phone',
                    onInput: e => setId((e.currentTarget as HTMLInputElement).value),
                })
            ),
            h(
                'label',
                {},
                'Password ',
                h('input', {
                    type: 'password',
                    value: password,
                    placeholder: 'Password',
                    onInput: e => setPassword((e.currentTarget as HTMLInputElement).value),
                })
            ),
            h('button', { onClick: onSignup, disabled: !(id && password) }, 'Signup'),
            h('button', { onClick: onSignin, disabled: !(id && password) }, 'Signin'),
            h('button', { onClick: onLogout, disabled: !tokens.accessToken }, 'Logout')
        ),
        h(
            'section',
            {},
            h('h2', {}, 'Files'),
            h('input', { type: 'file', onChange: onUpload }),
            h(
                'label',
                {},
                'Select file ',
                h(
                    'select',
                    {
                        id: 'file-select',
                        value: fileId,
                        size: Math.min(8, Math.max(files.length, 3)),
                        onChange: e => setFileId((e.currentTarget as HTMLSelectElement).value),
                    },
                    h('option', { value: '' }, 'Choose file'),
                    files.map(record => {
                        const idValue = getFileId(record);
                        const nameValue = record.originalName ?? record.original_name ?? idValue;
                        const sizeValue = record.sizeBytes ?? record.size_bytes ?? '';
                        const label = sizeValue ? `${nameValue} (${sizeValue})` : nameValue;
                        return h('option', { key: idValue, value: idValue }, label);
                    })
                )
            ),
            h('button', { onClick: onDownload, disabled: !fileId }, 'Download'),
            h('button', { onClick: onDelete, disabled: !fileId }, 'Delete'),
            h('input', {
                id: 'replace-file-input',
                class: 'file-input',
                type: 'file',
                onChange: onReplace,
                disabled: !fileId,
            }),
            h(
                'label',
                { class: `file-label${fileId ? '' : ' file-label--disabled'}`, htmlFor: 'replace-file-input' },
                'Replace file'
            ),
            h('button', { onClick: onDetails, disabled: !fileId }, 'Details')
        ),
        h('pre', {}, output)
    );
}

render(<App />, document.getElementById('app'));
