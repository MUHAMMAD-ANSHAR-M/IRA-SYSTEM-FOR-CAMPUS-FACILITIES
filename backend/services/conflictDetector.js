const db = require('../db/db');

class ConflictDetector {
    /**
     * Checks if a facility has any conflicting bookings in [startTime, endTime]
     */
    async checkFacilityConflict(facilityId, startTime, endTime, excludeBookingId = null) {
        const startIso = new Date(startTime).toISOString();
        const endIso = new Date(endTime).toISOString();

        let sql = `
            SELECT b.id, b.title, b.start_time, b.end_time, b.user_id, u.name as booked_by_name, f.name as facility_name
            FROM bookings b
            JOIN facilities f ON b.facility_id = f.id
            JOIN users u ON b.user_id = u.id
            WHERE b.facility_id = ?
              AND b.status IN ('APPROVED', 'CONFIRMED')
              AND datetime(b.start_time) < datetime(?)
              AND datetime(b.end_time) > datetime(?)
        `;
        const params = [facilityId, endIso, startIso];

        if (excludeBookingId) {
            sql += ` AND b.id != ?`;
            params.push(excludeBookingId);
        }

        const res = await db.query(sql, params);
        return {
            hasConflict: res.rows.length > 0,
            conflicts: res.rows
        };
    }

    /**
     * Checks if the faculty user already has an active class/session elsewhere at the same time
     */
    async checkFacultyConflict(userId, startTime, endTime, excludeBookingId = null) {
        const startIso = new Date(startTime).toISOString();
        const endIso = new Date(endTime).toISOString();

        let sql = `
            SELECT b.id, b.title, b.start_time, b.end_time, f.name as facility_name
            FROM bookings b
            JOIN facilities f ON b.facility_id = f.id
            WHERE b.user_id = ?
              AND b.status IN ('APPROVED', 'CONFIRMED')
              AND datetime(b.start_time) < datetime(?)
              AND datetime(b.end_time) > datetime(?)
        `;
        const params = [userId, endIso, startIso];

        if (excludeBookingId) {
            sql += ` AND b.id != ?`;
            params.push(excludeBookingId);
        }

        const res = await db.query(sql, params);
        return {
            hasConflict: res.rows.length > 0,
            conflicts: res.rows
        };
    }

    /**
     * Comprehensive multi-layer conflict check
     */
    async validateBookingRequest(facilityId, userId, startTime, endTime, excludeBookingId = null) {
        // 1. Facility status check (maintenance / blocked)
        const fac = await db.getOne("SELECT id, name, status, type, capacity FROM facilities WHERE id = ?", [facilityId]);
        if (!fac) {
            return { valid: false, reason: "FACILITY_NOT_FOUND", message: "Specified facility does not exist." };
        }
        if (fac.status !== 'ACTIVE') {
            return {
                valid: false,
                reason: "FACILITY_INACTIVE",
                message: `Facility '${fac.name}' is currently under ${fac.status}. Allocation blocked.`
            };
        }

        // 2. Room double-booking overlap
        const roomConflict = await this.checkFacilityConflict(facilityId, startTime, endTime, excludeBookingId);
        if (roomConflict.hasConflict) {
            const first = roomConflict.conflicts[0];
            return {
                valid: false,
                reason: "ROOM_DOUBLE_BOOKING",
                message: `Double-booking conflict: Room '${fac.name}' is already reserved for '${first.title}' by ${first.booked_by_name} (${new Date(first.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(first.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}).`,
                conflicts: roomConflict.conflicts
            };
        }

        // 3. Faculty personal schedule overlap
        const facultyConflict = await this.checkFacultyConflict(userId, startTime, endTime, excludeBookingId);
        if (facultyConflict.hasConflict) {
            const first = facultyConflict.conflicts[0];
            return {
                valid: false,
                reason: "FACULTY_SCHEDULE_CLASH",
                message: `Faculty schedule conflict: You are already assigned to '${first.title}' at '${first.facility_name}' during this slot.`,
                conflicts: facultyConflict.conflicts
            };
        }

        return { valid: true };
    }
}

module.exports = new ConflictDetector();
