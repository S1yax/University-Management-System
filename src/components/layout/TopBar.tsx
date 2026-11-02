import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  Shield,
  GraduationCap,
  Briefcase,
  UserCheck,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { Language, UserRole } from '../../types';
import { MESSAGES } from '../../data/mockData';

interface TopBarProps {
  onToggleMobileSidebar: () => void;
  pageTitle: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileSidebar, pageTitle }) => {
  const { currentUser, logout, language, setLanguage, t } = useApp();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState(MESSAGES);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <Shield className="w-3 h-3" />
            {t('roleAdmin')}
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Briefcase className="w-3 h-3" />
            {t('roleTeacher')}
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <UserCheck className="w-3 h-3" />
            {t('roleManager')}
          </span>
        );
      case 'STUDENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#0B3D91] border border-[#D6E2F5]">
            <GraduationCap className="w-3 h-3" />
            {t('roleStudent')}
          </span>
        );
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const unreadCount = notificationsList.filter((n) => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-[#D6E2F5] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_3px_rgba(11,61,145,0.03)]">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 text-slate-600 hover:text-[#0B3D91] hover:bg-[#F5F8FD] rounded-lg transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#0F1F3D] tracking-tight">
            {pageTitle}
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-500 font-medium">
            KBTU UMS • Academic Year 2026–2027
          </p>
        </div>
      </div>

      {/* Right: Actions, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Language switcher */}
        <div className="hidden lg:flex items-center bg-[#F5F8FD] border border-[#D6E2F5] rounded-full p-0.5 text-xs font-semibold text-[#0F1F3D]">
          <Globe className="w-3.5 h-3.5 ml-2 mr-1 text-[#0B3D91]" />
          {(['EN', 'RU', 'KZ'] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`px-2 py-0.5 rounded-full transition-all ${
                language === lang
                  ? 'bg-[#0B3D91] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B3D91]'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-[#0B3D91] hover:bg-[#E8F0FE]/60 rounded-xl transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#D6E2F5] rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
              <div className="p-3.5 bg-[#F5F8FD] border-b border-[#D6E2F5] flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F1F3D] uppercase tracking-wider">
                  {t('notifications')} ({unreadCount})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setNotificationsList((prev) => prev.map((item) => ({ ...item, read: true })))
                  }
                  className="text-[11px] font-semibold text-[#0B3D91] hover:underline"
                >
                  Mark all as read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#D6E2F5]/60">
                {notificationsList.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 text-xs transition-colors hover:bg-[#F5F8FD] ${
                      !notif.read ? 'bg-[#E8F0FE]/30' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-[#0F1F3D]">{notif.subject}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{notif.date}</span>
                    </div>
                    <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {notif.content}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] font-medium text-[#0B3D91]">
                      {notif.sender} ({notif.senderRole})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu Dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#E8F0FE]/50 border border-transparent hover:border-[#D6E2F5] transition-all"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-[#0B3D91] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {getInitials(currentUser?.fullName)}
            </div>

            {/* Name and role (hidden on mobile) */}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[#0F1F3D] leading-tight">
                {currentUser?.fullName}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {currentUser?.username}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* User Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#D6E2F5] rounded-xl shadow-xl z-50 py-2 animate-fadeIn">
              <div className="px-4 py-2 border-b border-[#D6E2F5]/70">
                <p className="text-xs font-bold text-[#0F1F3D] truncate">
                  {currentUser?.fullName}
                </p>
                <p className="text-[11px] text-slate-500 truncate mb-1.5">
                  {currentUser?.email}
                </p>
                <div>{getRoleBadge(currentUser?.role)}</div>
                {currentUser?.studentId && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    ID: <span className="font-semibold text-[#0F1F3D]">{currentUser.studentId}</span>
                  </p>
                )}
              </div>

              {/* Mobile language switch inside user menu */}
              <div className="px-4 py-2 lg:hidden border-b border-[#D6E2F5]/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Language
                </span>
                <div className="flex gap-1">
                  {(['EN', 'RU', 'KZ'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        language === lang
                          ? 'bg-[#0B3D91] text-white'
                          : 'bg-[#F5F8FD] text-slate-600'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout Option */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  {t('logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
