const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

async function initAndSeed() {
    console.log('[Seed] Checking database initialization status...');
    
    // Check if users table exists
    try {
        const testUser = await db.getOne("SELECT COUNT(*) as count FROM users");
        if (testUser && testUser.count > 0) {
            console.log(`[Seed] Database already initialized with ${testUser.count} users. Skipping seed.`);
            return;
        }
    } catch (err) {
        console.log('[Seed] Schema not detected, running DDL schema creation...');
        const schemaPath = db.pgPool ? path.join(__dirname, 'schema.sql') : path.join(__dirname, 'sqliteSchema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute statements
        if (db.sqliteDb) {
            db.sqliteDb.exec(schemaSql);
        } else {
            await db.query(schemaSql);
        }
        console.log('[Seed] Schema applied successfully.');
    }

    console.log('[Seed] Populating realistic campus seed data...');

    // 1. Departments
    const depts = [
        { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE', building: 'Turing Block' },
        { id: 'dept-ece', name: 'Electronics & Communication', code: 'ECE', building: 'Tesla Block' },
        { id: 'dept-mech', name: 'Mechanical Engineering', code: 'MECH', building: 'Newton Block' },
        { id: 'dept-civil', name: 'Civil Engineering', code: 'CIVIL', building: 'Visvesvaraya Block' },
        { id: 'dept-mgmt', name: 'Management & Humanities', code: 'MGMT', building: 'Chanakya Block' },
        { id: 'dept-sports', name: 'Physical Education & Sports', code: 'SPORTS', building: 'Sports Pavilion' },
        { id: 'dept-affairs', name: 'Dean Student Affairs & Clubs', code: 'DSA', building: 'Student Activity Center' }
    ];

    for (const d of depts) {
        await db.query(
            "INSERT OR IGNORE INTO departments (id, name, code, building) VALUES (?, ?, ?, ?)",
            [d.id, d.name, d.code, d.building]
        );
    }

    // 2. Demo Users for all 6 Roles
    const salt = await bcrypt.genSalt(10);
    const passAdmin = await bcrypt.hash('admin123', salt);
    const passFaculty = await bcrypt.hash('faculty123', salt);
    const passCoord = await bcrypt.hash('coord123', salt);
    const passManager = await bcrypt.hash('manager123', salt);
    const passClub = await bcrypt.hash('club123', salt);
    const passStudent = await bcrypt.hash('student123', salt);

    const users = [
        { id: 'usr-admin', name: 'Dr. Sarah Jenkins (Super Admin)', email: 'admin@campus.edu', pass: passAdmin, role: 'ADMIN', dept: null, phone: '+1-555-0100' },
        { id: 'usr-faculty-cs', name: 'Prof. Alan Turing', email: 'faculty.cs@campus.edu', pass: passFaculty, role: 'FACULTY', dept: 'dept-cse', phone: '+1-555-0101' },
        { id: 'usr-faculty-ece', name: 'Prof. Claude Shannon', email: 'faculty.ece@campus.edu', pass: passFaculty, role: 'FACULTY', dept: 'dept-ece', phone: '+1-555-0102' },
        { id: 'usr-coord-cse', name: 'Dr. Grace Hopper (HOD CSE)', email: 'hod.cse@campus.edu', pass: passCoord, role: 'COORDINATOR', dept: 'dept-cse', phone: '+1-555-0103' },
        { id: 'usr-manager', name: 'Robert Vance (Facility Manager)', email: 'manager.facilities@campus.edu', pass: passManager, role: 'FACILITY_MANAGER', dept: null, phone: '+1-555-0104' },
        { id: 'usr-club-rep', name: 'Alex Rivera (Coding Club Lead)', email: 'coding.club@campus.edu', pass: passClub, role: 'CLUB_ORGANIZER', dept: 'dept-affairs', phone: '+1-555-0105' },
        { id: 'usr-student', name: 'Maya Lin (Student Representative)', email: 'student.alex@campus.edu', pass: passStudent, role: 'STUDENT', dept: 'dept-cse', phone: '+1-555-0106' }
    ];

    for (const u of users) {
        await db.query(
            "INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department_id, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [u.id, u.name, u.email, u.pass, u.role, u.dept, u.phone]
        );
    }

    // 3. Equipment
    const eqList = [
        { id: 'eq-proj-4k', name: '4K Laser Projector', category: 'Display' },
        { id: 'eq-audio-jbl', name: 'JBL Podium & Wireless Mics', category: 'Audio' },
        { id: 'eq-pcs-60', name: '60x High-Performance Workstations', category: 'Computing' },
        { id: 'eq-smartboard', name: 'Interactive Smart Board 85"', category: 'Display' },
        { id: 'eq-central-ac', name: 'Central HVAC / Air Conditioning', category: 'Climate' },
        { id: 'eq-iot-kits', name: 'Embedded IoT & Robotics Kits', category: 'Laboratory' },
        { id: 'eq-chem-safety', name: 'Fume Hoods & Safety Eye Wash', category: 'Safety' },
        { id: 'eq-stadium-lights', name: 'Floodlights (Night Play)', category: 'Lighting' }
    ];

    for (const eq of eqList) {
        await db.query(
            "INSERT OR IGNORE INTO equipment (id, name, category) VALUES (?, ?, ?)",
            [eq.id, eq.name, eq.category]
        );
    }

    // 4. Facilities (24+ diverse resources)
    const facilities = [
        // Classrooms
        { id: 'fac-cr-101', name: 'Lecture Hall 101', code: 'LH-101', type: 'classroom', building: 'Turing Block', floor: 1, capacity: 60, status: 'ACTIVE', eq: ['eq-proj-4k', 'eq-central-ac'] },
        { id: 'fac-cr-102', name: 'Lecture Hall 102', code: 'LH-102', type: 'classroom', building: 'Turing Block', floor: 1, capacity: 60, status: 'ACTIVE', eq: ['eq-proj-4k'] },
        { id: 'fac-cr-103', name: 'Auditorium Classroom 103', code: 'AC-103', type: 'classroom', building: 'Turing Block', floor: 1, capacity: 85, status: 'ACTIVE', eq: ['eq-proj-4k', 'eq-audio-jbl', 'eq-central-ac'] },
        { id: 'fac-cr-201', name: 'Classroom 201', code: 'CR-201', type: 'classroom', building: 'Tesla Block', floor: 2, capacity: 45, status: 'ACTIVE', eq: ['eq-smartboard', 'eq-central-ac'] },
        { id: 'fac-cr-202', name: 'Classroom 202', code: 'CR-202', type: 'classroom', building: 'Tesla Block', floor: 2, capacity: 45, status: 'ACTIVE', eq: ['eq-smartboard'] },
        { id: 'fac-cr-301', name: 'Gallery Hall 301', code: 'GH-301', type: 'classroom', building: 'Newton Block', floor: 3, capacity: 110, status: 'ACTIVE', eq: ['eq-proj-4k', 'eq-audio-jbl', 'eq-central-ac'] },

        // Computer Labs
        { id: 'fac-lab-1', name: 'Computer Lab 1 (AI & ML)', code: 'LAB-1', type: 'computer_lab', building: 'Turing Block', floor: 2, capacity: 40, status: 'ACTIVE', eq: ['eq-pcs-60', 'eq-proj-4k', 'eq-central-ac'] },
        { id: 'fac-lab-2', name: 'Computer Lab 2 (Software Eng)', code: 'LAB-2', type: 'computer_lab', building: 'Turing Block', floor: 2, capacity: 50, status: 'ACTIVE', eq: ['eq-pcs-60', 'eq-proj-4k', 'eq-central-ac'] },
        { id: 'fac-lab-3', name: 'Computer Lab 3 (Advanced Systems)', code: 'LAB-3', type: 'computer_lab', building: 'Turing Block', floor: 3, capacity: 60, status: 'ACTIVE', eq: ['eq-pcs-60', 'eq-proj-4k', 'eq-smartboard', 'eq-central-ac'] },
        { id: 'fac-lab-4', name: 'Computer Lab 4 (Cloud Lab)', code: 'LAB-4', type: 'computer_lab', building: 'Turing Block', floor: 3, capacity: 55, status: 'ACTIVE', eq: ['eq-pcs-60', 'eq-proj-4k', 'eq-central-ac'] },
        { id: 'fac-lab-5', name: 'Embedded Systems Lab', code: 'LAB-5', type: 'computer_lab', building: 'Tesla Block', floor: 1, capacity: 35, status: 'ACTIVE', eq: ['eq-iot-kits', 'eq-proj-4k'] },

        // Seminar Halls
        { id: 'fac-hall-a', name: 'Dr. APJ Abdul Kalam Seminar Hall A', code: 'HALL-A', type: 'seminar_hall', building: 'Central Academic Block', floor: 1, capacity: 180, status: 'ACTIVE', eq: ['eq-proj-4k', 'eq-audio-jbl', 'eq-central-ac'] },
        { id: 'fac-hall-b', name: 'Sir CV Raman Seminar Hall B', code: 'HALL-B', type: 'seminar_hall', building: 'Central Academic Block', floor: 2, capacity: 220, status: 'ACTIVE', eq: ['eq-proj-4k', 'eq-audio-jbl', 'eq-central-ac'] },
        { id: 'fac-hall-c', name: 'Aryabhata Seminar Hall C', code: 'HALL-C', type: 'seminar_hall', building: 'Chanakya Block', floor: 2, capacity: 120, status: 'ACTIVE', eq: ['eq-proj-4k', 'eq-audio-jbl'] },

        // Auditoriums
        { id: 'fac-audi-main', name: 'Main Campus Grand Auditorium', code: 'AUDI-MAIN', type: 'auditorium', building: 'University Convention Center', floor: 1, capacity: 850, status: 'ACTIVE', eq: ['eq-proj-4k', 'eq-audio-jbl', 'eq-central-ac', 'eq-stadium-lights'] },
        { id: 'fac-audi-mini', name: 'Mini Convention Auditorium', code: 'AUDI-MINI', type: 'auditorium', building: 'Student Activity Center', floor: 1, capacity: 350, status: 'ACTIVE', eq: ['eq-proj-4k', 'eq-audio-jbl', 'eq-central-ac'] },

        // Sports Facilities
        { id: 'fac-sports-indoor', name: 'Multi-purpose Indoor Sports Arena', code: 'SPT-INDOOR', type: 'sports_facility', building: 'Sports Complex', floor: 1, capacity: 250, status: 'ACTIVE', eq: ['eq-stadium-lights', 'eq-audio-jbl'] },
        { id: 'fac-sports-ground', name: 'Main Athletics & Football Ground', code: 'SPT-GROUND', type: 'sports_facility', building: 'Sports Pavilion', floor: 1, capacity: 600, status: 'ACTIVE', eq: ['eq-stadium-lights'] },
        { id: 'fac-sports-basket', name: 'Championship Basketball Arena', code: 'SPT-BASKET', type: 'sports_facility', building: 'Sports Pavilion', floor: 1, capacity: 120, status: 'ACTIVE', eq: ['eq-stadium-lights'] }
    ];

    for (const f of facilities) {
        await db.query(
            "INSERT OR IGNORE INTO facilities (id, name, code, type, building, floor, capacity, status, operating_start, operating_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '08:00', '21:00')",
            [f.id, f.name, f.code, f.type, f.building, f.floor, f.capacity, f.status]
        );

        if (f.eq) {
            for (const eqId of f.eq) {
                await db.query(
                    "INSERT OR IGNORE INTO facility_equipment (facility_id, equipment_id, quantity, status) VALUES (?, ?, 1, 'OPERATIONAL')",
                    [f.id, eqId]
                );
            }
        }
    }

    // 5. Configurable Allocation Rules
    const rules = [
        { key: 'CAPACITY_FIT', weight: 0.30, desc: 'Prefers closest capacity match, penalizes oversized empty rooms' },
        { key: 'EQUIPMENT_MATCH', weight: 0.15, desc: 'Bonus for extra requested equipment presence' },
        { key: 'UTILIZATION_BALANCE', weight: 0.20, desc: 'Spreads load to avoid bottlenecking popular halls' },
        { key: 'LOCATION_PROXIMITY', weight: 0.15, desc: 'Prefers department home building or previous class zone' },
        { key: 'HISTORICAL_PREFERENCE', weight: 0.10, desc: 'Considers faculty repeat classroom comfort' },
        { key: 'BUFFER_GAP', weight: 0.10, desc: 'Leaves 10 min transition margin between back-to-back sessions' }
    ];

    for (const r of rules) {
        await db.query(
            "INSERT OR IGNORE INTO allocation_rules (key, weight, description, is_active) VALUES (?, ?, ?, TRUE)",
            [r.key, r.weight, r.desc]
        );
    }

    // 6. Seed Realistic Bookings (Current day & upcoming)
    const today = new Date();
    const isoDate = (d, hour) => {
        const dt = new Date(d);
        dt.setHours(hour, 0, 0, 0);
        return dt.toISOString();
    };

    const seedBookings = [
        {
            id: 'bkg-001',
            facility_id: 'fac-hall-a',
            user_id: 'usr-coord-cse',
            title: 'AI & Data Science Annual Faculty Symposium',
            purpose: 'Keynote sessions and department research presentation',
            expected_attendees: 160,
            start_time: isoDate(today, 10),
            end_time: isoDate(today, 12),
            status: 'CONFIRMED',
            priority: 2,
            score: 95.5
        },
        {
            id: 'bkg-002',
            facility_id: 'fac-audi-main',
            user_id: 'usr-club-rep',
            title: 'Hackathon 2026 Grand Orientation & Team Formation',
            purpose: 'Campus-wide hackathon kickoff and mentor meet',
            expected_attendees: 420,
            start_time: isoDate(today, 14),
            end_time: isoDate(today, 17),
            status: 'CONFIRMED',
            priority: 4,
            score: 91.0
        },
        {
            id: 'bkg-003',
            facility_id: 'fac-sports-ground',
            user_id: 'usr-faculty-cs',
            title: 'Inter-Department Football Tournament Practice',
            purpose: 'CSE vs ECE sports league qualifiers',
            expected_attendees: 80,
            start_time: isoDate(today, 16),
            end_time: isoDate(today, 18),
            status: 'CONFIRMED',
            priority: 4,
            score: 88.0
        },
        {
            id: 'bkg-004',
            facility_id: 'fac-lab-3',
            user_id: 'usr-faculty-cs',
            title: 'Operating Systems & Concurrency Lab',
            purpose: 'Hands-on practical session on POSIX threads & locks',
            expected_attendees: 55,
            start_time: isoDate(today, 10),
            end_time: isoDate(today, 12),
            status: 'CONFIRMED',
            priority: 2,
            score: 98.2
        },
        {
            id: 'bkg-005',
            facility_id: 'fac-cr-101',
            user_id: 'usr-faculty-ece',
            title: 'Digital Signal Processing (ECE-301)',
            purpose: 'Regular theoretical lecture',
            expected_attendees: 52,
            start_time: isoDate(today, 9),
            end_time: isoDate(today, 11),
            status: 'CONFIRMED',
            priority: 2,
            score: 94.0
        }
    ];

    for (const b of seedBookings) {
        await db.query(
            `INSERT OR IGNORE INTO bookings 
             (id, facility_id, user_id, title, purpose, expected_attendees, start_time, end_time, status, priority, allocated_by_engine, match_score, match_reasons)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
            [b.id, b.facility_id, b.user_id, b.title, b.purpose, b.expected_attendees, b.start_time, b.end_time, b.status, b.priority, b.score, JSON.stringify(["Optimal capacity fit", "All required equipment verified", "Zero timetable clashes"])]
        );
    }

    console.log('[Seed] Database initialization complete! 6 Roles, 24+ Facilities, and Core Bookings ready.');
}

module.exports = { initAndSeed };
