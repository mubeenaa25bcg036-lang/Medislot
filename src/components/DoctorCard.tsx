import { useState } from 'react';
import { Calendar, Star, Video, MapPin } from 'lucide-react';
import type { Appointment, Doctor } from '../types/clinic';
import {
  formatDisplayDate,
  getAvailableSlotsForDate,
  getEarliestAvailableSlot,
} from '../utils/clinicLogic';

interface DoctorCardProps {
  doctor: Doctor;
  upcomingDates: string[];
  appointments: Appointment[];
  selectedSlotInfo: { doctorId: string; date: string; timeSlot: string } | null;
  onSelectSlot: (doctor: Doctor, date: string, timeSlot: string) => void;
}

export function DoctorCard({
  doctor,
  upcomingDates,
  appointments,
  selectedSlotInfo,
  onSelectSlot,
}: DoctorCardProps) {
  const [activeDate, setActiveDate] = useState<string>(upcomingDates[0] || '');
  const [imgError, setImgError] = useState(false);

  const availableSlots = getAvailableSlotsForDate(doctor, activeDate, appointments);
  const fastestSlot = getEarliestAvailableSlot(doctor, activeDate, appointments);

  const initials = doctor.name
    .replace('Dr. ', '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

  return (
    <article
      data-testid={`doctor-card-${doctor.id}`}
      className="bg-white border border-[#E2E8F0] hover:border-[#0EA5E9] hover:shadow-md rounded-2xl p-6 transition-all duration-150"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {!imgError ? (
            <img
              src={doctor.avatarUrl}
              alt={`${doctor.name}, ${doctor.specialty}`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-[#E2E8F0]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shrink-0 bg-gradient-to-br from-[#E0F2FE] to-[#CCFBF1] border border-[#E2E8F0] flex items-center justify-center font-display font-semibold text-lg text-[#006194]"
            >
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h3 className="font-display text-lg font-semibold text-[#0F172A]">
                {doctor.name}
              </h3>
              <span className="text-xs font-medium text-[#64748B]">
                {doctor.credentials}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#64748B]">
              <span className="font-medium text-[#0284C7]">{doctor.specialty}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{doctor.yearsExperience} yrs experience</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                {doctor.location}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[#0F172A] font-medium tabular-nums">
                <Star className="w-3.5 h-3.5 fill-[#0EA5E9] text-[#0EA5E9]" />
                {doctor.rating.toFixed(1)} ({doctor.reviewCount})
              </span>
            </div>

            <p className="mt-2.5 text-sm text-[#3F4850] leading-relaxed max-w-2xl">
              {doctor.bio}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
              <span className="inline-flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-[#0D9488]" />
                {doctor.visitModes.join(' / ')}
              </span>
              <span aria-hidden="true">·</span>
              <span>Languages: {doctor.languages.join(', ')}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-medium text-[#0F172A]">
                ${doctor.consultationFee} standard consult
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#0F172A]">
            <Calendar className="w-4 h-4 text-[#0284C7]" />
            <span>Select Appointment Date</span>
          </div>

          <div
            role="tablist"
            aria-label={`Available dates for ${doctor.name}`}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
          >
            {upcomingDates.map((dateStr) => {
              const { weekday, shortDate } = formatDisplayDate(dateStr);
              const isSelectedDate = activeDate === dateStr;
              const count = getAvailableSlotsForDate(
                doctor,
                dateStr,
                appointments
              ).length;
              return (
                <button
                  key={dateStr}
                  type="button"
                  role="tab"
                  aria-selected={isSelectedDate}
                  onClick={() => setActiveDate(dateStr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors tabular-nums ${
                    isSelectedDate
                      ? 'bg-[#0284C7] text-white shadow-sm'
                      : 'bg-[#F8FAFC] text-[#3F4850] border border-[#E2E8F0] hover:border-[#0284C7]'
                  }`}
                >
                  {weekday}, {shortDate} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {availableSlots.length === 0 ? (
          <div className="py-3 px-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B]">
            No remaining slots on this date. Select another day above to view open times.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            {availableSlots.map((slot) => {
              const isFastest = slot === fastestSlot;
              const isSelected =
                selectedSlotInfo?.doctorId === doctor.id &&
                selectedSlotInfo?.date === activeDate &&
                selectedSlotInfo?.timeSlot === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onSelectSlot(doctor, activeDate, slot)}
                  aria-label={`Book ${doctor.name} on ${activeDate} at ${slot}${
                    isFastest ? ' (Fastest Care)' : ''
                  }`}
                  className={`h-10 px-4 rounded-full text-xs font-medium tabular-nums whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0284C7]/20 ${
                    isSelected
                      ? 'bg-[#0284C7] text-white border border-[#0284C7] shadow-sm'
                      : isFastest
                        ? 'bg-[#F0FDFA] text-[#0F766E] border-[1.5px] border-[#0D9488] hover:bg-[#CCFBF1]'
                        : 'bg-white text-[#0F172A] border border-[#E2E8F0] hover:border-[#0284C7] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span>{slot}</span>
                  {isFastest && !isSelected ? (
                    <span className="text-[11px] font-semibold text-[#0D9488]">
                      · Fastest Care
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
