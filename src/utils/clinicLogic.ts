import type {
  Appointment,
  AppointmentStatus,
  DashboardMetrics,
  Doctor,
  PatientProfile,
  Specialty,
  VisitMode,
} from '../types/clinic';

export const SPECIALTIES: Specialty[] = [
  'Cardiology',
  'Neurology',
  'Primary Care',
  'Dermatology',
  'Pediatrics',
];

export const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export interface DoctorFilterOptions {
  specialty: Specialty | 'All';
  query: string;
  visitMode: VisitMode | 'All';
}

export function getUpcomingDates(baseDateStr: string, count = 5): string[] {
  const parts = baseDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return [];
  }
  const [y, m, d] = parts;
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    dates.push(dt.toISOString().slice(0, 10));
  }
  return dates;
}

export function formatDisplayDate(dateStr: string): {
  weekday: string;
  shortDate: string;
  fullDate: string;
} {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(dt);
  const shortDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
  const fullDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
  return { weekday, shortDate, fullDate };
}

export function filterDoctors(doctors: Doctor[], filters: DoctorFilterOptions): Doctor[] {
  const normalizedQuery = filters.query.trim().toLowerCase();
  return doctors.filter((doc) => {
    if (filters.specialty !== 'All' && doc.specialty !== filters.specialty) {
      return false;
    }
    if (filters.visitMode !== 'All' && !doc.visitModes.includes(filters.visitMode)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const haystack = [
      doc.name,
      doc.specialty,
      doc.bio,
      doc.location,
      ...doc.languages,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function getAvailableSlotsForDate(
  doctor: Doctor,
  date: string,
  appointments: Appointment[],
  excludeAppointmentId?: string
): string[] {
  const booked = new Set(
    appointments
      .filter(
        (apt) =>
          apt.doctorId === doctor.id &&
          apt.date === date &&
          apt.status !== 'cancelled' &&
          apt.id !== excludeAppointmentId
      )
      .map((apt) => apt.timeSlot)
  );
  return doctor.dailySlots.filter((slot) => !booked.has(slot));
}

export function getEarliestAvailableSlot(
  doctor: Doctor,
  date: string,
  appointments: Appointment[]
): string | null {
  const available = getAvailableSlotsForDate(doctor, date, appointments);
  return available.length > 0 ? available[0] : null;
}

export interface BookingInput {
  doctorId: string;
  date: string;
  timeSlot: string;
  visitMode: VisitMode;
  reason: string;
  patientName: string;
}

export function validateBookingInput(input: BookingInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input.doctorId.trim()) {
    errors.doctorId = 'Please select a clinician.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())) {
    errors.date = 'Please choose a valid appointment date.';
  }
  if (!input.timeSlot.trim()) {
    errors.timeSlot = 'Please select an available time slot.';
  }
  if (input.visitMode !== 'In-Person' && input.visitMode !== 'Video Visit') {
    errors.visitMode = 'Please choose In-Person or Video Visit.';
  }
  if (input.reason.trim().length < 4) {
    errors.reason = 'Please briefly describe your reason for the visit (at least 4 characters).';
  }
  if (input.patientName.trim().length < 2) {
    errors.patientName = 'Patient profile name is required.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateProfileInput(profile: Partial<PatientProfile>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!profile.fullName || profile.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }
  if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!profile.phone || profile.phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'Please enter a valid phone number.';
  }
  if (!profile.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(profile.dateOfBirth)) {
    errors.dateOfBirth = 'Date of birth must use YYYY-MM-DD format.';
  }
  if (!profile.insuranceProvider || profile.insuranceProvider.trim().length < 2) {
    errors.insuranceProvider = 'Insurance provider is required.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function computeProfileCompleteness(profile: PatientProfile): number {
  const checks = [
    profile.fullName.trim().length >= 2,
    profile.email.trim().length >= 5,
    profile.phone.trim().length >= 7,
    profile.dateOfBirth.trim().length === 10,
    profile.bloodType.trim().length >= 2,
    profile.allergies.trim().length >= 2,
    profile.medications.trim().length >= 2,
    profile.insuranceProvider.trim().length >= 2,
    profile.insuranceMemberId.trim().length >= 3,
    profile.emergencyContactName.trim().length >= 2 &&
      profile.emergencyContactPhone.trim().length >= 7,
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

export function canTransitionAppointmentStatus(
  current: AppointmentStatus,
  next: AppointmentStatus
): boolean {
  if (current === next) return false;
  if (current === 'completed' || current === 'cancelled') {
    return false;
  }
  if (current === 'upcoming') {
    return next === 'checked-in' || next === 'completed' || next === 'cancelled';
  }
  if (current === 'checked-in') {
    return next === 'completed' || next === 'cancelled';
  }
  return false;
}

export function computeDashboardMetrics(
  appointments: Appointment[],
  patientId?: string
): DashboardMetrics {
  const scoped = patientId
    ? appointments.filter((apt) => apt.patientId === patientId)
    : appointments;

  const upcoming = scoped
    .filter((apt) => apt.status === 'upcoming' || apt.status === 'checked-in')
    .sort((a, b) => `${a.date} ${a.timeSlot}`.localeCompare(`${b.date} ${b.timeSlot}`));

  return {
    upcomingCount: scoped.filter((apt) => apt.status === 'upcoming').length,
    checkedInCount: scoped.filter((apt) => apt.status === 'checked-in').length,
    completedCount: scoped.filter((apt) => apt.status === 'completed').length,
    cancelledCount: scoped.filter((apt) => apt.status === 'cancelled').length,
    nextAppointment: upcoming.length > 0 ? upcoming[0] : null,
  };
}
