-- Test data copied from our website (version of 23.11). Built by gen_seed_v3.py, do not edit by hand.
--   src/data/mockData.ts: students, teachers, rooms, courses, lessons, registrations, check-ins
--   Discipline Schedule page: DB202, FIN201, ENG102 and the ECTS credits
--   Attestation page: the attestation points (they belong to Saniya: the same 5 courses)
-- Lessons of weeks 12-15 are added for every course that had none. Run after 01_schema.sql.

INSERT INTO students (student_id, username, full_name, email, major, year, gpa) VALUES
 ('24B031926', 's_niyazkhan', 'Saniya Niyazkhan', 's_niyazkhan@kbtu.kz', 'Information Systems', 3, 3.92),
 ('24B031901', 'm_nurlybay', 'Mubarak Nurlybay', 'm_nurlybay@kbtu.kz', 'Information Systems', 3, 2.84),
 ('25B032145', 'e_yugai', 'Yugai Elya', 'e_yugai@kbtu.kz', 'Information Systems', 2, 3.88),
 ('24B031666', 'a_bagdat', 'Bagdat Alua', 'a_bagdat@kbtu.kz', 'Information Systems', 3, 3.65),
 ('24B031787', 'a_zholdassali', 'Amir Zholdassali', 'a_zholdassali@kbtu.kz', 'Information Systems', 3, 2.95),
 ('24B031122', 'd_tleubay', 'Dias Tleubay', 'd.tleubay@kbtu.kz', 'Information Systems', 2, 3.42),
 ('24B031405', 'a_kanat', 'Aigerim Kanat', 'a.kanat@kbtu.kz', 'Information Systems', 2, 3.78),
 ('25B032011', 'd_serik', 'Daniyar Serik', 'd.serik@kbtu.kz', 'Computer Science', 1, 3.82),
 ('24B031980', 'm_bazarbay', 'Madina Bazarbay', 'm.bazarbay@kbtu.kz', 'Information Systems', 2, 3.91),
 ('25B032777', 'a_omar', 'Alikhan Omar', 'a.omar@kbtu.kz', 'Computer Science', 1, 3.55);

INSERT INTO teachers (teacher_id, username, full_name, email, department) VALUES
 ('u-6', 't_issabek', 'Ainur Issabek', 'a.issabek@kbtu.kz', 'School of Information Technology and Engineering'),
 ('u-7', 't_myrzakanurov', 'Arman Myrzakanurov', 'a.myrzakanurov@kbtu.kz', 'School of Information Technology and Engineering'),
 ('u-8', 't_asubay', 'Miras Asubay', 'm.asubay@kbtu.kz', 'School of Information Technology and Engineering'),
 ('t-sadykova', 't_sadykova', 'Dana Sadykova', 'd.sadykova@kbtu.kz', 'Business School'),
 ('t-kim', 't_kim', 'Elena Kim', 'e.kim@kbtu.kz', 'General Education');

INSERT INTO rooms (room_id, room_number, building, capacity, centroid_lat, centroid_lng, wifi_bssid) VALUES
 ('room-301', 'Hall 301', 'Main Building, Tole Bi 59 (Astana Square)', 120, 43.255320, 76.943094, 'KBTU-STUDENT-AP-301'),
 ('room-442', 'Auditorium 442', 'Main Building, Tole Bi 59', 80, 43.255410, 76.943180, 'KBTU-STUDENT-AP-442'),
 ('room-204', 'Computer Lab 204', 'SITE Block B, Tole Bi 59', 40, 43.255280, 76.942950, 'KBTU-SITE-LAB-204'),
 ('room-210', 'Aud 210', 'Main Building, Tole Bi 59 (Business School)', 60, 43.255410, 76.943180, NULL),
 ('room-118', 'Aud 118', 'Main Building, Tole Bi 59', 40, 43.255410, 76.943180, NULL);

INSERT INTO courses (course_code, title, credits, ects_credits, faculty, max_places, teacher_id, day_of_week, start_time, end_time, room_id) VALUES
 ('BIS201', 'Basics of Information Systems', 3, 5, 'SITE', 40, 'u-6', 1, '16:00', '19:00', 'room-301'),
 ('CS101', 'Introduction to Computer Science', 3, 6, 'SITE', 30, 'u-7', 3, '10:00', '13:00', 'room-442'),
 ('IS202', 'Enterprise Databases & SQL Systems', 4, NULL, 'SITE', 35, 'u-6', 2, '16:00', '19:00', 'room-204'),
 ('NET203', 'Computer Networks', 3, 5, 'SITE', 35, 'u-7', 4, '11:00', '14:00', 'room-442'),
 ('MATH101', 'Discrete Mathematics', 3, 5, 'SITE', 45, 'u-6', 5, '09:00', '12:00', 'room-301'),
 ('DB202', 'Database Systems & SQL', 4, 5, 'SITE', 35, 'u-8', 2, '14:00', '17:00', 'room-204'),
 ('FIN201', 'Corporate Finance', 3, 5, 'Business School', 40, 't-sadykova', 3, '14:00', '17:00', 'room-210'),
 ('ENG102', 'Academic English (Level B2)', 2, 3, 'General Education', 30, 't-kim', 2, '09:00', '12:00', 'room-118');

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
 ('24B031787', 'CS101', 'Fall 2026', 'Approved'),
 ('24B031122', 'BIS201', 'Fall 2026', 'Approved'),
 ('24B031122', 'IS202', 'Fall 2026', 'Approved'),
 ('24B031405', 'BIS201', 'Fall 2026', 'Approved'),
 ('25B032011', 'IS202', 'Fall 2026', 'Approved'),
 ('24B031980', 'IS202', 'Fall 2026', 'Approved'),
 ('25B032777', 'IS202', 'Fall 2026', 'Approved'),
 ('25B032145', 'IS202', 'Fall 2026', 'Approved'),
 ('24B031666', 'IS202', 'Fall 2026', 'Approved');

INSERT INTO class_sessions (session_id, course_code, room_id, session_number, session_date, start_time, end_time, allowed_campus_radius_m, status, tracked_hours) VALUES
 ('ses-1', 'BIS201', 'room-301', 1, '2026-09-07', '16:00', '19:00', 150, 'CLOSED', 1),
 ('ses-2', 'BIS201', 'room-301', 2, '2026-09-14', '16:00', '19:00', 150, 'CLOSED', 1),
 ('ses-3', 'BIS201', 'room-301', 3, '2026-09-21', '16:00', '19:00', 150, 'CLOSED', 1),
 ('ses-4', 'BIS201', 'room-301', 4, '2026-09-28', '16:00', '19:00', 150, 'CLOSED', 1),
 ('ses-5', 'BIS201', 'room-301', 5, '2026-10-05', '16:00', '19:00', 150, 'CLOSED', 1),
 ('ses-6', 'BIS201', 'room-301', 6, '2026-10-12', '16:00', '19:00', 150, 'CLOSED', 1),
 ('ses-7', 'BIS201', 'room-301', 7, '2026-10-19', '16:00', '19:00', 150, 'CLOSED', 1),
 ('ses-8', 'BIS201', 'room-301', 8, '2026-11-02', '16:00', '19:00', 150, 'OPEN', 3),
 ('ses-9', 'BIS201', 'room-301', 9, '2026-11-09', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-10', 'BIS201', 'room-301', 10, '2026-11-16', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-11', 'BIS201', 'room-301', 11, '2026-11-23', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-12', 'BIS201', 'room-301', 12, '2026-11-30', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-13', 'BIS201', 'room-301', 13, '2026-12-07', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-14', 'BIS201', 'room-301', 14, '2026-12-14', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-15', 'BIS201', 'room-301', 15, '2026-12-21', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-is202-7', 'IS202', 'room-204', 7, '2026-10-20', '16:00', '19:00', 150, 'CLOSED', 1),
 ('ses-is202-8', 'IS202', 'room-204', 8, '2026-11-03', '16:00', '19:00', 150, 'OPEN', 3),
 ('ses-cs101-12', 'CS101', 'room-442', 12, '2026-11-25', '10:00', '13:00', 150, 'CLOSED', 3),
 ('ses-cs101-13', 'CS101', 'room-442', 13, '2026-12-02', '10:00', '13:00', 150, 'CLOSED', 3),
 ('ses-cs101-14', 'CS101', 'room-442', 14, '2026-12-09', '10:00', '13:00', 150, 'CLOSED', 3),
 ('ses-cs101-15', 'CS101', 'room-442', 15, '2026-12-16', '10:00', '13:00', 150, 'CLOSED', 3),
 ('ses-is202-12', 'IS202', 'room-204', 12, '2026-11-24', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-is202-13', 'IS202', 'room-204', 13, '2026-12-01', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-is202-14', 'IS202', 'room-204', 14, '2026-12-08', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-is202-15', 'IS202', 'room-204', 15, '2026-12-15', '16:00', '19:00', 150, 'CLOSED', 3),
 ('ses-net203-12', 'NET203', 'room-442', 12, '2026-11-26', '11:00', '14:00', 150, 'CLOSED', 3),
 ('ses-net203-13', 'NET203', 'room-442', 13, '2026-12-03', '11:00', '14:00', 150, 'CLOSED', 3),
 ('ses-net203-14', 'NET203', 'room-442', 14, '2026-12-10', '11:00', '14:00', 150, 'CLOSED', 3),
 ('ses-net203-15', 'NET203', 'room-442', 15, '2026-12-17', '11:00', '14:00', 150, 'CLOSED', 3),
 ('ses-math101-12', 'MATH101', 'room-301', 12, '2026-11-27', '09:00', '12:00', 150, 'CLOSED', 3),
 ('ses-math101-13', 'MATH101', 'room-301', 13, '2026-12-04', '09:00', '12:00', 150, 'CLOSED', 3),
 ('ses-math101-14', 'MATH101', 'room-301', 14, '2026-12-11', '09:00', '12:00', 150, 'CLOSED', 3),
 ('ses-math101-15', 'MATH101', 'room-301', 15, '2026-12-18', '09:00', '12:00', 150, 'CLOSED', 3),
 ('ses-db202-12', 'DB202', 'room-204', 12, '2026-11-24', '14:00', '17:00', 150, 'CLOSED', 3),
 ('ses-db202-13', 'DB202', 'room-204', 13, '2026-12-01', '14:00', '17:00', 150, 'CLOSED', 3),
 ('ses-db202-14', 'DB202', 'room-204', 14, '2026-12-08', '14:00', '17:00', 150, 'CLOSED', 3),
 ('ses-db202-15', 'DB202', 'room-204', 15, '2026-12-15', '14:00', '17:00', 150, 'CLOSED', 3),
 ('ses-fin201-12', 'FIN201', 'room-210', 12, '2026-11-25', '14:00', '17:00', 150, 'CLOSED', 3),
 ('ses-fin201-13', 'FIN201', 'room-210', 13, '2026-12-02', '14:00', '17:00', 150, 'CLOSED', 3),
 ('ses-fin201-14', 'FIN201', 'room-210', 14, '2026-12-09', '14:00', '17:00', 150, 'CLOSED', 3),
 ('ses-fin201-15', 'FIN201', 'room-210', 15, '2026-12-16', '14:00', '17:00', 150, 'CLOSED', 3),
 ('ses-eng102-12', 'ENG102', 'room-118', 12, '2026-11-24', '09:00', '12:00', 150, 'CLOSED', 3),
 ('ses-eng102-13', 'ENG102', 'room-118', 13, '2026-12-01', '09:00', '12:00', 150, 'CLOSED', 3),
 ('ses-eng102-14', 'ENG102', 'room-118', 14, '2026-12-08', '09:00', '12:00', 150, 'CLOSED', 3),
 ('ses-eng102-15', 'ENG102', 'room-118', 15, '2026-12-15', '09:00', '12:00', 150, 'CLOSED', 3);

INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status, rejection_reason, is_override, override_by, override_reason) VALUES
 ('ses-1', '24B031926', 1, '2026-09-07 16:04:12', 43.255330, 76.943100, 4.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-1', '24B031901', 1, '2026-09-07 16:12:40', 43.255380, 76.943140, 11.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-1', '25B032145', 1, '2026-09-07 16:01:05', 43.255315, 76.943085, 2.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-1', '24B031666', 1, '2026-09-07 16:08:22', 43.255290, 76.943060, 7.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-1', '24B031787', 1, '2026-09-07 16:15:30', 43.255355, 76.943115, 6.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-2', '24B031926', 1, '2026-09-14 16:03:19', 43.255328, 76.943098, 3.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-2', '24B031901', 1, '2026-09-14 16:45:10', 43.264800, 76.953900, 920.4, 'REJECTED', 'Distance 920.4m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-2', '25B032145', 1, '2026-09-14 16:02:11', 43.255322, 76.943095, 1.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-2', '24B031666', 1, '2026-09-14 16:06:44', 43.255350, 76.943120, 7.9, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-2', '24B031787', 1, '2026-09-14 16:09:55', 43.255310, 76.943080, 4.3, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '24B031926', 1, '2026-09-21 16:05:00', 43.255325, 76.943096, 2.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '24B031901', 1, '2026-09-21 16:07:33', 43.255370, 76.943130, 9.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '25B032145', 1, '2026-09-21 16:00:48', 43.255319, 76.943093, 1.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '24B031666', 1, '2026-09-21 16:10:14', 43.255345, 76.943110, 5.4, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-3', '24B031787', 1, '2026-09-21 16:42:01', 43.263100, 76.952000, 790.0, 'REJECTED', 'Distance 790m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-4', '24B031926', 1, '2026-09-28 16:02:40', 43.255324, 76.943097, 2.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-4', '24B031901', 1, '2026-09-28 16:11:00', 43.266000, 76.956000, 1150.0, 'REJECTED', 'Distance 1150m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-4', '25B032145', 1, '2026-09-28 16:01:30', 43.255318, 76.943092, 1.0, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-4', '24B031666', 1, '2026-09-28 16:04:15', 43.255335, 76.943105, 4.6, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-4', '24B031787', 1, '2026-09-28 16:06:50', 43.255330, 76.943102, 3.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '24B031926', 1, '2026-10-05 16:03:00', 43.255322, 76.943095, 2.0, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '24B031901', 1, '2026-10-05 16:08:14', 43.255360, 76.943125, 6.4, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '25B032145', 1, '2026-10-05 16:02:00', 43.255317, 76.943093, 1.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '24B031666', 1, '2026-10-05 16:05:40', 43.255340, 76.943110, 4.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-5', '24B031787', 1, '2026-10-05 16:14:20', 43.262500, 76.951000, 830.0, 'PRESENT', NULL, TRUE, 'Ainur Issabek', 'Manual override: Student present in Hall 301, smartphone GPS signal failed.'),
 ('ses-6', '24B031926', 1, '2026-10-12 16:01:50', 43.255325, 76.943098, 2.3, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-6', '24B031901', 1, '2026-10-12 16:55:00', 43.268000, 76.958000, 1340.0, 'REJECTED', 'Distance 1340m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-6', '25B032145', 1, '2026-10-12 16:00:40', 43.255320, 76.943094, 0.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-6', '24B031666', 1, '2026-10-12 16:07:30', 43.255355, 76.943120, 6.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-6', '24B031787', 1, '2026-10-12 16:09:12', 43.255335, 76.943105, 3.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '24B031926', 1, '2026-10-19 16:04:10', 43.255323, 76.943096, 1.9, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '24B031901', 1, '2026-10-19 16:06:50', 43.255365, 76.943130, 7.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '25B032145', 1, '2026-10-19 16:01:25', 43.255320, 76.943094, 0.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '24B031666', 1, '2026-10-19 16:05:10', 43.255345, 76.943115, 4.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-7', '24B031787', 1, '2026-10-19 16:35:10', 43.264000, 76.953500, 980.0, 'REJECTED', 'Distance 980m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-8', '24B031926', 1, '2026-11-02 16:04:10', 43.255325, 76.943096, 3.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-8', '24B031901', 1, '2026-11-02 16:12:30', 43.255380, 76.943140, 11.4, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-8', '25B032145', 1, '2026-11-02 16:01:25', 43.255322, 76.943095, 1.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-8', '24B031666', 1, '2026-11-02 16:05:45', 43.255335, 76.943108, 3.9, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-8', '24B031787', 1, '2026-11-02 16:42:01', 43.264000, 76.953500, 980.0, 'REJECTED', 'Distance 980m exceeded allowed radius 150m', FALSE, NULL, NULL),
 ('ses-8', '24B031122', 1, '2026-11-02 16:15:10', 43.255340, 76.943110, 5.6, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-8', '24B031926', 2, '2026-11-02 17:02:45', 43.255324, 76.943097, 2.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-8', '25B032145', 2, '2026-11-02 17:01:10', 43.255320, 76.943094, 1.0, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-8', '24B031666', 2, '2026-11-02 17:06:30', 43.255330, 76.943105, 3.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-8', '24B031926', 3, '2026-11-02 18:03:15', 43.255322, 76.943095, 2.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-is202-8', '25B032011', 1, '2026-11-03 16:01:50', 43.255285, 76.942955, 1.2, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-is202-8', '24B031980', 1, '2026-11-03 16:03:15', 43.255290, 76.942960, 2.8, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-is202-8', '25B032777', 1, '2026-11-03 16:08:40', 43.255300, 76.942970, 4.5, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-is202-8', '25B032145', 1, '2026-11-03 16:14:02', 43.255295, 76.942965, 3.1, 'PRESENT', NULL, FALSE, NULL, NULL),
 ('ses-is202-8', '24B031122', 1, '2026-11-03 16:38:20', 43.266000, 76.956000, 1120.0, 'REJECTED', 'Distance 1120m exceeded allowed radius 150m', FALSE, NULL, NULL);

INSERT INTO attestation (student_id, course_code, semester, attestation_1, attestation_2, final_exam, updated_by) VALUES
 ('24B031926', 'BIS201', 'Fall 2026', 28.5, 27.0, NULL, 'Ainur Issabek'),
 ('24B031926', 'DB202', 'Fall 2026', 29.0, 28.5, NULL, 'Miras Asubay'),
 ('24B031926', 'CS101', 'Fall 2026', 27.0, 26.5, NULL, 'Arman Myrzakanurov'),
 ('24B031926', 'NET203', 'Fall 2026', 25.0, 26.0, NULL, 'Arman Myrzakanurov'),
 ('24B031926', 'MATH101', 'Fall 2026', 28.0, 29.0, NULL, 'Ainur Issabek');

-- Accounts without a password: the password is set at the first login.
INSERT INTO user_credentials (username, role, student_id)
SELECT username, 'STUDENT', student_id FROM students;

INSERT INTO user_credentials (username, role, teacher_id)
SELECT username, 'TEACHER', teacher_id FROM teachers;

INSERT INTO user_credentials (username, role) VALUES
 ('m_askarova', 'MANAGER'),
 ('admin', 'ADMIN');
