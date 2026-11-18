/**
 * Extra student data for the profile page. EVERYTHING HERE IS SAMPLE DATA generated for the demo:
 * never put a real IIN, document number or address into the repository (it is public).
 */
import { User } from '../types';

export interface StudentExtras {
  lastName: string;
  firstName: string;
  patronymic: string;
  gender: string;
  iin: string;
  enrollmentStatus: string;
  personalEmail: string;
  advisor: string;
  faculty: string;
  program: string;
  tuitionType: string;
  entranceYear: string;
  identityDocument: {
    type: string;
    number: string;
    issueDate: string;
    validUntil: string;
    issuedBy: string;
    countryOfBirth: string;
    regionOfBirth: string;
    placeOfBirth: string;
  };
  addresses: { type: string; address: string }[];
  educationDocument: {
    level: string;
    documentType: string;
    number: string;
    issueDate: string;
    institutionType: string;
    institution: string;
    country: string;
    region: string;
    institutionAddress: string;
    languageOfInstruction: string;
    certificateKind: string;
    gpa: string;
    entryYear: string;
    graduationYear: string;
    honours: string;
    altynBelgi: string;
  };
  languages: { language: string; level: string; ielts: string }[];
  studyDirections: { direction: string; speciality: string; language: string }[];
  finance: { funding: string; balance: string; nextPayment: string };
  invoices: { period: string; description: string; amount: string; status: string }[];
}

const GENDER: Record<string, string> = {
  s_niyazkhan: 'Female',
  s_nurlybay: 'Male',
  s_yugai: 'Female',
  s_bagdat: 'Female',
  s_zholdassali: 'Male',
};

/** Students who pay for their studies (the others have a state grant). */
const PAID = new Set(['s_zholdassali']);

export function getStudentExtras(user: User): StudentExtras {
  const id = user.studentId ?? '';
  const digits = id.replace(/\D/g, '');
  const yy = Number(id.slice(0, 2));
  const startYear = Number.isFinite(yy) && yy > 0 ? 2000 + yy : 2024;
  const [lastName = user.fullName, firstName = ''] = user.fullName.trim().split(/\s+/);
  const paid = PAID.has(user.username);

  return {
    lastName,
    firstName,
    patronymic: '—',
    gender: GENDER[user.username] ?? '—',
    iin: `000000${digits}`.slice(-12), // obviously fake: starts with zeros
    enrollmentStatus: 'Studying',
    personalEmail: `${user.username}@example.com`,
    advisor: 'Ainur Issabek',
    faculty: user.department ?? '—',
    program: user.major ?? '—',
    tuitionType: paid ? 'Paid (contract)' : 'State grant',
    entranceYear: `${startYear}-${startYear + 1}`,
    identityDocument: {
      type: 'ID card (sample)',
      number: `N${digits.padStart(8, '0')}`,
      issueDate: '2022-03-15',
      validUntil: '2032-03-14',
      issuedBy: 'Sample issuing authority',
      countryOfBirth: 'Kazakhstan',
      regionOfBirth: 'Almaty',
      placeOfBirth: '—',
    },
    addresses: [
      { type: 'Registration address', address: 'Almaty, Sample street 1, apt. 1 (sample data)' },
      { type: 'Actual residence', address: 'Almaty, Sample street 1, apt. 1 (sample data)' },
    ],
    educationDocument: {
      level: 'Secondary education',
      documentType: 'School certificate',
      number: `S${digits.padStart(8, '0')}`,
      issueDate: `${startYear}-06-30`,
      institutionType: 'Gymnasium',
      institution: 'Sample Gymnasium No. 1',
      country: 'Kazakhstan',
      region: 'Almaty',
      institutionAddress: '—',
      languageOfInstruction: 'Russian',
      certificateKind: 'Standard',
      gpa: '4.5',
      entryYear: String(startYear - 11),
      graduationYear: String(startYear),
      honours: 'No',
      altynBelgi: 'No',
    },
    languages: [
      { language: 'English', level: 'B2', ielts: '—' },
      { language: 'Russian', level: 'Native', ielts: '—' },
    ],
    studyDirections: [
      { direction: 'Information technologies', speciality: user.major ?? '—', language: 'English' },
    ],
    finance: paid
      ? { funding: 'Self-funded (contract)', balance: '900 000 KZT due', nextPayment: 'Spring semester, before 20 January' }
      : { funding: 'State grant', balance: '0 KZT', nextPayment: 'No payment required' },
    invoices: paid
      ? [
          { period: 'Fall 2026', description: 'Tuition, first installment', amount: '900 000 KZT', status: 'Paid' },
          { period: 'Spring 2027', description: 'Tuition, second installment', amount: '900 000 KZT', status: 'Due' },
        ]
      : [
          { period: 'Fall 2026', description: 'Tuition covered by state grant', amount: '0 KZT', status: 'Covered by grant' },
          { period: 'Spring 2027', description: 'Tuition covered by state grant', amount: '0 KZT', status: 'Covered by grant' },
        ],
  };
}