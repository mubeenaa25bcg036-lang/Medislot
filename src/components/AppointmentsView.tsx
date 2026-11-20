import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  Video,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import type { Appointment, AppointmentStatus, Doctor } from '../types/clinic';
import {
  formatDisplayDate,
  getAvailableSlotsForDate,
  getUpcomingDates,
} from '../utils/clinicLogic';

interface AppointmentsViewProps {
  appointments: Appointment[];
  doctors: Doctor[];
  baseDateStr: string;
  onUpdateAppointment: (
    id: string,
    updates: {
      date?: string;
      timeSlot?: string;
      status?: AppointmentStatus;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onJumpToBook: () => void;
}

type FilterTab = 'upcoming' | 'completed' | 'cancelled';

export function AppointmentsView({
  appointments,
  doctors,
  baseDateStr,
  onUpdateAppointment,
  onJumpToBook,
}: AppointmentsViewProps) {
  const [tab, setTab] = useState<FilterTab>('upcoming');
  const [search, setSearch] = useState('');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(baseDateStr);
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('');
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const upcomingDates = getUpcomingDates(baseDateStr, 5);

  const filtered = appointments.filter((apt) => {
    const matchesTab =
      tab === 'upcoming'
        ? apt.status === 'upcoming' || apt.status === 'checked-in'
        : apt.status === tab;
    if (!matchesTab) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      apt.doctorName.toLowerCase().includes(q) ||
      apt.doctorSpecialty.toLowerCase().includes(q) ||
      apt.reason.toLowerCase().includes(q)
    );
  });

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    setActionError(null);
    setBusyId(id);
    const res = await onUpdateAppointment(id, { status });
    setBusyId(null);
    setConfirmCancelId(null);
    if (!res.ok) {
      setActionError(res.error || 'Could not update appointment.');
    }
  };

  const openReschedule = (apt: Appointment) => {
    setActionError(null);
    setRescheduleId(apt.id);
    setRescheduleDate(upcomingDates.includes(apt.date) ? apt.date : upcomingDates[0]);
    setRescheduleSlot('');
  };

  const submitReschedule = async (aptId: string) => {
    if (!rescheduleSlot) {
      setActionError('Please choose a new time slot before saving.');
      return;
    }
    setActionError(null);
    setBusyId(aptId);
    const res = await onUpdateAppointment(aptId, {
      date: rescheduleDate,
      timeSlot: rescheduleSlot,
    });
    setBusyId(null);
    if (!res.ok) {
      setActionError(res.error || 'Failed to reschedule appointment.');
    } else {
      setRescheduleId(null);
    }
  };

  const renderStatus = (status: AppointmentStatus) => {
    switch (status) {
      case 'checked-in':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1] text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Checked In
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CCFBF1] text-[#0F766E] text-xs font-medium">
            <Calendar className="w-3.5 h-3.5" />
            Confirmed
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F5F9] text-[#3F4850] text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488]" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF2F2] text-[#991B1B] text-xs font-medium">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
    }
  };

  return (
    <section aria-label="Appointments and Care Schedule" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F172A] text-balance">
            Appointments & Visit Schedule
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Real-time synchronized schedule for upcoming check-ins, rescheduling, and visit summaries.
          </p>
        </div>
        <button
          type="button"
          onClick={onJumpToBook}
          className="h-10 px-4 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
        >
          Book New Visit
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter appointments by status"
          className="inline-flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-xl self-start"
        >
          {(
            [
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ] as { id: FilterTab; label: string }[]
          ).map((item) => {
            const active = tab === item.id;
            const count = appointments.filter((a) =>
              item.id === 'upcoming'
                ? a.status === 'upcoming' || a.status === 'checked-in'
                : a.status === item.id
            ).length;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap tabular-nums ${
                  active
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {item.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <label htmlFor="appointment-search" className="sr-only">
            Search appointments
          </label>
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="appointment-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clinician or visit reason..."
            className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0284C7]"
          />
        </div>
      </div>

      {actionError ? (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]"
        >
          {actionError}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center">
          <p className="font-display text-base font-semibold text-[#0F172A]">
            No {tab} appointments found
          </p>
          <p className="mt-1 text-sm text-[#64748B]">
            {search
              ? 'Try clearing your search filter to view other visits.'
              : 'Schedule an in-person or video consultation from the Care Directory.'}
          </p>
          {!search && tab === 'upcoming' ? (
            <button
              type="button"
              onClick={onJumpToBook}
              className="mt-4 h-10 px-4 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-medium transition-colors"
            >
              Browse Available Clinicians
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((apt) => {
            const { fullDate } = formatDisplayDate(apt.date);
            const doctor = doctors.find((d) => d.id === apt.doctorId);
            const isRescheduling = rescheduleId === apt.id;
            const isCancelling = confirmCancelId === apt.id;
            const rescheduleSlots = doctor
              ? getAvailableSlotsForDate(doctor, rescheduleDate, appointments, apt.id)
              : [];

            return (
              <article
                key={apt.id}
                data-testid={`appointment-card-${apt.id}`}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-lg font-semibold text-[#0F172A]">
                        {apt.doctorName}
                      </h2>
                      <span className="text-xs font-medium text-[#0284C7]">
                        {apt.doctorSpecialty}
                      </span>
                      {renderStatus(apt.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B] tabular-nums">
                      <span className="inline-flex items-center gap-1 text-[#0F172A] font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
                        {fullDate}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-[#0F172A] font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
                        {apt.timeSlot}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        {apt.visitMode === 'Video Visit' ? (
                          <Video className="w-3.5 h-3.5 text-[#0D9488]" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                        )}
                        {apt.visitMode} — {apt.location}
                      </span>
                    </div>

                    <p className="text-sm text-[#0F172A]">
                      <span className="font-medium">Reason:</span> {apt.reason}
                    </p>
                    {apt.notes ? (
                      <p className="text-xs text-[#64748B]">
                        <span className="font-medium text-[#3F4850]">Care Note:</span>{' '}
                        {apt.notes}
                      </p>
                    ) : null}
                  </div>

                  {(apt.status === 'upcoming' || apt.status === 'checked-in') ? (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {apt.status === 'upcoming' ? (
                        <button
                          type="button"
                          disabled={busyId === apt.id}
                          onClick={() => handleStatusChange(apt.id, 'checked-in')}
                          className="h-9 px-3.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          Check In
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === apt.id}
                          onClick={() => handleStatusChange(apt.id, 'completed')}
                          className="h-9 px-3.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          Complete Visit
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          isRescheduling ? setRescheduleId(null) : openReschedule(apt)
                        }
                        className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#0284C7] text-xs font-medium text-[#0F172A] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reschedule
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmCancelId(isCancelling ? null : apt.id)
                        }
                        className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#991B1B] text-xs font-medium text-[#64748B] transition-colors whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>

                {isCancelling ? (
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs font-medium text-[#991B1B]">
                      Cancel this appointment with {apt.doctorName} on {fullDate} at{' '}
                      {apt.timeSlot}?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmCancelId(null)}
                        className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
                      >
                        Keep Appointment
                      </button>
                      <button
                        type="button"
                        disabled={busyId === apt.id}
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}
                        className="h-9 px-3 rounded-lg bg-[#BA1A1A] hover:bg-[#93000A] text-white text-xs font-medium"
                      >
                        Confirm Cancellation
                      </button>
                    </div>
                  </div>
                ) : null}

                {isRescheduling && doctor ? (
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-[#0F172A]">
                        New Date:
                      </span>
                      {upcomingDates.map((d) => {
                        const { weekday, shortDate } = formatDisplayDate(d);
                        const selected = rescheduleDate === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setRescheduleDate(d);
                              setRescheduleSlot('');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium tabular-nums ${
                              selected
                                ? 'bg-[#0284C7] text-white'
                                : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#3F4850]'
                            }`}
                          >
                            {weekday}, {shortDate}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-[#0F172A]">
                        Open Times:
                      </span>
                      {rescheduleSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setRescheduleSlot(slot)}
                          className={`h-9 px-3.5 rounded-full text-xs font-medium tabular-nums ${
                            rescheduleSlot === slot
                              ? 'bg-[#0284C7] text-white border border-[#0284C7]'
                              : 'bg-white border border-[#E2E8F0] text-[#0F172A] hover:border-[#0284C7]'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busyId === apt.id}
                        onClick={() => submitReschedule(apt.id)}
                        className="h-9 px-4 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-medium"
                      >
                        Save New Time
                      </button>
                      <button
                        type="button"
                        onClick={() => setRescheduleId(null)}
                        className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#64748B]"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
