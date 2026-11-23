-- =====================================================================
-- Dashboard views: ready numbers for the manager and teacher dashboards.
-- A VIEW is a saved query. The website can read it like a table.
-- Run after 02_seed.sql.
-- =====================================================================

-- A finished lesson = a lesson whose date has already passed.
-- Points: an old lesson (tracked_hours = 1) gives 1 point,
--         an hourly lesson (tracked_hours = 3) gives up to 3 points, one per hour.
-- This is the same rule as getStudentAttendanceRate() on the website.

-- 1. Attendance percent of every approved student in every course.
--    attendance_summary(date) = "what was the attendance on this date".
--    Example: SELECT * FROM attendance_summary(DATE '2026-11-08');  -- end of week 8
DROP VIEW IF EXISTS v_at_risk_students, v_attendance_summary, v_hourly_tracker CASCADE;
DROP FUNCTION IF EXISTS attendance_summary(DATE) CASCADE;

CREATE FUNCTION attendance_summary(p_as_of DATE)
RETURNS TABLE (student_id VARCHAR, full_name VARCHAR, course_code VARCHAR,
               finished_sessions BIGINT, points_total BIGINT, points_present BIGINT,
               attendance_pct NUMERIC) AS $$
    WITH finished AS (
        SELECT session_id, course_code, tracked_hours
        FROM class_sessions
        WHERE session_date < p_as_of
    ),
    per_lesson AS (
        SELECT e.student_id, e.course_code, f.session_id, f.tracked_hours,
               COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'PRESENT') AS present_hours
        FROM enrollments e
        JOIN finished f ON f.course_code = e.course_code
        LEFT JOIN attendance_records a
               ON a.session_id = f.session_id AND a.student_id = e.student_id
        WHERE e.status = 'Approved'
        GROUP BY e.student_id, e.course_code, f.session_id, f.tracked_hours
    )
    SELECT s.student_id, s.full_name, p.course_code,
           COUNT(*)                                        AS finished_sessions,
           SUM(p.tracked_hours)                            AS points_total,
           SUM(LEAST(p.present_hours, p.tracked_hours))    AS points_present,
           ROUND(100.0 * SUM(LEAST(p.present_hours, p.tracked_hours)) / SUM(p.tracked_hours), 1)
                                                           AS attendance_pct
    FROM per_lesson p
    JOIN students s ON s.student_id = p.student_id
    GROUP BY s.student_id, s.full_name, p.course_code;
$$ LANGUAGE sql STABLE;

-- The same numbers for today
CREATE VIEW v_attendance_summary AS
SELECT * FROM attendance_summary(CURRENT_DATE);

-- 2. At-risk students: attendance below 80% (FR-07, early warning)
CREATE OR REPLACE VIEW v_at_risk_students AS
SELECT student_id, full_name, course_code, points_present, points_total, attendance_pct
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

-- 4. Session results: PRESENT / REJECTED / review per lesson and per hour (teacher dashboard)
DROP VIEW IF EXISTS v_session_stats, v_attendance_export CASCADE;
CREATE VIEW v_session_stats AS
SELECT cs.course_code,
       cs.session_number,
       cs.session_date,
       a.hour_slot,
       COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'PRESENT')       AS present,
       COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'REJECTED')      AS rejected,
       COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'MANUAL_REVIEW') AS manual_review,
       COUNT(a.attendance_id) FILTER (WHERE a.is_override)                           AS overridden
FROM class_sessions cs
LEFT JOIN attendance_records a ON a.session_id = cs.session_id
GROUP BY cs.course_code, cs.session_number, cs.session_date, a.hour_slot
ORDER BY cs.course_code, cs.session_number, a.hour_slot;

-- 5. CSV export: the full attendance list of a course, one row per check-in
CREATE VIEW v_attendance_export AS
SELECT cs.course_code,
       cs.session_number,
       cs.session_date,
       a.hour_slot,
       s.student_id,
       s.full_name,
       a.check_in_time,
       a.distance_to_center_m,
       a.verification_status,
       a.is_override
FROM attendance_records a
JOIN class_sessions cs ON cs.session_id = a.session_id
JOIN students s        ON s.student_id  = a.student_id
ORDER BY cs.course_code, cs.session_number, s.full_name, a.hour_slot;

-- 6. EVERY-HOUR TRACKER: one row per student per lesson, one column per hour.
--    This is the table the teacher sees on the Live Attendance page.
--    NO_CHECK_IN = the student did not check in for that hour.
--    The hour columns only show hours the lesson tracks (NULL for the others).
CREATE VIEW v_hourly_tracker AS
SELECT cs.session_id,
       cs.course_code,
       cs.session_number,
       cs.session_date,
       cs.status AS session_status,
       s.student_id,
       s.full_name,
       COALESCE(MAX(a.verification_status) FILTER (WHERE a.hour_slot = 1), 'NO_CHECK_IN') AS hour_1,
       CASE WHEN cs.tracked_hours >= 2
            THEN COALESCE(MAX(a.verification_status) FILTER (WHERE a.hour_slot = 2), 'NO_CHECK_IN') END AS hour_2,
       CASE WHEN cs.tracked_hours >= 3
            THEN COALESCE(MAX(a.verification_status) FILTER (WHERE a.hour_slot = 3), 'NO_CHECK_IN') END AS hour_3,
       COUNT(a.attendance_id) FILTER (WHERE a.verification_status = 'PRESENT') AS hours_present,
       cs.tracked_hours AS hours_total
FROM class_sessions cs
JOIN enrollments e ON e.course_code = cs.course_code AND e.status = 'Approved'
JOIN students s    ON s.student_id = e.student_id
LEFT JOIN attendance_records a
       ON a.session_id = cs.session_id AND a.student_id = s.student_id
GROUP BY cs.session_id, cs.course_code, cs.session_number, cs.session_date, cs.status,
         cs.tracked_hours, s.student_id, s.full_name
ORDER BY cs.course_code, cs.session_number, s.full_name;

-- =====================================================================
-- Version 3 (23.11): course registration, schedule and attestation
-- =====================================================================
DROP VIEW IF EXISTS v_course_catalog, v_student_schedule, v_schedule_clashes,
                    v_room_clashes, v_attestation CASCADE;
DROP FUNCTION IF EXISTS letter_grade(NUMERIC) CASCADE;

-- Letter grade of the Kazakhstan credit system (total 0-100) and its GPA points
-- Example: SELECT * FROM letter_grade(87);  -> B+, 3.33
CREATE FUNCTION letter_grade(p_total NUMERIC, OUT letter VARCHAR, OUT gpa_points NUMERIC) AS $$
    SELECT g.letter, g.points
    FROM (VALUES (95,'A',4.00),(90,'A-',3.67),(85,'B+',3.33),(80,'B',3.00),(75,'B-',2.67),
                 (70,'C+',2.33),(65,'C',2.00),(60,'C-',1.67),(55,'D+',1.33),(50,'D',1.00),(0,'F',0.00))
         AS g(min_total, letter, points)
    WHERE p_total >= g.min_total
    ORDER BY g.min_total DESC
    LIMIT 1;
$$ LANGUAGE sql IMMUTABLE;

-- 7. Course catalog for the registration page: schedule, teacher, room and free places
--    Pending registrations also take a place (the manager has not answered yet).
CREATE VIEW v_course_catalog AS
SELECT c.course_code,
       c.title,
       c.credits,
       c.ects_credits,
       c.faculty,
       t.full_name AS teacher,
       (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[c.day_of_week] AS day,
       c.day_of_week,
       c.start_time,
       c.end_time,
       r.room_number AS room,
       c.max_places,
       COUNT(e.enrollment_id) FILTER (WHERE e.status IN ('Pending','Approved')) AS taken_places,
       c.max_places - COUNT(e.enrollment_id) FILTER (WHERE e.status IN ('Pending','Approved')) AS free_places
FROM courses c
JOIN teachers t ON t.teacher_id = c.teacher_id
JOIN rooms r    ON r.room_id = c.room_id
LEFT JOIN enrollments e ON e.course_code = c.course_code
GROUP BY c.course_code, t.full_name, r.room_number
ORDER BY c.day_of_week, c.start_time;

-- 8. Weekly schedule of every student (approved and pending courses)
CREATE VIEW v_student_schedule AS
SELECT e.student_id,
       s.full_name,
       e.semester,
       e.enrollment_id,
       e.status,
       cc.course_code, cc.title, cc.credits, cc.teacher, cc.day, cc.day_of_week,
       cc.start_time, cc.end_time, cc.room
FROM enrollments e
JOIN students s          ON s.student_id = e.student_id
JOIN v_course_catalog cc ON cc.course_code = e.course_code
WHERE e.status IN ('Pending','Approved')
ORDER BY e.student_id, cc.day_of_week, cc.start_time;

-- 9. Problems in the timetable (for the manager)
--    a) a student has two courses at the same time
CREATE VIEW v_schedule_clashes AS
SELECT a.student_id, a.full_name, a.semester,
       a.course_code AS course_1, b.course_code AS course_2,
       a.day, GREATEST(a.start_time, b.start_time) AS clash_from,
       LEAST(a.end_time, b.end_time) AS clash_to
FROM v_student_schedule a
JOIN v_student_schedule b
  ON b.student_id = a.student_id AND b.semester = a.semester
 AND b.course_code > a.course_code
 AND b.day_of_week = a.day_of_week
 AND b.start_time < a.end_time AND a.start_time < b.end_time;

--    b) two courses in the same room at the same time
CREATE VIEW v_room_clashes AS
SELECT a.room_id, r.room_number, a.course_code AS course_1, b.course_code AS course_2,
       (ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[a.day_of_week] AS day,
       GREATEST(a.start_time, b.start_time) AS clash_from,
       LEAST(a.end_time, b.end_time) AS clash_to
FROM courses a
JOIN courses b ON b.room_id = a.room_id AND b.course_code > a.course_code
              AND b.day_of_week = a.day_of_week
              AND b.start_time < a.end_time AND a.start_time < b.end_time
JOIN rooms r   ON r.room_id = a.room_id;

-- 10. Attestation page: points, admission to the final exam and the grade
--     admitted     = at least 30 of 60 points for the two attestations
--     total        = attestation 1 + attestation 2 + final exam
--     letter       = only when the final exam has points
--     max_possible = what the student can still reach (the final exam counted as 40)
CREATE VIEW v_attestation AS
SELECT a.student_id,
       s.full_name,
       a.course_code,
       c.title,
       c.ects_credits,
       a.semester,
       a.attestation_1,
       a.attestation_2,
       COALESCE(a.attestation_1, 0) + COALESCE(a.attestation_2, 0)              AS rating,
       (COALESCE(a.attestation_1, 0) + COALESCE(a.attestation_2, 0)) >= 30       AS admitted,
       a.final_exam,
       CASE WHEN a.final_exam IS NOT NULL
            THEN a.attestation_1 + a.attestation_2 + a.final_exam END            AS total,
       CASE WHEN a.final_exam IS NOT NULL
            THEN (letter_grade(a.attestation_1 + a.attestation_2 + a.final_exam)).letter END AS letter,
       COALESCE(a.attestation_1, 0) + COALESCE(a.attestation_2, 0)
         + COALESCE(a.final_exam, 40)                                            AS max_possible,
       a.updated_by,
       a.updated_at
FROM attestation a
JOIN students s ON s.student_id = a.student_id
JOIN courses c  ON c.course_code = a.course_code
ORDER BY a.student_id, a.course_code;

-- How to look at them:
--   SELECT * FROM v_course_catalog;
--   SELECT * FROM v_student_schedule WHERE student_id = '24B031901';
--   SELECT * FROM v_schedule_clashes;   SELECT * FROM v_room_clashes;
--   SELECT * FROM v_attestation WHERE student_id = '24B031926';
--   SELECT * FROM v_hourly_tracker WHERE session_id = 'ses-8';
--   SELECT * FROM v_at_risk_students;
--   SELECT * FROM v_course_places;
--   SELECT * FROM v_session_stats WHERE course_code = 'BIS201';
-- How to save a CSV file (in psql):
--   \copy (SELECT * FROM v_attendance_export WHERE course_code = 'BIS201') TO 'bis201_attendance.csv' CSV HEADER
-- In pgAdmin: run SELECT * FROM v_attendance_export; then press "Save results to file".
