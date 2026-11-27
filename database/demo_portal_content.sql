-- Optional content for the local demonstration. Apply after migration 10.
BEGIN;

INSERT INTO portal_events (demo_key, title, description, starts_at, volunteer) VALUES
('student-project-showcase-2026', 'KBTU Student Project Showcase',
 'Student teams present prototypes in data analytics, software engineering, and sustainable technology. Bring a classmate and vote for the audience favourite during the closing session.',
 '2026-12-03T15:00:00+05:00', false),
('library-finals-2026', 'Library workshop for final exams',
 'The library team hosts a short workshop on finding academic sources, preparing a revision plan, and booking a group study room for finals.',
 '2026-12-04T13:00:00+05:00', false),
('campus-volunteer-2026', 'Volunteer day with the KBTU Student Council',
 'Student volunteers help welcome visitors, guide them to the project exhibition, and prepare activity stations for the campus open day.',
 '2026-12-08T14:00:00+05:00', true)
ON CONFLICT (demo_key) DO NOTHING;

INSERT INTO portal_notifications (recipient, sender, subject, message, demo_key)
SELECT u.username, item.sender, item.subject, item.message, item.key
FROM portal_users u
CROSS JOIN (VALUES
 ('welcome-2026', 'KBTU Student Services', 'Welcome to your student portal',
  'Your weekly timetable, course registrations, assessment results, and teaching surveys are now available from the sidebar.'),
 ('attestation-2026', 'Academic Registrar', 'Fall assessment results',
  'Open Attestation to review both assessment scores, your current rating, and the final exam result. The Transcript page groups final results by course.'),
 ('survey-2026', 'Student Experience Team', 'Share feedback about your courses',
  'The short Fall 2026 course survey is open in Surveys & Evaluations. Rate the course and share one improvement for next semester.')
) AS item(key, sender, subject, message)
WHERE u.role = 'STUDENT'
ON CONFLICT (recipient, demo_key) DO NOTHING;

COMMIT;
