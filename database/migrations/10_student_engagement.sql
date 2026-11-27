BEGIN;

ALTER TABLE portal_events ADD COLUMN IF NOT EXISTS demo_key text UNIQUE;
ALTER TABLE portal_notifications ADD COLUMN IF NOT EXISTS demo_key text;
CREATE UNIQUE INDEX IF NOT EXISTS portal_notification_demo_once ON portal_notifications (recipient, demo_key);

CREATE TABLE IF NOT EXISTS portal_survey_participation (
    student_id varchar(15) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_code varchar(15) NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    semester varchar(20) NOT NULL,
    PRIMARY KEY (student_id, course_code, semester)
);

CREATE TABLE IF NOT EXISTS portal_survey_responses (
    response_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_code varchar(15) NOT NULL REFERENCES courses(course_code) ON DELETE CASCADE,
    semester varchar(20) NOT NULL,
    clarity smallint NOT NULL CHECK (clarity BETWEEN 1 AND 5),
    materials smallint NOT NULL CHECK (materials BETWEEN 1 AND 5),
    workload smallint NOT NULL CHECK (workload BETWEEN 1 AND 5),
    feedback text NOT NULL CHECK (char_length(feedback) <= 500)
);

-- Stable examples for the demo screens. Academic records stay in attestation.
CREATE OR REPLACE VIEW portal_grade_examples AS
SELECT e.student_id, e.course_code, e.semester,
       p.a1 AS attestation_1, p.a2 AS attestation_2, p.exam AS final_exam,
       p.a1 + p.a2 AS rating, p.a1 + p.a2 + p.exam AS total,
       (letter_grade((p.a1 + p.a2 + p.exam)::numeric)).letter AS letter,
       (letter_grade((p.a1 + p.a2 + p.exam)::numeric)).gpa_points AS gpa_points
FROM enrollments e
CROSS JOIN LATERAL (
    SELECT decode(md5(e.student_id || '/' || e.course_code || '/' || e.semester), 'hex') AS seed
) h
CROSS JOIN LATERAL (
    SELECT 21 + get_byte(h.seed, 0) % 10 AS a1,
           20 + get_byte(h.seed, 1) % 11 AS a2,
           28 + get_byte(h.seed, 2) % 13 AS exam
) p
WHERE e.status = 'Approved';

ALTER TABLE portal_survey_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_survey_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON portal_survey_participation, portal_survey_responses, portal_grade_examples FROM PUBLIC;

DO $$
DECLARE role_name text;
BEGIN
    FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        EXECUTE format('REVOKE ALL ON portal_survey_participation, portal_survey_responses, portal_grade_examples FROM %I', role_name);
    END LOOP;
END;
$$;

COMMIT;
