-- =====================================================================
-- Database tests. Run after 03_dashboards.sql.
-- Every test prints PASS or FAIL in the Messages tab.
-- All changes are undone at the end (ROLLBACK), so you can run it again.
-- =====================================================================
BEGIN;

-- TEST 1: a valid check-in is saved
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '24B031926', '2026-11-02 16:03:00', 43.238960, 76.889712, 3.5, 'PRESENT');
    RAISE NOTICE 'TEST 1 PASS: a valid check-in is saved';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 1 FAIL: %', SQLERRM;
END $$;

-- TEST 2: a second check-in to the same lesson is rejected
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '24B031926', '2026-11-02 16:05:00', 43.238960, 76.889712, 3.5, 'PRESENT');
    RAISE NOTICE 'TEST 2 FAIL: duplicate check-in was saved';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 2 PASS: duplicate check-in rejected (uq_session_student)';
END $$;

-- TEST 3: a check-in for a student who does not exist is rejected
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '99X999999', '2026-11-02 16:06:00', 43.238960, 76.889712, 3.5, 'PRESENT');
    RAISE NOTICE 'TEST 3 FAIL: check-in for an unknown student was saved';
EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'TEST 3 PASS: unknown student rejected (foreign key)';
END $$;

-- TEST 4: a status that is not allowed is rejected
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '25B032145', '2026-11-02 16:06:00', 43.238960, 76.889712, 3.5, 'MAYBE');
    RAISE NOTICE 'TEST 4 FAIL: status MAYBE was saved';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 4 PASS: wrong status rejected (CHECK)';
END $$;

-- TEST 5: registering twice for the same course in one semester is rejected
DO $$
BEGIN
    INSERT INTO enrollments (student_id, course_code, semester) VALUES ('24B031926', 'BIS201', 'Fall 2026');
    RAISE NOTICE 'TEST 5 FAIL: duplicate registration was saved';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 5 PASS: duplicate registration rejected (uq_student_course_semester)';
END $$;

-- TEST 6: a teacher override without a reason is rejected
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status, is_override)
    VALUES ('ses-8', '24B031901', '2026-11-02 16:10:00', 43.245000, 76.896500, 830.0, 'PRESENT', TRUE);
    RAISE NOTICE 'TEST 6 FAIL: override without a reason was saved';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 6 PASS: override without a reason rejected';
END $$;

-- TEST 7: the dashboard gives the same number as the website (Mubarak: 57.1%)
DO $$
DECLARE pct NUMERIC;
BEGIN
    SELECT attendance_pct INTO pct FROM v_attendance_summary
    WHERE student_id = '24B031901' AND course_code = 'BIS201';
    IF pct = 57.1 THEN
        RAISE NOTICE 'TEST 7 PASS: attendance of Mubarak in BIS201 = % (same as website)', pct;
    ELSE
        RAISE NOTICE 'TEST 7 FAIL: expected 57.1, got %', pct;
    END IF;
END $$;

-- TEST 8: deleting a lesson also deletes its check-ins (ON DELETE CASCADE)
DO $$
DECLARE before_count INT; after_count INT;
BEGIN
    SELECT COUNT(*) INTO before_count FROM attendance_records WHERE session_id = 'ses-1';
    DELETE FROM class_sessions WHERE session_id = 'ses-1';
    SELECT COUNT(*) INTO after_count FROM attendance_records WHERE session_id = 'ses-1';
    IF before_count > 0 AND after_count = 0 THEN
        RAISE NOTICE 'TEST 8 PASS: % check-ins deleted together with the lesson (CASCADE)', before_count;
    ELSE
        RAISE NOTICE 'TEST 8 FAIL: before %, after %', before_count, after_count;
    END IF;
END $$;

ROLLBACK;  -- undo all test changes
