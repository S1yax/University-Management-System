import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  Compass,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Building,
  User,
  Wifi,
  Navigation,
  Send,
  ShieldAlert,
  Smartphone,
  LocateFixed,
  Crosshair,
  Lock,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import {
  SIMULATION_PRESETS,
  formatDistance,
  KBTU_HALL_301_COORDS,
  calculateHaversineDistance,
} from '../../utils/geo';
import { CampusMap } from '../common/CampusMap';

export const AttendanceCheckInPage: React.FC = () => {
  const {
    currentUser,
    classSessions,
    attendanceRecords,
    checkInGPS,
    requestManualReview,
    getStudentAttendanceRate,
    courses,
    t,
    timeSimulationMode,
    setTimeSimulationMode,
    checkSessionTime,
  } = useApp();

  // Active session for BIS201 (Week 8)
  const activeSession = classSessions.find((s) => s.id === 'ses-8') || classSessions[7];

  // Time Window Check (Monday 16:00 - 19:00 / с 4 до 7 в понедельник)
  const sessionTimeStatus = checkSessionTime(activeSession?.id || 'ses-8');

  // Check hourly records for this 3-hour session
  const hour1Record = attendanceRecords.find(
    (r) => r.sessionId === activeSession?.id && r.studentId === currentUser?.id && (r.hourSlot || 1) === 1
  );
  const hour2Record = attendanceRecords.find(
    (r) => r.sessionId === activeSession?.id && r.studentId === currentUser?.id && r.hourSlot === 2
  );
  const hour3Record = attendanceRecords.find(
    (r) => r.sessionId === activeSession?.id && r.studentId === currentUser?.id && r.hourSlot === 3
  );

  const activeHourSlot: 1 | 2 | 3 = sessionTimeStatus.currentHourSlot || 1;
  const currentHourRecord = activeHourSlot === 1 ? hour1Record : activeHourSlot === 2 ? hour2Record : hour3Record;
  const existingRecord = currentHourRecord;

  // User's current location state (supports real browser GPS or simulation presets)
  const [studentCoords, setStudentCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    source: 'REAL_BROWSER' | 'INSIDE' | 'OUTSIDE' | 'DRIFT';
    sourceLabel: string;
  }>({
    lat: SIMULATION_PRESETS.INSIDE.lat,
    lng: SIMULATION_PRESETS.INSIDE.lng,
    accuracy: SIMULATION_PRESETS.INSIDE.accuracy,
    source: 'INSIDE',
    sourceLabel: 'Демо: Внутри Hall 301',
  });

  const [mapView, setMapView] = useState<'LEAFLET' | 'ALMATY_SCHEMATIC' | 'RADAR'>('LEAFLET');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Result Banner State
  const [checkInResult, setCheckInResult] = useState<{
    type: 'SUCCESS' | 'REJECTED' | 'ALREADY' | 'DRIFT';
    message: string;
    distance?: number;
    timestamp?: string;
  } | null>(null);

  // Manual Review Form State
  const [showManualReviewForm, setShowManualReviewForm] = useState(false);
  const [manualReviewReason, setManualReviewReason] = useState(
    'Присутствую в Hall 301, 3 ряд. Слабый сигнал GPS внутри аудитории.'
  );
  const [reviewSentToast, setReviewSentToast] = useState(false);

  // Real-time calculated Haversine distance from student coordinates to KBTU Hall 301 Centroid
  const currentDistanceM = calculateHaversineDistance(
    studentCoords.lat,
    studentCoords.lng,
    KBTU_HALL_301_COORDS.lat,
    KBTU_HALL_301_COORDS.lng
  );

  const allowedRadiusM = activeSession?.allowedCampusRadiusM || KBTU_HALL_301_COORDS.allowedRadiusM;
  const isWithinRadius = currentDistanceM <= allowedRadiusM;
  const isDriftMode = studentCoords.source === 'DRIFT';

  // Synchronize existing status if student already has a record for the current active hour
  useEffect(() => {
    if (currentHourRecord) {
      if (currentHourRecord.verificationStatus === 'PRESENT') {
        setCheckInResult({
          type: 'SUCCESS',
          message: `Посещаемость за Час ${activeHourSlot} подтверждена! Дистанция: ${formatDistance(currentHourRecord.distanceToCenterM)}`,
          distance: currentHourRecord.distanceToCenterM,
          timestamp: currentHourRecord.checkInTime,
        });
      } else if (currentHourRecord.verificationStatus === 'REJECTED') {
        setCheckInResult({
          type: 'REJECTED',
          message: currentHourRecord.rejectionReason || `Отметка за Час ${activeHourSlot} отклонена.`,
          distance: currentHourRecord.distanceToCenterM,
          timestamp: currentHourRecord.checkInTime,
        });
      } else if (currentHourRecord.verificationStatus === 'MANUAL_REVIEW') {
        setCheckInResult({
          type: 'DRIFT',
          message: `Слабый GPS-сигнал — запрос за Час ${activeHourSlot} на проверке у преподавателя`,
          distance: currentHourRecord.distanceToCenterM,
          timestamp: currentHourRecord.checkInTime,
        });
      }
    } else {
      setCheckInResult(null);
    }
  }, [currentHourRecord, activeHourSlot]);

  // Request real device GPS from browser
  const handleDetectRealGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsErrorMsg('Геолокация не поддерживается вашим браузером.');
      return;
    }

    setIsDetectingGps(true);
    setGpsErrorMsg(null);
    setCheckInResult(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        setStudentCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          source: 'REAL_BROWSER',
          sourceLabel: `Реальный GPS устройства (±${Math.round(pos.coords.accuracy)}м)`,
        });
      },
      (err) => {
        setIsDetectingGps(false);
        let msg = 'Не удалось получить GPS-координаты.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Доступ к геолокации запрещен в браузере. Разрешите доступ или выберите тестовый пресет ниже.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Датчик геолокации недоступен на вашем устройстве.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Время запроса GPS истекло. Попробуйте еще раз.';
        }
        setGpsErrorMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Switch simulation presets
  const handleSelectPreset = (mode: 'INSIDE' | 'OUTSIDE' | 'DRIFT') => {
    const preset = SIMULATION_PRESETS[mode];
    setGpsErrorMsg(null);
    setCheckInResult(null);
    setStudentCoords({
      lat: preset.lat,
      lng: preset.lng,
      accuracy: preset.accuracy,
      source: mode,
      sourceLabel: preset.name,
    });
  };

  // Perform GPS Check-in verification
  const handlePerformCheckIn = (forceAttempt: boolean = false) => {
    if (!activeSession || !currentUser) return;

    // Check time condition
    if (!sessionTimeStatus.active && !forceAttempt) {
      setCheckInResult({
        type: 'REJECTED',
        message: `Чек-ин заблокирован по времени: занятие проводится по понедельникам с 16:00 до 19:00. ${sessionTimeStatus.reason || ''}`,
      });
      return;
    }

    // Check geofence condition
    if (!isWithinRadius && !forceAttempt && !isDriftMode) {
      setCheckInResult({
        type: 'REJECTED',
        message: `Дистанция ${formatDistance(currentDistanceM)} находится вне допустимого радиуса кампуса (${allowedRadiusM} м). Отметка заблокирована.`,
        distance: currentDistanceM,
      });
      return;
    }

    setIsLocating(true);

    setTimeout(() => {
      setIsLocating(false);
      const result = checkInGPS(
        activeSession.id,
        studentCoords.lat,
        studentCoords.lng,
        isDriftMode,
        activeHourSlot
      );
      processCheckInResult(result);
    }, 400);
  };

  const processCheckInResult = (result: any) => {
    if (result.status === 'SUCCESS_PRESENT') {
      setCheckInResult({
        type: 'SUCCESS',
        message: result.message,
        distance: result.distanceM,
        timestamp: new Date().toLocaleTimeString(),
      });
    } else if (result.status === 'MANUAL_REVIEW_SUBMITTED') {
      setCheckInResult({
        type: 'DRIFT',
        message: result.message,
        distance: result.distanceM,
        timestamp: new Date().toLocaleTimeString(),
      });
      setShowManualReviewForm(true);
    } else if (result.status === 'ALREADY_CHECKED_IN') {
      setCheckInResult({
        type: 'ALREADY',
        message: result.message,
      });
    } else {
      setCheckInResult({
        type: 'REJECTED',
        message: result.message,
        distance: result.distanceM,
      });
    }
  };

  // Reset check-in in local storage for testing multiple times
  const handleResetForTesting = () => {
    if (!activeSession || !currentUser) return;
    const saved = localStorage.getItem('kbtu_ums_attendance');
    if (saved) {
      try {
        const records = JSON.parse(saved);
        const filtered = records.filter(
          (r: any) => !(r.sessionId === activeSession.id && r.studentId === currentUser.id)
        );
        localStorage.setItem('kbtu_ums_attendance', JSON.stringify(filtered));
      } catch {
        // ignore
      }
    }
    setCheckInResult(null);
    window.location.reload();
  };

  const handleSendManualReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    requestManualReview(activeSession.id, manualReviewReason);
    setReviewSentToast(true);
    setShowManualReviewForm(false);
    setTimeout(() => setReviewSentToast(false), 5000);
  };

  // Student's attendance rate for BIS201
  const bis201Rate = currentUser
    ? getStudentAttendanceRate(currentUser.id, 'BIS201')
    : { attended: 0, total: 8, percentage: 0, isAtRisk: false };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {reviewSentToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold">
              {t('manualReviewSent')} (Записано в журнал преподавателя Аинур Исабек)
            </span>
          </div>
          <button
            onClick={() => setReviewSentToast(false)}
            className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            {t('close')}
          </button>
        </div>
      )}

      {/* HERO SECTION: Course & Active Session Header */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0B3D91] to-[#124cb1] text-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-xs rounded-full text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${sessionTimeStatus.active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>
                {sessionTimeStatus.active
                  ? `УРОК ИДЕТ • НЕДЕЛЯ ${activeSession?.sessionNumber}`
                  : `ВНЕ ВРЕМЕНИ УРОКА • НЕДЕЛЯ ${activeSession?.sessionNumber}`}
              </span>
            </div>
            <div className="text-xs font-medium text-blue-100 flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 text-blue-200" />
              <span>Понедельник с 16:00 до 19:00 (с 4 до 7)</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-3">
            {activeSession?.courseCode} — {courses.find((c) => c.code === activeSession?.courseCode)?.title}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            {activeSession?.title}
          </p>

          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-200 shrink-0" />
              <span>
                Аудитория: <strong className="text-white">{activeSession?.roomName}</strong> (Толе би, 59)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-200 shrink-0" />
              <span>
                Преподаватель: <strong className="text-white">{activeSession?.instructorName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-200 shrink-0" />
              <span>
                Радиус допуска: <strong className="text-white">{allowedRadiusM} метров</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* LESSON TIME STATUS NOTIFICATION */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              sessionTimeStatus.active
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className={`w-4 h-4 shrink-0 ${sessionTimeStatus.active ? 'text-emerald-700' : 'text-amber-700'}`} />
              <div>
                <span className="font-bold">
                  {sessionTimeStatus.active
                    ? `Окно урока активно (${sessionTimeStatus.scheduledDay} ${sessionTimeStatus.scheduledTime}):`
                    : 'Окно урока закрыто по времени:'}
                </span>{' '}
                <span>
                  {sessionTimeStatus.active
                    ? `Текущее время: ${sessionTimeStatus.currentTime}. Активен Час ${activeHourSlot} (${activeHourSlot === 1 ? '16:00–17:00' : activeHourSlot === 2 ? '17:00–18:00' : '18:00–19:00'}).`
                    : sessionTimeStatus.reason}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                sessionTimeStatus.active
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-amber-200 text-amber-900'
              }`}
            >
              {sessionTimeStatus.active ? `Час ${activeHourSlot} из 3` : 'Вне слота'}
            </span>
          </div>

          {/* 3-HOUR LESSON ATTENDANCE PROGRESS TRACKER */}
          <div className="bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D6E2F5] pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0B3D91]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#0F1F3D]">
                  Почасовая отметка: 3-часовой урок ({sessionTimeStatus.scheduledDay} 16:00 – 19:00)
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-[#0B3D91]">
                Итого за пару: {[hour1Record, hour2Record, hour3Record].filter(r => r?.verificationStatus === 'PRESENT').length} из 3 отметок
              </span>
            </div>

            <p className="text-xs text-slate-500">
              По правилам КБТУ отметка считается за каждый час 3-часового занятия. Всего необходимо отметиться 3 раза:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Hour 1 (16:00 - 17:00) */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  hour1Record?.verificationStatus === 'PRESENT'
                    ? 'bg-emerald-50 border-emerald-300'
                    : hour1Record?.verificationStatus === 'REJECTED'
                    ? 'bg-red-50 border-red-300'
                    : activeHourSlot === 1 && sessionTimeStatus.active
                    ? 'bg-white border-[#0B3D91] ring-2 ring-[#0B3D91]/20 shadow-xs'
                    : 'bg-white/80 border-[#D6E2F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F1F3D]">Час 1 (16:00 – 17:00)</span>
                  {activeHourSlot === 1 && sessionTimeStatus.active && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#0B3D91] animate-pulse">
                      Идет сейчас
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs">
                  {hour1Record?.verificationStatus === 'PRESENT' ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Отмечен ({hour1Record.checkInTime.split(' ')[1] || '16:04'})</span>
                    </div>
                  ) : hour1Record?.verificationStatus === 'REJECTED' ? (
                    <div className="flex items-center gap-1.5 text-red-800 font-bold">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Отклонен ({formatDistance(hour1Record.distanceToCenterM)})</span>
                    </div>
                  ) : activeHourSlot === 1 && sessionTimeStatus.active ? (
                    <span className="text-[#0B3D91] font-semibold">⏳ Требуется чек-ин</span>
                  ) : (
                    <span className="text-slate-400">⚪ Не отмечен</span>
                  )}
                </div>
              </div>

              {/* Hour 2 (17:00 - 18:00) */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  hour2Record?.verificationStatus === 'PRESENT'
                    ? 'bg-emerald-50 border-emerald-300'
                    : hour2Record?.verificationStatus === 'REJECTED'
                    ? 'bg-red-50 border-red-300'
                    : activeHourSlot === 2 && sessionTimeStatus.active
                    ? 'bg-white border-[#0B3D91] ring-2 ring-[#0B3D91]/20 shadow-xs'
                    : 'bg-white/80 border-[#D6E2F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F1F3D]">Час 2 (17:00 – 18:00)</span>
                  {activeHourSlot === 2 && sessionTimeStatus.active && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#0B3D91] animate-pulse">
                      Идет сейчас
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs">
                  {hour2Record?.verificationStatus === 'PRESENT' ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Отмечен ({hour2Record.checkInTime.split(' ')[1] || '17:02'})</span>
                    </div>
                  ) : hour2Record?.verificationStatus === 'REJECTED' ? (
                    <div className="flex items-center gap-1.5 text-red-800 font-bold">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Отклонен ({formatDistance(hour2Record.distanceToCenterM)})</span>
                    </div>
                  ) : activeHourSlot === 2 && sessionTimeStatus.active ? (
                    <span className="text-[#0B3D91] font-semibold">⏳ Требуется чек-ин</span>
                  ) : (
                    <span className="text-slate-400">⚪ Ожидание (с 17:00)</span>
                  )}
                </div>
              </div>

              {/* Hour 3 (18:00 - 19:00) */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  hour3Record?.verificationStatus === 'PRESENT'
                    ? 'bg-emerald-50 border-emerald-300'
                    : hour3Record?.verificationStatus === 'REJECTED'
                    ? 'bg-red-50 border-red-300'
                    : activeHourSlot === 3 && sessionTimeStatus.active
                    ? 'bg-white border-[#0B3D91] ring-2 ring-[#0B3D91]/20 shadow-xs'
                    : 'bg-white/80 border-[#D6E2F5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F1F3D]">Час 3 (18:00 – 19:00)</span>
                  {activeHourSlot === 3 && sessionTimeStatus.active && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#0B3D91] animate-pulse">
                      Идет сейчас
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs">
                  {hour3Record?.verificationStatus === 'PRESENT' ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Отмечен ({hour3Record.checkInTime.split(' ')[1] || '18:03'})</span>
                    </div>
                  ) : hour3Record?.verificationStatus === 'REJECTED' ? (
                    <div className="flex items-center gap-1.5 text-red-800 font-bold">
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Отклонен ({formatDistance(hour3Record.distanceToCenterM)})</span>
                    </div>
                  ) : activeHourSlot === 3 && sessionTimeStatus.active ? (
                    <span className="text-[#0B3D91] font-semibold">⏳ Требуется чек-ин</span>
                  ) : (
                    <span className="text-slate-400">⚪ Ожидание (с 18:00)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Time Simulator for testing 3 hours */}
            <div className="pt-2 border-t border-[#D6E2F5] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0B3D91]" />
                  <span>Симуляция времени урока для тестирования каждого часа:</span>
                </span>
                <span className="text-[11px] font-semibold text-[#0B3D91]">
                  Сейчас: {sessionTimeStatus.currentDay} {sessionTimeStatus.currentTime}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('DURING_LESSON_H1')}
                  className={`px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    timeSimulationMode === 'DURING_LESSON_H1' || (timeSimulationMode === 'DURING_LESSON' && activeHourSlot === 1)
                      ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 font-bold text-[#0B3D91]'
                      : 'border-[#D6E2F5] bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[11px] font-bold">Час 1</div>
                  <div className="text-[9px] text-slate-500">16:25</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('DURING_LESSON_H2')}
                  className={`px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    timeSimulationMode === 'DURING_LESSON_H2'
                      ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 font-bold text-[#0B3D91]'
                      : 'border-[#D6E2F5] bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[11px] font-bold">Час 2</div>
                  <div className="text-[9px] text-slate-500">17:25</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('DURING_LESSON_H3')}
                  className={`px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    timeSimulationMode === 'DURING_LESSON_H3'
                      ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 font-bold text-[#0B3D91]'
                      : 'border-[#D6E2F5] bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[11px] font-bold">Час 3</div>
                  <div className="text-[9px] text-slate-500">18:25</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('BEFORE_LESSON')}
                  className={`px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    timeSimulationMode === 'BEFORE_LESSON'
                      ? 'border-amber-600 bg-white ring-2 ring-amber-600/20 font-bold text-amber-700'
                      : 'border-[#D6E2F5] bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[11px] font-bold">До урока</div>
                  <div className="text-[9px] text-slate-500">15:15</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('AFTER_LESSON')}
                  className={`px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    timeSimulationMode === 'AFTER_LESSON'
                      ? 'border-red-600 bg-white ring-2 ring-red-600/20 font-bold text-red-700'
                      : 'border-[#D6E2F5] bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[11px] font-bold">После</div>
                  <div className="text-[9px] text-slate-500">19:45</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('REAL_TIME')}
                  className={`px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    timeSimulationMode === 'REAL_TIME'
                      ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 font-bold text-[#0B3D91]'
                      : 'border-[#D6E2F5] bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[11px] font-bold">Часы ПК</div>
                  <div className="text-[9px] text-slate-500">Реальное</div>
                </button>
              </div>
            </div>
          </div>

          {/* GEOLOCATION COMPARISON & GEOFENCE VALIDATOR PANEL */}
          <div className="bg-[#F5F8FD] rounded-xl border border-[#D6E2F5] p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D6E2F5] pb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#0B3D91]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#0F1F3D]">
                  Сравнение геолокации и проверка геозоны КБТУ (150 м)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleDetectRealGps}
                disabled={isDetectingGps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B3D91] hover:bg-[#0A3278] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isDetectingGps ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Определение координат...</span>
                  </>
                ) : (
                  <>
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>Определить мой реальный GPS</span>
                  </>
                )}
              </button>
            </div>

            {gpsErrorMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{gpsErrorMsg}</span>
              </div>
            )}

            {/* Side-by-Side Coordinates Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Target: KBTU Centroid */}
              <div className="bg-white p-3.5 rounded-lg border border-[#D6E2F5] space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-bold text-[#0B3D91]">
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#0B3D91]" />
                    <span>Центроид КБТУ (Hall 301)</span>
                  </span>
                  <span className="text-[10px] bg-[#E8F0FE] text-[#0B3D91] px-2 py-0.5 rounded-full font-semibold">
                    Главный корпус
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  ул. Толе би, 59 (площадь Астана, Алматы)
                </div>
                <div className="font-mono text-xs font-semibold text-[#0F1F3D] pt-1">
                  Широта: <span className="text-[#0B3D91]">{KBTU_HALL_301_COORDS.lat.toFixed(6)}°</span>
                  <br />
                  Долгота: <span className="text-[#0B3D91]">{KBTU_HALL_301_COORDS.lng.toFixed(6)}°</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                  <span>Допустимый радиус:</span>
                  <strong className="text-[#0B3D91]">150 метров</strong>
                </div>
              </div>

              {/* Current: Student Geolocation */}
              <div className="bg-white p-3.5 rounded-lg border border-[#D6E2F5] space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-bold text-[#0F1F3D]">
                  <span className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#0B3D91]" />
                    <span>Ваша текущая локация</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    studentCoords.source === 'REAL_BROWSER'
                      ? 'bg-emerald-100 text-emerald-800'
                      : studentCoords.source === 'OUTSIDE'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {studentCoords.sourceLabel}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {studentCoords.source === 'REAL_BROWSER'
                    ? 'Считано с датчика GPS браузера'
                    : 'Тестовый пресет симуляции'}
                </div>
                <div className="font-mono text-xs font-semibold text-[#0F1F3D] pt-1">
                  Широта: <span className="text-slate-800">{studentCoords.lat.toFixed(6)}°</span>
                  <br />
                  Долгота: <span className="text-slate-800">{studentCoords.lng.toFixed(6)}°</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                  <span>Погрешность сигнала:</span>
                  <strong>±{studentCoords.accuracy || 5} м</strong>
                </div>
              </div>
            </div>

            {/* Calculated Distance & Verification Outcome Card */}
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                isWithinRadius
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50/80 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isWithinRadius
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-rose-600 text-white shadow-xs'
                  }`}
                >
                  {isWithinRadius ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-extrabold">
                      {isWithinRadius ? 'ВНУТРИ ЗОНЫ КБТУ • ДОПУСК РАЗРЕШЕН' : 'ВНЕ ЗОНЫ КБТУ • ЧЕК-ИН ЗАБЛОКИРОВАН'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isWithinRadius
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      Лимит: 150 м
                    </span>
                  </div>

                  <p className="text-xs mt-1 leading-relaxed">
                    {isWithinRadius ? (
                      <>
                        Ваше расстояние до Hall 301 составляет{' '}
                        <strong className="text-emerald-800">{formatDistance(currentDistanceM)}</strong>, что не превышает допустимый радиус 150 м.
                        Вы можете подтвердить свое присутствие на занятии.
                      </>
                    ) : (
                      <>
                        Вы находитесь на расстоянии{' '}
                        <strong className="text-rose-800">{formatDistance(currentDistanceM)}</strong> от аудитории (превышает 150 м).
                        Система предотвращает фиктивную отметку посещаемости вне территории университета.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Big Distance Metric Tag */}
              <div className="sm:text-right shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-500">Дистанция до КБТУ</div>
                <div
                  className={`text-2xl font-black ${
                    isWithinRadius ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatDistance(currentDistanceM)}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CHECK-IN ACTION BUTTON & STATUS */}
          <div className="flex flex-col items-center justify-center text-center space-y-4 pt-2">
            {!sessionTimeStatus.active ? (
              // Case A: OUTSIDE SCHEDULED LESSON TIME (Monday 16:00 - 19:00) -> STRICTLY BLOCKED BY TIME!
              <div className="w-full max-w-lg space-y-2.5">
                <button
                  type="button"
                  disabled={true}
                  className="w-full h-16 rounded-2xl bg-slate-200 border-2 border-amber-400 text-amber-900 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-not-allowed shadow-inner"
                  title="Отметка невозможна: урок проводится только по понедельникам с 16:00 до 19:00"
                >
                  <Clock className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>Чек-ин заблокирован по времени (Урок: Пн 16:00–19:00)</span>
                </button>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-2 gap-2">
                  <span className="text-amber-800 font-semibold">{sessionTimeStatus.reason}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handlePerformCheckIn(true)}
                      className="text-amber-700 hover:underline font-semibold cursor-pointer"
                    >
                      Тест отказа: отправить попытку
                    </button>
                    {existingRecord && (
                      <button
                        type="button"
                        onClick={handleResetForTesting}
                        className="text-[#0B3D91] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Сброс</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : !isWithinRadius ? (
              // Case B: INSIDE LESSON TIME, BUT OUTSIDE CAMPUS RADIUS (>150m) -> STRICTLY BLOCKED BY GPS!
              <div className="w-full max-w-lg space-y-2.5">
                <button
                  type="button"
                  disabled={true}
                  className="w-full h-16 rounded-2xl bg-slate-200 border-2 border-rose-400 text-rose-800 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-not-allowed shadow-inner"
                  title="Отметка невозможна: вы находитесь за пределами радиуса 150 м от КБТУ"
                >
                  <Lock className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Чек-ин заблокирован (Вне зоны 150м: {formatDistance(currentDistanceM)})</span>
                </button>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-2 gap-2">
                  <span className="text-rose-700 font-semibold">Посещаемость не принимается вне кампуса</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handlePerformCheckIn(true)}
                      className="text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Тест отказа: отправить попытку (будет REJECTED)
                    </button>
                    {existingRecord && (
                      <button
                        type="button"
                        onClick={handleResetForTesting}
                        className="text-[#0B3D91] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Сброс</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : existingRecord?.verificationStatus === 'PRESENT' ? (
              // Case C: ALREADY CHECKED IN SUCCESSFULLY FOR THIS HOUR
              <div className="flex flex-col items-center gap-2">
                <div className="w-full sm:w-[420px] h-16 rounded-2xl bg-emerald-600 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md shadow-emerald-700/20 px-4">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <span>Час {activeHourSlot} подтвержден ({[hour1Record, hour2Record, hour3Record].filter(r => r?.verificationStatus === 'PRESENT').length}/3 отметок)</span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  {activeHourSlot < 3
                    ? `Следующая отметка откроется в Час ${activeHourSlot + 1} (${activeHourSlot === 1 ? 'с 17:00' : 'с 18:00'})`
                    : 'Все 3 часа 3-часового занятия успешно подтверждены!'}
                </p>
                <button
                  type="button"
                  onClick={handleResetForTesting}
                  className="text-xs text-[#0B3D91] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer pt-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить отметку для повторного тестирования сценариев</span>
                </button>
              </div>
            ) : (
              // Case D: DURING LESSON TIME AND WITHIN CAMPUS RADIUS -> ALLOWED TO CHECK-IN FOR THIS HOUR!
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePerformCheckIn(false)}
                  disabled={isLocating}
                  className="w-full sm:w-[420px] h-16 rounded-2xl bg-[#0B3D91] hover:bg-[#0A3278] active:bg-[#072458] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all shadow-md shadow-blue-900/20 active:scale-[0.98] disabled:opacity-60 cursor-pointer px-4"
                >
                  {isLocating ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Проверка координат и регистрация...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-6 h-6 animate-bounce" />
                      <span>
                        Отметиться за Час {activeHourSlot} ({activeHourSlot === 1 ? '16:00–17:00' : activeHourSlot === 2 ? '17:00–18:00' : '18:00–19:00'})
                      </span>
                    </>
                  )}
                </button>
                {([hour1Record, hour2Record, hour3Record].some(Boolean)) && (
                  <button
                    type="button"
                    onClick={handleResetForTesting}
                    className="text-xs text-[#0B3D91] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer pt-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Сбросить отметку для теста</span>
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500 max-w-md">
              Алгоритм вычисляет ортодромическое расстояние по формуле Хаверсина относительно центроида Hall 301 ({KBTU_HALL_301_COORDS.lat}, {KBTU_HALL_301_COORDS.lng}).
            </p>
          </div>

          {/* Result Banner (PRESENT / REJECTED / DRIFT) */}
          {checkInResult && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn ${
                checkInResult.type === 'SUCCESS'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : checkInResult.type === 'DRIFT'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : checkInResult.type === 'ALREADY'
                  ? 'bg-blue-50 border-blue-200 text-[#0B3D91]'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {checkInResult.type === 'SUCCESS' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : checkInResult.type === 'DRIFT' ? (
                  <Wifi className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                ) : checkInResult.type === 'ALREADY' ? (
                  <CheckCircle2 className="w-6 h-6 text-[#0B3D91] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                )}

                <div>
                  <div className="font-bold text-sm">
                    {checkInResult.type === 'SUCCESS' && 'СТАТУС: ПРИСУТСТВУЕТ (PRESENT)'}
                    {checkInResult.type === 'REJECTED' && 'СТАТУС: ОТКЛОНЕНО (REJECTED)'}
                    {checkInResult.type === 'DRIFT' && 'СТАТУС: СЛАБЫЙ GPS-СИГНАЛ (DRIFT)'}
                    {checkInResult.type === 'ALREADY' && 'СТАТУС: УЖЕ ОТМЕЧЕН'}
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed">{checkInResult.message}</p>
                  {checkInResult.distance !== undefined && (
                    <div className="text-[11px] font-medium mt-1 text-slate-600">
                      Зафиксированное расстояние: <strong>{formatDistance(checkInResult.distance)}</strong> • Радиус кампуса: 150 м
                    </div>
                  )}
                  {checkInResult.timestamp && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Время регистрации: {checkInResult.timestamp}
                    </div>
                  )}
                </div>
              </div>

              {/* Drift manual review request action */}
              {checkInResult.type === 'DRIFT' && (
                <button
                  type="button"
                  onClick={() => setShowManualReviewForm(true)}
                  className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  {t('manualReviewBtn')}
                </button>
              )}
            </div>
          )}

          {/* Drift Manual Review Modal / Form */}
          {showManualReviewForm && (
            <div className="p-4 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B3D91]">
                <ShieldAlert className="w-4 h-4 text-[#0B3D91]" />
                <span>Запрос на ручное подтверждение посещаемости</span>
              </div>
              <p className="text-xs text-slate-600">
                Слабый GPS-сигнал из-за толстых стен главного корпуса. Если вы действительно находитесь в аудитории Hall 301, отправьте пояснение преподавателю Аинур Исабек:
              </p>
              <form onSubmit={handleSendManualReview} className="space-y-3">
                <textarea
                  rows={2}
                  value={manualReviewReason}
                  onChange={(e) => setManualReviewReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D6E2F5] rounded-lg text-xs text-[#0F1F3D] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
                  placeholder="Опишите ваше место в аудитории Hall 301..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualReviewForm(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-[#0B3D91] hover:bg-[#0A3278] text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить преподавателю</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Interactive Geofence Map / Radar Visualizer */}
          <div className="p-4 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#0B3D91]" />
                <span className="text-xs font-bold text-[#0F1F3D]">
                  Интерактивная карта геозоны КБТУ (Толе би 59)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="bg-white border border-[#D6E2F5] p-0.5 rounded-lg flex items-center text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setMapView('LEAFLET')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      mapView === 'LEAFLET' ? 'bg-[#0B3D91] text-white' : 'text-slate-600 hover:text-[#0B3D91]'
                    }`}
                  >
                    Карта Алматы (OSM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapView('ALMATY_SCHEMATIC')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      mapView === 'ALMATY_SCHEMATIC' ? 'bg-[#0B3D91] text-white' : 'text-slate-600 hover:text-[#0B3D91]'
                    }`}
                  >
                    Схема кампуса
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapView('RADAR')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      mapView === 'RADAR' ? 'bg-[#0B3D91] text-white' : 'text-slate-600 hover:text-[#0B3D91]'
                    }`}
                  >
                    Радар
                  </button>
                </div>
                <span className="text-[10px] font-bold text-[#0B3D91] bg-[#E8F0FE] px-2 py-0.5 rounded-full border border-[#D6E2F5]">
                  Радиус: 150м
                </span>
              </div>
            </div>

            {/* Map, Campus Layout, or Radar View */}
            {mapView === 'LEAFLET' ? (
              <CampusMap
                studentLat={studentCoords.lat}
                studentLng={studentCoords.lng}
                status={isDriftMode ? 'DRIFT' : isWithinRadius ? 'INSIDE' : 'OUTSIDE'}
                accuracyM={studentCoords.accuracy}
                sourceLabel={studentCoords.sourceLabel}
              />
            ) : mapView === 'ALMATY_SCHEMATIC' ? (
              <div className="relative w-full h-72 bg-[#F0F5FD] rounded-xl border border-[#D6E2F5] overflow-hidden p-4 select-none flex flex-col justify-between">
                {/* Streets Header */}
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-b border-[#D6E2F5] pb-1">
                  <span>← ул. Панфилова (пешеходная)</span>
                  <span className="font-bold text-[#0B3D91]">УЛИЦА ТОЛЕ БИ (Старая площадь / пл. Астана)</span>
                  <span>просп. Абылай хана →</span>
                </div>

                {/* Central Campus Building Schema */}
                <div className="relative flex-1 flex items-center justify-center my-2">
                  {/* 150m Campus Geofence Boundary */}
                  <div className="absolute w-56 h-56 rounded-full border-2 border-dashed border-[#0B3D91]/60 bg-[#E8F0FE]/40 flex items-center justify-center">
                    <span className="text-[9px] font-extrabold text-[#0B3D91] absolute top-1 uppercase tracking-wider">
                      Периметр геозоны 150 м
                    </span>
                  </div>

                  {/* KBTU Main Historic Building Block */}
                  <div className="relative z-10 w-48 h-28 bg-white border-2 border-[#0B3D91] rounded-xl shadow-md p-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-[9px] font-extrabold text-[#0B3D91] uppercase">Главное здание КБТУ</span>
                      <span className="text-[8px] bg-blue-100 text-[#0B3D91] px-1 rounded font-bold">ТОЛЕ БИ 59</span>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 my-auto">
                      <div className="p-1.5 bg-[#0B3D91] text-white rounded-lg flex items-center gap-1 text-[10px] font-bold shadow-xs">
                        <Building className="w-3.5 h-3.5" />
                        <span>Hall 301 (Центроид)</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-[8px] text-slate-400">
                      <span>Западное крыло</span>
                      <span>Восточное крыло</span>
                    </div>
                  </div>

                  {/* Student Position Indicator in Schema */}
                  <div
                    className={`absolute z-20 transition-all duration-700 flex flex-col items-center ${
                      isWithinRadius
                        ? 'translate-x-3 -translate-y-2'
                        : studentCoords.source === 'OUTSIDE'
                        ? 'translate-x-36 -translate-y-24'
                        : 'translate-x-20 translate-y-16'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shadow-lg ring-2 ${
                        isWithinRadius
                          ? 'bg-emerald-500 ring-emerald-200 text-white'
                          : isDriftMode
                          ? 'bg-amber-500 ring-amber-200 text-white animate-pulse'
                          : 'bg-red-500 ring-red-200 text-white'
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs mt-0.5 whitespace-nowrap ${
                        isWithinRadius
                          ? 'bg-emerald-600 text-white'
                          : isDriftMode
                          ? 'bg-amber-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {isWithinRadius
                        ? `Внутри зоны (~${formatDistance(currentDistanceM)})`
                        : `Вне кампуса (~${formatDistance(currentDistanceM)})`}
                    </span>
                  </div>
                </div>

                {/* Footer streets */}
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-t border-[#D6E2F5] pt-1">
                  <span>Казахстанско-Британский технический университет</span>
                  <span>Центроид: 43.255320, 76.943094</span>
                  <span>ул. Богенбай батыра ↓</span>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-48 bg-gradient-to-b from-blue-900/5 to-blue-900/10 rounded-xl border border-[#D6E2F5] overflow-hidden flex items-center justify-center select-none">
                {/* Outer 150m boundary circle */}
                <div className="absolute w-40 h-40 rounded-full border-2 border-dashed border-[#0B3D91]/60 flex items-center justify-center bg-[#E8F0FE]/30 animate-pulse">
                  <span className="text-[9px] font-extrabold text-[#0B3D91] uppercase tracking-wider absolute -top-4">
                    Граница геозоны 150 м
                  </span>
                </div>

                {/* Inner 75m circle */}
                <div className="absolute w-20 h-20 rounded-full border border-[#0B3D91]/30 flex items-center justify-center" />

                {/* Centroid: Hall 301 */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-[#0B3D91] text-white flex items-center justify-center shadow-md">
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#0B3D91] mt-1 bg-white/90 px-1.5 py-0.2 rounded border border-[#D6E2F5]">
                    Hall 301
                  </span>
                </div>

                {/* Simulated Student Pin Position */}
                <div
                  className={`absolute transition-all duration-700 flex flex-col items-center z-20 ${
                    isWithinRadius
                      ? 'translate-x-3 -translate-y-2'
                      : 'translate-x-32 -translate-y-16'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shadow-lg ring-2 ${
                      isWithinRadius
                        ? 'bg-emerald-500 ring-emerald-200 text-white'
                        : 'bg-red-500 ring-red-200 text-white'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs mt-0.5 whitespace-nowrap ${
                      isWithinRadius ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    {formatDistance(currentDistanceM)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* DEV / DEMO LOCATION & TIME SIMULATOR CONTROLS */}
          <div className="space-y-3">
            {/* 1. Time Window Switcher (Monday 16:00 - 19:00 / с 4 до 7) */}
            <div className="p-4 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0B3D91]" />
                  <span className="text-xs font-bold text-[#0F1F3D]">
                    Симулятор времени урока (Расписание: Понедельник 16:00 – 19:00 / с 4 до 7):
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Текущий режим: <strong>{sessionTimeStatus.currentDay} {sessionTimeStatus.currentTime}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('DURING_LESSON')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    timeSimulationMode === 'DURING_LESSON'
                      ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 shadow-xs'
                      : 'border-[#D6E2F5] bg-white/70 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">Во время урока</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Пн 16:30
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Урок идет • Чек-ин открыт
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('BEFORE_LESSON')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    timeSimulationMode === 'BEFORE_LESSON'
                      ? 'border-amber-600 bg-white ring-2 ring-amber-600/20 shadow-xs'
                      : 'border-[#D6E2F5] bg-white/70 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">До урока</span>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      Пн 15:15
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    До 16:00 • Заблокировано
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('AFTER_LESSON')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    timeSimulationMode === 'AFTER_LESSON'
                      ? 'border-red-600 bg-white ring-2 ring-red-600/20 shadow-xs'
                      : 'border-[#D6E2F5] bg-white/70 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-700">После урока</span>
                    <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                      Пн 19:45
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    После 19:00 • Заблокировано
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTimeSimulationMode('REAL_TIME')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    timeSimulationMode === 'REAL_TIME'
                      ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 shadow-xs'
                      : 'border-[#D6E2F5] bg-white/70 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B3D91]">Реальные часы</span>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      ПК
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Системное время устройства
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Geolocation Presets Switcher */}
            <div className="p-4 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#0B3D91]" />
                  <span className="text-xs font-bold text-[#0F1F3D]">
                    Симулятор локации (Геозона: 150 м вокруг Hall 301):
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Локация: <strong>{studentCoords.sourceLabel}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('INSIDE')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    studentCoords.source === 'INSIDE'
                      ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 shadow-xs'
                      : 'border-[#D6E2F5] bg-white/70 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B3D91]">Внутри Hall 301</span>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      ~3.5 м
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    В пределах 150м • Чек-ин разрешен
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('OUTSIDE')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    studentCoords.source === 'OUTSIDE'
                      ? 'border-red-600 bg-white ring-2 ring-red-600/20 shadow-xs'
                      : 'border-[#D6E2F5] bg-white/70 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-600">Вне кампуса (Город)</span>
                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      ~1.2 км
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Превышает 150м • Чек-ин блокируется
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('DRIFT')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    studentCoords.source === 'DRIFT'
                      ? 'border-amber-600 bg-white ring-2 ring-amber-600/20 shadow-xs'
                      : 'border-[#D6E2F5] bg-white/70 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">Дрифт сигнала GPS</span>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      Слабый сигнал
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Стены КБТУ • Ручная апелляция учителю
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ATTENDANCE HISTORY TABLE WITH PROGRESS & AT-RISK CHIP */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] shadow-sm p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-[#0F1F3D]">
              История посещаемости курса BIS201
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Текущий показатель: {bis201Rate.attended} из {bis201Rate.total} занятий ({bis201Rate.percentage}%)
            </p>
          </div>

          {/* At-Risk Warning Chip if attendance < 80% */}
          {bis201Rate.isAtRisk ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{t('atRiskWarning')} (&lt;80%)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Допуск к экзамену подтвержден</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-500 ${
                bis201Rate.percentage >= 80 ? 'bg-[#0B3D91]' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(bis201Rate.percentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0%</span>
            <span className="font-semibold text-slate-600">Порог допуска: 80%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="border border-[#D6E2F5] rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F5F8FD] text-[#0F1F3D] font-bold border-b border-[#D6E2F5]">
              <tr>
                <th className="py-2.5 px-3">Неделя / Тема</th>
                <th className="py-2.5 px-3">Дата и время</th>
                <th className="py-2.5 px-3">Дистанция</th>
                <th className="py-2.5 px-3">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E2F5]">
              {attendanceRecords
                .filter((r) => r.studentId === currentUser?.id && r.courseCode === 'BIS201')
                .map((record) => (
                  <tr key={record.id} className="hover:bg-[#F5F8FD]/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#0F1F3D]">
                      {record.sessionTitle}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {record.checkInTime}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDistance(record.distanceToCenterM)}
                    </td>
                    <td className="py-2.5 px-3">
                      {record.verificationStatus === 'PRESENT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Присутствует
                        </span>
                      ) : record.verificationStatus === 'MANUAL_REVIEW' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Wifi className="w-3 h-3" />
                          На проверке
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          Отклонено
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
