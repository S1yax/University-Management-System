export type UserRole = 'STUDENT' | 'TEACHER' | 'MANAGER' | 'ADMIN';

export type Language = 'EN' | 'RU' | 'KZ';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email: string;
  avatar?: string;
  studentId?: string; // e.g., '24B031926'
  major?: string;      // e.g., 'Information Systems'
  year?: number;       // e.g., 2
  gpa?: number;        // e.g., 3.85
  creditsEnrolled?: number; // e.g., 18
  department?: string; // e.g., 'School of Information Technology and Engineering'
  phone?: string;
}

export interface Room {
  id: string;
  roomNumber: string; // e.g., 'Hall 301'
  building: string;   // e.g., 'Main Building (Tole Bi 59)'
  capacity: number;   // e.g., 120
  latitude: number;   // 43.255320
  longitude: number;  // 76.943094
  wifiBSSID: string;  // e.g., 'KBTU-STUDENT-AP-301'
}

export interface Course {
  id: string;
  code: string;         // 'BIS201'
  title: string;        // 'Basics of Information Systems'
  credits: number;      // 3
  department: string;
  instructorId: string;
  instructorName: string;
  semester: string;     // 'Fall 2026'
  maxCapacity: number;  // 40
  enrolledCount: number;
  description: string;
  room: string;
  schedule: string;
}

export interface ClassSession {
  id: string;
  courseCode: string;
  sessionNumber: number; // 1 to 15
  title: string;
  date: string;          // YYYY-MM-DD
  dayOfWeek: string;     // 'Monday'
  startTime: string;     // '16:00'
  endTime: string;       // '19:00'
  roomId: string;
  roomName: string;      // 'Hall 301'
  instructorId: string;
  instructorName: string;
  allowedCampusRadiusM: number; // 150
  centerLat: number;     // 43.255320
  centerLng: number;     // 76.943094
  status: 'OPEN' | 'CLOSED';
}

export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  courseCode: string;
  semester: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  grade?: string;
  score?: number;
  credits: number;
}

export type VerificationStatus = 'PRESENT' | 'REJECTED' | 'MANUAL_REVIEW';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  courseCode: string;
  sessionTitle: string;
  sessionNumber: number;
  studentId: string;
  studentName: string;
  checkInTime: string;
  gpsLatitude: number;
  gpsLongitude: number;
  distanceToCenterM: number;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  isOverride?: boolean;
  overrideBy?: string;
  overrideReason?: string;
  hourSlot?: 1 | 2 | 3; // 1 = 16:00-17:00, 2 = 17:00-18:00, 3 = 18:00-19:00 for 3-hour sessions
  manualReviewNote?: string;
}

export type AuditActionType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'ACCOUNT_LOCKED'
  | 'LOGOUT'
  | 'PASSWORD_SET'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_CHANGE_FAILED'
  | 'GPS_CHECK_IN'
  | 'CHECK_IN_REJECTED'
  | 'MANUAL_OVERRIDE'
  | 'SESSION_STATUS_CHANGED'
  | 'GRADE_CHANGED'
  | 'EARLY_WARNING_SENT'
  | 'MANUAL_REVIEW_REQUEST';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string;
  role: UserRole | 'GUEST';
  action: AuditActionType;
  details: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  author: string;
}

export interface MessageItem {
  id: string;
  sender: string;
  senderRole: string;
  subject: string;
  content: string;
  date: string;
  read: boolean;
}
