"""Builds database/02_seed.sql from the website's sample data.
Usage: python3 -I gen_seed_v3.py <repo root> <output .sql>
Sources: src/data/mockData.ts (users, rooms, courses, lessons, registrations, check-ins)
         src/components/pages/UninetPages.tsx (Discipline Schedule catalog, Attestation page)
"""
import re, sys, datetime

root, out = sys.argv[1], sys.argv[2]
mock = open(root + '/src/data/mockData.ts').read()
pages = open(root + '/src/components/pages/UninetPages.tsx').read()


def parse_objects(body):
    res, depth, cur = [], 0, ''
    for ch in body:
        if ch == '{':
            depth += 1
            if depth == 1:
                cur = ''
                continue
        if ch == '}':
            depth -= 1
            if depth == 0:
                res.append(cur)
                continue
        if depth >= 1:
            cur += ch
    rx = r"(\w+):\s*(?:'((?:[^'\\]|\\.)*)'|([^,\n]+))"
    return [{m.group(1): (m.group(2) if m.group(2) is not None else m.group(3).strip()) for m in re.finditer(rx, o)} for o in res]


def array(src, start_rx):
    m = re.search(start_rx + r'\s*=\s*\[(.*?)\n\s*\];', src, re.S)
    return parse_objects(m.group(1))


def q(v):
    if v is None:
        return 'NULL'
    v = str(v).strip()
    if v in ('true', 'false'):
        return v.upper()
    if re.fullmatch(r'-?\d+(\.\d+)?', v):
        return v
    return "'" + v.replace("'", "''") + "'"


U = array(mock, r'export const USERS[^=]*')
R = array(mock, r'export const ROOMS[^=]*')
C = array(mock, r'export const COURSES[^=]*')
S = array(mock, r'export const CLASS_SESSIONS[^=]*')
E = array(mock, r'export const ENROLLMENTS[^=]*')
A = array(mock, r'export const INITIAL_ATTENDANCE_RECORDS[^=]*')
CAT = array(pages, r'const allDisciplines')          # Discipline Schedule page
ATT = array(pages, r'const attestations')            # Attestation page

students = [u for u in U if u['role'] == 'STUDENT']
sid = {u['id']: u['studentId'] for u in students}
teachers = [dict(id=u['id'], username=u['username'], fullName=u['fullName'], email=u['email'],
                 department=u['department']) for u in U if u['role'] == 'TEACHER']
# Teachers named on the Discipline Schedule page who have no account in USERS yet
NEW_TEACHERS = {
    'Dana Sadykova': dict(id='t-sadykova', username='t_sadykova', email='d.sadykova@kbtu.kz', department='Business School'),
    'Elena Kim': dict(id='t-kim', username='t_kim', email='e.kim@kbtu.kz', department='General Education'),
}
for name, t in NEW_TEACHERS.items():
    teachers.append(dict(fullName=name, **t))
teacher_by_name = {t['fullName']: t['id'] for t in teachers}

rooms = [dict(id=r['id'], roomNumber=r['roomNumber'], building=r['building'], capacity=r['capacity'],
              latitude=r['latitude'], longitude=r['longitude'], wifiBSSID=r.get('wifiBSSID')) for r in R]
main = next(r for r in rooms if r['id'] == 'room-442')
# Rooms named on the Discipline Schedule page that are not in ROOMS.
# Same main building, so the GPS point of Auditorium 442 is used. Capacity is a placeholder.
rooms += [
    dict(id='room-210', roomNumber='Aud 210', building='Main Building, Tole Bi 59 (Business School)', capacity='60',
         latitude=main['latitude'], longitude=main['longitude'], wifiBSSID=None),
    dict(id='room-118', roomNumber='Aud 118', building='Main Building, Tole Bi 59', capacity='40',
         latitude=main['latitude'], longitude=main['longitude'], wifiBSSID=None),
]
ROOM_ALIAS = {'Hall 301': 'room-301', 'Auditorium 442': 'room-442', 'Aud 442': 'room-442',
              'Computer Lab 204': 'room-204', 'Lab 204': 'room-204', 'Aud 210': 'room-210', 'Aud 118': 'room-118'}
DAYS = {'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7}


def schedule(text):
    m = re.match(r'(\w{3})\s+(\d\d:\d\d)\s*[–-]\s*(\d\d:\d\d)', text)
    return DAYS[m.group(1)], m.group(2), m.group(3)


cat = {d['code']: d for d in CAT}
enr_credits = {e['courseCode']: e['credits'] for e in E}
# max places for courses that are not in COURSES: DB202 from the Database & ERD page (35), others placeholders
EXTRA_PLACES = {'DB202': '35', 'FIN201': '40', 'ENG102': '30'}
courses = []
for c in C:
    d, st, en = schedule(c['schedule'])
    courses.append(dict(code=c['code'], title=c['title'], credits=c['credits'],
                        ects=cat.get(c['code'], {}).get('credits'), faculty=cat.get(c['code'], {}).get('faculty', 'SITE'),
                        places=c['maxCapacity'], teacher=c['instructorId'], day=d, start=st, end=en,
                        room=ROOM_ALIAS[c['room']]))
known = {c['code'] for c in courses}
for d in CAT:
    if d['code'] in known:
        continue
    day, st, en = schedule(d['time'])
    # credits for the 21-credit limit: from ENROLLMENTS if there, otherwise ECTS x 3/5 (5 ECTS = 3 credits, like BIS201)
    credits = enr_credits.get(d['code']) or str(max(1, round(int(d['credits']) * 3 / 5)))
    courses.append(dict(code=d['code'], title=d['name'], credits=credits, ects=d['credits'], faculty=d['faculty'],
                        places=EXTRA_PLACES[d['code']], teacher=teacher_by_name[d['instructor']],
                        day=day, start=st, end=en, room=ROOM_ALIAS[d['room']]))
course = {c['code']: c for c in courses}


def tracked(start, end, number):
    hours = (datetime.datetime.strptime(end, '%H:%M') - datetime.datetime.strptime(start, '%H:%M')).seconds // 3600
    return 3 if hours == 3 and int(number) >= 8 else 1


sessions = [dict(id=s['id'], course=s['courseCode'], room=s['roomId'], number=s['sessionNumber'], date=s['date'],
                 start=s['startTime'], end=s['endTime'], radius=s['allowedCampusRadiusM'], status=s['status'],
                 hours=tracked(s['startTime'], s['endTime'], s['sessionNumber'])) for s in S]
# Lessons for weeks 12-15 of every course that has none yet (week 1 = Monday 07.09.2026)
WEEK1 = datetime.date(2026, 9, 7)
have = {(s['course'], int(s['number'])) for s in sessions}
for c in courses:
    for n in range(12, 16):
        if (c['code'], n) in have:
            continue
        date = WEEK1 + datetime.timedelta(weeks=n - 1, days=c['day'] - 1)
        sessions.append(dict(id=f"ses-{c['code'].lower()}-{n}", course=c['code'], room=c['room'], number=n,
                             date=date.isoformat(), start=c['start'], end=c['end'], radius='150', status='CLOSED',
                             hours=tracked(c['start'], c['end'], n)))

saniya = next(u['studentId'] for u in students if u['fullName'] == 'Saniya Niyazkhan')
teacher_name = {t['id']: t['fullName'] for t in teachers}

L = ["-- Test data copied from our website (version of 23.11). Built by gen_seed_v3.py, do not edit by hand.",
     "--   src/data/mockData.ts: students, teachers, rooms, courses, lessons, registrations, check-ins",
     "--   Discipline Schedule page: DB202, FIN201, ENG102 and the ECTS credits",
     "--   Attestation page: the attestation points (they belong to Saniya: the same 5 courses)",
     "-- Lessons of weeks 12-15 are added for every course that had none. Run after 01_schema.sql.", ""]
L.append("INSERT INTO students (student_id, username, full_name, email, major, year, gpa) VALUES")
L.append(",\n".join(f" ({q(u['studentId'])}, {q(u['username'])}, {q(u['fullName'])}, {q(u['email'])}, {q(u['major'])}, {q(u['year'])}, {q(u['gpa'])})" for u in students) + ";\n")
L.append("INSERT INTO teachers (teacher_id, username, full_name, email, department) VALUES")
L.append(",\n".join(f" ({q(t['id'])}, {q(t['username'])}, {q(t['fullName'])}, {q(t['email'])}, {q(t['department'])})" for t in teachers) + ";\n")
L.append("INSERT INTO rooms (room_id, room_number, building, capacity, centroid_lat, centroid_lng, wifi_bssid) VALUES")
L.append(",\n".join(f" ({q(r['id'])}, {q(r['roomNumber'])}, {q(r['building'])}, {q(r['capacity'])}, {q(r['latitude'])}, {q(r['longitude'])}, {q(r['wifiBSSID'])})" for r in rooms) + ";\n")
L.append("INSERT INTO courses (course_code, title, credits, ects_credits, faculty, max_places, teacher_id, day_of_week, start_time, end_time, room_id) VALUES")
L.append(",\n".join(f" ({q(c['code'])}, {q(c['title'])}, {q(c['credits'])}, {q(c['ects'])}, {q(c['faculty'])}, {q(c['places'])}, {q(c['teacher'])}, {c['day']}, {q(c['start'])}, {q(c['end'])}, {q(c['room'])})" for c in courses) + ";\n")
L.append("INSERT INTO enrollments (student_id, course_code, semester, status) VALUES")
L.append(",\n".join(f" ({q(sid[e['studentId']])}, {q(e['courseCode'])}, {q(e['semester'])}, {q(e['status'])})" for e in E) + ";\n")
L.append("INSERT INTO class_sessions (session_id, course_code, room_id, session_number, session_date, start_time, end_time, allowed_campus_radius_m, status, tracked_hours) VALUES")
L.append(",\n".join(f" ({q(s['id'])}, {q(s['course'])}, {q(s['room'])}, {q(s['number'])}, {q(s['date'])}, {q(s['start'])}, {q(s['end'])}, {q(s['radius'])}, {q(s['status'])}, {s['hours']})" for s in sessions) + ";\n")
L.append("INSERT INTO attendance_records (session_id, student_id, hour_slot, check_in_time, gps_latitude, gps_longitude, distance_to_center_m, verification_status, rejection_reason, is_override, override_by, override_reason) VALUES")
L.append(",\n".join(f" ({q(a['sessionId'])}, {q(sid[a['studentId']])}, {q(a.get('hourSlot', '1'))}, {q(a['checkInTime'])}, {q(a['gpsLatitude'])}, {q(a['gpsLongitude'])}, {q(a['distanceToCenterM'])}, {q(a['verificationStatus'])}, {q(a.get('rejectionReason'))}, {q(a.get('isOverride', 'false'))}, {q(a.get('overrideBy'))}, {q(a.get('overrideReason'))})" for a in A) + ";\n")
L.append("INSERT INTO attestation (student_id, course_code, semester, attestation_1, attestation_2, final_exam, updated_by) VALUES")
L.append(",\n".join(f" ({q(saniya)}, {q(a['code'])}, 'Fall 2026', {q(a['attestation1'])}, {q(a['attestation2'])}, NULL, {q(teacher_name[course[a['code']]['teacher']])})" for a in ATT) + ";\n")
open(out, 'w').write("\n".join(L))
print(f"students={len(students)} teachers={len(teachers)} rooms={len(rooms)} courses={len(courses)} "
      f"enrollments={len(E)} sessions={len(sessions)} checkins={len(A)} attestation={len(ATT)}")
