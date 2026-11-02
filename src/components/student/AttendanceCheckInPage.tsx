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
  Radio,
  Wifi,
  Navigation,
  Send,
  ShieldAlert,
  Smartphone,
  Eye,
} from 'lucide-react';
import { SIMULATION_PRESETS, formatDistance, KBTU_HALL_301_COORDS } from '../../utils/geo';
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
  } = useApp();

  // Active session for BIS201 (Week 8)
  const activeSession = classSessions.find((s) => s.id === 'ses-8') || classSessions[7];

  // Check if current student already checked in for this session
  const existingRecord = attendanceRecords.find(
    (r) => r.sessionId === activeSession?.id && r.studentId === currentUser?.id
  );

  // Geolocation & Simulation states
  const [simulationMode, setSimulationMode] = useState<'INSIDE' | 'OUTSIDE' | 'DRIFT'>('INSIDE');
  const [mapView, setMapView] = useState<'LEAFLET' | 'RADAR'>('LEAFLET');
  const [useDeviceGps, setUseDeviceGps] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    type: 'SUCCESS' | 'REJECTED' | 'ALREADY' | 'DRIFT';
    message: string;
    distance?: number;
    timestamp?: string;
  } | null>(null);

  // Manual Review Form
  const [showManualReviewForm, setShowManualReviewForm] = useState(false);
  const [manualReviewReason, setManualReviewReason] = useState(
    'Present in Hall 301, 3rd row. Weak GPS signal reported inside classroom.'
  );
  const [reviewSentToast, setReviewSentToast] = useState(false);

  // Pre-fill existing status if user re-opens the page
  useEffect(() => {
    if (existingRecord) {
      if (existingRecord.verificationStatus === 'PRESENT') {
        setCheckInResult({
          type: 'SUCCESS',
          message: `Attendance confirmed! Distance: ${formatDistance(existingRecord.distanceToCenterM)}`,
          distance: existingRecord.distanceToCenterM,
          timestamp: existingRecord.checkInTime,
        });
      } else if (existingRecord.verificationStatus === 'REJECTED') {
        setCheckInResult({
          type: 'REJECTED',
          message: existingRecord.rejectionReason || 'Check-in rejected.',
          distance: existingRecord.distanceToCenterM,
          timestamp: existingRecord.checkInTime,
        });
      } else if (existingRecord.verificationStatus === 'MANUAL_REVIEW') {
        setCheckInResult({
          type: 'DRIFT',
          message: 'Weak GPS signal — Wi-Fi verification (coming in Week 10)',
          distance: existingRecord.distanceToCenterM,
          timestamp: existingRecord.checkInTime,
        });
      }
    }
  }, [existingRecord]);

  // Main Check-in Handler
  const handlePerformCheckIn = () => {
    if (!activeSession || !currentUser) return;

    setIsLocating(true);

    if (useDeviceGps && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const result = checkInGPS(activeSession.id, pos.coords.latitude, pos.coords.longitude, false);
          processCheckInResult(result);
        },
        () => {
          setIsLocating(false);
          const preset = SIMULATION_PRESETS[simulationMode];
          const result = checkInGPS(
            activeSession.id,
            preset.lat,
            preset.lng,
            simulationMode === 'DRIFT'
          );
          processCheckInResult(result);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setTimeout(() => {
        setIsLocating(false);
        const preset = SIMULATION_PRESETS[simulationMode];
        const isDrift = simulationMode === 'DRIFT';
        const result = checkInGPS(activeSession.id, preset.lat, preset.lng, isDrift);
        processCheckInResult(result);
      }, 350);
    }
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
              {t('manualReviewSent')} (Logged to instructor Ainur Issabek's dashboard)
            </span>
          </div>
          <button
            onClick={() => setReviewSentToast(false)}
            className="text-xs text-emerald-700 font-bold hover:underline"
          >
            {t('close')}
          </button>
        </div>
      )}

      {/* HERO SECTION: GPS Check-in Card */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] shadow-sm overflow-hidden">
        {/* Banner with course details */}
        <div className="bg-gradient-to-r from-[#0B3D91] to-[#124cb1] text-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-xs rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ACTIVE SESSION • WEEK {activeSession?.sessionNumber}</span>
            </div>
            <div className="text-xs font-medium text-blue-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Monday 16:00 – 19:00</span>
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
                Room: <strong className="text-white">{activeSession?.roomName}</strong> (Main Building)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-200 shrink-0" />
              <span>
                Instructor: <strong className="text-white">{activeSession?.instructorName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-200 shrink-0" />
              <span>
                Radius limit: <strong className="text-white">{activeSession?.allowedCampusRadiusM}m</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Check-in Action Area */}
        <div className="p-5 sm:p-8 space-y-6">
          {/* Main big Check-in button */}
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <button
              type="button"
              onClick={handlePerformCheckIn}
              disabled={isLocating || existingRecord?.verificationStatus === 'PRESENT'}
              className={`w-full sm:w-80 h-16 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all shadow-md ${
                existingRecord?.verificationStatus === 'PRESENT'
                  ? 'bg-emerald-600 text-white cursor-default shadow-emerald-700/20'
                  : 'bg-[#0B3D91] hover:bg-[#0A3278] active:bg-[#072458] text-white shadow-blue-900/20 active:scale-[0.98]'
              }`}
            >
              {isLocating ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Computing GPS Coordinates...</span>
                </>
              ) : existingRecord?.verificationStatus === 'PRESENT' ? (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>{t('present')} (Verified)</span>
                </>
              ) : (
                <>
                  <Navigation className="w-6 h-6 animate-bounce" />
                  <span>{t('checkInNow')}</span>
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 max-w-md">
              Centroid target: Hall 301 ({KBTU_HALL_301_COORDS.lat}, {KBTU_HALL_301_COORDS.lng}).
              Geolocation is computed via Haversine spherical distance formula.
            </p>
          </div>

          {/* Result States Banner */}
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
                    {checkInResult.type === 'SUCCESS' && 'STATUS: PRESENT'}
                    {checkInResult.type === 'REJECTED' && 'STATUS: REJECTED'}
                    {checkInResult.type === 'DRIFT' && 'STATUS: INDOOR GPS DRIFT'}
                    {checkInResult.type === 'ALREADY' && 'STATUS: ALREADY CHECKED IN'}
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed">{checkInResult.message}</p>
                  {checkInResult.distance !== undefined && (
                    <div className="text-[11px] font-medium mt-1 text-slate-600">
                      Measured distance: <strong>{formatDistance(checkInResult.distance)}</strong> • Centroid limit: 150 m
                    </div>
                  )}
                  {checkInResult.timestamp && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Check-in registered at: {checkInResult.timestamp}
                    </div>
                  )}
                </div>
              </div>

              {/* Drift manual review request action */}
              {checkInResult.type === 'DRIFT' && (
                <button
                  type="button"
                  onClick={() => setShowManualReviewForm(true)}
                  className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
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
                <span>Manual Attendance Review Request</span>
              </div>
              <p className="text-xs text-slate-600">
                Weak GPS signal — Wi-Fi verification (coming in Week 10). If you are physically present in Hall 301, submit a review note directly to instructor Ainur Issabek:
              </p>
              <form onSubmit={handleSendManualReview} className="space-y-3">
                <textarea
                  rows={2}
                  value={manualReviewReason}
                  onChange={(e) => setManualReviewReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#D6E2F5] rounded-lg text-xs text-[#0F1F3D] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
                  placeholder="Explain your location inside Hall 301..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualReviewForm(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-[#0B3D91] hover:bg-[#0A3278] text-white rounded-lg flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit to Teacher</span>
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
                  Campus Geofence Map & Radar • KBTU Tole Bi 59
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="bg-white border border-[#D6E2F5] p-0.5 rounded-lg flex items-center text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setMapView('LEAFLET')}
                    className={`px-2 py-0.5 rounded ${
                      mapView === 'LEAFLET' ? 'bg-[#0B3D91] text-white' : 'text-slate-600 hover:text-[#0B3D91]'
                    }`}
                  >
                    OSM Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapView('RADAR')}
                    className={`px-2 py-0.5 rounded ${
                      mapView === 'RADAR' ? 'bg-[#0B3D91] text-white' : 'text-slate-600 hover:text-[#0B3D91]'
                    }`}
                  >
                    Radar
                  </button>
                </div>
                <span className="text-[10px] font-bold text-[#0B3D91] bg-[#E8F0FE] px-2 py-0.5 rounded-full border border-[#D6E2F5]">
                  Radius: 150m
                </span>
              </div>
            </div>

            {/* Map or Radar View */}
            {mapView === 'LEAFLET' ? (
              <CampusMap
                studentLat={SIMULATION_PRESETS[simulationMode].lat}
                studentLng={SIMULATION_PRESETS[simulationMode].lng}
                status={simulationMode}
                className="h-64"
              />
            ) : (
              <div className="relative w-full h-44 bg-gradient-to-b from-blue-900/5 to-blue-900/10 rounded-xl border border-[#D6E2F5] overflow-hidden flex items-center justify-center select-none">
                {/* Outer 150m boundary circle */}
                <div className="absolute w-36 h-36 rounded-full border-2 border-dashed border-[#0B3D91]/60 flex items-center justify-center bg-[#E8F0FE]/30 animate-pulse">
                  <span className="text-[9px] font-extrabold text-[#0B3D91] uppercase tracking-wider absolute -top-4">
                    150m Geofence Boundary
                  </span>
                </div>

                {/* Inner 75m circle */}
                <div className="absolute w-20 h-20 rounded-full border border-[#0B3D91]/30 flex items-center justify-center" />

                {/* Centroid: Hall 301 */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-[#0B3D91] text-white flex items-center justify-center shadow-md">
                    <Building className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[#0B3D91] mt-1 bg-white/90 px-1.5 py-0.2 rounded border border-[#D6E2F5]">
                    Hall 301
                  </span>
                </div>

                {/* Simulated Student Pin Position */}
                <div
                  className={`absolute transition-all duration-700 flex flex-col items-center z-20 ${
                    simulationMode === 'INSIDE'
                      ? 'translate-x-3 -translate-y-2'
                      : simulationMode === 'OUTSIDE'
                      ? 'translate-x-32 -translate-y-14'
                      : 'translate-x-16 translate-y-12'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shadow-lg ring-2 ${
                      simulationMode === 'INSIDE'
                        ? 'bg-emerald-500 ring-emerald-200 text-white'
                        : simulationMode === 'OUTSIDE'
                        ? 'bg-red-500 ring-red-200 text-white'
                        : 'bg-amber-500 ring-amber-200 text-white animate-ping'
                    }`}
                  >
                    <MapPin className="w-2.5 h-2.5" />
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs mt-0.5 whitespace-nowrap ${
                      simulationMode === 'INSIDE'
                        ? 'bg-emerald-600 text-white'
                        : simulationMode === 'OUTSIDE'
                        ? 'bg-red-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {simulationMode === 'INSIDE'
                      ? 'Student: ~5m'
                      : simulationMode === 'OUTSIDE'
                      ? 'Student: ~850m'
                      : 'GPS Drift'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Dev Location Simulator Bar */}
          <div className="p-4 bg-[#F5F8FD] border border-[#D6E2F5] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#0B3D91]" />
                <span className="text-xs font-bold text-[#0F1F3D]">
                  {t('simulatedLocation')}
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDeviceGps}
                  onChange={(e) => setUseDeviceGps(e.target.checked)}
                  className="rounded text-[#0B3D91] focus:ring-[#0B3D91]"
                />
                <span>Use real browser GPS</span>
              </label>
            </div>

            {/* Presets buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSimulationMode('INSIDE')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  simulationMode === 'INSIDE'
                    ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 shadow-xs'
                    : 'border-[#D6E2F5] bg-white/60 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B3D91]">Inside Hall 301</span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ~5m
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allowed within 150m radius
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSimulationMode('OUTSIDE')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  simulationMode === 'OUTSIDE'
                    ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 shadow-xs'
                    : 'border-[#D6E2F5] bg-white/60 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-600">Outside campus</span>
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                    ~850m
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Exceeds 150m boundary
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSimulationMode('DRIFT')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  simulationMode === 'DRIFT'
                    ? 'border-[#0B3D91] bg-white ring-2 ring-[#0B3D91]/20 shadow-xs'
                    : 'border-[#D6E2F5] bg-white/60 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700">Indoor GPS drift</span>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    Weak signal
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Triggers Wi-Fi / review request
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ATTENDANCE SUMMARY & COURSE HISTORY */}
      <div className="bg-white rounded-2xl border border-[#D6E2F5] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D6E2F5]">
          <div>
            <h3 className="text-base font-bold text-[#0F1F3D]">
              Attendance Progress & Course History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              KBTU Academic Policy: 80% attendance is required for exam clearance.
            </p>
          </div>

          {/* At-Risk Warning Chip if attendance < 80% */}
          {bis201Rate.isAtRisk ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{t('atRiskWarning')} ({bis201Rate.percentage}%)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Exam Clearance Valid ({bis201Rate.percentage}%)</span>
            </div>
          )}
        </div>

        {/* Progress Bar for BIS201 */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#0B3D91]">
              BIS201 Basics of Information Systems: {bis201Rate.attended} of {bis201Rate.total} attended sessions
            </span>
            <span className={bis201Rate.isAtRisk ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
              {bis201Rate.percentage}%
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-[#D6E2F5]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                bis201Rate.isAtRisk ? 'bg-red-500' : 'bg-[#0B3D91]'
              }`}
              style={{ width: `${Math.min(100, bis201Rate.percentage)}%` }}
            />
          </div>
          {bis201Rate.isAtRisk && (
            <p className="text-xs text-red-600 font-medium">
              ⚠️ Warning: You have missed {bis201Rate.total - bis201Rate.attended} sessions. Maintain attendance to avoid automatic F grade.
            </p>
          )}
        </div>

        {/* Detailed Sessions Table for Student */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#D6E2F5]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#E8F0FE] text-[#0B3D91] font-bold uppercase tracking-wider sticky top-0 border-b border-[#D6E2F5]">
              <tr>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">Topic / Room</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Distance</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D6E2F5]/70">
              {classSessions
                .filter((s) => s.courseCode === 'BIS201')
                .slice(0, 10)
                .map((session, idx) => {
                  const record = attendanceRecords.find(
                    (r) => r.sessionId === session.id && r.studentId === currentUser?.id
                  );

                  const isFuture = session.sessionNumber > 8;

                  return (
                    <tr
                      key={session.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F8FD]'}
                    >
                      <td className="py-3 px-4 font-bold text-[#0B3D91]">
                        Session #{session.sessionNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F1F3D]">{session.title}</div>
                        <div className="text-[11px] text-slate-500">{session.roomName}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {session.date} • {session.startTime}
                      </td>
                      <td className="py-3 px-4">
                        {record?.distanceToCenterM !== undefined
                          ? formatDistance(record.distanceToCenterM)
                          : isFuture
                          ? '—'
                          : 'Not tracked'}
                      </td>
                      <td className="py-3 px-4">
                        {record?.verificationStatus === 'PRESENT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {t('present')} {record.isOverride && '(Override)'}
                          </span>
                        ) : record?.verificationStatus === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3 text-red-600" />
                            {t('rejected')}
                          </span>
                        ) : record?.verificationStatus === 'MANUAL_REVIEW' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Wifi className="w-3 h-3 text-amber-600" />
                            Review
                          </span>
                        ) : isFuture ? (
                          <span className="text-slate-400 font-medium">Scheduled</span>
                        ) : (
                          <span className="text-slate-500 font-medium">Absent</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
