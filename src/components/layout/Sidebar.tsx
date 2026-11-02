import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  BookOpen,
  MapPin,
  Calendar,
  GraduationCap,
  PlusCircle,
  MessageSquare,
  Star,
  Newspaper,
  ClipboardList,
  FileSpreadsheet,
  Users,
  FlaskConical,
  AlertTriangle,
  BarChart3,
  UserCheck,
  ShieldAlert,
  Sliders,
  Database,
  Users2,
  CheckCircle,
  Building2,
  X,
  Radio,
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isHero?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { currentUser, activePath, setActivePath, t } = useApp();

  if (!currentUser) return null;

  // Build menu strictly per role - NO numbers, NO numbered lists!
  const getRoleMenuItems = (role: UserRole): MenuItem[] => {
    switch (role) {
      case 'STUDENT':
        return [
          { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
          { id: 'my-courses', label: t('myCourses'), icon: BookOpen },
          { id: 'attendance-checkin', label: t('attendanceCheckIn'), icon: MapPin, isHero: true, badge: 'GPS' },
          { id: 'schedule', label: t('schedule'), icon: Calendar },
          { id: 'grades-transcript', label: t('gradesTranscript'), icon: GraduationCap },
          { id: 'course-registration', label: t('courseRegistration'), icon: PlusCircle },
          { id: 'messages', label: t('messages'), icon: MessageSquare },
          { id: 'teacher-ratings', label: t('teacherRatings'), icon: Star },
          { id: 'news', label: t('news'), icon: Newspaper },
        ];

      case 'TEACHER':
        return [
          { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
          { id: 'my-courses', label: t('myCourses'), icon: BookOpen },
          { id: 'live-attendance', label: t('liveAttendance'), icon: Radio, isHero: true, badge: 'Live' },
          { id: 'gradebook', label: t('gradebook'), icon: FileSpreadsheet },
          { id: 'lessons', label: t('lessons'), icon: Calendar },
          { id: 'students', label: t('students'), icon: Users },
          { id: 'research', label: t('research'), icon: FlaskConical },
          { id: 'messages', label: t('messages'), icon: MessageSquare },
          { id: 'news', label: t('news'), icon: Newspaper },
        ];

      case 'MANAGER':
        return [
          { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
          { id: 'courses', label: t('courses'), icon: BookOpen },
          { id: 'enrollments', label: t('enrollments'), icon: ClipboardList },
          { id: 'at-risk-attendance', label: t('atRiskAttendance'), icon: AlertTriangle, isHero: true, badge: '< 80%' },
          { id: 'performance-reports', label: t('performanceReports'), icon: BarChart3 },
          { id: 'mentors', label: t('mentors'), icon: UserCheck },
          { id: 'messages', label: t('messages'), icon: MessageSquare },
          { id: 'news', label: t('news'), icon: Newspaper },
        ];

      case 'ADMIN':
        return [
          { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
          { id: 'users', label: t('users'), icon: Users },
          { id: 'roles-permissions', label: t('rolesPermissions'), icon: ShieldAlert },
          { id: 'audit-log', label: t('auditLog'), icon: ClipboardList, isHero: true, badge: 'Audit' },
          { id: 'courses', label: t('courses'), icon: BookOpen },
          { id: 'applications', label: t('applications'), icon: FileSpreadsheet },
          { id: 'system-settings', label: t('systemSettings'), icon: Sliders },
        ];
    }
  };

  // Shared pages only inside "Project" group at the bottom
  const projectGroupItems: MenuItem[] = [
    { id: 'database-erd', label: t('databaseErd'), icon: Database },
    { id: 'team-39', label: t('team39'), icon: Users2 },
    { id: 'project-status', label: t('projectStatus'), icon: CheckCircle },
  ];

  const roleMenuItems = getRoleMenuItems(currentUser.role);

  const handleSelectNav = (pathId: string) => {
    setActivePath(pathId);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white border-r border-[#D6E2F5] select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-[#D6E2F5] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0B3D91] text-white flex items-center justify-center font-extrabold text-sm shadow-md">
            K
          </div>
          <div>
            <span className="font-extrabold text-[#0B3D91] text-lg tracking-tight leading-none block">
              KBTU
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-tight">
              UMS Portal
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Role Menu Group */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {currentUser.role} {t('dashboard')}
            </span>
          </div>

          <nav className="space-y-1">
            {roleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-[#0B3D91] text-white shadow-sm shadow-[#0B3D91]/20'
                      : 'text-[#0F1F3D] hover:bg-[#E8F0FE] hover:text-[#0B3D91]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-white'
                          : item.isHero
                          ? 'text-[#0B3D91]'
                          : 'text-slate-400 group-hover:text-[#0B3D91]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.isHero
                          ? 'bg-[#E8F0FE] text-[#0B3D91] border border-[#D6E2F5]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Shared "Project" Group (at the bottom of sidebar) */}
        <div className="pt-2 border-t border-[#D6E2F5]/80">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('projectGroup')} (Team 39)
            </span>
          </div>

          <nav className="space-y-1">
            {projectGroupItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-[#0B3D91] text-white shadow-sm shadow-[#0B3D91]/20'
                      : 'text-[#0F1F3D] hover:bg-[#E8F0FE] hover:text-[#0B3D91]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#0B3D91]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#D6E2F5] shrink-0 bg-[#F5F8FD]/60">
        <div className="bg-white rounded-xl p-2.5 border border-[#D6E2F5] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E8F0FE] flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-[#0B3D91]" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[11px] font-bold text-[#0F1F3D] truncate">
              SITE • BIS201
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              Hall 301 Campus GPS
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (fixed width 260px) */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (with backdrop) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl transition-transform animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
