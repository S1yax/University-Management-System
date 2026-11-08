# Database (PostgreSQL)

Author: **Mubarak Nurlybay** (Data and Database), Team 39

The real database for our KBTU UMS website. It follows the ERD on the
"Database & ERD" page. The SQL on that page created only 3 tables, so
this version adds `students`, `teachers`, `courses` and `enrollments`.

## Files

| File | What it does |
|---|---|
| `01_schema.sql` | Creates 7 tables with primary keys, foreign keys, UNIQUE and CHECK rules, ON DELETE CASCADE and indexes |
| `02_seed.sql` | Test data copied from the website (`src/data/mockData.ts`): 5 students, 3 teachers, 3 rooms, 5 courses, 16 enrollments, 15 sessions, 37 check-ins |
| `03_dashboards.sql` | 5 views for dashboards: attendance %, at-risk students (below 80%), free places per course, results per session, CSV export |
| `04_tests.sql` | 8 tests. Each prints PASS or FAIL. All changes are rolled back |
| `test_results.txt` | Result of the last test run (8 of 8 PASS) |

## How to run (pgAdmin)

1. Create a database `kbtu_ums`.
2. Open Query Tool and run the files in order: `01` → `02` → `03` → `04`.
3. The test results are in the **Messages** tab.

## Main rules

- `UNIQUE (session_id, student_id)` — one check-in per student per lesson
- `UNIQUE (student_id, course_code, semester)` — one registration per course per semester
- Foreign keys — no check-in for a student or lesson that does not exist
- `ON DELETE CASCADE` — deleting a lesson deletes its check-ins
- A teacher override must have a written reason

AI helped to write the SQL. I compared it with the website data, checked every table and ran the tests.
