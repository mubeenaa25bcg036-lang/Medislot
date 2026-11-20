import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Search,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type {
  Appointment,
  AppointmentStatus,
  ClinicBootstrapPayload,
  Doctor,
  PatientProfile,
  RealtimeEvent,
  Specialty,
  VisitMode,
} from './types/clinic';
import {
  SPECIALTIES,
  computeDashboardMetrics,
  computeProfileCompleteness,
  filterDoctors,
  formatDisplayDate,
  getEarliestAvailableSlot,
  getUpcomingDates,
} from './utils/clinicLogic';
import { TopNav, type NavTab } from './components/TopNav';
import { TriageBar } from './components/TriageBar';
import { DoctorCard } from './components/DoctorCard';
import { BookingModal } from './components/BookingModal';
import { AppointmentsView } from './components/AppointmentsView';
import { CareTeamView } from './components/CareTeamView';
import { PatientProfileView } from './components/PatientProfileView';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('book');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serverBaseDate, setServerBaseDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Book Care filters
  const [specialtyFilter, setSpecialtyFilter] = useState<Specialty | 'All'>('All');
  const [visitModeFilter, setVisitModeFilter] = useState<VisitMode | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active booking modal selection
  const [bookingSelection, setBookingSelection] = useState<{
    doctor: Doctor;
    date: string;
    timeSlot: string;
  } | null>(null);

  const triageInputRef = useRef<HTMLInputElement | null>(null);

  const applyBootstrap = useCallback((data: ClinicBootstrapPayload) => {
    setDoctors(data.doctors);
    setProfiles(data.profiles);
    setActiveProfile(data.activeProfile);
    setAppointments(data.appointments);
    if (data.serverTime) {
      setServerBaseDate(data.serverTime.slice(0, 10));
    }
    setLoading(false);
    setLoadError(null);
  }, []);

  // Initial fetch + WebSocket real-time synchronization
  useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const loadInitial = async () => {
      try {
        const res = await fetch('/api/bootstrap');
        if (!res.ok) {
          throw new Error('Failed to load clinic workspace');
        }
        const payload = (await res.json()) as ClinicBootstrapPayload;
        if (active) applyBootstrap(payload);
      } catch (err) {
        if (active) {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to reach clinic server.'
          );
          setLoading(false);
        }
      }
    };

    const connectWs = () => {
      if (!active) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as RealtimeEvent;
          if (event.type === 'sync:init') {
            applyBootstrap(event.payload);
          } else if (event.type === 'profile:updated') {
            setActiveProfile((prev) =>
              prev && prev.id === event.payload.id ? event.payload : prev
            );
            setProfiles((prev) =>
              prev.map((p) => (p.id === event.payload.id ? event.payload : p))
            );
            setAppointments((prev) =>
              prev.map((apt) =>
                apt.patientId === event.payload.id
                  ? { ...apt, patientName: event.payload.fullName }
                  : apt
              )
            );
          } else if (event.type === 'profile:switched') {
            setActiveProfile(event.payload.activeProfile);
            setProfiles(event.payload.profiles);
          } else if (event.type === 'appointment:created') {
            setAppointments((prev) => {
              if (prev.some((a) => a.id === event.payload.id)) return prev;
              return [event.payload, ...prev];
            });
          } else if (event.type === 'appointment:updated') {
            setAppointments((prev) =>
              prev.map((a) => (a.id === event.payload.id ? event.payload : a))
            );
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        if (active) {
          reconnectTimer = window.setTimeout(connectWs, 3000);
        }
      };
    };

    void loadInitial();
    connectWs();

    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [applyBootstrap]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const upcomingDates = useMemo(
    () => getUpcomingDates(serverBaseDate, 5),
    [serverBaseDate]
  );

  const patientAppointments = useMemo(() => {
    if (!activeProfile) return appointments;
    return appointments.filter((a) => a.patientId === activeProfile.id);
  }, [appointments, activeProfile]);

  const metrics = useMemo(
    () => computeDashboardMetrics(appointments, activeProfile?.id),
    [appointments, activeProfile?.id]
  );

  const filteredDoctors = useMemo(
    () =>
      filterDoctors(doctors, {
        specialty: specialtyFilter,
        query: searchQuery,
        visitMode: visitModeFilter,
      }),
    [doctors, specialtyFilter, searchQuery, visitModeFilter]
  );

  const profileCompleteness = activeProfile
    ? computeProfileCompleteness(activeProfile)
    : 0;

  const handleConfirmBooking = async (payload: {
    doctorId: string;
    date: string;
    timeSlot: string;
    visitMode: VisitMode;
    reason: string;
    notes: string;
  }) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Unable to confirm appointment.' };
      }
      const created = data.appointment as Appointment;
      setAppointments((prev) =>
        prev.some((a) => a.id === created.id) ? prev : [created, ...prev]
      );
      setBookingSelection(null);
      setToast(
        `Appointment confirmed with ${created.doctorName} on ${
          formatDisplayDate(created.date).shortDate
        } at ${created.timeSlot}.`
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error while creating appointment.' };
    }
  };

  const handleUpdateAppointment = async (
    id: string,
    updates: {
      date?: string;
      timeSlot?: string;
      status?: AppointmentStatus;
    }
  ) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to update appointment.' };
      }
      const updated = data.appointment as Appointment;
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
      setToast(`Updated appointment with ${updated.doctorName}.`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error while updating appointment.' };
    }
  };

  const handleSaveProfile = async (updates: Partial<PatientProfile>) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Unable to save profile.',
          fieldErrors: data.fieldErrors,
        };
      }
      setActiveProfile(data.profile as PatientProfile);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error while saving profile.' };
    }
  };

  const handleSwitchProfile = async (payload: {
    profileId?: string;
    newProfile?: Partial<PatientProfile>;
  }) => {
    try {
      const res = await fetch('/api/profile/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Unable to switch profile.',
          fieldErrors: data.fieldErrors,
        };
      }
      setActiveProfile(data.activeProfile as PatientProfile);
      setProfiles(data.profiles as PatientProfile[]);
      setToast(`Switched active patient to ${data.activeProfile.fullName}.`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error while switching profile.' };
    }
  };

  const handleQuickSelectDoctor = (doctor: Doctor) => {
    setActiveTab('book');
    const firstDate = upcomingDates[0] || serverBaseDate;
    const earliest = getEarliestAvailableSlot(doctor, firstDate, appointments);
    if (earliest) {
      setBookingSelection({ doctor, date: firstDate, timeSlot: earliest });
    } else {
      setSpecialtyFilter(doctor.specialty);
      setSearchQuery(doctor.name);
    }
  };

  const handleTriggerTriage = () => {
    setActiveTab('book');
    window.setTimeout(() => {
      triageInputRef.current?.focus();
      triageInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAF8FF] text-[#0F172A]">
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onTriggerTriage={handleTriggerTriage}
        upcomingCount={metrics.upcomingCount + metrics.checkedInCount}
      />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {toast ? (
          <div
            role="status"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#CCFBF1] border border-[#99F6E4] text-sm font-medium text-[#0F766E]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toast}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            <div className="h-24 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
            <div className="h-44 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
            <div className="h-52 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
          </div>
        ) : loadError || !activeProfile ? (
          <div
            role="alert"
            className="p-6 rounded-2xl bg-white border border-[#FECACA] text-[#991B1B] flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Unable to initialize Clinical Clarity workspace</p>
              <p className="text-xs mt-0.5">{loadError || 'Profile unavailable.'}</p>
            </div>
          </div>
        ) : activeTab === 'book' ? (
          <div className="space-y-6">
            {/* Hero / Workspace Summary */}
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A] text-balance">
                    Precision Care Scheduling
                  </h1>
                  <p className="mt-1 text-sm sm:text-base text-[#64748B]">
                    Signed in as <strong className="text-[#0F172A] font-medium">{activeProfile.fullName}</strong> ·{' '}
                    {activeProfile.insuranceProvider} ({activeProfile.insuranceMemberId})
                  </p>
                </div>

                {metrics.nextAppointment ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('appointments')}
                    className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#0284C7] text-left transition-colors shrink-0"
                  >
                    <CalendarCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
                    <div className="text-xs">
                      <p className="text-[#64748B]">Next Visit</p>
                      <p className="font-medium text-[#0F172A] tabular-nums">
                        {metrics.nextAppointment.doctorName} ·{' '}
                        {formatDisplayDate(metrics.nextAppointment.date).shortDate} at{' '}
                        {metrics.nextAppointment.timeSlot}
                      </p>
                    </div>
                  </button>
                ) : null}
              </div>

              {/* 4-column KPI strip across full width */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#E2E8F0] border border-[#E2E8F0] rounded-2xl overflow-hidden">
                <div className="bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium text-[#64748B]">Upcoming Visits</p>
                  <p
                    data-testid="kpi-upcoming"
                    className="mt-1 font-display text-2xl font-semibold text-[#0F172A] tabular-nums"
                  >
                    {metrics.upcomingCount}
                  </p>
                </div>
                <div className="bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium text-[#64748B]">Checked-In Today</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-[#0284C7] tabular-nums">
                    {metrics.checkedInCount}
                  </p>
                </div>
                <div className="bg-white p-4 sm:p-5">
                  <p className="text-xs font-medium text-[#64748B]">Completed Visits</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-[#0F172A] tabular-nums">
                    {metrics.completedCount}
                  </p>
                </div>
                <div className="bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#64748B]">Profile Readiness</p>
                    <UserCheck className="w-4 h-4 text-[#0D9488]" />
                  </div>
                  <p className="mt-1 font-display text-2xl font-semibold text-[#0D9488] tabular-nums">
                    {profileCompleteness}%
                  </p>
                </div>
              </div>
            </section>

            {/* AI Natural Language Triage */}
            <TriageBar
              inputRef={triageInputRef}
              doctors={doctors}
              onApplySpecialty={(spec) => setSpecialtyFilter(spec)}
              onSelectDoctorForBooking={handleQuickSelectDoctor}
            />

            {/* Physician Directory & Time-Slot Grid */}
            <section aria-label="Available Clinicians" className="space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSpecialtyFilter('All')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      specialtyFilter === 'All'
                        ? 'bg-[#0284C7] text-white'
                        : 'bg-white border border-[#E2E8F0] text-[#3F4850] hover:border-[#0284C7]'
                    }`}
                  >
                    All Specialties
                  </button>
                  {SPECIALTIES.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => setSpecialtyFilter(spec)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        specialtyFilter === spec
                          ? 'bg-[#0284C7] text-white'
                          : 'bg-white border border-[#E2E8F0] text-[#3F4850] hover:border-[#0284C7]'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-xl self-start">
                    {(['All', 'In-Person', 'Video Visit'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setVisitModeFilter(mode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                          visitModeFilter === mode
                            ? 'bg-white text-[#0F172A] shadow-sm'
                            : 'text-[#64748B] hover:text-[#0F172A]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <label htmlFor="doctor-search" className="sr-only">
                      Search clinicians
                    </label>
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="doctor-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search doctor or symptom..."
                      className="h-10 w-full sm:w-56 pl-9 pr-3 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0284C7]"
                    />
                  </div>
                </div>
              </div>

              {filteredDoctors.length === 0 ? (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center">
                  <Sparkles className="w-6 h-6 text-[#0284C7] mx-auto mb-2" />
                  <p className="font-display text-base font-semibold text-[#0F172A]">
                    No clinicians match your active filters
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Reset the specialty or search query to view all available physicians.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSpecialtyFilter('All');
                      setVisitModeFilter('All');
                      setSearchQuery('');
                    }}
                    className="mt-4 h-10 px-4 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-sm font-medium text-[#0F172A]"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDoctors.map((doctor) => (
                    <DoctorCard
                      key={doctor.id}
                      doctor={doctor}
                      upcomingDates={upcomingDates}
                      appointments={appointments}
                      selectedSlotInfo={
                        bookingSelection
                          ? {
                              doctorId: bookingSelection.doctor.id,
                              date: bookingSelection.date,
                              timeSlot: bookingSelection.timeSlot,
                            }
                          : null
                      }
                      onSelectSlot={(doc, date, timeSlot) =>
                        setBookingSelection({ doctor: doc, date, timeSlot })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'appointments' ? (
          <AppointmentsView
            appointments={patientAppointments}
            doctors={doctors}
            baseDateStr={serverBaseDate}
            onUpdateAppointment={handleUpdateAppointment}
            onJumpToBook={() => setActiveTab('book')}
          />
        ) : activeTab === 'team' ? (
          <CareTeamView doctors={doctors} onBookDoctor={handleQuickSelectDoctor} />
        ) : (
          <PatientProfileView
            activeProfile={activeProfile}
            profiles={profiles}
            onSaveProfile={handleSaveProfile}
            onSwitchProfile={handleSwitchProfile}
          />
        )}
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white mt-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <span>Clinical Clarity Healthcare Scheduling</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('book')}
              className="hover:text-[#0F172A]"
            >
              Book Care
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className="hover:text-[#0F172A]"
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="hover:text-[#0F172A]"
            >
              Patient Record
            </button>
          </div>
        </div>
      </footer>

      {bookingSelection && activeProfile ? (
        <BookingModal
          doctor={bookingSelection.doctor}
          date={bookingSelection.date}
          timeSlot={bookingSelection.timeSlot}
          activeProfile={activeProfile}
          onClose={() => setBookingSelection(null)}
          onConfirm={handleConfirmBooking}
        />
      ) : null}
    </div>
  );
}
