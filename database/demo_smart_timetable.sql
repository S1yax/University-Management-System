-- Optional tasks for the local demonstration.
INSERT INTO portal_timetable_tasks (course_code, semester, title, kind, due_at, demo_key)
SELECT c.course_code, 'Fall 2026', item.title, item.kind,
       (((timezone('Asia/Almaty', now())::date + item.offset_days) + item.deadline::time)
         AT TIME ZONE 'Asia/Almaty'), item.demo_key
FROM (VALUES
    ('BIS201', 'Read about access control and submit notes', 'SIS', 0, '23:59', 'bis201-access-control'),
    ('BIS201', 'Information systems and GPS check-in quiz', 'Quiz', -1, '18:00', 'bis201-attendance-quiz'),
    ('DB202', 'Build a query with JOIN and GROUP BY', 'Assignment', 2, '23:59', 'db202-query-assignment'),
    ('IS202', 'Review a database transaction in the workshop', 'TSIS', 3, '17:00', 'is202-transaction-tsis'),
    ('CS101', 'Variables and loops practice quiz', 'Quiz', 4, '20:00', 'cs101-loops-quiz'),
    ('NET203', 'Draw a network topology', 'Assignment', 4, '23:59', 'net203-topology'),
    ('MATH101', 'Sets and relations practice', 'SIS', 5, '19:00', 'math101-practice'),
    ('FIN201', 'Compare two budgeting scenarios', 'Assignment', 5, '18:00', 'fin201-budget'),
    ('ENG102', 'Prepare a short presentation outline', 'TSIS', 4, '17:30', 'eng102-presentation')
) AS item(code, title, kind, offset_days, deadline, demo_key)
JOIN courses c ON c.course_code = item.code
ON CONFLICT (demo_key) DO NOTHING;
