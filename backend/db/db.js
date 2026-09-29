const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

let pgPool = null;
let sqliteDb = null;

if (config.DATABASE_URL) {
    console.log('[DB] Connecting to PostgreSQL at', config.DATABASE_URL.split('@')[1] || 'remote');
    pgPool = new Pool({
        connectionString: config.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
} else {
    try {
        const Database = require('better-sqlite3');
        const dbDir = path.dirname(config.DB_FILE_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        console.log('[DB] Initializing SQLite database at:', config.DB_FILE_PATH);
        sqliteDb = new Database(config.DB_FILE_PATH);
        sqliteDb.pragma('journal_mode = WAL');
        sqliteDb.pragma('foreign_keys = ON');
    } catch (e) {
        console.error('[DB] SQLite driver not available and no DATABASE_URL configured:', e.message);
    }
}

/**
 * Universal query runner:
 * Adapts between PostgreSQL ($1, $2) and SQLite (?, ?)
 */
async function query(sql, params = []) {
    if (pgPool) {
        let pgSql = sql;

        // Auto-adapt SQLite dialect to PostgreSQL dialect
        if (pgSql.includes('INSERT OR IGNORE INTO')) {
            pgSql = pgSql.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
            if (!pgSql.includes('ON CONFLICT')) {
                pgSql += ' ON CONFLICT DO NOTHING';
            }
        }

        // GROUP_CONCAT -> STRING_AGG
        pgSql = pgSql.replace(/GROUP_CONCAT\(([^)]+)\)/gi, 'STRING_AGG($1::text, \',\')');

        // datetime() / date() SQLite functions -> PostgreSQL casting
        pgSql = pgSql.replace(/datetime\(([^)]+)\)/gi, '($1::timestamptz)');
        pgSql = pgSql.replace(/date\(([^)]+)\)/gi, '($1::date)');

        // Parameter conversion ? -> $1, $2, ...
        let paramIndex = 1;
        while (pgSql.includes('?')) {
            pgSql = pgSql.replace('?', `$${paramIndex++}`);
        }

        const res = await pgPool.query(pgSql, params);
        return { rows: res.rows || [], rowCount: res.rowCount || 0 };
    } else {
        if (!sqliteDb) {
            throw new Error("No active database connection available.");
        }
        let sqSql = sql.replace(/\$\d+/g, '?');
        const trimmed = sqSql.trim().toUpperCase();

        if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH')) {
            const stmt = sqliteDb.prepare(sqSql);
            const rows = stmt.all(...params);
            return { rows, rowCount: rows.length };
        } else {
            const stmt = sqliteDb.prepare(sqSql);
            const info = stmt.run(...params);
            return {
                rows: [],
                rowCount: info.changes,
                lastInsertRowid: info.lastInsertRowid
            };
        }
    }
}

/**
 * Single-row helper
 */
async function getOne(sql, params = []) {
    const res = await query(sql, params);
    return res.rows.length > 0 ? res.rows[0] : null;
}

let sqliteTxLock = Promise.resolve();

/**
 * Atomic transaction wrapper
 */
async function transaction(callback) {
    if (pgPool) {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback({
                query: async (text, params = []) => {
                    let pgSql = text;
                    if (pgSql.includes('INSERT OR IGNORE INTO')) {
                        pgSql = pgSql.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
                        if (!pgSql.includes('ON CONFLICT')) {
                            pgSql += ' ON CONFLICT DO NOTHING';
                        }
                    }
                    pgSql = pgSql.replace(/GROUP_CONCAT\(([^)]+)\)/gi, 'STRING_AGG($1::text, \',\')');
                    pgSql = pgSql.replace(/datetime\(([^)]+)\)/gi, '($1::timestamptz)');
                    pgSql = pgSql.replace(/date\(([^)]+)\)/gi, '($1::date)');

                    let paramIndex = 1;
                    while (pgSql.includes('?')) {
                        pgSql = pgSql.replace('?', `$${paramIndex++}`);
                    }
                    return client.query(pgSql, params);
                },
                getOne: async (text, params = []) => {
                    let pgSql = text;
                    let paramIndex = 1;
                    while (pgSql.includes('?')) {
                        pgSql = pgSql.replace('?', `$${paramIndex++}`);
                    }
                    const r = await client.query(pgSql, params);
                    return r.rows[0] || null;
                }
            });
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } else {
        if (!sqliteDb) {
            throw new Error("No active SQLite connection.");
        }
        return new Promise((resolve, reject) => {
            sqliteTxLock = sqliteTxLock.then(async () => {
                try {
                    sqliteDb.exec('BEGIN IMMEDIATE');
                    const txHelper = {
                        query: async (text, params = []) => {
                            let sq = text.replace(/\$\d+/g, '?');
                            const trimmed = sq.trim().toUpperCase();
                            if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
                                return { rows: sqliteDb.prepare(sq).all(...params) };
                            } else {
                                const info = sqliteDb.prepare(sq).run(...params);
                                return { rows: [], rowCount: info.changes };
                            }
                        },
                        getOne: async (text, params = []) => {
                            let sq = text.replace(/\$\d+/g, '?');
                            return sqliteDb.prepare(sq).get(...params) || null;
                        }
                    };

                    const result = await callback(txHelper);
                    sqliteDb.exec('COMMIT');
                    resolve(result);
                } catch (err) {
                    try { sqliteDb.exec('ROLLBACK'); } catch (_) {}
                    reject(err);
                }
            }).catch(reject);
        });
    }
}

module.exports = {
    query,
    getOne,
    transaction,
    sqliteDb,
    pgPool
};
