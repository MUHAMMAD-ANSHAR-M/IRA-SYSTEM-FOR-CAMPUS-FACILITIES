let io = null;

function initSocket(server) {
    const { Server } = require('socket.io');
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Client connected: ${socket.id}`);

        socket.on('join:role', (role) => {
            socket.join(`role:${role}`);
            console.log(`[Socket.IO] ${socket.id} joined room role:${role}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    console.log('[Socket.IO] Real-time engine initialized.');
    return io;
}

function getIO() {
    return io;
}

function broadcast(event, data) {
    if (io) {
        io.emit(event, data);
    }
}

function emitToRole(role, event, data) {
    if (io) {
        io.to(`role:${role}`).emit(event, data);
    }
}

module.exports = {
    initSocket,
    getIO,
    broadcast,
    emitToRole
};
