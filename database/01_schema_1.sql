-- =====================================================================
-- KBTU UMS (Team 39) - PostgreSQL schema
-- Author: Mubarak Nurlybay (Data and Database)
-- Based on the ERD on the "Database & ERD" page of our website.
-- The SQL on that page created only 3 tables, so this file adds
-- students, teachers, courses and enrollments.
-- Run order: 01_schema.sql -> 02_seed.sql -> 03_dashboards.sql -> 04_tests.sql
-- =====================================================================

DROP TABLE IF EXISTS attendance_records CASCADE;
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

-- 4. COURSES: every course has one main teacher
CREATE TABLE courses (
    course_code  VARCHAR(15)  PRIMARY KEY,
    title        VARCHAR(120) NOT NULL,
    credits      INT          NOT NULL CHECK (credits BETWEEN 1 AND 10),
    max_places   INT          NOT NULL CHECK (max_places > 0),
    teacher_id   VARCHAR(15)  NOT NULL REFERENCES teachers(teacher_id)
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
    CONSTRAINT uq_course_session_number UNIQUE (course_code, session_number)
);

-- 7. ATTENDANCE_RECORDS: one row = one check-in
CREATE TABLE attendance_records (
    attendance_id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id           VARCHAR(30)  NOT NULL REFERENCES class_sessions(session_id) ON DELETE CASCADE,
    student_id           VARCHAR(15)  NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
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
    -- one student can check in only once in one lesson
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id),
    -- if a teacher overrides, the reason must be written
    CONSTRAINT chk_override_reason CHECK (is_override = FALSE OR override_reason IS NOT NULL)
);

-- Indexes (make search faster)
-- (session_id, student_id) is already indexed by uq_session_student.
CREATE INDEX idx_attendance_student      ON attendance_records (student_id);
CREATE INDEX idx_enrollments_course_sem  ON enrollments (course_code, semester);
CREATE INDEX idx_sessions_course         ON class_sessions (course_code);
