import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

export const db = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    connectionLimit: 10,
});

export async function initializeSchema() {
    const schema_exists = await db.query('SELECT * FROM users').catch(e => console.log(`${e}`));
    if (schema_exists) return;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.resolve(__dirname, '../db/schema.sql');
    const sql = await fs.readFile(schemaPath, 'utf8');
    const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
        await db.query(statement);
    }
}
