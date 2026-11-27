BEGIN;

CREATE OR REPLACE FUNCTION register_for_course(p_student VARCHAR, p_course VARCHAR, p_semester VARCHAR)
RETURNS enrollments AS $$
DECLARE
    c        courses%ROWTYPE;
    taken    INT;
    credits_now INT;
    clash    VARCHAR;
    result   enrollments%ROWTYPE;
BEGIN
    PERFORM 1 FROM students WHERE student_id = p_student FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student does not exist' USING ERRCODE = 'foreign_key_violation';
    END IF;
    SELECT * INTO c FROM courses WHERE course_code = p_course FOR UPDATE;  -- lock: two students cannot take the last place
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Course % does not exist', p_course USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF EXISTS (SELECT 1 FROM enrollments WHERE student_id = p_student AND course_code = p_course AND semester = p_semester) THEN
        RAISE EXCEPTION 'Already registered' USING ERRCODE = 'unique_violation';
    END IF;

    SELECT COUNT(*) INTO taken FROM enrollments
    WHERE course_code = p_course AND semester = p_semester AND status IN ('Pending', 'Approved');
    IF taken >= c.max_places THEN
        RAISE EXCEPTION 'No free places in % (% of %)', p_course, taken, c.max_places USING ERRCODE = 'UMS01';
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

    SELECT COALESCE(SUM(COALESCE(co.ects_credits, co.credits)), 0) INTO credits_now
    FROM enrollments e JOIN courses co ON co.course_code = e.course_code
    WHERE e.student_id = p_student AND e.semester = p_semester
      AND e.status IN ('Pending', 'Approved') AND e.course_code <> p_course;
    IF credits_now + COALESCE(c.ects_credits, c.credits) > 21 THEN
        RAISE EXCEPTION 'ECTS limit: % + % > 21', credits_now, COALESCE(c.ects_credits, c.credits) USING ERRCODE = 'UMS02';
    END IF;

    INSERT INTO enrollments (student_id, course_code, semester, status)
    VALUES (p_student, p_course, p_semester, 'Pending')
    RETURNING * INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_sessions_semester_course ON class_sessions (semester, course_code);

COMMIT;
