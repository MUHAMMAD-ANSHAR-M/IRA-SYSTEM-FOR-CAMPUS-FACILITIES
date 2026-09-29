function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: "Unauthorized. Authentication required." });
        }

        if (req.user.role === 'ADMIN') {
            // Admin has super-user bypass
            return next();
        }

        if (allowedRoles.includes(req.user.role)) {
            return next();
        }

        return res.status(403).json({
            error: "Forbidden. Insufficient permissions for this action.",
            userRole: req.user.role,
            requiredRoles: allowedRoles
        });
    };
}

module.exports = { requireRole };
