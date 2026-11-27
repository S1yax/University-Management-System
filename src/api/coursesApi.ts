/**
 * Courses, course registration and attestation on the server (server/src/routes/).
 * The same rules as in the database: free places, the 21-credit limit, time clashes,
 * one registration per course, attestation 0-30 / 0-30 and the final exam 0-40.
 *
 * Every function returns { code, body }. body.status says what happened, for example:
 *   REGISTERED, ALREADY_REGISTERED, COURSE_FULL, CREDIT_LIMIT, TIME_CLASH, NOT_FOUND,
 *   SAVED, NOT_REGISTERED, NOT_APPROVED, NOT_ADMITTED, BAD_VALUE.
 * body.message is a ready text to show on the page.
 *
 * Example (student registers for a course):
 *   const { body } = await coursesApi.register(currentUser.studentId!, 'NET203');
 *   if (body.status === 'REGISTERED') showSuccess(body.message); else showError(body.message);
 */
import { call, isApiConfigured } from './attendanceApi';

export { isApiConfigured };

export interface CatalogCourse {
  course_code: string;
  title: string;
  credits: number;
  ects_credits: number | null;
  faculty: string;
  teacher: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  day_of_week: number;
  start_time: string; // "16:00"
  end_time: string;
  room: string;
  max_places: number;
  taken_places: number;
  free_places: number;
}

export interface ScheduleLesson {
  enrollment_id: number;
  status: 'Pending' | 'Approved';
  course_code: string;
  title: string;
  credits: number;
  teacher: string;
  day: CatalogCourse['day'];
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
}

export interface ServerEnrollment {
  enrollment_id: number;
  student_id: string;
  full_name: string;
  course_code: string;
  title: string;
  credits: number;
  ects_credits: number | null;
  semester: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface AttestationItem {
  student_id: string;
  full_name: string;
  course_code: string;
  title: string;
  ects_credits: number | null;
  attestation_1: number | null;
  attestation_2: number | null;
  rating: number; // attestation 1 + attestation 2
  admitted: boolean; // rating >= 30: allowed to take the final exam
  final_exam: number | null;
  total: number | null; // only when the final exam has points
  letter: string | null; // A, A-, B+ ... F
  max_possible: number; // what the student can still reach
  updated_by: string | null;
  updated_at: string;
}

export interface Answer {
  status: string;
  message: string;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const query = (params: Record<string, string | undefined>) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return q ? `?${q}` : '';
};

export const coursesApi = {
  /** Catalog for the registration page */
  catalog: () => call<{ semester: string; courses: CatalogCourse[] }>('/courses'),

  /** Weekly timetable of one student, with the sum of credits */
  schedule: (studentId: string) =>
    call<{ studentId: string; semester: string; credits: number; creditLimit: number; lessons: ScheduleLesson[] }>(
      `/schedule${query({ studentId })}`
    ),

  /** Timetable problems for the manager: double-booked rooms and students with two courses at once */
  clashes: () => call<{ rooms: unknown[]; students: unknown[] }>('/clashes'),

  /** Registrations; every filter is optional (manager: status = 'Pending') */
  enrollments: (filter: { studentId?: string; courseCode?: string; status?: string } = {}) =>
    call<{ enrollments: ServerEnrollment[] }>(`/enrollments${query(filter)}`),

  /** A student registers for a course (status Pending) */
  register: (studentId: string, courseCode: string) =>
    call<Answer & { enrollment?: ServerEnrollment }>('/enrollments', json('POST', { studentId, courseCode })),

  /** The manager answers a registration */
  decide: (enrollmentId: number, status: 'Approved' | 'Rejected') =>
    call<Answer>(`/enrollments/${enrollmentId}`, json('PATCH', { status })),

  /** The student cancels a registration (its attestation points are deleted too) */
  cancel: (enrollmentId: number) => call<Answer>(`/enrollments/${enrollmentId}`, { method: 'DELETE' }),

  /** Attestation of a student (all courses) or of a course (all students) */
  attestation: (filter: { studentId?: string; courseCode?: string }) =>
    call<{ semester: string; items: AttestationItem[] }>(`/attestation${query(filter)}`),

  /** The teacher saves points. Only the sent fields change; null clears a field. */
  savePoints: (body: {
    studentId: string;
    courseCode: string;
    attestation1?: number | null;
    attestation2?: number | null;
    finalExam?: number | null;
  }) => call<Answer & { item?: AttestationItem }>('/attestation', json('PUT', body)),
};
