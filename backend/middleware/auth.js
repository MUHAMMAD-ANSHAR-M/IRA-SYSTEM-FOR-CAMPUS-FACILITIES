const jwt = require('jsonwebtoken');
const config = require('../config/config');

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        // Support Demo Mode header for instant role switching without re-login during presentations
        const demoUserId = req.headers['x-demo-user-id'];
        if (demoUserId) {
            req.user = { id: demoUserId, role: req.headers['x-demo-user-role'] || 'FACULTY' };
            return next();
        }
        return res.status(401).json({ error: "Missing authorization token" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: "Invalid token format" });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Token expired or invalid" });
    }
}

module.exports = { authenticate };
