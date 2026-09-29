const db = require('../db/db');
const allocationEngine = require('./allocationEngine');
const socketService = require('./socketService');
const { v4: uuidv4 } = require('uuid');

class MaintenanceCascadeService {
    /**
     * Triggered when facility manager marks a room as MAINTENANCE or BLOCKED
     */
    async setFacilityMaintenance(facilityId, reason, startTime, endTime, reportedBy = 'usr-manager') {
        const fac = await db.getOne("SELECT * FROM facilities WHERE id = ?", [facilityId]);
        if (!fac) {
            throw new Error(`Facility ${facilityId} not found`);
        }

        // 1. Update facility status
        await db.query("UPDATE facilities SET status = 'MAINTENANCE' WHERE id = ?", [facilityId]);

        // 2. Insert maintenance log
        const logId = `maint-${Date.now()}`;
        await db.query(
            "INSERT INTO maintenance_logs (id, facility_id, reason, reported_by, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS')",
            [logId, facilityId, reason, reportedBy, startTime, endTime]
        );

        // 3. Find all future APPROVED/CONFIRMED bookings during this maintenance window
        const affectedBookingsSql = `
            SELECT b.*, u.name as user_name, u.email as user_email
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.facility_id = ?
              AND b.status IN ('APPROVED', 'CONFIRMED')
              AND datetime(b.start_time) < datetime(?)
              AND datetime(b.end_time) > datetime(?)
        `;
        const affectedBookings = (await db.query(affectedBookingsSql, [facilityId, endTime, startTime])).rows;

        const reallocatedList = [];
        const unassignedList = [];

        // 4. Cascade re-allocation for each affected booking
        for (const booking of affectedBookings) {
            // Run allocation engine for equivalent room
            const allocResult = await allocationEngine.allocate({
                userId: booking.user_id,
                userRole: 'FACULTY',
                departmentId: null,
                facilityType: fac.type,
                expectedAttendees: booking.expected_attendees,
                startTime: booking.start_time,
                endTime: booking.end_time,
                preferredFacilityId: null,
                priority: booking.priority
            });

            if (allocResult.status === 'ALLOCATION_FOUND' && allocResult.assignedFacility) {
                const newFac = allocResult.assignedFacility;
                // Update booking with new room
                await db.query(
                    `UPDATE bookings 
                     SET facility_id = ?, match_score = ?, match_reasons = ?, status = 'RESCHEDULED'
                     WHERE id = ?`,
                    [newFac.id, allocResult.matchScore, JSON.stringify([...allocResult.matchReasons, `Cascade re-allocated due to maintenance in ${fac.name}`]), booking.id]
                );

                // Create in-app notification for the user
                const notifId = `notif-${uuidv4()}`;
                const msg = `VENUE RELOCATION NOTICE: Your session '${booking.title}' has been automatically relocated from '${fac.name}' to '${newFac.name}' (${newFac.building}, Floor ${newFac.floor}) due to emergency facility maintenance (${reason}).`;
                await db.query(
                    "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'REALLOCATION')",
                    [notifId, booking.user_id, 'Venue Auto-Reallocated', msg]
                );

                reallocatedList.push({
                    bookingId: booking.id,
                    title: booking.title,
                    previousFacility: fac.name,
                    newFacility: newFac.name,
                    time: `${booking.start_time} - ${booking.end_time}`,
                    matchScore: allocResult.matchScore
                });
            } else {
                // No equivalent room was available
                await db.query("UPDATE bookings SET status = 'PENDING' WHERE id = ?", [booking.id]);
                const notifId = `notif-${uuidv4()}`;
                const msg = `URGENT VENUE ALERT: Your booking '${booking.title}' at '${fac.name}' has been temporarily moved to PENDING because no immediate identical room was free during maintenance. Please review suggested alternative time slots.`;
                await db.query(
                    "INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, 'CONFLICT')",
                    [notifId, booking.user_id, 'Emergency Maintenance Conflict', msg]
                );

                unassignedList.push({
                    bookingId: booking.id,
                    title: booking.title,
                    previousFacility: fac.name,
                    alternatives: allocResult.alternatives || []
                });
            }
        }

        // Update cascade count in maintenance log
        await db.query(
            "UPDATE maintenance_logs SET cascade_reallocated_count = ? WHERE id = ?",
            [reallocatedList.length, logId]
        );

        // 5. Broadcast real-time WebSocket events to update all dashboards
        socketService.broadcast('facility:statusChanged', {
            facilityId,
            facilityName: fac.name,
            newStatus: 'MAINTENANCE',
            reason
        });

        socketService.broadcast('maintenance:cascade', {
            facilityId,
            facilityName: fac.name,
            reason,
            reallocatedBookings: reallocatedList,
            unassignedBookings: unassignedList
        });

        return {
            success: true,
            facility: fac.name,
            status: 'MAINTENANCE',
            affectedCount: affectedBookings.length,
            autoReallocatedCount: reallocatedList.length,
            unassignedCount: unassignedList.length,
            reallocations: reallocatedList,
            unassigned: unassignedList
        };
    }

    /**
     * Restore facility back to ACTIVE status
     */
    async restoreFacility(facilityId) {
        const fac = await db.getOne("SELECT * FROM facilities WHERE id = ?", [facilityId]);
        if (!fac) throw new Error("Facility not found");

        await db.query("UPDATE facilities SET status = 'ACTIVE' WHERE id = ?", [facilityId]);
        await db.query(
            "UPDATE maintenance_logs SET status = 'COMPLETED' WHERE facility_id = ? AND status = 'IN_PROGRESS'",
            [facilityId]
        );

        socketService.broadcast('facility:statusChanged', {
            facilityId,
            facilityName: fac.name,
            newStatus: 'ACTIVE'
        });

        return { success: true, facility: fac.name, status: 'ACTIVE' };
    }
}

module.exports = new MaintenanceCascadeService();
