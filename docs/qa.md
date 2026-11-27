# Verification report

## Account checks

The accounts below were exercised against the linked Supabase project through the local Express API. Each check verified the signed-in username, role, first-sign-in password requirement, and logout. Credentials are stored outside the repository in the Windows user vault. The same identities and their role-specific workspaces were also exercised against synthetic academic records in an isolated PostgreSQL schema.

| Username | Role | Academic ID | Live authentication | Scoped QA workspace |
| --- | --- | --- | --- | --- |
| `s_niyazkhan` | Student | `24B031926` | Pass | Pass |
| `m_nurlybay` | Student | `24B031901` | Pass | Pass |
| `e_yugai` | Student | `25B032145` | Pass | Pass |
| `a_bagdat` | Student | `24B031666` | Pass | Pass |
| `a_zholdassali` | Student | `24B031787` | Pass | Pass |
| `d_tleubay` | Student | `24B031122` | Pass | Pass |
| `a_kanat` | Student | `24B031405` | Pass | Pass |
| `d_serik` | Student | `25B032011` | Pass | Pass |
| `m_bazarbay` | Student | `24B031980` | Pass | Pass |
| `a_omar` | Student | `25B032777` | Pass | Pass |
| `t_issabek` | Teacher | `u-6` | Pass | Pass |
| `t_myrzakanurov` | Teacher | `u-7` | Pass | Pass |
| `t_asubay` | Teacher | `u-8` | Pass | Pass |
| `t_sadykova` | Teacher | `t-sadykova` | Pass | Pass |
| `t_kim` | Teacher | `t-kim` | Pass | Pass |
| `m_askarova` | Manager | Staff | Pass | Pass |
| `admin` | Admin | Staff | Pass | Pass |

## Database verification

The migrations preserved the contents of the existing academic tables. Row counts and deterministic row fingerprints were compared before and after migration. The only new column on existing rows was the semester recorded on dated sessions.

| Students | Teachers | Rooms | Courses | Dated sessions | Enrollments | Attendance records | Assessment rows |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | 5 | 5 | 8 | 45 | 26 | 50 | 5 |

Yugai Elya's existing registrations total 14 approved and 6 pending internal credits, or 16 approved and 10 pending ECTS. Those legacy rows were preserved. New selections use the 21 ECTS limit.

## Test coverage

| Check | Result |
| --- | --- |
| TypeScript and Vite build | Pass. Vite reported a bundle-size advisory. |
| Frontend automated suite | 245 passed. |
| Backend and SQL integration suite | 55 passed, including the test that executes all 27 SQL assertions. Run with `npm test` from `server/`. |
| Chrome desktop and mobile-sized viewports | All four role dashboards passed at 1440 × 900 and 390 × 844. Also verified the account picker, refresh, teacher Gradebook, manager Audit Log and administrator Student Management. |
| Assessment synchronization | Pass. The assigned teacher's test grade became available to the correct student and manager. Another student's grades stayed unchanged. |
| Enrollment workflow | Pass. A new student signed in without a frontend change, submitted an enrollment, and was visible to the teacher after admin approval. The suite also checked duplicate requests, the ECTS limit, schedule conflicts and a concurrent request for the last seat. |
| Attendance workflow | Pass in an isolated database using synthetic GPS coordinates. The suite covered distance, availability, hourly duplicates, GPS accuracy, teacher overrides, and manual review. |
| Persistence | Pass across a service listener restart and fresh sign-in. Tested authenticated browser reload. |
| Authorization | Pass for anonymous protected routes, student separation, and the teacher assignment boundary. |
| Physical phone and public HTTPS hosting | Pending an authorized hosting connection and a check-in from a phone in a configured classroom. |
| Scheduled backup and recovery | Workflow prepared. A hosted scheduled run and restore drill have not been performed. |

Supabase role checks also confirmed that `anon` cannot select the students table and `authenticated` cannot select the assessment view.

## Remaining scope

The weekly timetable and dated attendance sessions are separately managed records. The legacy schema still uses a course-level unique week number for dated sessions. A schema review is needed before keeping multiple terms of the same course's dated sessions in that table.

Several auxiliary Uninet pages were inherited as templates. Finance, external requests, research, dormitory, mobility, syllabus files and similar pages do not have authoritative data sources in this Supabase project. Their navigation and existing UI remain. The main academic and management screens listed above use Supabase.

See the [deployment guide](deployment.md) for team access, private demonstration, and recovery steps. See [changed files](changed-files.md) for the branch inventory.
