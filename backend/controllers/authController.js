const db = require('../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const user = await db.getOne(
            "SELECT u.*, d.name as dept_name, d.code as dept_code FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.email = ?",
            [email]
        );

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role, department_id: user.department_id },
            config.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.dept_name,
                deptCode: user.dept_code,
                phone: user.phone
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

async function getDemoUsers(req, res) {
    try {
        const users = (await db.query(
            "SELECT u.id, u.name, u.email, u.role, d.name as dept_name FROM users u LEFT JOIN departments d ON u.department_id = d.id ORDER BY u.role"
        )).rows;

        // Default passwords for demo
        const demoAccounts = users.map(u => {
            let pass = 'student123';
            if (u.role === 'ADMIN') pass = 'admin123';
            else if (u.role === 'FACULTY') pass = 'faculty123';
            else if (u.role === 'COORDINATOR') pass = 'coord123';
            else if (u.role === 'FACILITY_MANAGER') pass = 'manager123';
            else if (u.role === 'CLUB_ORGANIZER') pass = 'club123';
            return {
                ...u,
                demoPassword: pass
            };
        });

        return res.json({ demoAccounts });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function getCurrentUser(req, res) {
    try {
        const user = await db.getOne(
            "SELECT u.id, u.name, u.email, u.role, d.name as dept_name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = ?",
            [req.user.id]
        );
        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json({ user });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

module.exports = {
    login,
    getDemoUsers,
    getCurrentUser
};
