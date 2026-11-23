# Server (Node.js + Express)

Author: **Mubarak Nurlybay** (Data and Database), Team 39

The backend for the **every-hour tracker**. Until now every check-in was saved only in the
browser (localStorage), so a teacher on another device could not see it. This server saves
check-ins in our PostgreSQL database (`database/` folder), so every device sees the same data.

## How to run

1. Create the database: run `database/01` → `02` → `03` in pgAdmin.
2. In the `server` folder copy `.env.example` to `.env` and write your pgAdmin password.
3. In the terminal:

```
cd server
npm install
npm start
```

4. Open http://localhost:4000/api/health. You should see `"ok": true`.

On Windows PowerShell use `npm.cmd install` and `npm.cmd start` if `npm` is blocked.

## The website with the server (two devices)

1. Start this server (`npm start`).
2. In the project root copy `.env.example` to `.env.local` (it has `VITE_API_URL=auto`).
3. Start the website: `npm run dev -- --host` in the project root.
4. Open the website on the laptop and on a phone in the same Wi-Fi
   (the phone uses the address that Vite prints as `Network`).
5. A badge on the check-in page and the teacher page shows where the data is:
   - green **Сервер PostgreSQL · общие данные**: saved in the database, every device sees it
     (the teacher table updates every 4 seconds);
   - yellow: no server, data only in this browser (as before).

Without `.env.local` (for example on Vercel) the website works as before, without a server.
Phone GPS needs HTTPS, so for the demo a student checks in on the laptop and the teacher
watches the table on the phone.

## Endpoints

| Method | Address | What it does |
|---|---|---|
| GET | `/api/health` | Checks the connection to the database |
| POST | `/api/checkin` | A student checks in by GPS for the current hour |
| GET | `/api/tracker?sessionId=ses-8` | Teacher table: every student, hour 1, 2, 3 |
| POST | `/api/override` | Teacher sets one hour by hand (reason required) |
| GET | `/api/attendance?studentId=24B031901` | Attendance % per course, counted by hours |
| GET | `/api/records[?sessionId=ses-8]` | All check-ins (the website loads them every 4 seconds) |
| GET | `/api/sessions` | Lesson statuses (OPEN / CLOSED) |
| PATCH | `/api/sessions/ses-8` | Teacher opens or closes check-in: `{ "status": "CLOSED" }` |
| GET | `/api/courses` | Catalog: 8 subjects with day, time, room, teacher, free places |
| GET | `/api/schedule?studentId=24B031901` | Weekly timetable of one student and the sum of credits |
| GET | `/api/clashes` | Timetable problems: double-booked rooms, students with two courses at once |
| GET | `/api/enrollments?studentId=&courseCode=&status=` | Registrations (every filter is optional) |
| POST | `/api/enrollments` | A student registers: `{ "studentId": "...", "courseCode": "NET203" }` |
| PATCH | `/api/enrollments/:id` | The manager answers: `{ "status": "Approved" }` or `"Rejected"` |
| DELETE | `/api/enrollments/:id` | The student cancels a registration |
| GET | `/api/attestation?studentId=...` or `?courseCode=...` | Points, admission to the exam, total and letter grade |
| PUT | `/api/attestation` | The teacher saves points (only the sent fields change) |

Files: `src/app.js` has attendance (Amir and Mubarak), `src/routes/courses.js` registration and the timetable,
`src/routes/attestation.js` attestation, `src/http.js` shared helpers.

### POST /api/checkin

```json
{ "sessionId": "ses-8", "studentId": "24B031901", "latitude": 43.25533, "longitude": 76.9431, "time": "2026-11-02 17:05" }
```

`time` is only for the demo (`ALLOW_DEMO_TIME=true`), because the sample lesson was on 02.11.
Without it the server uses its own time.

The checks go in the same order as `checkInGPS()` on the website:

| Check | Answer |
|---|---|
| Time is outside the lesson | 403 `REJECTED_CLOSED` |
| Lesson is CLOSED | 403 `REJECTED_CLOSED` |
| Student is not registered for the course | 403 `REJECTED_NOT_ENROLLED` |
| Already checked in for this hour | 409 `ALREADY_CHECKED_IN` (the database rule `uq_session_student_hour`) |
| Farther than 150 m | 201 `REJECTED_RADIUS`, saved as REJECTED |
| `accuracy` over 100 m and the accuracy circle reaches the campus | 201 `MANUAL_REVIEW_SUBMITTED`, saved as MANUAL_REVIEW |
| `accuracy` under 1 m (e.g. 0, fake GPS) and inside the radius | 201 `MANUAL_REVIEW_SUBMITTED` with a "Suspicious GPS accuracy" reason |
| `accuracy` under 1 m and outside the radius | 201 `REJECTED_RADIUS` |
| `accuracy` is not a number | 400 `BAD_REQUEST` |
| `weakSignal: true` and no `accuracy` (old clients) | 201 `MANUAL_REVIEW_SUBMITTED`, saved as MANUAL_REVIEW. When `accuracy` is sent, `weakSignal` is ignored |
| Everything is fine | 201 `SUCCESS_PRESENT` with `hourSlot` 1, 2 or 3 |

The status names are the same as on the website, so the page can show the same messages.

### POST /api/enrollments: answers

| Answer | When |
|---|---|
| 201 `REGISTERED` | Saved as Pending, waits for the manager |
| 409 `ALREADY_REGISTERED` | The student already has this course in this semester |
| 409 `TIME_CLASH` | The course is at the same time as another course of the student |
| 409 `CREDIT_LIMIT` | More than 21 credits |
| 409 `COURSE_FULL` | No free places |
| 404 `NOT_FOUND` | The student or the course does not exist |

All these checks are in the database function `register_for_course()`, so they also work if someone calls the database directly.

### PUT /api/attestation

```json
{ "studentId": "24B031901", "courseCode": "BIS201", "attestation1": 24.5, "teacher": "Ainur Issabek" }
```

Fields: `attestation1` (0-30), `attestation2` (0-30), `finalExam` (0-40). Answers: 200 `SAVED`,
400 `BAD_VALUE` (out of range), 400 `NOT_ADMITTED` (final exam with less than 30 points),
403 `NOT_APPROVED` (registration is still Pending), 404 `NOT_REGISTERED`.

## For Elya: how to connect a page

Use `src/api/coursesApi.ts` on the website. Every function returns `{ code, body }`;
`body.status` says what happened and `body.message` is a ready text for the page.

```ts
import { coursesApi, isApiConfigured } from '../../api/coursesApi';

// Course Registration page: load the catalog
const { body } = await coursesApi.catalog();        // body.courses[i].free_places, .day, .start_time ...

// "Register Now" button
const r = await coursesApi.register(currentUser.studentId!, course.course_code);
if (r.body.status === 'REGISTERED') { /* show r.body.message in green */ }
else { /* show r.body.message in red: TIME_CLASH, CREDIT_LIMIT, COURSE_FULL ... */ }

// Attestation page of the logged-in student
const a = await coursesApi.attestation({ studentId: currentUser.studentId! });
// a.body.items[i].attestation_1, attestation_2, rating, admitted, final_exam, total, letter, max_possible
```

If `isApiConfigured` is false (no server, for example on Vercel), keep the old sample data, like the attendance pages do.

To add a new endpoint: make a file in `src/routes/` like `courses.js`, export a `Router`,
add `app.use(...)` in `src/app.js` next to `courses` and `attestation`, and write tests in `test/`.

### POST /api/override

```json
{ "sessionId": "ses-8", "studentId": "24B031787", "hourSlot": 2, "status": "PRESENT", "reason": "GPS failed in Hall 301", "teacher": "Ainur Issabek" }
```

## Tests

`npm test` runs 48 tests: 7 accuracy unit tests (U1–U7, no database needed), 22 attendance API tests (A1–A22)
and 19 tests for courses, registration and attestation (C1–C19). Everything the tests change is put back at the end.
Last result: `test_results.txt` (48 of 48 pass).

## Not done yet

- **Login:** the server trusts the `studentId` that the website sends. A real system must take
  it from the login session (Alua's part: passwords and lockout must move to the server too).
- **Pages:** the registration and attestation pages still use sample data. The server is ready; Elya connects the pages (see above).
- **Passwords** are still in the browser (Alua).

AI helped to write the code. I checked every endpoint against the website logic and ran the tests.
