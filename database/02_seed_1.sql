-- Test data copied from the sample data of our website (src/data/mockData.ts).
-- Run after 01_schema.sql.

INSERT INTO students (student_id, username, full_name, email, major, year, gpa) VALUES
 ('24B031926', 's_niyazkhan', 'Saniya Niyazkhan', 's_niyazkhan@kbtu.kz', 'Information Systems', 2, 3.92),
 ('24B031901', 's_nurlybay', 'Mubarak Nurlybay', 's_nurlybay@kbtu.kz', 'Information Systems', 2, 2.84),
 ('25B032145', 's_yugai', 'Yugai Elya', 's_yugai@kbtu.kz', 'Information Systems', 1, 3.88),
 ('24B031666', 's_bagdat', 'Bagdat Alua', 's_bagdat@kbtu.kz', 'Information Systems', 2, 3.65),
 ('24B031787', 's_zholdassali', 'Amir Zholdassali', 's_zholdassali@kbtu.kz', 'Information Systems', 2, 2.95);

INSERT INTO teachers (teacher_id, username, full_name, email, department) VALUES
 ('u-6', 't_issabek', 'Ainur Issabek', 'a.issabek@kbtu.kz', 'School of Information Technology and Engineering'),
 ('u-7', 't_myrzakanurov', 'Arman Myrzakanurov', 'a.myrzakanurov@kbtu.kz', 'School of Information Technology and Engineering'),
 ('u-8', 't_asubay', 'Miras Asubay', 'm.asubay@kbtu.kz', 'School of Information Technology and Engineering');

INSERT INTO rooms (room_id, room_number, building, capacity, centroid_lat, centroid_lng, wifi_bssid) VALUES
 ('room-301', 'Hall 301', 'Main Building, Tole Bi 59', 120, 43.238949, 76.889709, 'KBTU-STUDENT-AP-301'),
 ('room-442', 'Auditorium 442', 'Main Building, Tole Bi 59', 80, 43.238820, 76.889650, 'KBTU-STUDENT-AP-442'),
 ('room-204', 'Computer Lab 204', 'SITE Block B', 40, 43.239100, 76.889900, 'KBTU-SITE-LAB-204');

INSERT INTO courses (course_code, title, credits, max_places, teacher_id) VALUES
 ('BIS201', 'Basics of Information Systems', 3, 40, 'u-6'),
 ('CS101', 'Introduction to Computer Science', 3, 30, 'u-7'),
 ('DB202', 'Database Systems & SQL', 4, 35, 'u-8'),
 ('NET203', 'Computer Networks', 3, 35, 'u-7'),
 ('MATH101', 'Discrete Mathematics', 3, 45, 'u-6');

INSERT INTO enrollments (student_id, course_code, semester, status) VALUES
 ('24B031926', 'BIS201', 'Fall 2026', 'Approved'),
 ('24B031926', 'CS101', 'Fall 2026', 'Approved'),
 ('24B031926', 'DB202', 'Fall 2026', 'Approved'),
 ('24B031926', 'NET203', 'Fall 2026', 'Approved'),
 ('24B031926', 'MATH101', 'Fall 2026', 'Approved'),
 ('24B031901', 'BIS201', 'Fall 2026', 'Approved'),
 ('24B031901', 'CS101', 'Fall 2026', 'Approved'),
 ('24B031901', 'DB202', 'Fall 2026', 'Approved'),
 ('25B032145', 'BIS201', 'Fall 2026', 'Approved'),
 ('25B032145', 'CS101', 'Fall 2026', 'Approved'),
 ('25B032145', 'DB202', 'Fall 2026', 'Approved'),
 ('24B031666', 'BIS201', 'Fall 2026', 'Approved'),
 ('24B031666', 'CS101', 'Fall 2026', 'Approved'),
 ('24B031666', 'DB202', 'Fall 2026', 'Approved'),
 ('24B031787', 'BIS201', 'Fall 2026', 'Approved'),
 ('24B031787', 'CS101', 'Fall 2026', 'Approved');

INSERT INTO class_sessions (session_id, course_code, room_id, session_number, session_date, start_time, end_time, allowed_campus_radius_m, status) VALUES
 ('ses-1', 'BIS201', 'room-301', 1, '2026-09-07', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-2', 'BIS201', 'room-301', 2, '2026-09-14', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-3', 'BIS201', 'room-301', 3, '2026-09-21', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-4', 'BIS201', 'room-301', 4, '2026-09-28', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-5', 'BIS201', 'room-301', 5, '2026-10-05', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-6', 'BIS201', 'room-301', 6, '2026-10-12', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-7', 'BIS201', 'room-301', 7, '2026-10-19', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-8', 'BIS201', 'room-301', 8, '2026-11-02', '16:00', '19:00', 150, 'OPEN'),
 ('ses-9', 'BIS201', 'room-301', 9, '2026-11-09', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-10', 'BIS201', 'room-301', 10, '2026-11-16', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-11', 'BIS201', 'room-301', 11, '2026-11-23', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-12', 'BIS201', 'room-301', 12, '2026-11-30', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-13', 'BIS201', 'room-301', 13, '2026-12-07', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-14', 'BIS201', 'room-301', 14, '2026-12-14', '16:00', '19:00', 150, 'CLOSED'),
 ('ses-15', 'BIS201', 'room-301', 15, '2026-12-21', '16:00', '19:00', 150, 'CLOSED');

INSERT INTO attendance_records (session_id, student_id, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status, rejection_reason, is_override, override_by, override_reason) VALUES
 ('ses-1', '24B031926', '2026-09-07 16:04:12', 43.238960, 76.889715, 4.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-1', '24B031901', '2026-09-07 16:12:40', 43.239020, 76.889750, 11.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-1', '25B032145', '2026-09-07 16:01:05', 43.238940, 76.889700, 2.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-1', '24B031666', '2026-09-07 16:08:22', 43.238910, 76.889680, 7.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-1', '24B031787', '2026-09-07 16:15:30', 43.238990, 76.889730, 6.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-2', '24B031926', '2026-09-14 16:03:19', 43.238955, 76.889710, 3.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-2', '24B031901', '2026-09-14 16:45:10', 43.246800, 76.898900, 920.4, 'REJECTED', 'Distance 920.4m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-2', '25B032145', '2026-09-14 16:02:11', 43.238948, 76.889705, 1.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-2', '24B031666', '2026-09-14 16:06:44', 43.238980, 76.889735, 7.9, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-2', '24B031787', '2026-09-14 16:09:55', 43.238930, 76.889690, 4.3, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '24B031926', '2026-09-21 16:05:00', 43.238940, 76.889712, 2.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '24B031901', '2026-09-21 16:07:33', 43.239010, 76.889740, 9.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '25B032145', '2026-09-21 16:00:48', 43.238945, 76.889708, 1.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '24B031666', '2026-09-21 16:10:14', 43.238970, 76.889725, 5.4, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '24B031787', '2026-09-21 16:42:01', 43.244100, 76.897000, 790.0, 'REJECTED', 'Distance 790m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-4', '24B031926', '2026-09-28 16:02:40', 43.238950, 76.889710, 2.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-4', '24B031901', '2026-09-28 16:11:00', 43.248000, 76.901000, 1150.0, 'REJECTED', 'Distance 1150m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-4', '25B032145', '2026-09-28 16:01:30', 43.238947, 76.889707, 1.0, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-4', '24B031666', '2026-09-28 16:04:15', 43.238965, 76.889720, 4.6, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-4', '24B031787', '2026-09-28 16:06:50', 43.238955, 76.889718, 3.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '24B031926', '2026-10-05 16:03:00', 43.238945, 76.889710, 2.0, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '24B031901', '2026-10-05 16:08:14', 43.238980, 76.889730, 6.4, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '25B032145', '2026-10-05 16:02:00', 43.238946, 76.889708, 1.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '24B031666', '2026-10-05 16:05:40', 43.238960, 76.889719, 4.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '24B031787', '2026-10-05 16:14:20', 43.245000, 76.896500, 830.0, 'PRESENT', NULL, TRUE, 'Ainur Issabek', 'Manual override: Student present in Hall 301, smartphone GPS signal failed.'),
 ('ses-6', '24B031926', '2026-10-12 16:01:50', 43.238952, 76.889711, 2.3, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-6', '24B031901', '2026-10-12 16:55:00', 43.249200, 76.903000, 1340.0, 'REJECTED', 'Distance 1340m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-6', '25B032145', '2026-10-12 16:00:40', 43.238948, 76.889709, 0.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-6', '24B031666', '2026-10-12 16:07:30', 43.238975, 76.889728, 6.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-6', '24B031787', '2026-10-12 16:09:12', 43.238958, 76.889715, 3.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '24B031926', '2026-10-19 16:04:10', 43.238950, 76.889709, 1.9, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '24B031901', '2026-10-19 16:06:50', 43.238990, 76.889735, 7.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '25B032145', '2026-10-19 16:01:25', 43.238949, 76.889709, 0.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '24B031666', '2026-10-19 16:05:10', 43.238965, 76.889722, 4.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '24B031787', '2026-10-19 16:35:10', 43.246000, 76.898000, 980.0, 'REJECTED', 'Distance 980m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-8', '25B032145', '2026-11-02 16:02:15', 43.238950, 76.889710, 1.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-8', '24B031666', '2026-11-02 16:05:45', 43.238960, 76.889718, 3.9, 'PRESENT', NULL, FALSE, NULL, NULL);
