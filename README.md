# IRA — Smart Campus Resource Management System
> **An intelligent constraint-satisfaction and predictive optimization engine for campus facilities.**
> Eliminates double-bookings, resolves resource contention, predicts demand bottlenecks, and automates maintenance cascade re-allocations.

---

## 1. System Overview & Problem Statement
Campus facilities (classrooms, computer labs, seminar halls, auditoriums, and sports grounds) suffer from double bookings, last-minute timetable clashes, and massive capacity wastage (e.g., 20 people occupying a 200-seat hall while larger groups are turned away).

**IRA's Design Principle:**
> *"Rules guarantee correctness; ML optimizes utilization and advises. ML never decides booking legality."*

### Key Features
1. **Three-Layer Conflict Prevention**:
   - **Application Layer**: In-memory temporal window overlap inspection.
   - **Concurrency Layer**: ACID serializable transaction locks.
   - **Database Layer**: PostgreSQL GiST Exclusion Constraints (`EXCLUDE USING gist (facility_id WITH =, tsrange(start_time, end_time) WITH &&)`) and SQLite strict conditional abort triggers.
2. **Deterministic Constraint-Satisfaction Allocation Engine**:
   - **Hard Constraints**: Type compatibility, capacity adequacy, active operational status, required equipment availability, operating hours, and role privileges.
   - **Soft Constraints Multi-Factor Scoring**: Capacity fit (30%), Utilization balance (20%), Department proximity (15%), Equipment bonus (15%), Historical preference (10%), Buffer gap (10%).
3. **Smart Alternatives Generator**:
   - Same-time alternative facilities (matching equipment and capacity).
   - Nearest alternative time slots (±1 to 2 hours).
   - Capacity upgrade notices (larger halls with waste warning).
4. **Maintenance Cascade Re-Allocation Engine (Workflow C)**:
   - When a room is placed under maintenance (e.g. Lab 2 projector fails), all future bookings are automatically detected, passed through the allocation engine, and re-assigned to equivalent facilities in real time.
5. **AI / ML Microservice (FastAPI + NumPy / Scikit-Learn / XGBoost)**:
   - **Demand Forecaster**: Predicts slot contention scores based on temporal, departmental, and semester patterns.
   - **Underutilization & Overdemand Detector**: K-Means clustering classifying rooms into *Underutilized* (<30%), *Balanced* (30-75%), and *Overdemanded* (>75%) with prescriptive rebalancing advice.
   - **No-Show Classifier**: Evaluates lead-time and past attendance ratios to flag high-risk idle reservations.
   - **Booking Anomaly Detector**: Multivariate distance scoring to flag hoarding behavior or abnormal duration blocks.

---

## 2. Complete Folder Structure

```
IRA/
├── backend/                       # Node.js + Express + Socket.IO Core API
│   ├── config/
│   │   └── config.js              # Environment configurations & ports
│   ├── controllers/
│   │   ├── authController.js       # Login, user profile, demo accounts provider
│   │   ├── bookingController.js    # Allocation engine runner, booking CRUD, concurrency test
│   │   ├── facilityController.js   # Facility discovery, equipment inventory, status updates
│   │   └── analyticsController.js  # Heatmap generation, campus KPIs, report export
│   ├── db/
│   │   ├── db.js                   # Dual-driver DB layer (PostgreSQL + SQLite)
│   │   ├── schema.sql              # Production PostgreSQL schema with GiST exclusion constraints
│   │   ├── sqliteSchema.sql        # Zero-config SQLite schema with double-booking prevention trigger
│   │   └── seedData.js             # 28+ facilities, 6 role users, 500+ past/active bookings
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification & demo role bypass
│   │   └── rbac.js                 # Role-based access control guards
│   ├── routes/
│   │   └── api.js                  # Express API router
│   ├── services/
│   │   ├── allocationEngine.js     # Constraint satisfaction & soft scoring engine
│   │   ├── conflictDetector.js     # Multi-layer collision detector
│   │   ├── maintenanceCascade.js   # Automated outage re-allocation engine
│   │   ├── socketService.js        # Real-time WebSocket event broadcaster
│   │   └── aiClient.js             # HTTP bridge to Python AI Microservice with fallbacks
│   ├── tests/
│   │   └── concurrencyTest.js      # 50-request parallel collision benchmark
│   ├── Dockerfile
│   ├── package.json
│   └── server.js                   # Main application entry point
│
├── ai-service/                     # Python FastAPI AI / ML Microservice
│   ├── app/
│   │   ├── data/
│   │   │   └── synthetic_generator.py # 6-month campus booking records generator
│   │   ├── models/
│   │   │   ├── demand_forecaster.py     # Ridge / XGBoost demand regression
│   │   │   ├── underutilization_detector.py # K-Means clustering & recommendations
│   │   │   ├── no_show_predictor.py     # Calibrated logistic classifier
│   │   │   └── anomaly_detector.py      # Multivariate distance anomaly detector
│   │   ├── config.py               # Microservice configuration
│   │   ├── main.py                 # FastAPI application & endpoints
│   │   └── train.py                # Training pipeline saving models to saved_models/
│   ├── saved_models/               # Serialized model artifacts (.json / .joblib)
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                       # React 18 SPA (Vite + Tailwind CSS + Recharts)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Live sync indicator, 1-click role switcher, notifications
│   │   │   └── Sidebar.jsx         # Contextual navigation by role
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx          # Heatmap, KPIs, AI recommendations, PDF/CSV export
│   │   │   ├── FacultyDashboard.jsx        # Smart auto-allocation booking & match score
│   │   │   ├── CoordinatorDashboard.jsx    # Department timetable & club approval queue
│   │   │   ├── FacilityManagerDashboard.jsx # Maintenance outage toggle & live cascade stream
│   │   │   ├── ClubDashboard.jsx           # Workshop application & status tracker
│   │   │   ├── StudentViewer.jsx           # Today's events & facility availability search
│   │   │   └── ConcurrencyTester.jsx       # 50-request race condition visualizer
│   │   ├── services/
│   │   │   └── api.js              # REST client & Socket.IO singleton
│   │   ├── App.jsx                 # View state coordinator
│   │   ├── index.css               # Tailwind & glassmorphism theme
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── docker-compose.yml              # Complete 5-container orchestration (Postgres, Redis, Backend, AI, Frontend)
├── start-all.bat                   # 1-click local launch script for Windows
└── README.md
```

---

## 3. Pre-Seeded Demo Accounts for All 6 Roles

To evaluate the system, use the **1-Click Role Switcher** in the top navigation bar or log in with these credentials:

| Role | Name | Email | Password | Key Powers |
|---|---|---|---|---|
| **Super Admin** | Dr. Sarah Jenkins | `admin@campus.edu` | `admin123` | Complete system control, utilization heatmaps, AI recommendations, rules configuration |
| **Faculty** | Prof. Alan Turing | `faculty.cs@campus.edu` | `faculty123` | Smart auto-allocation booking, match score breakdown, alternatives selection |
| **Coordinator / HOD** | Dr. Grace Hopper | `hod.cse@campus.edu` | `coord123` | Manage CSE schedule, approve club workshops, verify zero timetable clashes |
| **Facility Manager** | Robert Vance | `manager.facilities@campus.edu` | `manager123` | Toggle maintenance status, trigger live cascade re-allocations |
| **Club Organizer** | Alex Rivera | `coding.club@campus.edu` | `club123` | Request seminar halls & auditoriums for workshops, track approval status |
| **Student Viewer** | Maya Lin | `student.alex@campus.edu` | `student123` | Today's Events schedule, facility availability search, venue change notices |

---

## 4. Core Workflows Walkthrough

### Workflow A: Faculty Books a Lab (Auto-Allocation)
```
Faculty selects: Computer Lab, 55 Seats, 10:00 AM - 12:00 PM, Needs Workstations & Projector
       │
       ▼
Hard Constraints Filter (Type match, Capacity >= 55, Status = ACTIVE, Required Equipment verified)
       │
       ▼
Temporal Overlap Inspection (Find rooms free of conflicting APPROVED/CONFIRMED bookings)
       │
       ▼
Multi-Factor Soft Scoring:
  - Capacity Fit (55/60 in Lab-3 -> minimal waste): 95/100
  - Equipment Bonus (Workstations, Projector, Smart Board): 98/100
  - Proximity Bonus (Turing Block, CSE Department): 100/100
       │
       ▼
System assigns Lab-3 with 98.2% Match Score + provides 2 alternatives (Lab-4, Hall-C)
       │
       ▼
Booking inserted in ACID transaction -> Real-time Socket.IO broadcast updates all screens!
```

### Workflow B: Student Club Event Request (Approval Flow)
```
Coding Club requests Seminar Hall (120 seats, Saturday 2:00 PM)
       │
       ▼
Engine suggests Hall-A (Match: 92%)
       │
       ▼
Status set to PENDING (Club role requires academic authorization)
       │
       ▼
Coordinator dashboard updates in real time with approval button
       │
       ▼
Coordinator Approves -> Status becomes CONFIRMED -> Appears immediately on Student "Today's Events"
```

### Workflow C: Facility Goes Under Maintenance (Cascade Re-Allocation)
```
Facility Manager marks "Computer Lab 2" as MAINTENANCE (e.g. Projector & AC failure)
       │
       ▼
System queries all future confirmed bookings in that room
       │
       ▼
Cascade Engine triggers allocation engine for equivalent room for each affected session
       │
       ├─ Found (e.g. Lab-4): Automatically updates booking, generates student/faculty notification
       └─ None Free: Flags urgency to Admin with nearest alternative time slots
       │
       ▼
Live WebSocket stream visualizes the relocation cascade with zero clashes!
```

### Workflow D: Concurrency Stress-Test (Judges Demonstration)
```
User clicks "Fire 50 Concurrent Bookings" on Concurrency Test page
       │
       ▼
Backend fires 50 asynchronous requests trying to book Computer Lab 3 at the exact same millisecond
       │
       ▼
ACID Transaction + Exclusion Constraint activates:
  - Exactly 1 request successfully locks and claims the slot
  - Remaining 49 requests are caught and safely rejected with alternatives
  - Double Bookings in Database = 0
```

---

## 5. Quick Start Instructions

### Option 1: One-Click Startup (Windows)
Double-click `start-all.bat` or run in PowerShell:
```powershell
.\start-all.bat
```
This opens 3 terminals running:
- **Frontend Dashboard**: http://localhost:3000
- **Node.js Core Backend**: http://localhost:5000
- **AI Microservice**: http://127.0.0.1:8000/docs

---

### Option 2: Running Services Individually

#### 1. AI Microservice (Python)
```bash
cd ai-service
python app/train.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### 2. Core Backend (Node.js)
```bash
cd backend
npm install
npm start
```
*(The SQLite database with all seed facilities and users will be automatically initialized on first run).*

#### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

### Option 3: Docker Compose (Full Stack with PostgreSQL & Redis)
```bash
docker-compose up --build
```
Services deployed:
- `frontend` at port 3000
- `backend` at port 5000
- `ai-service` at port 8000
- `postgres` at port 5432
- `redis` at port 6379
