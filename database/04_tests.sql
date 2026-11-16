-- =====================================================================
-- Database tests. Run after 03_dashboards.sql.
-- Every test prints PASS or FAIL in the Messages tab.
-- All changes are undone at the end (ROLLBACK), so you can run it again.
--
-- Version 2 (16.11): tests 1-8 check the every-hour tracker.
-- Students used below:
--   24B031926 = Saniya,  24B031901 = Mubarak,  24B031787 = Amir
-- ses-8 = BIS201 week 8, Monday 02.11, 16:00-19:00, tracked every hour
-- ses-1 = BIS201 week 1, tracked once per lesson
-- =====================================================================
BEGIN;

-- TEST 1: the tracker shows every hour of ses-8 like the website
DO $$
DECLARE
    sa RECORD; mu RECORD; am RECORD;
BEGIN
    SELECT * INTO sa FROM v_hourly_tracker WHERE session_id = 'ses-8' AND student_id = '24B031926';
    SELECT * INTO mu FROM v_hourly_tracker WHERE session_id = 'ses-8' AND student_id = '24B031901';
    SELECT * INTO am FROM v_hourly_tracker WHERE session_id = 'ses-8' AND student_id = '24B031787';
    IF sa.hours_present = 3
       AND mu.hour_1 = 'PRESENT' AND mu.hour_2 = 'NO_CHECK_IN' AND mu.hours_present = 1
       AND am.hour_1 = 'REJECTED' AND am.hours_present = 0 THEN
        RAISE NOTICE 'TEST 1 PASS: tracker ses-8: Saniya 3/3, Mubarak 1/3, Amir hour 1 REJECTED';
    ELSE
        RAISE NOTICE 'TEST 1 FAIL: Saniya %/3, Mubarak % % (%/3), Amir %',
            sa.hours_present, mu.hour_1, mu.hour_2, mu.hours_present, am.hour_1;
    END IF;
END $$;

-- TEST 2: attendance at the end of week 8 counts hours, the same as the website
--   Mubarak BIS201: weeks 1-7 = 4 of 7, week 8 = 1 of 3 hours -> 5 of 10 = 50%
DO $$
DECLARE
    r RECORD;
BEGIN
    SELECT * INTO r FROM attendance_summary(DATE '2026-11-08')
    WHERE student_id = '24B031901' AND course_code = 'BIS201';
    IF r.points_present = 5 AND r.points_total = 10 AND r.attendance_pct = 50.0 THEN
        RAISE NOTICE 'TEST 2 PASS: Mubarak BIS201 = 5 of 10 points = 50.0%% (website shows 50%%)';
    ELSE
        RAISE NOTICE 'TEST 2 FAIL: got % of % = %', r.points_present, r.points_total, r.attendance_pct;
    END IF;
END $$;

-- TEST 3: the database knows which hour it is
DO $$
BEGIN
    IF hour_slot_for('ses-8', '2026-11-02 16:00') = 1
       AND hour_slot_for('ses-8', '2026-11-02 17:20') = 2
       AND hour_slot_for('ses-8', '2026-11-02 18:59') = 3
       AND hour_slot_for('ses-8', '2026-11-02 19:00') IS NULL
       AND hour_slot_for('ses-8', '2026-11-03 17:20') IS NULL THEN
        RAISE NOTICE 'TEST 3 PASS: 16:00 -> hour 1, 17:20 -> hour 2, 18:59 -> hour 3, 19:00 and another day -> none';
    ELSE
        RAISE NOTICE 'TEST 3 FAIL: hour_slot_for gives wrong hours';
    END IF;
END $$;

-- TEST 4: a check-in for hour 2 is saved
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '24B031901', 2, '2026-11-02 17:04:00', 43.255330, 76.943100, 3.0, 'PRESENT');
    RAISE NOTICE 'TEST 4 PASS: Mubarak hour 2 check-in saved';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4 FAIL: %', SQLERRM;
END $$;

-- TEST 5: a second check-in for the same hour is rejected
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '24B031901', 2, '2026-11-02 17:30:00', 43.255330, 76.943100, 3.0, 'PRESENT');
    RAISE NOTICE 'TEST 5 FAIL: two check-ins for the same hour were saved';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 5 PASS: same hour twice rejected (uq_session_student_hour)';
END $$;

-- TEST 6: the next hour is a new check-in, not a duplicate
DO $$
DECLARE
    n INT;
BEGIN
    INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '24B031901', 3, '2026-11-02 18:02:00', 43.255330, 76.943100, 3.0, 'PRESENT');
    SELECT hours_present INTO n FROM v_hourly_tracker WHERE session_id = 'ses-8' AND student_id = '24B031901';
    IF n = 3 THEN
        RAISE NOTICE 'TEST 6 PASS: hour 3 saved, tracker now shows Mubarak 3/3';
    ELSE
        RAISE NOTICE 'TEST 6 FAIL: tracker shows %/3', n;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 6 FAIL: %', SQLERRM;
END $$;

-- TEST 7: hour 4 does not exist
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '24B031787', 4, '2026-11-02 19:10:00', 43.255330, 76.943100, 3.0, 'PRESENT');
    RAISE NOTICE 'TEST 7 FAIL: hour 4 was saved';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 7 PASS: hour 4 rejected (CHECK hour_slot 1-3)';
END $$;

-- TEST 8: a lesson tracked once cannot get a check-in for hour 2
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-1', '24B031901', 2, '2026-09-07 17:05:00', 43.255330, 76.943100, 3.0, 'PRESENT');
    RAISE NOTICE 'TEST 8 FAIL: hour 2 saved for a lesson tracked once';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 8 PASS: hour 2 in ses-1 rejected (trigger: lesson has only 1 tracked hour)';
END $$;

-- TEST 9: a check-in for a student who does not exist is rejected
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '99X999999', 1, '2026-11-02 16:06:00', 43.255330, 76.943100, 3.0, 'PRESENT');
    RAISE NOTICE 'TEST 9 FAIL: check-in for an unknown student was saved';
EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'TEST 9 PASS: unknown student rejected (foreign key)';
END $$;

-- TEST 10: a status that is not allowed is rejected
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status)
    VALUES ('ses-8', '24B031787', 2, '2026-11-02 17:06:00', 43.255330, 76.943100, 3.0, 'MAYBE');
    RAISE NOTICE 'TEST 10 FAIL: status MAYBE was saved';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 10 PASS: status MAYBE rejected (CHECK)';
END $$;

-- TEST 11: the same student cannot register for the same course twice in one semester
DO $$
BEGIN
    INSERT INTO enrollments (student_id, course_code, semester, status)
    VALUES ('24B031901', 'BIS201', 'Fall 2026', 'Pending');
    RAISE NOTICE 'TEST 11 FAIL: duplicate registration was saved';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 11 PASS: duplicate registration rejected (uq_student_course_semester)';
END $$;

-- TEST 12: a teacher override without a reason is rejected
DO $$
BEGIN
    INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status, is_override, override_by)
    VALUES ('ses-8', '24B031787', 2, '2026-11-02 17:10:00', 43.264000, 76.953500, 980.0, 'PRESENT', TRUE, 'Ainur Issabek');
    RAISE NOTICE 'TEST 12 FAIL: override without a reason was saved';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 12 PASS: override without a reason rejected (chk_override_reason)';
END $$;

-- TEST 13: deleting a lesson also deletes its check-ins (ON DELETE CASCADE)
DO $$
DECLARE
    n INT;
BEGIN
    DELETE FROM class_sessions WHERE session_id = 'ses-1';
    SELECT COUNT(*) INTO n FROM attendance_records WHERE session_id = 'ses-1';
    IF n = 0 THEN
        RAISE NOTICE 'TEST 13 PASS: ses-1 deleted together with its 5 check-ins';
    ELSE
        RAISE NOTICE 'TEST 13 FAIL: % check-ins left', n;
    END IF;
END $$;

ROLLBACK;
