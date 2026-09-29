-- Smart Campus Resource Management System (IRA)
-- PostgreSQL Production Schema

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    building VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'FACULTY', 'COORDINATOR', 'FACILITY_MANAGER', 'CLUB_ORGANIZER', 'STUDENT')),
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Facilities
CREATE TABLE IF NOT EXISTS facilities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    type VARCHAR(40) NOT NULL CHECK (type IN ('classroom', 'computer_lab', 'seminar_hall', 'auditorium', 'sports_facility')),
    building VARCHAR(100) NOT NULL,
    floor INT NOT NULL DEFAULT 1,
    capacity INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'BLOCKED')),
    operating_start VARCHAR(10) NOT NULL DEFAULT '08:00',
    operating_end VARCHAR(10) NOT NULL DEFAULT '20:00',
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Equipment
CREATE TABLE IF NOT EXISTS equipment (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'FUNCTIONAL'
);

-- 5. Facility-Equipment Link
CREATE TABLE IF NOT EXISTS facility_equipment (
    facility_id VARCHAR(50) REFERENCES facilities(id) ON DELETE CASCADE,
    equipment_id VARCHAR(50) REFERENCES equipment(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'OPERATIONAL',
    PRIMARY KEY (facility_id, equipment_id)
);

-- 6. Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(50) PRIMARY KEY,
    facility_id VARCHAR(50) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    purpose TEXT,
    expected_attendees INT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'RESCHEDULED', 'PREEMPTED')),
    priority INT NOT NULL DEFAULT 3,
    approved_by VARCHAR(50) REFERENCES users(id),
    allocated_by_engine BOOLEAN DEFAULT FALSE,
    match_score NUMERIC(5,2),
    match_reasons JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_time_valid CHECK (end_time > start_time)
);

-- Indexes for range lookups
CREATE INDEX IF NOT EXISTS idx_bookings_facility_time ON bookings (facility_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);

-- Optional GiST Exclusion Constraint (applied if cloud environment allows btree_gist extension)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS btree_gist;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'prevent_double_booking'
    ) THEN
        ALTER TABLE bookings ADD CONSTRAINT prevent_double_booking EXCLUDE USING gist (
            facility_id WITH =,
            tsrange(start_time, end_time) WITH &&
        ) WHERE (status IN ('APPROVED', 'CONFIRMED'));
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Graceful fallback: application transaction-level locks enforce zero double-booking
        RAISE NOTICE 'Skipped GiST exclusion constraint (handled via application locking)';
END $$;

-- 7. Recurring Timetable Slots
CREATE TABLE IF NOT EXISTS timetable_slots (
    id VARCHAR(50) PRIMARY KEY,
    section_code VARCHAR(30) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    faculty_id VARCHAR(50) REFERENCES users(id),
    facility_id VARCHAR(50) REFERENCES facilities(id),
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    semester_phase VARCHAR(30) DEFAULT 'regular'
);

-- 8. Maintenance Logs & Outages
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id VARCHAR(50) PRIMARY KEY,
    facility_id VARCHAR(50) NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    reported_by VARCHAR(50) REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) DEFAULT 'IN_PROGRESS',
    cascade_reallocated_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(40) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Configurable Allocation Rules
CREATE TABLE IF NOT EXISTS allocation_rules (
    key VARCHAR(50) PRIMARY KEY,
    weight NUMERIC(4,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);
