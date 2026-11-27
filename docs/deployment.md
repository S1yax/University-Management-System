# Deployment and team access

## Shared Supabase database

Use the direct PostgreSQL connection or the IPv4 session pooler on port 5432. Download the CA from Supabase Database Settings and configure certificate verification in the backend. Apply the files in `database/migrations` in numeric order with `npm run migrate` from `server/`. Run the older reset and seed SQL only against a fresh development database. [Supabase connections](https://supabase.com/docs/guides/database/connecting-to-postgres) · [TLS settings](https://supabase.com/docs/guides/platform/ssl-enforcement)

The portal administrator can manage students, teachers, staff, classrooms, assignments, dated sessions, events and volunteer registrations. Use `scripts/bootstrap.ps1` on Windows to create initial credentials for identities that do not have an account password yet. The script stores new passwords in the local DPAPI vault under `%LOCALAPPDATA%\KBTU UMS`. The bootstrap script preserves existing passwords. The account owner chooses a new password during first sign-in.

Give each authorized participant a separate identity and share initial access with the account holder through an approved private channel. The vault owner can use `scripts/copy-initial-password.ps1 -Username <username>` to pass one initial password through the Windows clipboard. Supabase project access is needed only for team members performing database maintenance.

## Local first-time setup

Set `LOCAL_INITIAL_SETUP=true` in `server/.env` while using the portal on a trusted computer. Restart Express and open `http://localhost:5173/`. Pending users can choose their username and set a password. Use the sign-in button for accounts that already have a password. This mode is available only on loopback connections outside production. Keep it disabled for hosted deployments.

## Single-use activation links

Use `./scripts/bootstrap.ps1 -Activation` on Windows after provisioning the roster or resetting accounts. It issues links to users who still need to choose a password and stores them in the DPAPI vault. A link replaces the temporary password for that account and expires after seven days. Reissuing links invalidates the previous links for pending accounts.

Use `./scripts/copy-activation-link.ps1 -Username <username>` to copy a private local link. Use `-PortalUrl https://<frontend-host>/` when sharing for an HTTPS deployment. Each user opens only their own link and creates their password in the portal.

## HTTPS hosting

Render can host the educational preview as an Express web service and a React static site. Connect the reviewed Git branch in Render. Read the current free service limits before choosing a plan. [Express on Render](https://render.com/docs/deploy-node-express-app) · [Static sites](https://render.com/docs/static-sites) · [Free service limits](https://render.com/docs/free)

| Service | Setting | Value |
| --- | --- | --- |
| Express | Root directory | `server` |
| Express | Build command | `npm ci` |
| Express | Start command | `npm start` |
| Express | Health check | `/api/health` |
| React | Build command | `npm ci && npm run build` |
| React | Publish directory | `dist` |
| React | Public build variable | `VITE_API_URL=https://<backend-host>/api` |

Set `NODE_ENV=production`, `SHOW_DEMO_ACCOUNTS=false`, `ALLOW_DEMO_TIME=false`, and `CORS_ORIGIN=https://<frontend-host>` on Express. Set `CURRENT_SEMESTER` for the active term. Configure `DATABASE_URL` without SSL query options and supply the certificate PEM via `SUPABASE_CA_CERT`, or use the separate connection variables in `server/.env.example`. Store database connection settings in the backend's environment. [Render environment variables](https://render.com/docs/configure-environment-variables)

Before a public launch, configure a limited Postgres runtime account with access to the university tables, views, functions and sequences. Enable the required RLS policies for that account. The migration account retains schema ownership. Local integration uses the existing owner account and a verified TLS connection.

Use the same HTTPS site from both devices. A student must grant location permission and check in during an actual lesson from the assigned classroom. The teacher should see the record on the next refresh. The main workspace refreshes every five seconds while the tab is visible and on focus.

## Private classroom demonstration

Use a separate seeded database or schema and a private deployment. Set `SHOW_DEMO_ACCOUNTS=true` and `ALLOW_DEMO_TIME=true` on a development backend and `VITE_SHOW_DEMO_ACCOUNTS=true` on the frontend. The picker fills usernames. Each account uses a provisioned password.

1. In Teacher **Gradebook**, select a course and save test points. In another browser profile, open the student's **Attestation** and **Transcript**.
2. Use a fresh test student to make a registration. Approve it in **Enrollments** with an admin or manager account and check the teacher's roster.
3. In **Live Attendance**, select the relevant session and open its check-in window. Submit a check-in or manual review as an approved student. Check the teacher's session and the manager's attendance report.
4. Reload, sign out, and sign back in. The academic records should remain available.

## Demo student content

After applying all migrations, run `database/demo_portal_content.sql` and `database/demo_smart_timetable.sql` on the demo database. Set `SHOW_STUDENT_DEMO_CONTENT=true` on the local backend and restart it. Example grades, campus stories, sample messages, and timetable assignments are labelled as demo content. Course feedback and personal timetable tasks are available independently of the demo setting.

## Backup and recovery

The repository contains an [encrypted backup workflow](../.github/workflows/database-backup.yml). It exports the full university application schema, including the academic and portal tables for all roles. The archive excludes active session rows. Supabase-managed schemas and external storage are outside this application backup. Hosted backups and retention depend on the project's plan. [Supabase backups](https://supabase.com/docs/guides/platform/backups)

Configure the workflow's repository secrets and keep its encryption key in the team password manager. Set the repository variable `UMS_BACKUPS_ENABLED=true` when ready. Run the workflow manually and confirm the expected table inventory. The workflow encrypts the archive, verifies decryption and retains the encrypted artifact for 14 days.

Run a recovery drill using a disposable database. Decrypt the archive locally, inspect it with `pg_restore --list`, and restore it with `pg_restore --no-owner --no-acl --exit-on-error -d <test-database> university.dump`. Run the additive migrations to restore the application access policy. Verify academic row counts and fresh sign-in before ending the drill.

The backup workflow is prepared. A scheduled run and full restore still need verification.
