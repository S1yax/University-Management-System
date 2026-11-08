-- =====================================================================
-- Load test: 300 students check in to one lesson within 3 minutes.
-- Run after 01_schema.sql, 02_seed.sql and 03_dashboards.sql.
-- Every check prints PASS or FAIL in the Messages tab.
-- All changes are undone at the end (ROLLBACK), so you can run it again.
--
-- What it checks:
--   L1  300 check-ins are saved
--   L2  all 300 check-ins fit into a 3-minute window
--   L3  270 PRESENT and 30 REJECTED, and the status matches the distance
--   L4  300 repeated check-ins are all rejected by uq_session_student
--   L5  still exactly 300 rows after the duplicate attempts
--   L6  speed: inserting 300 rows takes less than 2 seconds
-- =====================================================================
BEGIN;

-- Haversine distance in meters (same formula as src/utils/geo.ts)
CREATE FUNCTION pg_temp.haversine_m(lat1 float8, lon1 float8, lat2 float8, lon2 float8)
RETURNS float8 LANGUAGE sql IMMUTABLE AS $$
    SELECT 6371000 * 2 * atan2(sqrt(a), sqrt(1 - a))
    FROM (
        SELECT sin(radians(lat2 - lat1) / 2) ^ 2
             + cos(radians(lat1)) * cos(radians(lat2))
             * sin(radians(lon2 - lon1) / 2) ^ 2 AS a
    ) t
$$;

-- 300 test students (ids LT0001 ... LT0300)
INSERT INTO students (student_id, username, full_name, email, major, year, gpa)
SELECT 'LT' || lpad(i::text, 4, '0'),
       'load_student_' || i,
       'Load Test Student ' || i,
       'load_student_' || i || '@kbtu.test',
       'IS', 1, 3.00
FROM generate_series(1, 300) AS i;

-- L1 + L2 + L6: 300 check-ins, one every 0.6 s = 3 minutes in total.
-- Every 10th student is far away (about 1.1 km), the other 270 are in the room.
DO $$
DECLARE
    t0       timestamptz;
    elapsed  numeric;
    c_lat    float8;
    c_lng    float8;
    n_total  INT;
    n_span   numeric;
BEGIN
    SELECT centroid_lat, centroid_lng INTO c_lat, c_lng
    FROM rooms WHERE room_id = 'room-301';

    t0 := clock_timestamp();

    INSERT INTO attendance_records (session_id, student_id, check_in_time,
                                    gps_latitude, gps_longitude,
                                    distance_to_center_m, verification_status, rejection_reason)
    SELECT 'ses-8',
           'LT' || lpad(i::text, 4, '0'),
           timestamp '2026-11-02 16:00:00' + (i * 0.6) * interval '1 second',
           lat, lng,
           round(d::numeric, 1),
           CASE WHEN d <= 150 THEN 'PRESENT' ELSE 'REJECTED' END,
           CASE WHEN d <= 150 THEN NULL ELSE 'Outside campus radius' END
    FROM (
        SELECT i, lat, lng, pg_temp.haversine_m(lat, lng, c_lat, c_lng) AS d
        FROM (
            SELECT i,
                   c_lat + CASE WHEN i % 10 = 0 THEN 0.010 ELSE (i % 7) * 0.0001 END AS lat,
                   c_lng + (i % 5) * 0.0001 AS lng
            FROM generate_series(1, 300) AS i
        ) p
    ) q;

    elapsed := extract(epoch FROM clock_timestamp() - t0);

    SELECT count(*), extract(epoch FROM max(check_in_time) - min(check_in_time))
    INTO n_total, n_span
    FROM attendance_records WHERE student_id LIKE 'LT%';

    IF n_total = 300 THEN
        RAISE NOTICE 'TEST L1 PASS: 300 check-ins saved';
    ELSE
        RAISE NOTICE 'TEST L1 FAIL: expected 300 rows, found %', n_total;
    END IF;

    IF n_span <= 180 THEN
        RAISE NOTICE 'TEST L2 PASS: all check-ins inside a 3-minute window (% s)', round(n_span, 1);
    ELSE
        RAISE NOTICE 'TEST L2 FAIL: window is % s', round(n_span, 1);
    END IF;

    IF elapsed < 2 THEN
        RAISE NOTICE 'TEST L6 PASS: 300 rows inserted in % s', round(elapsed, 3);
    ELSE
        RAISE NOTICE 'TEST L6 FAIL: insert took % s', round(elapsed, 3);
    END IF;
END $$;

-- L3: statuses match distances (270 PRESENT, 30 REJECTED, none inconsistent)
DO $$
DECLARE
    n_present  INT;
    n_rejected INT;
    n_wrong    INT;
BEGIN
    SELECT count(*) FILTER (WHERE verification_status = 'PRESENT'),
           count(*) FILTER (WHERE verification_status = 'REJECTED'),
           count(*) FILTER (WHERE (verification_status = 'PRESENT'  AND distance_to_center_m > 150)
                               OR (verification_status = 'REJECTED' AND distance_to_center_m <= 150))
    INTO n_present, n_rejected, n_wrong
    FROM attendance_records WHERE student_id LIKE 'LT%';

    IF n_present = 270 AND n_rejected = 30 AND n_wrong = 0 THEN
        RAISE NOTICE 'TEST L3 PASS: 270 PRESENT and 30 REJECTED, statuses match distances';
    ELSE
        RAISE NOTICE 'TEST L3 FAIL: present=%, rejected=%, inconsistent=%', n_present, n_rejected, n_wrong;
    END IF;
END $$;

-- L4: all 300 students try to check in a second time, every attempt must fail
DO $$
DECLARE
    i         INT;
    n_blocked INT := 0;
BEGIN
    FOR i IN 1..300 LOOP
        BEGIN
            INSERT INTO attendance_records (session_id, student_id, check_in_time,
                                            gps_latitude, gps_longitude,
                                            distance_to_center_m, verification_status)
            VALUES ('ses-8', 'LT' || lpad(i::text, 4, '0'),
                    '2026-11-02 16:04:00', 43.238960, 76.889712, 3.5, 'PRESENT');
        EXCEPTION WHEN unique_violation THEN
            n_blocked := n_blocked + 1;
        END;
    END LOOP;

    IF n_blocked = 300 THEN
        RAISE NOTICE 'TEST L4 PASS: 300 of 300 duplicate check-ins rejected (uq_session_student)';
    ELSE
        RAISE NOTICE 'TEST L4 FAIL: only % of 300 duplicates rejected', n_blocked;
    END IF;
END $$;

-- L5: the table still holds exactly 300 rows for these students
DO $$
DECLARE
    n INT;
BEGIN
    SELECT count(*) INTO n FROM attendance_records WHERE student_id LIKE 'LT%';
    IF n = 300 THEN
        RAISE NOTICE 'TEST L5 PASS: still exactly 300 rows after duplicate attempts';
    ELSE
        RAISE NOTICE 'TEST L5 FAIL: % rows', n;
    END IF;
END $$;

ROLLBACK;
