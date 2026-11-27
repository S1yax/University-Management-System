# Express API

Team 39 · PostgreSQL and academic services

## Start

Install dependencies with `npm ci`, configure `.env` from `.env.example`, run `npm run migrate` against an existing university database, then run `npm start`. For a fresh development database run the initial schema, seed and dashboard SQL files first. See the [root README](../README.md) and [deployment guide](../docs/deployment.md).

`GET /api/health` is public. `POST /api/auth/login` creates a session from the database credentials. A private development instance can explicitly enable the demo account picker. The remainder of the API requires an `Authorization: Bearer <token>` header. Logout revokes the session, and password changes revoke other sessions for the same account.

| API | Roles and scope |
| --- | --- |
| `GET /api/workspace` | Signed-in role's academic workspace and own notifications |
| `GET /api/courses` | Current course catalog and remaining places |
| `GET /api/attestation` | Student's own grades, teacher's assigned courses, or authorized staff |
| `PUT /api/attestation` | Teacher assigned to the course and approved roster |
| `GET /api/schedule` | Student's own schedule or authorized staff |
| `GET /api/enrollments` | Student's own entries, teacher's approved roster, or authorized staff |
| `POST /api/enrollments` and `DELETE /api/enrollments/:id` | Student creates or cancels own pending enrollment |
| `PATCH /api/enrollments/:id` | Admin or manager approves or rejects a pending request |
| `POST /api/checkin` and `POST /api/manual-review` | Student, active window and approved enrollment |
| `GET /api/tracker`, `PATCH /api/sessions/:id`, and `POST /api/override` | Teacher assigned to the course |
| `GET /api/students` and `POST /api/warnings` | Admin or manager |
| `/api/admin/:resource` | Administrator, supported university records |
| `GET /api/events` and `POST /api/events/:id/register` | Signed-in read access, student registration |
| `PATCH /api/profile` and `PATCH /api/notifications/:id` | Current account only |

`npm test` runs behavior tests against a temporary schema populated with synthetic seed records. The configured DB connection needs permission to create a schema. Use a direct connection or the session pooler. Each test fixture cleans up only the schema that it created. Use a separate database when testing schema or privilege changes outside the provided test fixtures.
