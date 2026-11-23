-- =====================================================================
-- KBTU UMS (Team 39) - PostgreSQL schema
-- Author: Mubarak Nurlybay (Data and Database)
-- Based on the ERD on the "Database & ERD" page of our website.
-- The SQL on that page created only 3 tables, so this file adds
-- students, teachers, courses and enrollments.
-- Run order: 01_schema.sql -> 02_seed.sql -> 03_dashboards.sql -> 04_tests.sql
--
-- Version 2 (16.11): every-hour tracker.
--   A 3-hour lesson (16:00-19:00) now has 3 check-ins: hour 1, 2 and 3.
--   class_sessions.tracked_hours = how many hourly check-ins the lesson has.
--   attendance_records.hour_slot = which hour this check-in is for.
--   The unique rule is now (session, student, hour), the same as the website.
--
-- Version 3 (23.11): all subjects, course registration and attestation.
--   courses now have a schedule (day, time, room), ECTS credits and a faculty.
--   8 subjects: the 5 from the website's COURSES list + DB202, FIN201, ENG102
--   from the Discipline Schedule page.
--   register_for_course() checks free places, the 21-credit limit and
--   time clashes with the student's other courses.
--   attestation: 1st and 2nd attestation (0-30 each) and the final exam (0-40).
-- =====================================================================

DROP TABLE IF EXISTS attestation CASCADE;
DROP FUNCTION IF EXISTS register_for_course(VARCHAR, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS check_attestation_enrollment() CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP FUNCTION IF EXISTS hour_slot_for(VARCHAR, TIMESTAMP) CASCADE;
DROP FUNCTION IF EXISTS check_hour_slot() CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS class_sessions CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- 1. STUDENTS: each student is stored once
CREATE TABLE students (
    student_id  VARCHAR(15)  PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    major       VARCHAR(50)  NOT NULL,
    year        INT          NOT NULL CHECK (year BETWEEN 1 AND 4),
    gpa         NUMERIC(3,2) CHECK (gpa BETWEEN 0 AND 4)
);

-- 2. TEACHERS: each teacher is stored once
CREATE TABLE teachers (
    teacher_id  VARCHAR(15)  PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    department  VARCHAR(80)  NOT NULL
);

-- 3. ROOMS: the GPS center of every room is stored once
CREATE TABLE rooms (
    room_id       VARCHAR(20)  PRIMARY KEY,
    room_number   VARCHAR(30)  NOT NULL,
    building      VARCHAR(80)  NOT NULL,
    capacity      INT          NOT NULL CHECK (capacity > 0),
    centroid_lat  NUMERIC(9,6) NOT NULL,
    centroid_lng  NUMERIC(9,6) NOT NULL,
    wifi_bssid    VARCHAR(50)
);

-- 4. COURSES: every course has one main teacher and one weekly lesson
CREATE TABLE courses (
    course_code  VARCHAR(15)  PRIMARY KEY,
    title        VARCHAR(120) NOT NULL,
    credits      INT          NOT NULL CHECK (credits BETWEEN 1 AND 10),  -- credits for the 21-credit limit
    ects_credits INT          CHECK (ects_credits BETWEEN 1 AND 15),     -- ECTS, as on the Discipline Schedule page
    faculty      VARCHAR(60)  NOT NULL DEFAULT 'SITE',
    max_places   INT          NOT NULL CHECK (max_places > 0),
    teacher_id   VARCHAR(15)  NOT NULL REFERENCES teachers(teacher_id),
    -- weekly lesson: 1 = Monday ... 7 = Sunday
    day_of_week  SMALLINT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time   TIME         NOT NULL,
    end_time     TIME         NOT NULL CHECK (end_time > start_time),
    room_id      VARCHAR(20)  NOT NULL REFERENCES rooms(room_id)
);

-- 5. ENROLLMENTS: which student is registered for which course
--    (it was missing on our ERD page)
CREATE TABLE enrollments (
    enrollment_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id     VARCHAR(15) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_code    VARCHAR(15) NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    semester       VARCHAR(20) NOT NULL,
    status         VARCHAR(10) NOT NULL DEFAULT 'Pending'
                   CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    -- one student can register for one course only once per semester
    CONSTRAINT uq_student_course_semester UNIQUE (student_id, course_code, semester)
);

-- 6. CLASS_SESSIONS: every lesson of a course (15 per semester)
CREATE TABLE class_sessions (
    session_id               VARCHAR(30) PRIMARY KEY,
    course_code              VARCHAR(15) NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    room_id                  VARCHAR(20) NOT NULL REFERENCES rooms(room_id),
    session_number           INT         NOT NULL CHECK (session_number BETWEEN 1 AND 15),
    session_date             DATE        NOT NULL,
    start_time               TIME        NOT NULL,
    end_time                 TIME        NOT NULL CHECK (end_time > start_time),
    allowed_campus_radius_m  INT         NOT NULL DEFAULT 150 CHECK (allowed_campus_radius_m > 0),
    status                   VARCHAR(10) NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('OPEN', 'CLOSED')),
    -- 1 = one check-in per lesson (weeks 1-7), 3 = a check-in every hour (from week 8)
    tracked_hours            SMALLINT    NOT NULL DEFAULT 1 CHECK (tracked_hours BETWEEN 1 AND 3),
    CONSTRAINT uq_course_session_number UNIQUE (course_code, session_number)
);

-- 7. ATTENDANCE_RECORDS: one row = one check-in for one hour of a lesson
CREATE TABLE attendance_records (
    attendance_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id           VARCHAR(30)  NOT NULL REFERENCES class_sessions(session_id) ON DELETE CASCADE,
    student_id           VARCHAR(15)  NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    -- 1 = 16:00-17:00, 2 = 17:00-18:00, 3 = 18:00-19:00
    hour_slot            SMALLINT     NOT NULL DEFAULT 1 CHECK (hour_slot BETWEEN 1 AND 3),
    check_in_time        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gps_latitude         NUMERIC(9,6) NOT NULL,
    gps_longitude        NUMERIC(9,6) NOT NULL,
    distance_to_center_m NUMERIC(6,1) NOT NULL CHECK (distance_to_center_m >= 0),
    verification_status  VARCHAR(20)  NOT NULL
                         CHECK (verification_status IN ('PRESENT', 'REJECTED', 'MANUAL_REVIEW')),
    rejection_reason     TEXT,
    -- a teacher can change the result by hand (for example, GPS failed in the room)
    is_override          BOOLEAN      NOT NULL DEFAULT FALSE,
    override_by          VARCHAR(100),
    override_reason      TEXT,
    -- one student can check in only once per hour of one lesson
    CONSTRAINT uq_session_student_hour UNIQUE (session_id, student_id, hour_slot),
    -- if a teacher overrides, the reason must be written
    CONSTRAINT chk_override_reason CHECK (is_override = FALSE OR override_reason IS NOT NULL)
);

-- Rule: the hour must exist in that lesson.
-- Example: a lesson with tracked_hours = 1 cannot get a check-in for hour 2.
-- A CHECK cannot look at another table, so a trigger does it.
CREATE FUNCTION check_hour_slot() RETURNS TRIGGER AS $$
DECLARE
    max_hours SMALLINT;
BEGIN
    SELECT tracked_hours INTO max_hours FROM class_sessions WHERE session_id = NEW.session_id;
    IF max_hours IS NOT NULL AND NEW.hour_slot > max_hours THEN
        RAISE EXCEPTION 'Lesson % has only % tracked hour(s), hour % is not allowed',
            NEW.session_id, max_hours, NEW.hour_slot
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_hour_slot
    BEFORE INSERT OR UPDATE OF hour_slot, session_id ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION check_hour_slot();

-- Helper for the backend: which hour of the lesson is it at this time?
-- Returns 1, 2 or 3, or NULL when the time is outside the lesson.
-- Example: SELECT hour_slot_for('ses-8', '2026-11-02 17:20');  -> 2
CREATE FUNCTION hour_slot_for(p_session_id VARCHAR, p_time TIMESTAMP)
RETURNS SMALLINT AS $$
    SELECT CASE
             WHEN p_time::date <> cs.session_date
               OR p_time::time <  cs.start_time
               OR p_time::time >= cs.end_time THEN NULL
             ELSE LEAST(cs.tracked_hours,
                        1 + FLOOR(EXTRACT(EPOCH FROM (p_time::time - cs.start_time)) / 3600))::SMALLINT
           END
    FROM class_sessions cs
    WHERE cs.session_id = p_session_id;
$$ LANGUAGE sql STABLE;

-- 8. ATTESTATION: points of one student in one course
--    1st attestation 0-30, 2nd attestation 0-30, final exam 0-40 (total 0-100).
CREATE TABLE attestation (
    student_id     VARCHAR(15)  NOT NULL,
    course_code    VARCHAR(15)  NOT NULL,
    semester       VARCHAR(20)  NOT NULL,
    attestation_1  NUMERIC(4,1) CHECK (attestation_1 BETWEEN 0 AND 30),
    attestation_2  NUMERIC(4,1) CHECK (attestation_2 BETWEEN 0 AND 30),
    final_exam     NUMERIC(4,1) CHECK (final_exam BETWEEN 0 AND 40),
    updated_by     VARCHAR(100),
    updated_at     TIMESTAMP    NOT NULL DEFAULT LOCALTIMESTAMP(0),
    PRIMARY KEY (student_id, course_code, semester),
    -- points only for a student who is registered for this course in this semester
    CONSTRAINT fk_attestation_enrollment FOREIGN KEY (student_id, course_code, semester)
        REFERENCES enrollments (student_id, course_code, semester) ON DELETE CASCADE,
    -- the final exam is allowed only with at least 30 points for the two attestations
    CONSTRAINT chk_admitted_to_final CHECK (
        final_exam IS NULL
        OR (attestation_1 IS NOT NULL AND attestation_2 IS NOT NULL
            AND attestation_1 + attestation_2 >= 30))
);

-- Rule: points only for an APPROVED registration (a Pending one is not a student of the course yet)
CREATE FUNCTION check_attestation_enrollment() RETURNS TRIGGER AS $$
DECLARE
    st VARCHAR;
BEGIN
    SELECT status INTO st FROM enrollments
    WHERE student_id = NEW.student_id AND course_code = NEW.course_code AND semester = NEW.semester;
    IF st IS NULL THEN
        RAISE EXCEPTION 'Student % is not registered for % in %',
            NEW.student_id, NEW.course_code, NEW.semester
            USING ERRCODE = 'foreign_key_violation', CONSTRAINT = 'fk_attestation_enrollment';
    ELSIF st <> 'Approved' THEN
        RAISE EXCEPTION 'The registration of % for % is % (not approved yet)',
            NEW.student_id, NEW.course_code, st
            USING ERRCODE = 'UMS05';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attestation_enrollment
    BEFORE INSERT OR UPDATE ON attestation
    FOR EACH ROW EXECUTE FUNCTION check_attestation_enrollment();

-- Course registration with all checks. The backend calls only this function.
--   UMS01 = no free places, UMS02 = more than 21 credits, UMS03 = time clash,
--   23505 (unique_violation) = already registered, 23503 = student or course does not exist.
-- Example: SELECT * FROM register_for_course('24B031901', 'NET203', 'Fall 2026');
CREATE FUNCTION register_for_course(p_student VARCHAR, p_course VARCHAR, p_semester VARCHAR)
RETURNS enrollments AS $$
DECLARE
    c        courses%ROWTYPE;
    taken    INT;
    credits_now INT;
    clash    VARCHAR;
    result   enrollments%ROWTYPE;
BEGIN
    SELECT * INTO c FROM courses WHERE course_code = p_course FOR UPDATE;  -- lock: two students cannot take the last place
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course % does not exist', p_course USING ERRCODE = 'foreign_key_violation';
    END IF;

    SELECT COUNT(*) INTO taken FROM enrollments
    WHERE course_code = p_course AND semester = p_semester AND status IN ('Pending', 'Approved');
    IF taken >= c.max_places THEN
        RAISE EXCEPTION 'No free places in % (% of %)', p_course, taken, c.max_places USING ERRCODE = 'UMS01';
    END IF;

    SELECT COALESCE(SUM(co.credits), 0) INTO credits_now
    FROM enrollments e JOIN courses co ON co.course_code = e.course_code
    WHERE e.student_id = p_student AND e.semester = p_semester
      AND e.status IN ('Pending', 'Approved') AND e.course_code <> p_course;
    IF credits_now + c.credits > 21 THEN
        RAISE EXCEPTION 'Credit limit: % + % > 21', credits_now, c.credits USING ERRCODE = 'UMS02';
    END IF;

    SELECT co.course_code INTO clash
    FROM enrollments e JOIN courses co ON co.course_code = e.course_code
    WHERE e.student_id = p_student AND e.semester = p_semester
      AND e.status IN ('Pending', 'Approved') AND e.course_code <> p_course
      AND co.day_of_week = c.day_of_week
      AND co.start_time < c.end_time AND c.start_time < co.end_time
    LIMIT 1;
    IF clash IS NOT NULL THEN
        RAISE EXCEPTION 'Time clash with %', clash USING ERRCODE = 'UMS03';
    END IF;

    INSERT INTO enrollments (student_id, course_code, semester, status)
    VALUES (p_student, p_course, p_semester, 'Pending')
    RETURNING * INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Indexes (make search faster)
-- (session_id, student_id, hour_slot) is already indexed by uq_session_student_hour.
CREATE INDEX idx_attendance_student      ON attendance_records (student_id);
CREATE INDEX idx_enrollments_course_sem  ON enrollments (course_code, semester);
CREATE INDEX idx_sessions_course         ON class_sessions (course_code);
CREATE INDEX idx_enrollments_student     ON enrollments (student_id, semester);
CREATE INDEX idx_courses_room_day        ON courses (room_id, day_of_week);
