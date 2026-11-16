# Database (PostgreSQL)

Author: **Mubarak Nurlybay** (Data and Database), Team 39

The real database for our KBTU UMS website. It follows the ERD on the
"Database & ERD" page. The SQL on that page created only 3 tables, so
this version adds `students`, `teachers`, `courses` and `enrollments`.

## Version 2 (16.11): every-hour tracker

A 3-hour lesson (Mon 16:00–19:00) now has a check-in for every hour, the same as the website (`hourSlot` 1, 2, 3).

- `class_sessions.tracked_hours`: 1 = one check-in per lesson (weeks 1–7), 3 = every hour (from week 8)
- `attendance_records.hour_slot`: 1 = 16:00–17:00, 2 = 17:00–18:00, 3 = 18:00–19:00
- The unique rule changed from `(session_id, student_id)` to `(session_id, student_id, hour_slot)`
- A trigger rejects hour 2 or 3 for a lesson that is tracked only once
- `hour_slot_for(session, time)` tells which hour it is (for the backend)
- New view `v_hourly_tracker`: one row per student, one column per hour
- Attendance % counts hours: a week-8 lesson gives up to 3 points. The rule is the same as `getStudentAttendanceRate()` on the website
- The data is synced with the website of 16.11: new Hall 301 GPS point, 10 students, IS202 and its lessons

## Files

| File | What it does |
|---|---|
| `01_schema.sql` | 7 tables with primary keys, foreign keys, UNIQUE and CHECK rules, ON DELETE CASCADE, indexes, the hour trigger and `hour_slot_for()` |
| `02_seed.sql` | Test data copied from the website (`src/data/mockData.ts`): 10 students, 3 teachers, 3 rooms, 5 courses, 20 enrollments, 17 lessons, 50 check-ins |
| `03_dashboards.sql` | `attendance_summary(date)` and 6 views: attendance %, at-risk students (below 80%), free places, results per lesson and hour, CSV export, hourly tracker |
| `04_tests.sql` | 13 tests. Each prints PASS or FAIL. All changes are rolled back |
| `05_load_300.sql` | Amir's load test (300 students in 3 minutes). Still passes on version 2 |
| `test_results.txt` | Result of the last test run (13 of 13 PASS) |

## How to run (pgAdmin)

1. Create a database `kbtu_ums` (or use the old one: `01` deletes the old tables first).
2. Open Query Tool and run the files in order: `01` → `02` → `03` → `04`.
3. The test results are in the **Messages** tab.

Look at the tracker:

```sql
SELECT full_name, hour_1, hour_2, hour_3, hours_present
FROM v_hourly_tracker WHERE session_id = 'ses-8';
```

## Main rules

- `UNIQUE (session_id, student_id, hour_slot)`: one check-in per student per hour
- `CHECK (hour_slot BETWEEN 1 AND 3)` and the trigger: only hours that the lesson has
- `UNIQUE (student_id, course_code, semester)`: one registration per course per semester
- Foreign keys: no check-in for a student or lesson that does not exist
- `ON DELETE CASCADE`: deleting a lesson deletes its check-ins
- A teacher override must have a written reason

## Found in the website data

`ENROLLMENTS` has 4 rows for course `DB202`, but `DB202` is not in `COURSES`
(probably renamed to `IS202`). The foreign key would reject them, so `02_seed.sql` skips them.

AI helped to write the SQL. I compared it with the website data, checked every table and ran the tests.
