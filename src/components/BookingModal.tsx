import { useState } from 'react';
import { Calendar, Clock, ShieldCheck, Video, MapPin, X } from 'lucide-react';
import type { Doctor, PatientProfile, VisitMode } from '../types/clinic';
import { formatDisplayDate, validateBookingInput } from '../utils/clinicLogic';

interface BookingModalProps {
  doctor: Doctor;
  date: string;
  timeSlot: string;
  activeProfile: PatientProfile;
  onClose: () => void;
  onConfirm: (payload: {
    doctorId: string;
    date: string;
    timeSlot: string;
    visitMode: VisitMode;
    reason: string;
    notes: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function BookingModal({
  doctor,
  date,
  timeSlot,
  activeProfile,
  onClose,
  onConfirm,
}: BookingModalProps) {
  const defaultMode: VisitMode = doctor.visitModes.includes(
    activeProfile.preferredVisitMode
  )
    ? activeProfile.preferredVisitMode
    : doctor.visitModes[0];

  const [visitMode, setVisitMode] = useState<VisitMode>(defaultMode);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { fullDate } = formatDisplayDate(date);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateBookingInput({
      doctorId: doctor.id,
      date,
      timeSlot,
      visitMode,
      reason,
      patientName: activeProfile.fullName,
    });

    if (!validation.valid) {
      setFieldError(validation.errors.reason || 'Please check the booking details.');
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    const res = await onConfirm({
      doctorId: doctor.id,
      date,
      timeSlot,
      visitMode,
      reason: reason.trim(),
      notes: notes.trim(),
    });
    setSubmitting(false);

    if (!res.ok) {
      setServerError(res.error || 'Could not confirm appointment.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/25 backdrop-blur-md"
    >
      <div className="w-full max-w-xl bg-white border border-[#E2E8F0] rounded-2xl shadow-md overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E2E8F0]">
          <div>
            <h2
              id="booking-modal-title"
              className="font-display text-xl font-semibold text-[#0F172A]"
            >
              Confirm Clinical Appointment
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              {doctor.name} ({doctor.credentials}) · {doctor.specialty}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
            className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm">
            <div className="flex items-center gap-2 text-[#0F172A]">
              <Calendar className="w-4 h-4 text-[#0284C7] shrink-0" />
              <span className="font-medium tabular-nums">{fullDate}</span>
            </div>
            <div className="flex items-center gap-2 text-[#0F172A]">
              <Clock className="w-4 h-4 text-[#0D9488] shrink-0" />
              <span className="font-medium tabular-nums">{timeSlot}</span>
            </div>
            <div className="flex items-center gap-2 text-[#64748B] sm:col-span-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
              <span>
                Patient: <strong className="text-[#0F172A]">{activeProfile.fullName}</strong> ·{' '}
                {activeProfile.insuranceProvider} ({activeProfile.insuranceMemberId})
              </span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-[#3F4850] mb-2">
              Visit Format
            </span>
            <div className="grid grid-cols-2 gap-3">
              {doctor.visitModes.map((mode) => {
                const selected = visitMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setVisitMode(mode)}
                    className={`h-11 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      selected
                        ? 'bg-[#E0F2FE] border-[#0284C7] text-[#0369A1]'
                        : 'bg-white border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {mode === 'Video Visit' ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="booking-reason"
              className="block text-xs font-medium text-[#3F4850] mb-1.5"
            >
              Reason for Visit <span className="text-[#BA1A1A]">*</span>
            </label>
            <textarea
              id="booking-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              placeholder="Briefly describe symptoms, follow-up questions, or medication review..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-3 transition-colors ${
                fieldError
                  ? 'border-[#BA1A1A] focus:border-[#BA1A1A] focus:ring-[#BA1A1A]/15'
                  : 'border-[#E2E8F0] focus:border-[#0284C7] focus:ring-[#0284C7]/12'
              }`}
            />
            {fieldError ? (
              <p role="alert" className="mt-1 text-xs text-[#BA1A1A]">
                {fieldError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="booking-notes"
              className="block text-xs font-medium text-[#3F4850] mb-1.5"
            >
              Pre-Visit Notes for Clinician (Optional)
            </label>
            <input
              id="booking-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recent vitals, pharmacy preference, or mobility accommodations"
              className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0284C7] focus:ring-3 focus:ring-[#0284C7]/12"
            />
          </div>

          {serverError ? (
            <div
              role="alert"
              className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
            >
              {serverError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-sm font-medium text-[#0F172A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 px-5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {submitting ? 'Confirming...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
