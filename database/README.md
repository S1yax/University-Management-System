# Database (PostgreSQL)

Author: **Mubarak Nurlybay** (Data and Database), Team 39

The real database for our KBTU UMS website. It follows the ERD on the
"Database & ERD" page. The SQL on that page created only 3 tables, so
this version adds `students`, `teachers`, `courses` and `enrollments`.

## Version 3 (23.11): all subjects, registration, attestation

- **8 subjects**: the 5 from the website's `COURSES` + `DB202`, `FIN201`, `ENG102` from the Discipline Schedule page.
  Every course now has its weekly lesson (day, time, room), ECTS credits and a faculty.
- **Lessons of weeks 12-15** for every course (attendance for other subjects starts this week,
  so old weeks without check-ins do not give everyone 0%).
- **`register_for_course(student, course, semester)`**: saves a registration as Pending only if
  there are free places, the student stays within **21 credits** and the course does not clash in time
  with the student's other courses.
- **`attestation`**: 1st attestation 0-30, 2nd 0-30, final exam 0-40. Points only for an **approved**
  registration. The final exam only with **at least 30** attestation points.
- **`letter_grade(total)`**: the grade scale of the Kazakhstan credit system (A 95+, A- 90+, B+ 85+ ... F below 50).
- New views: `v_course_catalog`, `v_student_schedule`, `v_schedule_clashes`, `v_room_clashes`, `v_attestation`.
- `02_seed.sql` is built by `gen_seed.py` from the website files: `python3 gen_seed.py .. 02_seed.sql`.

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
| `01_schema.sql` | 8 tables with primary keys, foreign keys, UNIQUE and CHECK rules, ON DELETE CASCADE, indexes, the hour trigger, `hour_slot_for()`, `register_for_course()` and the attestation trigger |
| `02_seed.sql` | Test data from the website: 10 students, 5 teachers, 5 rooms, 8 courses, 24 registrations, 45 lessons, 50 check-ins, attestation of 5 courses |
| `gen_seed.py` | Builds `02_seed.sql` from `src/data/mockData.ts` and the Uninet pages |
| `03_dashboards.sql` | `attendance_summary(date)`, `letter_grade()` and 11 views: attendance, at-risk students, free places, results per hour, CSV export, hourly tracker, course catalog, student timetable, timetable clashes, attestation |
| `04_tests.sql` | 27 tests. Each prints PASS or FAIL. All changes are rolled back |
| `05_load_300.sql` | Amir's load test (300 students in 3 minutes). Still passes on version 3 |
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
- `register_for_course()`: free places, 21 credits, no time clash (errors `UMS01`, `UMS02`, `UMS03`)
- Attestation: `CHECK` 0-30 / 0-30 / 0-40, points only for an approved registration (`UMS05`),
  final exam only with 30+ points (`chk_admitted_to_final`)

## Found in the website data

- **Lab 204 is double-booked on Tuesday 16:00-17:00**: `DB202` (Tue 14-17) and `IS202` (Tue 16-19)
  are in the same room (`SELECT * FROM v_room_clashes;`).
- **Alua and Elya** are registered for both `DB202` and `IS202`, which overlap (`v_schedule_clashes`).
  The new registration function would not allow this; the old rows came from the website data.
- **Credits differ**: `COURSES` gives BIS201 3 credits, the Discipline Schedule page 5. The database keeps
  both: `credits` (for the 21-credit limit) and `ects_credits` (as on the page).
- `FIN201` and `ENG102` have no credits in `COURSES`: 3 and 2 (5 ECTS = 3 credits, like BIS201).
  Their places (40, 30) and the rooms Aud 210 and Aud 118 (capacity, GPS point of the main building) are placeholders.
- The Attestation page shows the same points for every student. They are saved for Saniya
  (her 5 courses are the same as on the page).

AI helped to write the SQL. I compared it with the website data, checked every table and ran the tests.
