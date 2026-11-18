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
| `weakSignal: true` (weak GPS indoors) | 201 `MANUAL_REVIEW_SUBMITTED`, saved as MANUAL_REVIEW |
| Everything is fine | 201 `SUCCESS_PRESENT` with `hourSlot` 1, 2 or 3 |

The status names are the same as on the website, so the page can show the same messages.

### POST /api/override

```json
{ "sessionId": "ses-8", "studentId": "24B031787", "hourSlot": 2, "status": "PRESENT", "reason": "GPS failed in Hall 301", "teacher": "Ainur Issabek" }
```

## Tests

`npm test` runs 17 API tests (A1–A17) against the database from `.env`.
Every check-in made by the tests is deleted at the end. Last result: `test_results.txt` (17 of 17 pass).

## Not done yet

- **Login:** the server trusts the `studentId` that the website sends. A real system must take
  it from the login session (Alua's part: passwords and lockout must move to the server too).
- **Only attendance is on the server.** Courses, registrations and passwords are still in the browser.

AI helped to write the code. I checked every endpoint against the website logic and ran the tests.
