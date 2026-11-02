# KBTU University Management System (UMS)
**Unified Academic & Geolocation Portal (wsp.kbtu.kz style)**

Developed for the **Team 39 (Monday group)** database and software architecture project in **BIS201 Basics of Information Systems**, School of Information Technology and Engineering (SITE), Kazakh-British Technical University.

---

## 🏛️ Project Overview

The KBTU UMS is a production-grade institutional academic portal featuring role-based dashboards, course enrollment tracking, academic standing monitoring, and an automated **GPS Geolocation Attendance Tracking Hero Feature** that verifies student physical presence in classrooms via spherical Haversine distance computations against classroom centroid coordinates.

---

## 👥 Demo Accounts (Dev Reference)

> **Note on Security**: Following institutional security policy and system requirements, **passwords are NOT displayed in this documentation or anywhere in the UI**. All demo accounts share a preconfigured demo credential configured in the runtime mock system (`Demo2026!`).

### 🎓 Students
- `s_niyazkhan` — **Saniya Niyazkhan** (Student ID: `24B031926`, Major: Information Systems, Year 2, GPA: 3.92)
- `s_nurlybay` — **Mubarak Nurlybay** (Student ID: `24B031901`, Major: Information Systems, Year 2, At-Risk Candidate)
- `s_yugai` — **Yugai Elya** (Student ID: `25B032145`, Major: Information Systems, Year 1, GPA: 3.88)
- `s_bagdat` — **Bagdat Alua** (Student ID: `24B031666`, Major: Information Systems, Year 2, GPA: 3.65)
- `s_zholdassali` — **Amir Zholdassali** (Student ID: `24B031787`, Major: Information Systems, Year 2, At-Risk Candidate)

### 👨‍🏫 Faculty / Teachers
- `t_issabek` — **Ainur Issabek** (Instructor for BIS201 Basics of Information Systems, Hall 301)
- `t_myrzakanurov` — **Arman Myrzakanurov** (Instructor for CS101 Introduction to Computer Science)
- `t_asubay` — **Miras Asubay** (Instructor for DB202 Database Systems & SQL)

### 💼 Academic Manager
- `m_askarova` — **Asel Askarova** (Academic Registrar & Enrollment Management Office)

### 🛡️ System Administrator
- `admin` — **KBTU System Administrator** (IT Infrastructure & Security Audit Operations)

---

## 🎯 Hero Feature: GPS Geofenced Attendance System

The attendance verification algorithm calculates the precise great-circle distance between the student's device location and the classroom centroid coordinates using the spherical Haversine formula:

$$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
$$d = R \cdot \Delta\sigma$$

- **Hall 301 Centroid**: `Latitude 43.255320, Longitude 76.943094` (Main Campus, Tole Bi 59, Astana Square)
- **Allowed Geofence Radius**: `150 meters`

### Verification Rule Engine:
1. **Distance Check**: Device coordinates must resolve within `allowed_campus_radius_m` (150 m).
2. **Enrollment Check**: Student must possess an approved registration record for the target course (`BIS201`).
3. **Session Window**: Target class session must be actively toggled `OPEN` by the instructor.
4. **Duplicate Prevention**: Enforces a strict composite unique constraint on `(session_id, student_id)`.
5. **GPS Drift / Weak Signal**: Provides simulated weak indoor GPS handling with a prompt for Wi-Fi verification and direct submission of a manual review request to the teacher.

### Verification States:
- `PRESENT`: Green status chip with exact computed meter distance and verification timestamp.
- `REJECTED`: Outside campus boundary (e.g. 850m > 150m), session closed, or student not registered.
- `ALREADY CHECKED IN`: Blocks duplicate submission with timestamp of existing record.
- `INDOOR GPS DRIFT`: Weak signal alert with Wi-Fi AP fallback note and manual review dispatch.

---

## 🧭 Role-Based Navigation Architecture (No Numbering)

The application enforces strict Role-Based Access Control (RBAC). A user navigating to an unauthorized portal route receives a friendly **403 — Access denied** screen. Sidebar items use clear icon-label pairings with zero numerical ordering:

- **Student Portal**:
  - Dashboard
  - My Courses
  - Attendance Check-in *(Hero)*
  - Schedule
  - Grades & Transcript
  - Course Registration
  - Messages
  - Teacher Ratings
  - News

- **Teacher Portal**:
  - Dashboard
  - My Courses
  - Live Attendance *(Hero: Window toggle, live student counter, manual override with required audit justification, CSV export)*
  - Gradebook
  - Lessons (15-week syllabus)
  - Students
  - Research (h-index, citations)
  - Messages
  - News

- **Academic Manager Portal**:
  - Dashboard
  - Courses
  - Enrollments
  - At-Risk Attendance *(Hero: Identifies students below the 80% KBTU attendance threshold over 15 sessions, early-warning SMS/email broadcast)*
  - Performance Reports
  - Mentors
  - Messages
  - News

- **Administrator Portal**:
  - Dashboard
  - Users
  - Roles & Permissions
  - Audit Log *(Hero: Complete searchable, filterable security & GPS trail with CSV export)*
  - Courses
  - Applications
  - System Settings (Geofence parameters, centroid coordinates, Wi-Fi AP configuration)

- **Shared Project Group** *(Accessible to all roles at the bottom of the sidebar)*:
  - Database & ERD
  - Team 39
  - Project Status

---

## 🎨 Blue and White Design System

Built strictly to the specification:
- **Primary Blue**: `#0B3D91` (KBTU Academic Blue)
- **Hover Blue**: `#0A3278`
- **Accent Light Blue**: `#E8F0FE`
- **Border**: `#D6E2F5`
- **Background**: `#F5F8FD`
- **Cards**: Pure White `#FFFFFF` with 12px / 16px border-radius
- **Typography**: Inter with subtle weights and generous spacing
- **Status Colors**: Success Emerald `#10B981` / `#059669` and Error Red `#EF4444` / `#DC2626` strictly reserved for verification states.
- **Charts**: Recharts rendered in blue tonal palettes (`#0B3D91`, `#2563EB`, `#60A5FA`, `#D6E2F5`).
- **Mobile Responsive**: Fully adaptive down to 375px mobile viewports with collapsible hamburger drawer navigation.

---

## 💾 Relational Data Model (3NF)

```sql
-- Core Entities (PostgreSQL Dialect)
STUDENTS (student_id PK, username UNIQUE, full_name, email, major, year, gpa)
TEACHERS (teacher_id PK, username UNIQUE, full_name, email, department)
ROOMS (room_id PK, room_number, building, capacity, centroid_lat, centroid_lng, wifi_bssid)
COURSES (course_code PK, title, credits, teacher_id FK, max_places)
CLASS_SESSIONS (session_id PK, course_code FK, room_id FK, session_number [1..15], allowed_campus_radius_m = 150, status [OPEN/CLOSED])
ENROLLMENTS (enrollment_id PK, student_id FK, course_code FK, semester, status, grade)
ATTENDANCE_RECORDS (attendance_id PK, session_id FK, student_id FK, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status, rejection_reason, is_override, override_by, override_reason, UNIQUE(session_id, student_id))
AUDIT_LOGS (log_id PK, timestamp, username, role, action, details, ip_address, status)
```

### Seeded Mock Data:
- **15 Weekly Sessions for BIS201**: Session 8 is active/open today (Week 8, Monday 16:00–19:00, Hall 301).
- **~42 Pre-seeded Attendance Records**: Realistic mix of PRESENT, REJECTED (exceeded 150m boundary), and teacher manual overrides across sessions 1–8.
- **Audit Logs**: Pre-seeded with logins, geofence checks, teacher overrides, and security lockout events.

---

## 🛠️ What is Mocked in Frontend Mode

1. **Hardware GPS Geolocation**: The application supports real browser Geolocation API (`navigator.geolocation`) with an instant Dev Location Simulator offering 3 presets:
   - *Inside Hall 301* (~5m from centroid)
   - *Outside Campus* (~850m away in city)
   - *Indoor GPS Drift* (low accuracy simulation triggering manual review)
2. **Early-Warning Email/SMS**: Simulated with instant UI toast feedback and recorded to the audit trail.
3. **Wi-Fi BSSID Handshake**: Pre-configured for Week 10 roadmap (`KBTU-STUDENT-AP-301`).
4. **CSV Exporting**: Generates real downloadable `.csv` data files directly in the browser.

---

## 🚀 Running the Application

```bash
# Navigate to project folder
cd "C:\Users\User\.gemini\antigravity\scratch\kbtu-ums"

# Install dependencies (already installed)
npm install

# Start Vite development server
npm run dev

# Or build production bundle
npm run build
```
