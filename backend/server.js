const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const socketService = require('./services/socketService');
const { initAndSeed } = require('./db/seedData');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
socketService.initSocket(server);

// Middleware
app.use(cors({
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user-id', 'x-demo-user-role']
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
});

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'IRA Core Backend',
        timestamp: new Date().toISOString()
    });
});

// Start Server
async function start() {
    try {
        await initAndSeed();
        server.listen(config.PORT, '0.0.0.0', () => {
            console.log(`=======================================================`);
            console.log(`🚀 IRA Backend & Allocation Engine running on port ${config.PORT}`);
            console.log(`📡 WebSocket server active`);
            console.log(`🧠 AI Microservice target: ${config.AI_SERVICE_URL}`);
            console.log(`=======================================================`);
        });
    } catch (err) {
        console.error("Failed to start backend server:", err);
        process.exit(1);
    }
}

start();
