import React, { useState } from 'react';
import { canAccess } from './utils/rbac';
import { useApp } from './context/AppContext';
import { LoginPage } from './components/auth/LoginPage';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ProfilePage } from './components/profile/ProfilePage';
import { AttendanceCheckInPage } from './components/student/AttendanceCheckInPage';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { LiveAttendancePage } from './components/teacher/LiveAttendancePage';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { AtRiskAttendancePage } from './components/manager/AtRiskAttendancePage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuditLogPage } from './components/admin/AuditLogPage';
import { DatabaseErdPage } from './components/project/DatabaseErdPage';
import { Team39Page } from './components/project/Team39Page';
import { ProjectStatusPage } from './components/project/ProjectStatusPage';
import { AccessDeniedPage } from './components/common/AccessDeniedPage';
import { ChangePasswordPage } from './components/auth/ChangePasswordPage';
import {
  MyCoursesPage,
  SchedulePage,
  GradesTranscriptPage,
  CourseRegistrationPage,
  MessagesPage,
  TeacherRatingsPage,
  NewsPage,
  GradebookPage,
  LessonsPage,
  StudentsPage,
  ResearchPage,
  CoursesCatalogPage,
  EnrollmentsPage,
  PerformanceReportsPage,
  MentorsPage,
  UsersPage,
  RolesPermissionsPage,
  ApplicationsPage,
  SystemSettingsPage,
} from './components/pages/AdditionalPages';
import {
  JournalPage,
  SyllabusPage,
  AttestationPage,
  CourseMaterialsPage,
  ExamSchedulePage,
  DisciplineSchedulePage,
  FinancialCabinetPage,
  BillingPage,
  ScheduleCreationPage,
  AddDropPage,
  RequestsPage,
  SurveysPage,
  EntryTestsPage,
  MobilityPage,
  DormitoryPage,
  UserProfilePage,
  FilesPage,
} from './components/pages/UninetPages';

export const App: React.FC = () => {
  const { currentUser, activePath, setActivePath, t, authReady, passwordChangeInfo } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // A remembered device is being checked: show nothing instead of flashing the login page
  if (!authReady) {
    return null;
  }

  // If not logged in, show University Portal Login
  if (!currentUser) {
    return <LoginPage />;
  }

  // Students must choose a new password in every semester: nothing else opens until they do
  if (passwordChangeInfo) {
    return (
      <div className="min-h-screen bg-[#F5F8FD] p-4 sm:p-8 text-[#0F1F3D]">
        <ChangePasswordPage forced />
      </div>
    );
  }

  const isAllowed = canAccess(currentUser.role, activePath);

  // Determine current page title
  const getPageTitle = (path: string) => {
    switch (path) {
      case 'dashboard':
        return `${currentUser.role === 'STUDENT' ? 'Student' : currentUser.role === 'TEACHER' ? 'Faculty' : currentUser.role === 'MANAGER' ? 'Manager' : 'Administrator'} ${t('dashboard')}`;
      case 'my-courses':
        return t('myCourses');
      case 'attendance-checkin':
        return t('attendanceCheckIn');
      case 'schedule':
        return t('schedule');
      case 'grades-transcript':
        return t('gradesTranscript');
      case 'course-registration':
        return t('courseRegistration');
      case 'messages':
        return t('messages');
      case 'teacher-ratings':
        return t('teacherRatings');
      case 'news':
        return t('news');
      case 'live-attendance':
        return t('liveAttendance');
      case 'gradebook':
        return t('gradebook');
      case 'lessons':
        return t('lessons');
      case 'students':
        return t('students');
      case 'research':
        return t('research');
      case 'courses':
        return t('courses');
      case 'enrollments':
        return t('enrollments');
      case 'at-risk-attendance':
        return t('atRiskAttendance');
      case 'performance-reports':
        return t('performanceReports');
      case 'mentors':
        return t('mentors');
      case 'users':
        return t('users');
      case 'roles-permissions':
        return t('rolesPermissions');
      case 'audit-log':
        return t('auditLog');
      case 'applications':
        return t('applications');
      case 'system-settings':
        return t('systemSettings');
      case 'database-erd':
        return t('databaseErd');
      case 'team-39':
        return t('team39');
      case 'project-status':
        return t('projectStatus');
      case 'transcript':
        return 'Transcript';
      case 'journal':
        return 'Academic Journal & GPS Attendance';
      case 'syllabus':
        return 'Course Syllabus';
      case 'attestation':
        return 'Attestation & Grade Points';
      case 'course-materials':
        return 'Course Materials';
      case 'exam-schedule':
        return 'Exam Schedule';
      case 'discipline-schedule':
        return 'Discipline Schedule';
      case 'financial-cabinet':
        return 'Financial Cabinet';
      case 'billing':
        return 'Billing & Invoices';
      case 'schedule-creation':
        return 'Schedule Creation';
      case 'add-drop':
        return 'Add/Drop Period';
      case 'requests':
        return 'Requests & Student Services';
      case 'surveys':
        return 'Surveys & Evaluations';
      case 'entry-tests':
        return 'Entry tests';
      case 'mobility':
        return 'Academic Mobility';
      case 'dormitory':
        return 'Dormitory (House #1 & #2)';
      case 'user-profile':
        return 'User profile';
      case 'files':
        return 'Files Storage';
      case 'change-password':
        return 'Change password';
      case 'profile':
        return 'My profile';
      default:
        return t('dashboard');
    }
  };

  // Render content based on activePath & role authorization
  const renderContent = () => {
    if (!isAllowed) {
      return <AccessDeniedPage />;
    }

    // Shared Project Pages
    if (activePath === 'database-erd') return <DatabaseErdPage />;
    if (activePath === 'team-39') return <Team39Page />;
    if (activePath === 'project-status') return <ProjectStatusPage />;
    if (activePath === 'change-password') return <ChangePasswordPage />;
    if (activePath === 'profile') return <ProfilePage />;

    // Role-specific routing
    switch (activePath) {
      case 'dashboard':
        if (currentUser.role === 'STUDENT') return <StudentDashboard />;
        if (currentUser.role === 'TEACHER') return <TeacherDashboard />;
        if (currentUser.role === 'MANAGER') return <ManagerDashboard />;
        return <AdminDashboard />;

      // Student routes
      case 'attendance-checkin':
        return <AttendanceCheckInPage />;
      case 'schedule':
        return <SchedulePage />;
      case 'grades-transcript':
        return <GradesTranscriptPage />;
      case 'course-registration':
        return <CourseRegistrationPage />;
      case 'teacher-ratings':
        return <TeacherRatingsPage />;

      // Teacher routes
      case 'live-attendance':
        return <LiveAttendancePage />;
      case 'gradebook':
        return <GradebookPage />;
      case 'lessons':
        return <LessonsPage />;
      case 'students':
        return <StudentsPage />;
      case 'research':
        return <ResearchPage />;

      // Manager routes
      case 'at-risk-attendance':
        return <AtRiskAttendancePage />;
      case 'enrollments':
        return <EnrollmentsPage />;
      case 'performance-reports':
        return <PerformanceReportsPage />;
      case 'mentors':
        return <MentorsPage />;

      // Admin routes
      case 'audit-log':
        return <AuditLogPage />;
      case 'users':
        return <UsersPage />;
      case 'roles-permissions':
        return <RolesPermissionsPage />;
      case 'applications':
        return <ApplicationsPage />;
      case 'system-settings':
        return <SystemSettingsPage />;

      // Uninet Pages
      case 'transcript':
        return <GradesTranscriptPage />;
      case 'journal':
        return <JournalPage />;
      case 'syllabus':
        return <SyllabusPage />;
      case 'attestation':
        return <AttestationPage />;
      case 'course-materials':
        return <CourseMaterialsPage />;
      case 'exam-schedule':
        return <ExamSchedulePage />;
      case 'discipline-schedule':
        return <DisciplineSchedulePage />;
      case 'financial-cabinet':
        return <FinancialCabinetPage />;
      case 'billing':
        return <BillingPage />;
      case 'schedule-creation':
        return <ScheduleCreationPage />;
      case 'add-drop':
        return <AddDropPage />;
      case 'requests':
        return <RequestsPage />;
      case 'surveys':
        return <SurveysPage />;
      case 'entry-tests':
        return <EntryTestsPage />;
      case 'mobility':
        return <MobilityPage />;
      case 'dormitory':
        return <DormitoryPage />;
      case 'user-profile':
        return <UserProfilePage />;
      case 'files':
        return <FilesPage />;

      // Shared secondary pages
      case 'my-courses':
        return <MyCoursesPage />;
      case 'courses':
        return <CoursesCatalogPage />;
      case 'messages':
        return <MessagesPage />;
      case 'news':
        return <NewsPage />;

      default:
        return <AccessDeniedPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FD] flex text-[#0F1F3D] selection:bg-[#E8F0FE] selection:text-[#0B3D91]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          pageTitle={getPageTitle(activePath)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Dev Role Testing Shortcut (Discrete floating pill for grading/evaluation) */}
      <div className="fixed bottom-3 right-3 z-40 hidden lg:flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-xs border border-[#D6E2F5] rounded-full shadow-lg text-[10px] font-bold text-slate-600">
        <span className="text-[#0B3D91] px-1.5">Dev 403 Test:</span>
        <button
          type="button"
          onClick={() => setActivePath('live-attendance')}
          className="px-2 py-0.5 rounded-full hover:bg-slate-100"
          title="Try opening Teacher Live Attendance"
        >
          /teacher
        </button>
        <button
          type="button"
          onClick={() => setActivePath('audit-log')}
          className="px-2 py-0.5 rounded-full hover:bg-slate-100"
          title="Try opening Admin Audit Log"
        >
          /admin
        </button>
        <button
          type="button"
          onClick={() => setActivePath('at-risk-attendance')}
          className="px-2 py-0.5 rounded-full hover:bg-slate-100"
          title="Try opening Manager At-Risk"
        >
          /manager
        </button>
        <button
          type="button"
          onClick={() => setActivePath('attendance-checkin')}
          className="px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#0B3D91]"
          title="Open Student Check-in"
        >
          /student
        </button>
      </div>
    </div>
  );
};
