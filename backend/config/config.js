const path = require('path');
require('dotenv').config();

let aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
if (aiServiceUrl && !aiServiceUrl.startsWith('http://') && !aiServiceUrl.startsWith('https://')) {
    aiServiceUrl = `http://${aiServiceUrl}`;
}

module.exports = {
    PORT: process.env.PORT || 5000,
    JWT_SECRET: process.env.JWT_SECRET || 'ira-super-secret-jwt-key-2026-campus-allocator',
    AI_SERVICE_URL: aiServiceUrl,
    DATABASE_URL: process.env.DATABASE_URL || null,
    DB_FILE_PATH: process.env.DB_FILE_PATH || path.join(__dirname, '..', 'db', 'ira_campus.db'),
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
