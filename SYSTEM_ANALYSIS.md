# SYSTEM ANALYSIS: KBTU UNIVERSITY MANAGEMENT SYSTEM (UMS)
## Geofenced Geolocation Attendance Verification & Academic Portal
**Course:** BIS201 — Basics of Information Systems  
**Institution:** Kazakh-British Technical University (KBTU), School of Information Technology & Engineering (SITE)  
**Academic Year:** 2026–2027  
**Scope:** 2-Page Technical & Architectural System Analysis Report  

---

## 1. EXECUTIVE SUMMARY & PROBLEM FORMULATION

### 1.1 Institutional Context & Legacy Deficiencies
In traditional university management systems (UMS), classroom attendance tracking represents a critical bottleneck for academic governance and regulatory compliance. Under KBTU academic policy, maintaining a minimum of **80% attendance** across 15 weekly lecture and laboratory sessions is a prerequisite for final examination clearance. However, legacy verification techniques suffer from severe systematic vulnerabilities:
1. **Paper Attendance Sheets:** Prone to manual proxy-signing ("buddy punching"), physical loss, transcription errors during manual entry into the registrar database, and consumption of 10–15 minutes of lecture time.
2. **Fixed RFID Card Terminals:** Susceptible to credential-sharing, where one student carries and swipes multiple physical student ID cards for absent peers.
3. **Static Optical QR Codes:** Frequently photographed and instantly broadcast via messaging channels (Telegram, WhatsApp) to students outside the university campus.

### 1.2 Proposed System Objective
The proposed **KBTU UMS Geofence Attendance Platform** replaces paper sheets and proxy swiping with an automated, client-side cryptographic and trigonometric verification engine. By executing the spherical **Haversine formula** directly against the browser's hardware Geolocation API, the system validates physical proximity to the designated lecture hall centroid (e.g., Hall 301, Main Building, `43.255320° N, 76.943094° E`) within a strict boundary of **150 meters**, guaranteeing physical presence, zero administrative overhead, and non-repudiable audit logging.

```
+---------------------------------------------------------------------------------------------------+
|                                  SYSTEM CONCEPTUAL PIPELINE                                       |
|                                                                                                   |
|  [Student Mobile Device]                                                                          |
|            |                                                                                      |
|            |--- (1) GPS Coordinates (Lat, Lng) + Session ID                                       |
|            v                                                                                      |
|  [Haversine Geofence Engine]                                                                      |
|            |--- (2) Distance Calculation to Hall 301 Centroid (43.255320, 76.943094)              |
|            v                                                                                      |
|  [Rule Verification Pipeline]                                                                     |
|            |--- Condition A: Distance <= 150m                                                     |
|            |--- Condition B: Enrollment Status == 'Approved'                                      |
|            |--- Condition C: Session Window == 'OPEN'                                             |
|            |--- Condition D: Composite Unique Check (Session_ID, Student_ID)                      |
|            v                                                                                      |
|  [Status Decision] ---> PRESENT (Green) / REJECTED (Red) / WEAK DRIFT (Amber)                     |
|            |                                                                                      |
|            v                                                                                      |
|  [Immutable Security Audit Log] + [Instructor Live Console] + [Manager At-Risk Trigger (<80%)]    |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. STAKEHOLDER & ACTOR ANALYSIS (USE CASE MODELING)

The system identifies four primary human actors operating under strict Role-Based Access Control (RBAC):

| Actor | Role Definition | Primary Use Cases | Security Boundary |
| :--- | :--- | :--- | :--- |
| **Student** | Enrolled undergraduate learner | • Authenticate via SSO portal<br>• Execute GPS check-in during open session<br>• View personal attendance % and exam clearance status<br>• Request manual review during indoor GPS drift<br>• Inspect academic transcript and course timetable | Restricted strictly to personal data; zero access to faculty or administrative consoles (`403 Forbidden`). |
| **Teacher** | Course instructor / Lecturer | • Toggle active check-in window (`OPEN` / `CLOSED`)<br>• Monitor real-time student arrival counter and live roster<br>• Execute manual overrides with mandatory justification note<br>• Export verified attendance records to CSV for grading | Authorized exclusively for assigned instructional courses (`BIS201`, `CS101`, etc.). |
| **Academic Manager** | Registrar & Faculty Dean's Office | • Inspect university-wide course capacity and enrollment ratios<br>• Filter students with attendance below 80% across 15 sessions<br>• Dispatch automated early-warning SMS/email notices<br>• Audit prerequisite adherence and credit caps (max 21 ECTS) | Read/Write access across all department academic rosters; restricted from system infrastructure configurations. |
| **System Administrator** | IT Infrastructure & Security | • Maintain system-wide user credentials and RBAC rules<br>• Configure geofence radii and classroom centroid coordinates<br>• Inspect immutable chronological audit trail<br>• Monitor lockout events and brute-force intrusion attempts | Full administrative root access over infrastructure parameters, geofence coordinates, and audit logs. |

---

## 3. FUNCTIONAL & NON-FUNCTIONAL REQUIREMENTS (FURPS+ FRAMEWORK)

### 3.1 Functional Requirements (FR)
* **FR-01 (Authentication & Portal Security):** The system must provide a unified, responsive login portal matching `wsp.kbtu.kz` styling, validating institutional logins (`s_surname`, `t_surname`, `m_surname`, `admin`).
* **FR-02 (Brute-Force Lockout):** Upon detecting 5 consecutive failed authentication attempts, the system must enforce a mandatory 30-second lockout timer, display an inline countdown, and register an `ACCOUNT_LOCKED` security event to the audit log.
* **FR-03 (Haversine Distance Engine):** The system must compute great-circle distance between user GPS coordinates and target room centroid coordinates with sub-meter floating point precision.
* **FR-04 (Geofence Decision Matrix):** Check-in requests must resolve into one of five mutually exclusive states:
  1. `PRESENT`: Distance $\le 150\text{ m}$, enrolled, session open, no prior record.
  2. `REJECTED (Out of Bounds)`: Distance $> 150\text{ m}$.
  3. `REJECTED (Not Enrolled)`: Student lacks approved registration in course.
  4. `REJECTED (Session Closed)`: Instructor has closed the session check-in window.
  5. `ALREADY CHECKED IN`: A record matching `(session_id, student_id)` already exists.
* **FR-05 (Indoor Drift & Manual Review):** When GPS accuracy degrades due to thick masonry walls, the student must be able to submit a manual review note directly to the instructor's console.
* **FR-06 (Teacher Override with Mandatory Audit):** Instructors must have authority to change attendance status, provided a mandatory text justification is supplied.
* **FR-07 (At-Risk Early Warning):** The manager console must automatically calculate percentage attendance over 15 scheduled sessions and flag students with $< 80\%$ attendance for early-warning dispatch.
* **FR-08 (Immutable Audit Logging):** Every state-altering action (logins, lockouts, check-ins, rejections, overrides, notices) must append an audit entry recording timestamp, username, role, action, details, and client IP address.

### 3.2 Non-Functional Requirements (NFR)
* **Performance:** Geolocation distance calculation and verification decision must execute in $< 50\text{ ms}$ on mobile hardware.
* **Availability & Reliability:** Client-side caching and fallback location simulation must ensure continuous operational readiness during intermittent cellular connectivity.
* **Usability & Design System:** Interface strictly adheres to KBTU institutional colors (Primary Blue `#0B3D91`, Light Accent `#E8F0FE`, Border `#D6E2F5`, Background `#F5F8FD`, Cards `#FFFFFF`).
* **Mobile Responsiveness:** Viewports down to $375\text{ px}$ width must render all check-in controls, interactive maps, and error banners without horizontal scrolling.
* **Localization:** Seamless real-time switching between English (EN), Russian (RU), and Kazakh (KZ).

---

## 4. MATHEMATICAL & ALGORITHMIC FORMULATION

### 4.1 Spherical Haversine Formulation
To calculate the distance $d$ across the Earth's curved surface between the student's terminal coordinates $(\phi_1, \lambda_1)$ and the classroom centroid $(\phi_2, \lambda_2)$, the system executes the Haversine trigonometric formulation:

$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

$$d = R \cdot c$$

Where:
* $\phi_1, \phi_2$ = latitudes in radians (Hall 301 Centroid $\phi_2 = 43.255320^\circ \times \frac{\pi}{180} \approx 0.754949\text{ rad}$)
* $\lambda_1, \lambda_2$ = longitudes in radians (Hall 301 Centroid $\lambda_2 = 76.943094^\circ \times \frac{\pi}{180} \approx 1.342911\text{ rad}$)
* $R = 6,371,000\text{ meters}$ (Earth's volumetric mean radius)
* $d$ = resulting spherical distance in meters

### 4.2 Geofence Verification Decision Algorithm
```
Algorithm: VerifyStudentAttendance(session_id, student_id, user_lat, user_lng)
Input:     session_id (String), student_id (String), user_lat (Float), user_lng (Float)
Output:    DecisionResult (Status, Message, DistanceM)

1. session <- QueryClassSession(session_id)
2. if session.status != 'OPEN' then
3.     LogAudit('CHECK_IN_REJECTED', 'Session window closed', student_id)
4.     return DecisionResult('REJECTED_CLOSED', 'Check-in window is currently closed', NULL)
5.
6. if not IsStudentEnrolled(student_id, session.course_code) then
7.     LogAudit('CHECK_IN_REJECTED', 'Student not registered', student_id)
8.     return DecisionResult('REJECTED_NOT_ENROLLED', 'Student is not registered', NULL)
9.
10. if ExistsAttendanceRecord(session_id, student_id) then
11.    existing <- GetAttendanceRecord(session_id, student_id)
12.    return DecisionResult('ALREADY_CHECKED_IN', 'Duplicate check-in blocked', existing.distance)
13.
14. distance_m <- CalculateHaversine(user_lat, user_lng, session.center_lat, session.center_lng)
15.
16. if distance_m <= session.allowed_campus_radius_m then
17.    record <- InsertAttendanceRecord(session_id, student_id, distance_m, 'PRESENT')
18.    LogAudit('GPS_CHECK_IN', Concat('Verified inside radius: ', distance_m, 'm'), student_id)
19.    return DecisionResult('SUCCESS_PRESENT', 'Attendance confirmed inside classroom', distance_m)
20. else
21.    record <- InsertAttendanceRecord(session_id, student_id, distance_m, 'REJECTED')
22.    LogAudit('CHECK_IN_REJECTED', Concat('Distance exceeded: ', distance_m, 'm > 150m'), student_id)
23.    return DecisionResult('REJECTED_RADIUS', 'Outside allowed campus radius', distance_m)
```

---

## 5. ARCHITECTURAL & DATA MODEL ANALYSIS

### 5.1 Relational Schema Architecture (Third Normal Form — 3NF)
The persistence layer complies with 3NF normalization, eliminating insertion, update, and deletion anomalies. Room parameters are explicitly decoupled from session schedules:

```
  +-------------------+       1:N       +-------------------+
  |      ROOMS        |----------------<|   CLASS_SESSIONS  |
  +-------------------+                 +-------------------+
  | PK  room_id       |                 | PK  session_id    |
  |     room_number   |                 | FK  course_code   |
  |     building      |                 | FK  room_id       |
  |     capacity      |                 |     session_number|
  |     centroid_lat  |                 |     start_time    |
  |     centroid_lng  |                 |     allowed_radius|
  |     wifi_bssid    |                 |     status        |
  +-------------------+                 +-------------------+
                                                  |
                                                  | 1:N
                                                  v
  +-------------------+       1:N       +-------------------+
  |     STUDENTS      |----------------<| ATTENDANCE_RECORDS|
  +-------------------+                 +-------------------+
  | PK  student_id    |                 | PK  attendance_id |
  |     username (UQ) |                 | FK  session_id    |
  |     full_name     |                 | FK  student_id    |
  |     email (UQ)    |                 |     check_in_time |
  |     major         |                 |     gps_lat, lng  |
  |     year, gpa     |                 |     distance_m    |
  +-------------------+                 |     verif_status  |
            |                           |     is_override   |
            | 1:N                       |     override_note |
            v                           | UQ (session, stud)|
  +-------------------+                 +-------------------+
  |    ENROLLMENTS    |
  +-------------------+
  | PK  enrollment_id |
  | FK  student_id    |
  | FK  course_code   |
  |     status, grade |
  +-------------------+
```

### 5.2 Key Relational Constraints & Integrity Guarantees
1. **Composite Uniqueness:** `UNIQUE (session_id, student_id)` on `ATTENDANCE_RECORDS` guarantees mathematically that no student can register multiple attendance instances for the same class meeting.
2. **Referential Integrity Cascades:** `FOREIGN KEY (session_id) REFERENCES class_sessions(session_id) ON DELETE CASCADE` ensures child check-in records are automatically cleaned if an administrative schedule update drops a session.
3. **Decoupled Physical Entity (`ROOMS`):** Separating auditorium metadata (`room_id`, `building`, `capacity`, `centroid_lat`, `centroid_lng`, `wifi_bssid`) isolates physical architectural properties from course curriculum management.

---

## 6. RISK IDENTIFICATION & ENGINEERING MITIGATION

```
+------------------------------------+------------------------------------+------------------------------------+
| Identified Technical Risk          | Impact on System                   | Engineering Mitigation             |
+------------------------------------+------------------------------------+------------------------------------+
| 1. Indoor GPS Attenuation          | High: Satellite signals degrade    | Dual-Action Mitigation:            |
|    Historic stone masonry of KBTU  | through thick multi-story roofs,   | (a) Integrated student manual      |
|    causes multipath reflection and | causing artificial drift of        |     review request with teacher log|
|    coordinates drift (> 200m).     | 200-400m for genuine students.     | (b) Week 10 Wi-Fi AP handshake     |
|                                    |                                    |     validating KBTU-STUDENT-AP-301 |
+------------------------------------+------------------------------------+------------------------------------+
| 2. Mobile Mock Location Spoofing   | Medium: Developer options in OS    | Multi-parameter inspection:        |
|    Students using mock GPS apps    | can simulate fake coordinates at   | Checking `coords.accuracy` rating, |
|    to forge Hall 301 coordinates.  | Hall 301 from dormitories.         | combined with client IP subnet     |
|                                    |                                    | validation (KBTU Campus LAN).      |
+------------------------------------+------------------------------------+------------------------------------+
| 3. High Concurrent Arrival Spikes  | Medium: 100+ students clicking     | Stateless client-side computation: |
|    Simultaneous check-ins during   | check-in during the first 5 minutes| Mathematical calculations execute  |
|    lecture start (16:00-16:05).    | causing server queue bottlenecks.  | locally on client; server only     |
|                                    |                                    | validates pre-computed distance.   |
+------------------------------------+------------------------------------+------------------------------------+
```

---

## 7. INSTITUTIONAL IMPACT & ACADEMIC VALUE

1. **Reclaiming Instructional Time:** Eliminates 10–15 minutes of manual attendance taking per 3-hour block, recovering over **12.5 lecture hours per semester** across the department.
2. **Elimination of Academic Fraud:** Replaces proxy sign-ins and photographed QR codes with hardware-verified geofencing backed by an immutable audit trail.
3. **Proactive Attrition Intervention:** Automated detection of attendance dropping below the 80% threshold enables academic advisors to intervene before students face irreversible exam disqualification.
4. **Verifiable Compliance:** The system delivers full auditability for accreditation bodies and university leadership via automated CSV and SQL reports.
