-- =====================================================================
-- Dashboard views: ready numbers for the manager and teacher dashboards.
-- A VIEW is a saved query. The website can read it like a table.
-- Run after 02_seed.sql.
-- =====================================================================

-- A finished session = a CLOSED session whose date has already passed.

-- 1. Attendance percent of every approved student in every course
CREATE OR REPLACE VIEW v_attendance_summary AS
WITH finished AS (
    SELECT session_id, course_code
    FROM class_sessions
    WHERE status = 'CLOSED' AND session_date < CURRENT_DATE
),
finished_count AS (
    SELECT course_code, COUNT(*) AS finished_sessions
    FROM finished
    GROUP BY course_code
)
SELECT s.student_id,
       s.full_name,
       e.course_code,
       fc.finished_sessions,
       COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'PRESENT') AS present,
       ROUND(100.0 * COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'PRESENT')
             / fc.finished_sessions, 1) AS attendance_pct
FROM enrollments e
JOIN students s        ON s.student_id = e.student_id
JOIN finished_count fc ON fc.course_code = e.course_code
LEFT JOIN finished f   ON f.course_code = e.course_code
LEFT JOIN attendance_records a
       ON a.session_id = f.session_id AND a.student_id = s.student_id
WHERE e.status = 'Approved'
GROUP BY s.student_id, s.full_name, e.course_code, fc.finished_sessions;

-- 2. At-risk students: attendance below 80% (FR-07, early warning)
CREATE OR REPLACE VIEW v_at_risk_students AS
SELECT student_id, full_name, course_code, present, finished_sessions, attendance_pct
FROM v_attendance_summary
WHERE attendance_pct < 80
ORDER BY attendance_pct;

-- 3. Course places: how many students are approved and how many places are free
CREATE OR REPLACE VIEW v_course_places AS
SELECT c.course_code,
       c.title,
       c.max_places,
       COUNT(e.enrollment_id) FILTER (WHERE e.status = 'Approved') AS approved_students,
       c.max_places - COUNT(e.enrollment_id) FILTER (WHERE e.status = 'Approved') AS free_places
FROM courses c
LEFT JOIN enrollments e ON e.course_code = c.course_code
GROUP BY c.course_code, c.title, c.max_places
ORDER BY c.course_code;

-- 4. Session results: PRESENT / REJECTED / review per lesson (teacher dashboard)
CREATE OR REPLACE VIEW v_session_stats AS
SELECT cs.course_code,
       cs.session_number,
       cs.session_date,
       COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'PRESENT')       AS present,
       COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'REJECTED')      AS rejected,
       COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'MANUAL_REVIEW') AS manual_review,
       COUNT(a.attendance_id) FILTER (WHERE a.is_override)                           AS overridden
FROM class_sessions cs
LEFT JOIN attendance_records a ON a.session_id = cs.session_id
GROUP BY cs.course_code, cs.session_number, cs.session_date
ORDER BY cs.course_code, cs.session_number;

-- 5. CSV export: the full attendance list of a course, one row per check-in
CREATE OR REPLACE VIEW v_attendance_export AS
SELECT cs.course_code,
       cs.session_number,
       cs.session_date,
       s.student_id,
       s.full_name,
       a.check_in_time,
       a.distance_to_center_m,
       a.verification_status,
       a.is_override
FROM attendance_records a
JOIN class_sessions cs ON cs.session_id = a.session_id
JOIN students s        ON s.student_id  = a.student_id
ORDER BY cs.course_code, cs.session_number, s.full_name;

-- How to look at them:
--   SELECT * FROM v_at_risk_students;
--   SELECT * FROM v_course_places;
--   SELECT * FROM v_session_stats WHERE course_code = 'BIS201';
-- How to save a CSV file (in psql):
--   \copy (SELECT * FROM v_attendance_export WHERE course_code = 'BIS201') TO 'bis201_attendance.csv' CSV HEADER
-- In pgAdmin: run SELECT * FROM v_attendance_export; then press "Save results to file".
