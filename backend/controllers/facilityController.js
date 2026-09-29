const db = require('../db/db');
const maintenanceCascade = require('../services/maintenanceCascade');

async function getFacilities(req, res) {
    try {
        const { type, status, minCapacity, building } = req.query;

        let sql = `
            SELECT f.*, d.name as dept_name, d.code as dept_code,
                   GROUP_CONCAT(e.name) as equipment_names,
                   GROUP_CONCAT(e.id) as equipment_ids
            FROM facilities f
            LEFT JOIN departments d ON f.department_id = d.id
            LEFT JOIN facility_equipment fe ON f.id = fe.facility_id
            LEFT JOIN equipment e ON fe.equipment_id = e.id
            WHERE 1=1
        `;
        const params = [];

        if (type) {
            sql += ` AND f.type = ?`;
            params.push(type);
        }
        if (status) {
            sql += ` AND f.status = ?`;
            params.push(status);
        }
        if (minCapacity) {
            sql += ` AND f.capacity >= ?`;
            params.push(parseInt(minCapacity));
        }
        if (building) {
            sql += ` AND f.building LIKE ?`;
            params.push(`%${building}%`);
        }

        sql += ` GROUP BY f.id ORDER BY f.building, f.floor, f.name`;

        const facilities = (await db.query(sql, params)).rows;
        return res.json({ facilities });
    } catch (err) {
        console.error("getFacilities error:", err);
        return res.status(500).json({ error: err.message });
    }
}

async function getFacilityById(req, res) {
    const { id } = req.params;
    try {
        const fac = await db.getOne(
            `SELECT f.*, d.name as dept_name FROM facilities f LEFT JOIN departments d ON f.department_id = d.id WHERE f.id = ?`,
            [id]
        );
        if (!fac) return res.status(404).json({ error: "Facility not found" });

        // Get equipment
        const eq = (await db.query(
            `SELECT e.*, fe.quantity, fe.status as op_status 
             FROM facility_equipment fe JOIN equipment e ON fe.equipment_id = e.id 
             WHERE fe.facility_id = ?`,
            [id]
        )).rows;

        // Get upcoming bookings
        const bookings = (await db.query(
            `SELECT b.*, u.name as user_name 
             FROM bookings b JOIN users u ON b.user_id = u.id 
             WHERE b.facility_id = ? AND b.status IN ('APPROVED', 'CONFIRMED')
             ORDER BY b.start_time LIMIT 20`,
            [id]
        )).rows;

        return res.json({ facility: fac, equipment: eq, upcomingBookings: bookings });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function updateFacilityStatus(req, res) {
    const { id } = req.params;
    const { status, reason, startTime, endTime } = req.body;

    try {
        if (status === 'MAINTENANCE') {
            const start = startTime || new Date().toISOString();
            const end = endTime || new Date(Date.now() + 24 * 3600000).toISOString();
            const cascadeResult = await maintenanceCascade.setFacilityMaintenance(
                id,
                reason || 'Emergency Maintenance / Equipment Failure',
                start,
                end,
                req.user ? req.user.id : 'usr-manager'
            );
            return res.json({
                message: `Facility placed under MAINTENANCE. Cascade re-allocation executed.`,
                cascadeResult
            });
        } else if (status === 'ACTIVE') {
            const result = await maintenanceCascade.restoreFacility(id);
            return res.json({
                message: `Facility restored to ACTIVE status.`,
                result
            });
        } else {
            await db.query("UPDATE facilities SET status = ? WHERE id = ?", [status, id]);
            return res.json({ message: `Facility status updated to ${status}` });
        }
    } catch (err) {
        console.error("updateFacilityStatus error:", err);
        return res.status(500).json({ error: err.message });
    }
}

async function getEquipmentList(req, res) {
    try {
        const equipment = (await db.query("SELECT * FROM equipment ORDER BY category, name")).rows;
        return res.json({ equipment });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getFacilities,
    getFacilityById,
    updateFacilityStatus,
    getEquipmentList
};
