BEGIN;

CREATE TABLE IF NOT EXISTS portal_timetable_tasks (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id varchar(15) REFERENCES students(student_id) ON DELETE CASCADE,
    course_code varchar(15) REFERENCES courses(course_code) ON DELETE CASCADE,
    semester varchar(20) NOT NULL,
    title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
    kind text NOT NULL CHECK (kind IN ('SIS', 'TSIS', 'Assignment', 'Quiz', 'Other')),
    due_at timestamptz NOT NULL,
    demo_key text UNIQUE,
    CHECK (owner_id IS NOT NULL OR course_code IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS portal_timetable_tasks_owner ON portal_timetable_tasks (owner_id, semester);
CREATE INDEX IF NOT EXISTS portal_timetable_tasks_course ON portal_timetable_tasks (course_code, semester);

CREATE TABLE IF NOT EXISTS portal_timetable_progress (
    task_id bigint NOT NULL REFERENCES portal_timetable_tasks(id) ON DELETE CASCADE,
    student_id varchar(15) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    completed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, student_id)
);

CREATE OR REPLACE VIEW portal_timetable_student_tasks AS
WITH visible AS (
    SELECT t.*, t.owner_id AS student_id
    FROM portal_timetable_tasks t WHERE t.owner_id IS NOT NULL
    UNION ALL
    SELECT t.*, e.student_id FROM portal_timetable_tasks t JOIN enrollments e USING (course_code, semester)
    WHERE t.owner_id IS NULL AND e.status = 'Approved'
)
SELECT v.id, v.student_id, v.owner_id, v.semester, v.course_code, v.title, v.kind, v.due_at,
       v.demo_key, p.completed_at
FROM visible v LEFT JOIN portal_timetable_progress p ON (p.task_id, p.student_id) = (v.id, v.student_id);

ALTER TABLE portal_notifications ADD COLUMN IF NOT EXISTS timetable_key text;
CREATE UNIQUE INDEX IF NOT EXISTS portal_timetable_notification_once ON portal_notifications (recipient, timetable_key);

ALTER TABLE portal_timetable_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_timetable_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON portal_timetable_tasks, portal_timetable_progress, portal_timetable_student_tasks FROM PUBLIC;

DO $$
DECLARE role_name text;
BEGIN
    FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        EXECUTE format('REVOKE ALL ON portal_timetable_tasks, portal_timetable_progress, portal_timetable_student_tasks FROM %I', role_name);
    END LOOP;
END;
$$;

COMMIT;
