# KBTU University Management System

Team 39 · Kazakhstan-British Technical University · BIS201

The portal uses React, TypeScript and Vite for the frontend, Express for the API, and a shared Supabase PostgreSQL database. The backend enforces account and course scope for students, teachers, managers and administrators.

## Run locally

1. Use Node.js 22.12 or newer. Run `npm ci` in the repository root and again in `server/`.
2. Copy `server/.env.example` to `server/.env`, configure PostgreSQL, and supply the Supabase CA certificate when using Supabase.
3. For a fresh development database only, run `database/01_schema.sql`, `database/02_seed.sql`, and `database/03_dashboards.sql` in order. Then run `npm run migrate` from `server/`. On an existing database, use only the migrations.
4. If the database is fresh, provision credentials with `scripts/bootstrap.ps1` on Windows or `npm run provision -- <username>` from `server/`, with the password supplied privately over standard input.
5. Copy `.env.example` to `.env.local` in the repository root. `VITE_API_URL=auto` uses the local backend on port 4000.
6. Start the backend with `npm start` in `server/` and the frontend with `npm run dev` in the repository root.

On Windows, if npm reports a malformed ComSpec path, set `$env:ComSpec = "$env:SystemRoot\System32\cmd.exe"` in the current PowerShell session.

- [Local portal](http://localhost:5173/)
- [API health](http://localhost:4000/api/health)
- [Deployment, team access, backup and demonstration](docs/deployment.md)
- [QA report and verified account roster](docs/qa.md)
- [Express API and tests](server/README.md)

## Academic data

Approved registrations count toward enrolled credits. Pending and approved requests reserve seats and count toward the 21 ECTS registration threshold. Courses with no ECTS value use the database credit value for that calculation. The system preserves existing registrations. Cumulative GPA uses credit-weighted final results and the project's database grading scale.

GPS verification uses the assigned classroom coordinates, radius, lesson time in Asia/Almaty, approved enrollment, and the current open session. Registrations, assessment revisions, attendance, account settings, warnings, and event registrations are stored in PostgreSQL. The current schema holds weekly schedules on courses and dated attendance sessions separately.

## 🎯 Hero Feature: GPS Geofenced Attendance System

The attendance verification algorithm calculates the precise great-circle distance between the student's device location and the classroom centroid coordinates using the spherical Haversine formula:

$$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
$$d = R \cdot \Delta\sigma$$

- **Hall 301 Centroid**: `Latitude 43.255320, Longitude 76.943094` (Main Campus, Tole Bi 59, Astana Square)
- **Allowed Geofence Radius**: `150 meters`

### Verification Rule Engine:
1. **Distance Check**: Device coordinates must resolve within `allowed_campus_radius_m` (150 m).
2. **Enrollment Check**: Student must possess an approved registration record for the target course and semester.
3. **Session Window**: Target class session must be actively toggled `OPEN` by the instructor.
4. **Duplicate Prevention**: Enforces a strict composite unique constraint on `(session_id, student_id)`.
5. **GPS Drift / Weak Signal**: Weak or suspicious GPS readings can be routed to the teacher for manual review.

### Verification States:
- `PRESENT`: Green status chip with exact computed meter distance and verification timestamp.
- `REJECTED`: Outside campus boundary (e.g. 850m > 150m), session closed, or student not registered.
- `ALREADY CHECKED IN`: Blocks duplicate submission with timestamp of existing record.
- `INDOOR GPS DRIFT`: Weak signal alert with Wi-Fi AP fallback note and manual review dispatch.

---
