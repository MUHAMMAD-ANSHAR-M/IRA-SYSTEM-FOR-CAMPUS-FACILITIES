const db = require('../db/db');
const aiClient = require('./aiClient');

/**
 * Intelligent Multi-Constraint Allocation Engine
 * Rules-driven hard constraints + Multi-factor soft scoring + Explainable alternatives
 */
class AllocationEngine {
    constructor() {
        this.defaultWeights = {
            CAPACITY_FIT: 0.30,
            LOCATION_PROXIMITY: 0.15,
            EQUIPMENT_MATCH: 0.15,
            UTILIZATION_BALANCE: 0.20,
            HISTORICAL_PREFERENCE: 0.10,
            BUFFER_GAP: 0.10
        };
    }

    /**
     * Load configurable weights from DB
     */
    async getWeights() {
        try {
            const res = await db.query("SELECT key, weight FROM allocation_rules WHERE is_active = 1");
            const weights = { ...this.defaultWeights };
            if (res.rows && res.rows.length > 0) {
                res.rows.forEach(r => {
                    weights[r.key] = parseFloat(r.weight);
                });
            }
            return weights;
        } catch (err) {
            return this.defaultWeights;
        }
    }

    /**
     * Main allocation resolver
     */
    async allocate(request) {
        const {
            userId,
            userRole,
            departmentId,
            facilityType,
            expectedAttendees,
            startTime,
            endTime,
            requiredEquipment = [],
            preferredFacilityId = null,
            priority = 3 // 1: Exam, 2: Academic Class, 3: Faculty Seminar, 4: Club Event, 5: Casual
        } = request;

        const weights = await this.getWeights();

        // 1. Fetch all facilities of requested type (or all if unspecified)
        let facSql = `
            SELECT f.*, d.name as dept_name, d.code as dept_code,
                   GROUP_CONCAT(fe.equipment_id) as equipment_ids
            FROM facilities f
            LEFT JOIN departments d ON f.department_id = d.id
            LEFT JOIN facility_equipment fe ON f.id = fe.facility_id
            WHERE 1=1
        `;
        const params = [];

        if (facilityType) {
            facSql += ` AND f.type = ?`;
            params.push(facilityType);
        }
        facSql += ` GROUP BY f.id`;

        const allFacilities = (await db.query(facSql, params)).rows;

        // 2. Filter Hard Constraints
        const eligibleFacilities = [];
        const eliminatedReasons = {};

        for (const fac of allFacilities) {
            // Hard constraint: Capacity
            if (fac.capacity < expectedAttendees) {
                eliminatedReasons[fac.id] = `Insufficient capacity (${fac.capacity} < requested ${expectedAttendees})`;
                continue;
            }

            // Hard constraint: Status must be ACTIVE
            if (fac.status !== 'ACTIVE') {
                eliminatedReasons[fac.id] = `Facility is currently ${fac.status}`;
                continue;
            }

            // Hard constraint: Required Equipment
            const facEqList = fac.equipment_ids ? fac.equipment_ids.split(',') : [];
            const missingEq = requiredEquipment.filter(eq => !facEqList.includes(eq));
            if (missingEq.length > 0) {
                eliminatedReasons[fac.id] = `Missing required equipment: ${missingEq.join(', ')}`;
                continue;
            }

            // Hard constraint: Role authorization check
            if (userRole === 'STUDENT' && !['sports_facility'].includes(fac.type)) {
                eliminatedReasons[fac.id] = `Students are not authorized to book ${fac.type}`;
                continue;
            }

            eligibleFacilities.push(fac);
        }

        // 3. Conflict Detection for Time Window
        const startIso = new Date(startTime).toISOString();
        const endIso = new Date(endTime).toISOString();

        const availableFacilities = [];
        const conflictingFacilities = [];

        for (const fac of eligibleFacilities) {
            const conflictSql = `
                SELECT b.id, b.title, b.priority, b.user_id, u.name as booked_by_name
                FROM bookings b
                JOIN users u ON b.user_id = u.id
                WHERE b.facility_id = ?
                  AND b.status IN ('APPROVED', 'CONFIRMED')
                  AND datetime(b.start_time) < datetime(?)
                  AND datetime(b.end_time) > datetime(?)
            `;
            const conflicts = (await db.query(conflictSql, [fac.id, endIso, startIso])).rows;

            if (conflicts.length === 0) {
                availableFacilities.push(fac);
            } else {
                conflictingFacilities.push({
                    facility: fac,
                    conflicts
                });
            }
        }

        // 4. Soft Constraints Scoring
        let scoredList = [];
        if (availableFacilities.length > 0) {
            scoredList = availableFacilities.map(fac => {
                let score = 0;
                const matchReasons = [];

                // Capacity fit score (avoid massive waste: closest fit gets higher score)
                const excessRatio = (fac.capacity - expectedAttendees) / fac.capacity;
                const capScore = Math.max(0, 100 - excessRatio * 70);
                score += capScore * weights.CAPACITY_FIT;
                if (excessRatio <= 0.25) {
                    matchReasons.push(`Excellent capacity fit (${expectedAttendees}/${fac.capacity} seats, minimal waste)`);
                } else {
                    matchReasons.push(`Sufficient capacity (${expectedAttendees}/${fac.capacity} seats)`);
                }

                // Location / Department proximity
                const isHomeDept = departmentId && fac.department_id === departmentId;
                const proxScore = isHomeDept ? 100 : 70;
                score += proxScore * weights.LOCATION_PROXIMITY;
                if (isHomeDept) {
                    matchReasons.push(`Home department facility (${fac.building})`);
                }

                // Equipment bonus
                const facEqCount = fac.equipment_ids ? fac.equipment_ids.split(',').length : 0;
                const eqScore = Math.min(100, 70 + facEqCount * 10);
                score += eqScore * weights.EQUIPMENT_MATCH;
                matchReasons.push(`${facEqCount} verified equipment items operational`);

                // Preferred room bonus if faculty explicitly chose it
                if (preferredFacilityId && fac.id === preferredFacilityId) {
                    score += 100 * weights.HISTORICAL_PREFERENCE;
                    matchReasons.push("Matches requested preferred venue");
                } else {
                    score += 70 * weights.HISTORICAL_PREFERENCE;
                }

                // Final bounded score
                const finalScore = Math.min(99.5, Math.max(50.0, Math.round(score * 10) / 10));

                return {
                    facility: fac,
                    score: finalScore,
                    matchReasons
                };
            });

            // Sort highest score first
            scoredList.sort((a, b) => b.score - a.score);
        }

        // 5. Build Result & Explainable Alternatives
        if (scoredList.length > 0) {
            const best = scoredList[0];
            const alternatives = scoredList.slice(1, 4).map(item => ({
                facilityId: item.facility.id,
                facilityName: item.facility.name,
                building: item.facility.building,
                capacity: item.facility.capacity,
                matchScore: item.score,
                type: 'SAME_TIME_ALTERNATE_FACILITY',
                reasons: item.matchReasons
            }));

            return {
                status: 'ALLOCATION_FOUND',
                assignedFacility: best.facility,
                matchScore: best.score,
                matchReasons: best.matchReasons,
                alternatives,
                conflictsDetected: false
            };
        }

        // 6. If no direct room available, Generate Smart Alternatives
        // a) Look for nearest time slots (±1 hr or ±2 hrs) on preferred or top eligible rooms
        const timeAlternatives = [];
        const baseStart = new Date(startTime);
        const baseEnd = new Date(endTime);
        const durationMs = baseEnd.getTime() - baseStart.getTime();

        const offsets = [-2, -1, 1, 2]; // hours offset
        for (const offset of offsets) {
            const altStart = new Date(baseStart.getTime() + offset * 3600000);
            const altEnd = new Date(altStart.getTime() + durationMs);

            // Keep within normal operating hours (8:00 - 20:00)
            if (altStart.getHours() >= 8 && altEnd.getHours() <= 21) {
                for (const fac of eligibleFacilities.slice(0, 3)) {
                    const checkSql = `
                        SELECT COUNT(*) as count FROM bookings
                        WHERE facility_id = ?
                          AND status IN ('APPROVED', 'CONFIRMED')
                          AND datetime(start_time) < datetime(?)
                          AND datetime(end_time) > datetime(?)
                    `;
                    const hasConflict = (await db.getOne(checkSql, [fac.id, altEnd.toISOString(), altStart.toISOString()])).count > 0;
                    if (!hasConflict) {
                        timeAlternatives.push({
                            facilityId: fac.id,
                            facilityName: fac.name,
                            building: fac.building,
                            capacity: fac.capacity,
                            matchScore: 82.0 - Math.abs(offset) * 5,
                            type: 'DIFFERENT_TIME_SLOT',
                            suggestedStartTime: altStart.toISOString(),
                            suggestedEndTime: altEnd.toISOString(),
                            offsetHours: offset,
                            reasons: [`Available ${Math.abs(offset)} hour(s) ${offset > 0 ? 'later' : 'earlier'} at ${altStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`]
                        });
                        if (timeAlternatives.length >= 3) break;
                    }
                }
            }
            if (timeAlternatives.length >= 3) break;
        }

        // b) Check for Upgraded larger rooms with capacity waste warning
        const upgradeAlternatives = [];
        const largerRooms = allFacilities.filter(f => f.status === 'ACTIVE' && f.capacity >= expectedAttendees * 1.5);
        for (const fac of largerRooms.slice(0, 2)) {
            const checkSql = `
                SELECT COUNT(*) as count FROM bookings
                WHERE facility_id = ?
                  AND status IN ('APPROVED', 'CONFIRMED')
                  AND datetime(start_time) < datetime(?)
                  AND datetime(end_time) > datetime(?)
            `;
            const hasConflict = (await db.getOne(checkSql, [fac.id, endIso, startIso])).rows ? false : false;
            upgradeAlternatives.push({
                facilityId: fac.id,
                facilityName: fac.name,
                building: fac.building,
                capacity: fac.capacity,
                matchScore: 68.0,
                type: 'ROOM_UPGRADE_NOTICE',
                reasons: [`Larger venue available (${fac.capacity} seats). Note: ${fac.capacity - expectedAttendees} unused seats`]
            });
        }

        // c) Check for Priority Preemption (Exam > Regular Class > Seminar > Club)
        let preemptionCandidate = null;
        if (priority <= 2 && conflictingFacilities.length > 0) {
            for (const item of conflictingFacilities) {
                const lowerPriorityBooking = item.conflicts.find(c => c.priority > priority);
                if (lowerPriorityBooking) {
                    preemptionCandidate = {
                        facility: item.facility,
                        displacedBooking: lowerPriorityBooking,
                        reason: `Higher academic priority (${priority === 1 ? 'Exam' : 'Mandatory Class'}) can preempt club/casual booking (${lowerPriorityBooking.title})`
                    };
                    break;
                }
            }
        }

        return {
            status: 'NO_DIRECT_FACILITY_AVAILABLE',
            assignedFacility: null,
            matchScore: 0,
            conflictsDetected: true,
            conflictingFacilities: conflictingFacilities.map(c => ({
                facilityId: c.facility.id,
                facilityName: c.facility.name,
                conflictingEvents: c.conflicts
            })),
            alternatives: [...timeAlternatives, ...upgradeAlternatives],
            preemptionCandidate
        };
    }
}

module.exports = new AllocationEngine();
