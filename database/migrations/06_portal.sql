BEGIN;

CREATE TABLE IF NOT EXISTS portal_staff (
    username text PRIMARY KEY CHECK (username = lower(username)),
    full_name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL CHECK (role IN ('MANAGER', 'ADMIN'))
);

INSERT INTO portal_staff (username, full_name, email, role) VALUES
    ('m_askarova', 'Asel Askarova', 'm.askarova@kbtu.kz', 'MANAGER'),
    ('admin', 'KBTU System Administrator', 'admin@kbtu.kz', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS portal_credentials (
    username text PRIMARY KEY CHECK (username = lower(username)),
    password_hash text NOT NULL,
    must_change boolean NOT NULL DEFAULT false
);

ALTER TABLE portal_credentials ADD COLUMN IF NOT EXISTS must_change boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS portal_sessions (
    token_hash text PRIMARY KEY,
    username text NOT NULL REFERENCES portal_credentials(username) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS portal_sessions_user ON portal_sessions(username);
CREATE INDEX IF NOT EXISTS portal_sessions_expiry ON portal_sessions(expires_at);

CREATE TABLE IF NOT EXISTS portal_audit (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    username text NOT NULL,
    role text NOT NULL,
    action text NOT NULL,
    details text NOT NULL,
    status text NOT NULL DEFAULT 'SUCCESS'
);

CREATE TABLE IF NOT EXISTS portal_notifications (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient text NOT NULL,
    sender text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz
);
CREATE INDEX IF NOT EXISTS portal_notifications_recipient ON portal_notifications(recipient, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL,
    description text NOT NULL,
    starts_at timestamptz NOT NULL,
    volunteer boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS portal_event_registrations (
    event_id bigint REFERENCES portal_events(id) ON DELETE RESTRICT,
    student_id varchar(15) REFERENCES students(student_id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, student_id)
);

CREATE TABLE IF NOT EXISTS portal_profiles (
    username text PRIMARY KEY,
    phone text NOT NULL CHECK (char_length(phone) <= 40)
);

CREATE OR REPLACE VIEW portal_users AS
SELECT student_id::text AS id, lower(username)::text AS username, full_name::text AS full_name,
       email::text AS email, 'STUDENT'::text AS role, student_id, null::varchar AS teacher_id,
       major::text, year, null::text AS department
FROM students
UNION ALL
SELECT teacher_id, lower(username), full_name, email, 'TEACHER', null, teacher_id, null, null, department
FROM teachers
UNION ALL
SELECT 'staff:' || username, username, full_name, email, role, null, null, null, null, null FROM portal_staff;

ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS semester varchar(20) NOT NULL DEFAULT 'Fall 2026';

-- Express is the sole API for portal data. Keep Supabase client roles off the
-- academic tables and new authentication tables, including through existing views.
DO $$
DECLARE relation record;
DECLARE client_role text;
BEGIN
    FOR relation IN
        SELECT tablename AS name FROM pg_tables WHERE schemaname = current_schema()
        AND (tablename LIKE 'portal\_%' OR tablename IN
            ('students','teachers','rooms','courses','enrollments','class_sessions','attendance_records','attestation'))
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', relation.name);
        EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', relation.name);
    END LOOP;
    FOR relation IN
        SELECT viewname AS name FROM pg_views WHERE schemaname = current_schema()
        AND viewname IN ('v_at_risk_students','v_attendance_export','v_attendance_summary','v_attestation',
          'v_course_catalog','v_course_places','v_hourly_tracker','v_room_clashes','v_schedule_clashes',
          'v_session_stats','v_student_schedule','portal_users')
    LOOP
        EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', relation.name);
    END LOOP;
    FOR client_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        FOR relation IN
            SELECT tablename AS name FROM pg_tables WHERE schemaname = current_schema()
            AND (tablename LIKE 'portal\_%' OR tablename IN
                ('students','teachers','rooms','courses','enrollments','class_sessions','attendance_records','attestation'))
            UNION ALL
            SELECT viewname FROM pg_views WHERE schemaname = current_schema() AND viewname IN ('v_at_risk_students','v_attendance_export','v_attendance_summary','v_attestation',
              'v_course_catalog','v_course_places','v_hourly_tracker','v_room_clashes','v_schedule_clashes',
              'v_session_stats','v_student_schedule','portal_users')
        LOOP
            EXECUTE format('REVOKE ALL ON %I FROM %I', relation.name, client_role);
        END LOOP;
        EXECUTE format('REVOKE EXECUTE ON FUNCTION register_for_course(varchar, varchar, varchar) FROM %I', client_role);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION attendance_summary(date) FROM %I', client_role);
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_for_course(varchar, varchar, varchar) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION attendance_summary(date) FROM PUBLIC;

COMMIT;
