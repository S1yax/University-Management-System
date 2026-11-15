import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutGrid,
  FileText,
  BookOpen,
  FileSpreadsheet,
  BarChart3,
  FolderArchive,
  Calendar,
  CalendarDays,
  Search,
  Wallet,
  Receipt,
  Edit3,
  CalendarPlus,
  ArrowLeftRight,
  Mail,
  ClipboardCheck,
  HelpCircle,
  Plane,
  Building2,
  User,
  Newspaper,
  Folder,
  Database,
  Users2,
  CheckCircle2,
  KeyRound,
  ChevronDown,
  X,
  Radio,
  AlertTriangle,
  ClipboardList,
  ShieldAlert,
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { currentUser, activePath, setActivePath, t } = useApp();

  // Accordion state for collapsible sections (all expanded by default matching screenshots)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  if (!currentUser) return null;

  const handleSelectNav = (pathId: string) => {
    setActivePath(pathId);
    onCloseMobile();
  };

  // Official KBTU Uninet Menu Structure (Matching screenshots 1:1)
  const uninetSections: NavSection[] = [
    {
      id: 'academic',
      title: 'ACADEMIC',
      items: [
        { id: 'transcript', label: 'Transcript', icon: FileText },
        { id: 'journal', label: 'Journal', icon: BookOpen, badge: 'GPS', badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-400/30' },
        { id: 'syllabus', label: 'Syllabus', icon: FileSpreadsheet },
        { id: 'attestation', label: 'Attestation', icon: BarChart3 },
        { id: 'course-materials', label: 'Course Materials', icon: FolderArchive },
      ],
    },
    {
      id: 'schedule-group',
      title: 'SCHEDULE',
      items: [
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'exam-schedule', label: 'Exam Schedule', icon: CalendarDays },
        { id: 'discipline-schedule', label: 'Discipline Schedule', icon: Search },
      ],
    },
    {
      id: 'financial',
      title: 'FINANCIAL',
      items: [
        { id: 'financial-cabinet', label: 'Financial Cabinet', icon: Wallet },
        { id: 'billing', label: 'Billing', icon: Receipt },
      ],
    },
    {
      id: 'registration',
      title: 'REGISTRATION',
      items: [
        { id: 'course-registration', label: 'Course Registration', icon: Edit3 },
        { id: 'schedule-creation', label: 'Schedule Creation', icon: CalendarPlus },
        { id: 'add-drop', label: 'Add/Drop', icon: ArrowLeftRight },
      ],
    },
    {
      id: 'requests-group',
      title: 'REQUESTS',
      items: [
        { id: 'requests', label: 'Requests', icon: Mail },
      ],
    },
    {
      id: 'interactive',
      title: 'INTERACTIVE',
      items: [
        { id: 'surveys', label: 'Surveys', icon: ClipboardCheck },
        { id: 'entry-tests', label: 'Entry tests', icon: HelpCircle },
        { id: 'mobility', label: 'Mobility', icon: Plane },
        { id: 'dormitory', label: 'Dormitory', icon: Building2 },
      ],
    },
    {
      id: 'personal',
      title: 'PERSONAL',
      items: [
        { id: 'user-profile', label: 'User profile', icon: User },
        { id: 'news', label: 'News', icon: Newspaper },
        { id: 'files', label: 'Files', icon: Folder },
      ],
    },
  ];

  // Additional sections for Project Team 39 and Faculty/Admin roles
  const projectItems: NavItem[] = [
    { id: 'database-erd', label: 'Database & ERD', icon: Database },
    { id: 'team-39', label: 'Team 39', icon: Users2 },
    { id: 'project-status', label: 'Project Status', icon: CheckCircle2 },
    { id: 'change-password', label: 'Change Password', icon: KeyRound },
  ];

  // Specific role views
  if (currentUser.role === 'ADMIN') {
    projectItems.push({ id: 'audit-log', label: 'Audit Log (NIST)', icon: ClipboardList, badge: 'Admin', badgeColor: 'bg-purple-500/20 text-purple-300' });
  } else if (currentUser.role === 'MANAGER') {
    projectItems.push({ id: 'at-risk-attendance', label: 'At-Risk (< 80%)', icon: AlertTriangle, badge: 'Alert', badgeColor: 'bg-amber-500/20 text-amber-300' });
  } else if (currentUser.role === 'TEACHER') {
    projectItems.push({ id: 'live-attendance', label: 'Live Attendance Roster', icon: Radio, badge: 'Live', badgeColor: 'bg-emerald-500/20 text-emerald-300' });
  }

  const projectSection: NavSection = {
    id: 'project-team39',
    title: 'PROJECT (TEAM 39)',
    items: projectItems,
  };

  const allSections = [...uninetSections, projectSection];

  const sidebarContent = (
    <div className="h-full flex flex-col bg-[#12162A] text-slate-200 select-none border-r border-[#1E2540]">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-[#1E2540] flex items-center justify-between shrink-0 bg-[#0E1222]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-black text-sm shadow-md">
            K
          </div>
          <div>
            <span className="font-black text-white text-base tracking-wide leading-none block">
              KBTU UNINET
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-tight">
              Academic Portal
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs font-medium scrollbar-thin scrollbar-thumb-slate-700">
        {/* Top: Standalone Dashboard (Matches Screenshot 1) */}
        <div>
          <button
            type="button"
            onClick={() => handleSelectNav('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
              activePath === 'dashboard'
                ? 'bg-[#202E54] text-[#4C82F7] font-semibold'
                : 'text-[#A6B4CE] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <LayoutGrid className={`w-4 h-4 shrink-0 ${activePath === 'dashboard' ? 'text-[#4C82F7]' : 'text-[#8A98B8]'}`} />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Collapsible Sections */}
        {allSections.map((section) => {
          const isCollapsed = !!collapsedSections[section.id];

          return (
            <div key={section.id} className="space-y-1">
              {/* Section Header with Chevron */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-3 pt-2 pb-1 text-[11px] font-bold text-[#637299] uppercase tracking-wider hover:text-slate-300 transition-colors cursor-pointer"
              >
                <span>{section.title}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 text-[#637299] ${
                    isCollapsed ? '-rotate-90' : 'rotate-0'
                  }`}
                />
              </button>

              {/* Section Items */}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    // Support aliases: journal matches attendance-checkin & live-attendance
                    const isActive =
                      activePath === item.id ||
                      (item.id === 'journal' && (activePath === 'attendance-checkin' || activePath === 'live-attendance')) ||
                      (item.id === 'transcript' && activePath === 'grades-transcript');

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectNav(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#202E54] text-[#4C82F7] font-semibold shadow-xs'
                            : 'text-[#A6B4CE] hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive ? 'text-[#4C82F7]' : 'text-[#8A98B8]'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              item.badgeColor || 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info (User & Active Semester) */}
      <div className="p-3 border-t border-[#1E2540] shrink-0 bg-[#0E1222]">
        <div className="bg-[#161C33] rounded-xl p-2.5 border border-[#222B4A] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#202E54] text-[#4C82F7] flex items-center justify-center shrink-0 font-bold text-xs">
            {currentUser.fullName.charAt(0)}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <div className="text-[11px] font-bold text-white truncate">
              {currentUser.fullName}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentUser.role} • SITE (Fall 2026)
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
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#12162A] shadow-2xl transition-transform animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
