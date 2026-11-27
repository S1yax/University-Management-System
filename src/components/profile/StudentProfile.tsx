import React, { useState } from 'react';
import { Eye, EyeOff, GraduationCap, KeyRound, Landmark, Receipt, User as UserIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ContactSettings } from './ContactSettings';
import { getStudentExtras } from '../../data/studentExtras';

type MainTab = 'info' | 'personal' | 'finance' | 'billing';
type PersonalTab = 'basic' | 'direction' | 'documents' | 'addresses' | 'education';

const MAIN_TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: 'info', label: 'Student Information', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'personal', label: 'Personal Data', icon: <UserIcon className="w-4 h-4" /> },
  { id: 'finance', label: 'Financial Cabinet', icon: <Landmark className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <Receipt className="w-4 h-4" /> },
];

const PERSONAL_TABS: { id: PersonalTab; label: string }[] = [
  { id: 'basic', label: 'Basic Data' },
  { id: 'direction', label: 'Education Direction' },
  { id: 'documents', label: 'Documents' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'education', label: 'Education' },
];

const card = 'bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm';

/** Shows only the last 4 characters of a sensitive value: •••••••1666 */
const mask = (value: string) => (value.length > 4 ? '•'.repeat(value.length - 4) + value.slice(-4) : value);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0B3D91] mb-3">
    <span className="w-1 h-4 rounded-full bg-[#0B3D91]" />
    {children}
  </h3>
);

const Field: React.FC<{ label: string; value?: React.ReactNode; ruled?: boolean }> = ({ label, value, ruled }) => (
  <div className={ruled ? 'py-3 border-b border-[#D6E2F5] last:border-b-0' : ''}>
    <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    <p className="text-sm font-semibold text-[#0F1F3D] break-words mt-0.5">
      {value === undefined || value === '' ? '—' : value}
    </p>
  </div>
);

const SimpleTable: React.FC<{ headers: string[]; rows: React.ReactNode[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-xl border border-[#D6E2F5]">
    <table className="w-full text-xs text-left">
      <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold">
        <tr>
          {headers.map((header) => (
            <th key={header} className="py-2.5 px-3">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#D6E2F5]">
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="py-2.5 px-3 text-[#0F1F3D]">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const NoData: React.FC = () => <p className="text-sm text-slate-500">No data</p>;

/** Student profile with tabs (Student Information, Personal Data, Financial Cabinet, Billing). Sample data only. */
export const StudentProfile: React.FC = () => {
  const { currentUser, setActivePath } = useApp();
  const [tab, setTab] = useState<MainTab>('info');
  const [personalTab, setPersonalTab] = useState<PersonalTab>('basic');
  const [reveal, setReveal] = useState(false); // IIN and document numbers are hidden until the user asks

  if (!currentUser) return null;
  const x = getStudentExtras(currentUser);
  const show = (value: string) => (reveal ? value : mask(value));

  const initials = currentUser.fullName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const selectMain = (id: MainTab) => {
    setTab(id);
    setReveal(false);
  };
  const selectPersonal = (id: PersonalTab) => {
    setPersonalTab(id);
    setReveal(false);
  };

  const tabClass = (active: boolean) =>
    `px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${
      active ? 'bg-[#E8F0FE] text-[#0B3D91]' : 'text-slate-600 hover:bg-[#F5F8FD]'
    }`;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-5">
      {/* Header card */}
      <div className={`${card} flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="w-20 h-20 rounded-2xl bg-[#0B3D91] text-white flex items-center justify-center text-2xl font-extrabold shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-[#0F1F3D]">{currentUser.fullName}</h2>
          <p className="text-xs text-slate-500 mt-0.5">ID: {currentUser.studentId}</p>
          <p className="text-sm text-[#0F1F3D] mt-1">{x.program}</p>
          <span className="inline-block mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        </div>
        <button
          type="button"
          onClick={() => setActivePath('change-password')}
          className="h-10 px-4 bg-white border border-[#D6E2F5] hover:bg-[#E8F0FE] text-[#0B3D91] font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors shrink-0"
        >
          <KeyRound className="w-4 h-4" />
          Change password
        </button>
      </div>

      {/* Main tabs */}
      <div className={`${card} !p-2`}>
        <div role="tablist" aria-label="Profile sections" className="flex flex-wrap gap-1">
          {MAIN_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => selectMain(item.id)}
              className={tabClass(tab === item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'info' && <ContactSettings />}

      {/* Student Information */}
      {tab === 'info' && (
        <div className={`${card} space-y-6`}>
          <div>
            <SectionTitle>Academic information</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Full Name" value={currentUser.fullName} />
              <Field label="Student ID" value={currentUser.studentId} />
              <Field label="Faculty" value={x.faculty} />
              <Field label="Program" value={x.program} />
              <Field label="Year of Study" value={currentUser.year} />
              <Field label="GPA" value={currentUser.gpa?.toFixed(2)} />
              <Field label="Advisor" value={x.advisor} />
            </div>
          </div>
          <div>
            <SectionTitle>Contact information</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Email" value={x.personalEmail} />
              <Field label="KBTU Email" value={currentUser.email} />
              <Field label="Phone" value={currentUser.phone} />
            </div>
          </div>
          <div>
            <SectionTitle>Administrative</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Enrollment Status" value={x.enrollmentStatus} />
              <Field label="Tuition Type" value={x.tuitionType} />
              <Field label="Entrance Year" value={x.entranceYear} />
            </div>
          </div>
        </div>
      )}

      {/* Personal Data */}
      {tab === 'personal' && (
        <>
          <div className={`${card} !p-2 flex items-center justify-between gap-2 flex-wrap`}>
            <div role="tablist" aria-label="Personal data sections" className="flex gap-1 overflow-x-auto">
              {PERSONAL_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={personalTab === item.id}
                  onClick={() => selectPersonal(item.id)}
                  className={tabClass(personalTab === item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setReveal(!reveal)}
              className="px-3 py-2 text-xs font-bold text-[#0B3D91] hover:bg-[#E8F0FE] rounded-xl flex items-center gap-1.5"
            >
              {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {reveal ? 'Hide sensitive data' : 'Show sensitive data'}
            </button>
          </div>

          <div className={card}>
            {personalTab === 'basic' && (
              <div>
                <Field ruled label="Last Name" value={x.lastName} />
                <Field ruled label="First Name" value={x.firstName} />
                <Field ruled label="Patronymic" value={x.patronymic} />
                <Field ruled label="Gender" value={x.gender} />
                <Field ruled label="IIN" value={show(x.iin)} />
                <Field ruled label="Student ID" value={currentUser.studentId} />
                <Field ruled label="Enrollment Status" value={x.enrollmentStatus} />
                <Field ruled label="Email" value={x.personalEmail} />
                <Field ruled label="Phone" value={currentUser.phone} />
              </div>
            )}

            {personalTab === 'direction' && (
              <div className="space-y-6">
                <div>
                  <Field ruled label="Program" value={x.program} />
                  <Field ruled label="Year" value={currentUser.year} />
                  <Field ruled label="Tuition Type" value={x.tuitionType} />
                  <Field ruled label="Admission Year" value={x.entranceYear} />
                </div>
                <div>
                  <SectionTitle>Study directions</SectionTitle>
                  <SimpleTable
                    headers={['Direction', 'Speciality', 'Language']}
                    rows={x.studyDirections.map((d) => [d.direction, d.speciality, d.language])}
                  />
                </div>
              </div>
            )}

            {personalTab === 'documents' && (
              <div className="space-y-6">
                <div>
                  <SectionTitle>Identity document</SectionTitle>
                  <Field ruled label="Document type" value={x.identityDocument.type} />
                  <Field ruled label="Number" value={show(x.identityDocument.number)} />
                  <Field ruled label="Issue date" value={x.identityDocument.issueDate} />
                  <Field ruled label="Valid until" value={x.identityDocument.validUntil} />
                  <Field ruled label="Issued by" value={x.identityDocument.issuedBy} />
                  <Field ruled label="IIN" value={show(x.iin)} />
                  <Field ruled label="Country of birth" value={x.identityDocument.countryOfBirth} />
                  <Field ruled label="Region of birth" value={x.identityDocument.regionOfBirth} />
                  <Field ruled label="Place of birth" value={x.identityDocument.placeOfBirth} />
                </div>
                {['Military record', 'Disability', 'Repatriate status', 'Visas'].map((title) => (
                  <div key={title}>
                    <SectionTitle>{title}</SectionTitle>
                    <NoData />
                  </div>
                ))}
              </div>
            )}

            {personalTab === 'addresses' && (
              <div>
                <SectionTitle>Addresses</SectionTitle>
                <SimpleTable
                  headers={['Address Type', 'Address']}
                  rows={x.addresses.map((a) => [a.type, a.address])}
                />
              </div>
            )}

            {personalTab === 'education' && (
              <div className="space-y-6">
                <div>
                  <SectionTitle>Education document</SectionTitle>
                  <Field ruled label="Education level" value={x.educationDocument.level} />
                  <Field ruled label="Document type" value={x.educationDocument.documentType} />
                  <Field ruled label="Number" value={show(x.educationDocument.number)} />
                  <Field ruled label="Issue date" value={x.educationDocument.issueDate} />
                  <Field ruled label="Type of institution" value={x.educationDocument.institutionType} />
                  <Field ruled label="Institution" value={x.educationDocument.institution} />
                  <Field ruled label="Country" value={x.educationDocument.country} />
                  <Field ruled label="Region" value={x.educationDocument.region} />
                  <Field ruled label="Institution address" value={x.educationDocument.institutionAddress} />
                  <Field ruled label="Language of instruction" value={x.educationDocument.languageOfInstruction} />
                  <Field ruled label="Certificate kind" value={x.educationDocument.certificateKind} />
                  <Field ruled label="GPA" value={x.educationDocument.gpa} />
                  <Field ruled label="Entry year" value={x.educationDocument.entryYear} />
                  <Field ruled label="Graduation year" value={x.educationDocument.graduationYear} />
                  <Field ruled label="Graduated with honours" value={x.educationDocument.honours} />
                  <Field ruled label="Altyn Belgi award" value={x.educationDocument.altynBelgi} />
                </div>
                <div>
                  <SectionTitle>School diploma</SectionTitle>
                  <NoData />
                </div>
                <div>
                  <SectionTitle>Languages</SectionTitle>
                  <SimpleTable
                    headers={['Language', 'Level', 'IELTS']}
                    rows={x.languages.map((l) => [l.language, l.level, l.ielts])}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Financial Cabinet */}
      {tab === 'finance' && (
        <div className={`${card} space-y-4`}>
          <SectionTitle>Financial cabinet</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Funding" value={x.finance.funding} />
            <Field label="Balance" value={x.finance.balance} />
            <Field label="Next payment" value={x.finance.nextPayment} />
          </div>
          <p className="text-[11px] text-slate-500">Demo data: the real finance module is not connected yet.</p>
        </div>
      )}

      {/* Billing */}
      {tab === 'billing' && (
        <div className={`${card} space-y-4`}>
          <SectionTitle>Billing</SectionTitle>
          <SimpleTable
            headers={['Period', 'Description', 'Amount', 'Status']}
            rows={x.invoices.map((i) => [i.period, i.description, i.amount, i.status])}
          />
          <p className="text-[11px] text-slate-500">Demo data: invoices are examples only.</p>
        </div>
      )}
    </div>
  );
};