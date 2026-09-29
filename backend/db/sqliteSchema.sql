-- SQLite Schema for Smart Campus Resource Management (IRA)
-- Zero-config local execution with strict triggers and atomic validation

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    building TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    department_id TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    building TEXT NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    operating_start TEXT NOT NULL DEFAULT '08:00',
    operating_end TEXT NOT NULL DEFAULT '20:00',
    department_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'FUNCTIONAL'
);

CREATE TABLE IF NOT EXISTS facility_equipment (
    facility_id TEXT NOT NULL,
    equipment_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'OPERATIONAL',
    PRIMARY KEY(facility_id, equipment_id),
    FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    FOREIGN KEY(equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    purpose TEXT,
    expected_attendees INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CONFIRMED',
    priority INTEGER NOT NULL DEFAULT 3,
    approved_by TEXT,
    allocated_by_engine INTEGER DEFAULT 0,
    match_score REAL,
    match_reasons TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bkg_facility_time ON bookings (facility_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bkg_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bkg_user ON bookings (user_id);

-- Database level double-booking prevention trigger in SQLite
CREATE TRIGGER IF NOT EXISTS trg_prevent_double_booking
BEFORE INSERT ON bookings
WHEN NEW.status IN ('APPROVED', 'CONFIRMED')
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM bookings
            WHERE facility_id = NEW.facility_id
              AND status IN ('APPROVED', 'CONFIRMED')
              AND datetime(start_time) < datetime(NEW.end_time)
              AND datetime(end_time) > datetime(NEW.start_time)
        )
        THEN RAISE(ABORT, 'DATABASE_CONSTRAINT_VIOLATION: Facility double-booking conflict detected! Room already reserved.')
    END;
END;

CREATE TABLE IF NOT EXISTS timetable_slots (
    id TEXT PRIMARY KEY,
    section_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    faculty_id TEXT,
    facility_id TEXT,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    semester_phase TEXT DEFAULT 'regular',
    FOREIGN KEY(faculty_id) REFERENCES users(id),
    FOREIGN KEY(facility_id) REFERENCES facilities(id)
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
    id TEXT PRIMARY KEY,
    facility_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    reported_by TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'IN_PROGRESS',
    cascade_reallocated_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS allocation_rules (
    key TEXT PRIMARY KEY,
    weight REAL NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1
);
