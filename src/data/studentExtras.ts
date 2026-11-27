/** Profile fields without an academic data source are displayed as unavailable. */
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

export function getStudentExtras(user: User): StudentExtras {
  const [lastName = user.fullName, firstName = ''] = user.fullName.trim().split(/\s+/, 2);
  return {
    lastName, firstName, patronymic: '—', gender: '—', iin: '—',
    enrollmentStatus: '—', personalEmail: '—', advisor: '—',
    faculty: user.department ?? '—', program: user.major ?? '—', tuitionType: '—', entranceYear: '—',
    identityDocument: { type: '—', number: '—', issueDate: '—', validUntil: '—', issuedBy: '—', countryOfBirth: '—', regionOfBirth: '—', placeOfBirth: '—' },
    addresses: [],
    educationDocument: { level: '—', documentType: '—', number: '—', issueDate: '—', institutionType: '—',
      institution: '—', country: '—', region: '—', institutionAddress: '—', languageOfInstruction: '—',
      certificateKind: '—', gpa: '—', entryYear: '—', graduationYear: '—', honours: '—', altynBelgi: '—' },
    languages: [], studyDirections: [], finance: { funding: '—', balance: '—', nextPayment: '—' }, invoices: [],
  };
}
