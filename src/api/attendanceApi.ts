/**
 * Connection to our backend (server/ folder, Node.js + PostgreSQL).
 *
 * VITE_API_URL in the .env.local file of the project root:
 *   not set  -> no server; the website works as before (data in this browser only)
 *   auto     -> http://<the same computer as the website>:4000/api
 *               (localhost on the laptop, the laptop's IP address on a phone in the same Wi-Fi)
 *   a URL    -> that address, e.g. http://localhost:4000/api
 */
const RAW_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const API_URL: string | null = !RAW_URL
  ? null
  : RAW_URL === 'auto'
    ? `${window.location.protocol}//${window.location.hostname}:4000/api`
    : RAW_URL.replace(/\/$/, '');

export const isApiConfigured = API_URL !== null;

/** A check-in row as the server sends it (student_id = the KBTU ID, e.g. 24B031901). */
export interface ServerRecord {
  attendance_id: number;
  session_id: string;
  student_id: string;
  hour_slot: 1 | 2 | 3;
  check_in_time: string;
  gps_latitude: number;
  gps_longitude: number;
  distance_to_center_m: number;
  verification_status: 'PRESENT' | 'REJECTED' | 'MANUAL_REVIEW';
  rejection_reason: string | null;
  is_override: boolean;
  override_by: string | null;
  override_reason: string | null;
}

export interface ServerSession {
  session_id: string;
  status: 'OPEN' | 'CLOSED';
}

export interface ApiAnswer {
  status: string;
  message: string;
  hourSlot?: 1 | 2 | 3;
  distanceM?: number;
}

async function call<T>(path: string, init?: RequestInit): Promise<{ code: number; body: T }> {
  if (!API_URL) throw new Error('API is not configured');
  const res = await fetch(API_URL + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    signal: init?.signal ?? AbortSignal.timeout(5000),
  });
  return { code: res.status, body: (await res.json()) as T };
}

export const attendanceApi = {
  health: () => call<{ ok: boolean; database: string }>('/health'),

  records: () => call<{ records: ServerRecord[] }>('/records'),

  sessions: () => call<{ sessions: ServerSession[] }>('/sessions'),

  setSessionStatus: (sessionId: string, status: 'OPEN' | 'CLOSED') =>
    call<ApiAnswer>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  checkIn: (body: {
    sessionId: string;
    studentId: string;
    latitude: number;
    longitude: number;
    time?: string;
    weakSignal?: boolean;
    accuracy?: number;
  }) => call<ApiAnswer>('/checkin', { method: 'POST', body: JSON.stringify(body) }),

  override: (body: {
    sessionId: string;
    studentId: string;
    hourSlot: 1 | 2 | 3;
    status: 'PRESENT' | 'REJECTED' | 'MANUAL_REVIEW';
    reason: string;
    teacher: string;
  }) => call<ApiAnswer>('/override', { method: 'POST', body: JSON.stringify(body) }),
};
