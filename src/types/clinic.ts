export type Specialty =
  | 'Cardiology'
  | 'Neurology'
  | 'Primary Care'
  | 'Dermatology'
  | 'Pediatrics';

export type VisitMode = 'In-Person' | 'Video Visit';

export type AppointmentStatus =
  | 'upcoming'
  | 'checked-in'
  | 'completed'
  | 'cancelled';

export interface Doctor {
  id: string;
  name: string;
  credentials: string;
  specialty: Specialty;
  yearsExperience: number;
  location: string;
  rating: number;
  reviewCount: number;
  languages: string[];
  visitModes: VisitMode[];
  bio: string;
  avatarUrl: string;
  consultationFee: number;
  dailySlots: string[];
  acceptsInsurance: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: Specialty;
  doctorAvatarUrl: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g., "09:30 AM"
  visitMode: VisitMode;
  reason: string;
  notes: string;
  status: AppointmentStatus;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  bloodType: string;
  allergies: string;
  medications: string;
  insuranceProvider: string;
  insuranceMemberId: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredVisitMode: VisitMode;
  preferredClinic: string;
  smsReminders: boolean;
  emailSummaries: boolean;
  updatedAt: string;
}

export interface TriageRecommendation {
  recommendedSpecialty: Specialty;
  urgency: 'Routine' | 'Prompt (24-48h)' | 'Urgent Care Recommended';
  clinicalSummary: string;
  suggestedVisitMode: VisitMode;
  prepChecklist: string[];
  recommendedDoctorId?: string;
}

export interface DashboardMetrics {
  upcomingCount: number;
  checkedInCount: number;
  completedCount: number;
  cancelledCount: number;
  nextAppointment: Appointment | null;
}

export interface ClinicBootstrapPayload {
  doctors: Doctor[];
  activeProfile: PatientProfile;
  profiles: PatientProfile[];
  appointments: Appointment[];
  serverTime: string;
}

export type RealtimeEvent =
  | { type: 'sync:init'; payload: ClinicBootstrapPayload }
  | { type: 'profile:updated'; payload: PatientProfile }
  | { type: 'profile:switched'; payload: { activeProfile: PatientProfile; profiles: PatientProfile[] } }
  | { type: 'appointment:created'; payload: Appointment }
  | { type: 'appointment:updated'; payload: Appointment };
