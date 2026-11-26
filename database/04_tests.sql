-- =====================================================================
-- Database tests. Run after 03_dashboards.sql.
-- Every test prints PASS or FAIL in the Messages tab.
-- All changes are undone at the end (ROLLBACK), so you can run it again.
--
-- Version 2 (16.11): tests 1-8 check the every-hour tracker.
-- Version 3 (23.11): tests 14-27 check course registration, the schedule and attestation.
-- Version 4 (26.11): tests 28-37 check the login accounts and passwords.
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

-- =====================================================================
-- Version 3: course registration, schedule, attestation
-- Mubarak now: BIS201 (Mon), CS101 (Wed), DB202 (Tue 14-17) = 10 credits
-- Saniya now:  BIS201, CS101, DB202, NET203, MATH101       = 16 credits
-- =====================================================================

-- TEST 14: the catalog has all 8 subjects with free places
DO $$
DECLARE n INT; free INT;
BEGIN
    SELECT COUNT(*) INTO n FROM v_course_catalog;
    SELECT free_places INTO free FROM v_course_catalog WHERE course_code = 'DB202';
    IF n = 8 AND free = 31 THEN
        RAISE NOTICE 'TEST 14 PASS: catalog has 8 subjects, DB202 has 31 of 35 places free';
    ELSE
        RAISE NOTICE 'TEST 14 FAIL: % subjects, DB202 free = %', n, free;
    END IF;
END $$;

-- TEST 15: a new registration is saved as Pending
DO $$
DECLARE r enrollments;
BEGIN
    r := register_for_course('24B031901', 'NET203', 'Fall 2026');
    IF r.status = 'Pending' THEN
        RAISE NOTICE 'TEST 15 PASS: Mubarak registered for NET203, status Pending';
    ELSE
        RAISE NOTICE 'TEST 15 FAIL: status %', r.status;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 15 FAIL: %', SQLERRM;
END $$;

-- TEST 16: the same registration again is rejected
DO $$
BEGIN
    PERFORM register_for_course('24B031901', 'NET203', 'Fall 2026');
    RAISE NOTICE 'TEST 16 FAIL: second registration saved';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 16 PASS: same course twice rejected (uq_student_course_semester)';
END $$;

-- TEST 17: a course at the same time as another course is rejected
DO $$
BEGIN
    PERFORM register_for_course('24B031901', 'IS202', 'Fall 2026');
    RAISE NOTICE 'TEST 17 FAIL: IS202 saved although it clashes with DB202';
EXCEPTION WHEN SQLSTATE 'UMS03' THEN
    RAISE NOTICE 'TEST 17 PASS: IS202 (Tue 16-19) rejected, clash with DB202 (Tue 14-17): %', SQLERRM;
END $$;

-- TEST 18: more than 21 credits is rejected
DO $$
BEGIN
    PERFORM register_for_course('24B031926', 'FIN201', 'Fall 2026');   -- 16 + 3 = 19, allowed
    PERFORM register_for_course('24B031926', 'IS202', 'Fall 2026');    -- 19 + 4 = 23
    RAISE NOTICE 'TEST 18 FAIL: 23 credits saved';
EXCEPTION WHEN SQLSTATE 'UMS02' THEN
    RAISE NOTICE 'TEST 18 PASS: Saniya FIN201 saved (19 credits), IS202 rejected: %', SQLERRM;
END $$;

-- TEST 19: a full course is rejected
DO $$
BEGIN
    UPDATE courses SET max_places = 1 WHERE course_code = 'ENG102';
    PERFORM register_for_course('24B031901', 'ENG102', 'Fall 2026');   -- takes the only place
    PERFORM register_for_course('24B031787', 'ENG102', 'Fall 2026');
    RAISE NOTICE 'TEST 19 FAIL: second student saved in a full course';
EXCEPTION WHEN SQLSTATE 'UMS01' THEN
    RAISE NOTICE 'TEST 19 PASS: ENG102 with 1 place: Mubarak saved, Amir rejected: %', SQLERRM;
END $$;

-- TEST 20: a course that does not exist is rejected
DO $$
BEGIN
    PERFORM register_for_course('24B031901', 'XYZ999', 'Fall 2026');
    RAISE NOTICE 'TEST 20 FAIL: unknown course saved';
EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'TEST 20 PASS: unknown course XYZ999 rejected';
END $$;

-- TEST 21: points for a registration that is not approved yet are rejected
DO $$
BEGIN
    INSERT INTO attestation (student_id, course_code, semester, attestation_1)
    VALUES ('24B031901', 'NET203', 'Fall 2026', 20);
    RAISE NOTICE 'TEST 21 FAIL: points saved for a Pending registration';
EXCEPTION WHEN SQLSTATE 'UMS05' THEN
    RAISE NOTICE 'TEST 21 PASS: points for Pending NET203 rejected (trigger)';
END $$;

-- TEST 22: more than 30 points for one attestation is rejected
DO $$
BEGIN
    INSERT INTO attestation (student_id, course_code, semester, attestation_1)
    VALUES ('24B031901', 'BIS201', 'Fall 2026', 31);
    RAISE NOTICE 'TEST 22 FAIL: 31 points saved';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 22 PASS: 31 points for the 1st attestation rejected (CHECK 0-30)';
END $$;

-- TEST 23: the final exam without 30 attestation points is rejected
DO $$
BEGIN
    INSERT INTO attestation (student_id, course_code, semester, attestation_1, attestation_2, final_exam)
    VALUES ('24B031901', 'BIS201', 'Fall 2026', 10, 15, 30);
    RAISE NOTICE 'TEST 23 FAIL: final exam saved with 25 attestation points';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 23 PASS: final exam with 10 + 15 = 25 points rejected (chk_admitted_to_final)';
END $$;

-- TEST 24: the final exam gives the total and the letter grade
DO $$
DECLARE v RECORD;
BEGIN
    UPDATE attestation SET final_exam = 38
    WHERE student_id = '24B031926' AND course_code = 'BIS201';
    SELECT * INTO v FROM v_attestation WHERE student_id = '24B031926' AND course_code = 'BIS201';
    IF v.total = 93.5 AND v.letter = 'A-' THEN
        RAISE NOTICE 'TEST 24 PASS: Saniya BIS201 28.5 + 27 + 38 = 93.5 = A-';
    ELSE
        RAISE NOTICE 'TEST 24 FAIL: total %, letter %', v.total, v.letter;
    END IF;
END $$;

-- TEST 25: the grade scale
DO $$
BEGIN
    IF (letter_grade(95)).letter = 'A' AND (letter_grade(87)).letter = 'B+'
       AND (letter_grade(50)).letter = 'D' AND (letter_grade(49.9)).letter = 'F'
       AND (letter_grade(87)).gpa_points = 3.33 THEN
        RAISE NOTICE 'TEST 25 PASS: 95 = A, 87 = B+ (3.33), 50 = D, 49.9 = F';
    ELSE
        RAISE NOTICE 'TEST 25 FAIL: grade scale is wrong';
    END IF;
END $$;

-- TEST 26: the timetable problems are found
DO $$
DECLARE rooms INT; students INT;
BEGIN
    SELECT COUNT(*) INTO rooms FROM v_room_clashes WHERE course_1 = 'DB202' AND course_2 = 'IS202';
    SELECT COUNT(*) INTO students FROM v_schedule_clashes WHERE course_1 = 'DB202' AND course_2 = 'IS202';
    IF rooms = 1 AND students = 2 THEN
        RAISE NOTICE 'TEST 26 PASS: Lab 204 is double-booked on Tue 16-17 (DB202, IS202), 2 students have this clash';
    ELSE
        RAISE NOTICE 'TEST 26 FAIL: room clashes %, student clashes %', rooms, students;
    END IF;
END $$;

-- TEST 27: deleting a registration also deletes its points (ON DELETE CASCADE)
DO $$
DECLARE n INT;
BEGIN
    DELETE FROM enrollments WHERE student_id = '24B031926' AND course_code = 'CS101';
    SELECT COUNT(*) INTO n FROM attestation WHERE student_id = '24B031926' AND course_code = 'CS101';
    IF n = 0 THEN
        RAISE NOTICE 'TEST 27 PASS: Saniya CS101 registration deleted together with its points';
    ELSE
        RAISE NOTICE 'TEST 27 FAIL: % rows of points left', n;
    END IF;
END $$;

-- TEST 28: every user of the website has one login account, without a password yet
DO $$
DECLARE total INT; st INT; te INT; other INT; no_pw INT; wrong INT;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE role = 'STUDENT'), COUNT(*) FILTER (WHERE role = 'TEACHER'),
           COUNT(*) FILTER (WHERE role IN ('MANAGER', 'ADMIN')), COUNT(*) FILTER (WHERE password_hash IS NULL)
    INTO total, st, te, other, no_pw FROM user_credentials;
    -- the login of a student or teacher is the same as in the students / teachers table
    SELECT COUNT(*) INTO wrong FROM user_credentials u
    LEFT JOIN students s ON s.student_id = u.student_id
    LEFT JOIN teachers t ON t.teacher_id = u.teacher_id
    WHERE u.username <> COALESCE(s.username, t.username, u.username);
    IF total = 17 AND st = 10 AND te = 5 AND other = 2 AND no_pw = 17 AND wrong = 0 THEN
        RAISE NOTICE 'TEST 28 PASS: 17 accounts (10 students, 5 teachers, manager, admin), no passwords yet, logins match';
    ELSE
        RAISE NOTICE 'TEST 28 FAIL: total % students % teachers % other % without password % wrong logins %',
            total, st, te, other, no_pw, wrong;
    END IF;
END $$;

-- TEST 29: a student account must point to a student, a teacher account to a teacher
DO $$
DECLARE ok INT := 0;
BEGIN
    BEGIN
        INSERT INTO user_credentials (username, role) VALUES ('x_student', 'STUDENT');
    EXCEPTION WHEN check_violation THEN ok := ok + 1;
    END;
    BEGIN
        INSERT INTO user_credentials (username, role, student_id) VALUES ('x_teacher', 'TEACHER', '24B031901');
    EXCEPTION WHEN check_violation THEN ok := ok + 1;
    END;
    BEGIN
        INSERT INTO user_credentials (username, role) VALUES ('x_boss', 'DEAN');
    EXCEPTION WHEN check_violation THEN ok := ok + 1;
    END;
    IF ok = 3 THEN
        RAISE NOTICE 'TEST 29 PASS: student without student_id, teacher with student_id and role DEAN rejected';
    ELSE
        RAISE NOTICE 'TEST 29 FAIL: only % of 3 wrong accounts rejected', ok;
    END IF;
END $$;

-- TEST 30: an account for an unknown student or a second account for the same student is rejected
DO $$
DECLARE ok INT := 0;
BEGIN
    BEGIN
        INSERT INTO user_credentials (username, role, student_id) VALUES ('x_ghost', 'STUDENT', '99B000000');
    EXCEPTION WHEN foreign_key_violation THEN ok := ok + 1;
    END;
    BEGIN
        INSERT INTO user_credentials (username, role, student_id) VALUES ('m_nurlybay2', 'STUDENT', '24B031901');
    EXCEPTION WHEN unique_violation THEN ok := ok + 1;
    END;
    IF ok = 2 THEN
        RAISE NOTICE 'TEST 30 PASS: unknown student and a 2nd account for Mubarak rejected';
    ELSE
        RAISE NOTICE 'TEST 30 FAIL: only % of 2 rejected', ok;
    END IF;
END $$;

-- TEST 31: a hash without its salt is rejected
DO $$
BEGIN
    UPDATE user_credentials SET password_hash = 'aGFzaA==' WHERE username = 'm_nurlybay';
    RAISE NOTICE 'TEST 31 FAIL: a hash without salt was saved';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 31 PASS: hash without salt, iterations and date rejected (chk_password_parts)';
END $$;

-- TEST 32: the first password is saved, the history stays empty
DO $$
DECLARE acc user_credentials; n INT;
BEGIN
    acc := set_password('m_nurlybay', 'hash-1', 'salt-1', 210000);
    SELECT COUNT(*) INTO n FROM password_history WHERE username = 'm_nurlybay';
    IF acc.password_hash = 'hash-1' AND acc.salt = 'salt-1' AND acc.iterations = 210000
       AND acc.password_changed_at IS NOT NULL AND n = 0 THEN
        RAISE NOTICE 'TEST 32 PASS: first password of Mubarak saved, history empty';
    ELSE
        RAISE NOTICE 'TEST 32 FAIL: hash %, history %', acc.password_hash, n;
    END IF;
END $$;

-- TEST 33: after 3 more changes only the 2 previous passwords are kept (current + 2 = last 3)
DO $$
DECLARE acc user_credentials; kept TEXT;
BEGIN
    PERFORM set_password('m_nurlybay', 'hash-2', 'salt-2', 210000);
    PERFORM set_password('m_nurlybay', 'hash-3', 'salt-3', 210000);
    acc := set_password('m_nurlybay', 'hash-4', 'salt-4', 210000);
    SELECT string_agg(password_hash, ',' ORDER BY history_id DESC) INTO kept
    FROM password_history WHERE username = 'm_nurlybay';
    IF acc.password_hash = 'hash-4' AND kept = 'hash-3,hash-2' THEN
        RAISE NOTICE 'TEST 33 PASS: current hash-4, history hash-3, hash-2 (hash-1 forgotten)';
    ELSE
        RAISE NOTICE 'TEST 33 FAIL: current %, history %', acc.password_hash, kept;
    END IF;
END $$;

-- TEST 34: the 5th wrong password locks the login for 30 seconds
DO $$
DECLARE acc user_credentials; after4 user_credentials;
BEGIN
    PERFORM login_failed('a_bagdat');
    PERFORM login_failed('a_bagdat');
    PERFORM login_failed('a_bagdat');
    after4 := login_failed('a_bagdat');
    acc := login_failed('a_bagdat');
    IF after4.failed_attempts = 4 AND after4.locked_until IS NULL
       AND acc.failed_attempts = 5 AND acc.locked_until = now() + INTERVAL '30 seconds' THEN
        RAISE NOTICE 'TEST 34 PASS: 4 mistakes - not locked, 5th mistake - locked for 30 s';
    ELSE
        RAISE NOTICE 'TEST 34 FAIL: after 4: % %, after 5: % %',
            after4.failed_attempts, after4.locked_until, acc.failed_attempts, acc.locked_until;
    END IF;
END $$;

-- TEST 35: while locked, more mistakes do not extend the lock; after the lock the count starts again
DO $$
DECLARE locked user_credentials; again user_credentials;
BEGIN
    locked := login_failed('a_bagdat');                          -- 6th mistake, still locked
    UPDATE user_credentials SET locked_until = now() - INTERVAL '1 second' WHERE username = 'a_bagdat';
    again := login_failed('a_bagdat');                           -- lock is over
    IF locked.failed_attempts = 5 AND locked.locked_until = now() + INTERVAL '30 seconds'
       AND again.failed_attempts = 1 AND again.locked_until IS NULL THEN
        RAISE NOTICE 'TEST 35 PASS: 6th mistake while locked not counted; after the lock the count is 1';
    ELSE
        RAISE NOTICE 'TEST 35 FAIL: locked % %, after lock % %',
            locked.failed_attempts, locked.locked_until, again.failed_attempts, again.locked_until;
    END IF;
END $$;

-- TEST 36: a correct password clears the mistakes; an unknown login cannot get a password
DO $$
DECLARE n INT; ok BOOLEAN := false;
BEGIN
    PERFORM login_ok('a_bagdat');
    SELECT failed_attempts INTO n FROM user_credentials WHERE username = 'a_bagdat';
    BEGIN
        PERFORM set_password('nobody', 'hash', 'salt', 210000);
    EXCEPTION WHEN foreign_key_violation THEN ok := true;
    END;
    IF n = 0 AND ok AND login_failed('nobody') IS NULL THEN
        RAISE NOTICE 'TEST 36 PASS: login_ok resets mistakes to 0; unknown login rejected';
    ELSE
        RAISE NOTICE 'TEST 36 FAIL: mistakes %, unknown login rejected %', n, ok;
    END IF;
END $$;

-- TEST 37: deleting a student also deletes the account and its password history (ON DELETE CASCADE)
DO $$
DECLARE a INT; h INT;
BEGIN
    DELETE FROM students WHERE student_id = '24B031901';
    SELECT COUNT(*) INTO a FROM user_credentials WHERE username = 'm_nurlybay';
    SELECT COUNT(*) INTO h FROM password_history WHERE username = 'm_nurlybay';
    IF a = 0 AND h = 0 THEN
        RAISE NOTICE 'TEST 37 PASS: Mubarak deleted together with his account and 2 old passwords';
    ELSE
        RAISE NOTICE 'TEST 37 FAIL: % accounts and % old passwords left', a, h;
    END IF;
END $$;

ROLLBACK;
