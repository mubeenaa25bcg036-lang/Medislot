import fs from 'fs';
import path from 'path';
import type {
  Appointment,
  AppointmentStatus,
  ClinicBootstrapPayload,
  Doctor,
  PatientProfile,
  VisitMode,
} from '../src/types/clinic.ts';
import {
  SEED_DOCTORS,
  SEED_PROFILES,
  buildSeedAppointments,
} from '../src/data/seedClinicData.ts';
import {
  canTransitionAppointmentStatus,
  getAvailableSlotsForDate,
  validateBookingInput,
  validateProfileInput,
} from '../src/utils/clinicLogic.ts';

interface PersistedClinicState {
  doctors: Doctor[];
  profiles: PatientProfile[];
  activeProfileId: string;
  appointments: Appointment[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'clinic-store.json');

function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialState(): PersistedClinicState {
  const baseDate = getTodayDateStr();
  return {
    doctors: SEED_DOCTORS,
    profiles: SEED_PROFILES,
    activeProfileId: SEED_PROFILES[0].id,
    appointments: buildSeedAppointments(baseDate),
  };
}

export class ClinicStore {
  private state: PersistedClinicState;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): PersistedClinicState {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as PersistedClinicState;
        if (
          Array.isArray(parsed.doctors) &&
          Array.isArray(parsed.profiles) &&
          parsed.profiles.length > 0 &&
          Array.isArray(parsed.appointments)
        ) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read persisted clinic store, re-seeding:', err);
    }

    const initial = createInitialState();
    this.saveToDisk(initial);
    return initial;
  }

  private saveToDisk(stateToSave: PersistedClinicState): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempPath = `${STORE_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(stateToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, STORE_PATH);
    } catch (err) {
      console.error('Failed to persist clinic store to disk:', err);
    }
  }

  public getBootstrap(): ClinicBootstrapPayload {
    const activeProfile =
      this.state.profiles.find((p) => p.id === this.state.activeProfileId) ||
      this.state.profiles[0];

    return {
      doctors: this.state.doctors,
      activeProfile,
      profiles: this.state.profiles,
      appointments: this.state.appointments,
      serverTime: new Date().toISOString(),
    };
  }

  public getDoctors(): Doctor[] {
    return this.state.doctors;
  }

  public updateActiveProfile(updates: Partial<PatientProfile>): {
    ok: boolean;
    profile?: PatientProfile;
    error?: string;
    fieldErrors?: Record<string, string>;
  } {
    const idx = this.state.profiles.findIndex(
      (p) => p.id === this.state.activeProfileId
    );
    if (idx === -1) {
      return { ok: false, error: 'Active patient profile not found.' };
    }

    const candidate: PatientProfile = {
      ...this.state.profiles[idx],
      ...updates,
      id: this.state.profiles[idx].id,
      updatedAt: new Date().toISOString(),
    };

    const validation = validateProfileInput(candidate);
    if (!validation.valid) {
      return {
        ok: false,
        error: 'Please correct the highlighted profile fields.',
        fieldErrors: validation.errors,
      };
    }

    this.state.profiles[idx] = candidate;
    // Keep upcoming appointment display name synced when patient name changes
    this.state.appointments = this.state.appointments.map((apt) =>
      apt.patientId === candidate.id
        ? { ...apt, patientName: candidate.fullName }
        : apt
    );
    this.saveToDisk(this.state);
    return { ok: true, profile: candidate };
  }

  public switchProfile(payload: {
    profileId?: string;
    newProfile?: Partial<PatientProfile>;
  }): {
    ok: boolean;
    activeProfile?: PatientProfile;
    profiles?: PatientProfile[];
    error?: string;
    fieldErrors?: Record<string, string>;
  } {
    if (payload.profileId) {
      const target = this.state.profiles.find((p) => p.id === payload.profileId);
      if (!target) {
        return { ok: false, error: 'Selected patient profile does not exist.' };
      }
      this.state.activeProfileId = target.id;
      this.saveToDisk(this.state);
      return {
        ok: true,
        activeProfile: target,
        profiles: this.state.profiles,
      };
    }

    if (payload.newProfile) {
      const candidate: PatientProfile = {
        id: `pat-${Date.now().toString(36)}`,
        fullName: (payload.newProfile.fullName || '').trim(),
        email: (payload.newProfile.email || '').trim(),
        phone: (payload.newProfile.phone || '').trim(),
        dateOfBirth: (payload.newProfile.dateOfBirth || '').trim(),
        bloodType: payload.newProfile.bloodType || 'O+',
        allergies: payload.newProfile.allergies || 'None reported',
        medications: payload.newProfile.medications || 'None reported',
        insuranceProvider: (payload.newProfile.insuranceProvider || '').trim(),
        insuranceMemberId: (payload.newProfile.insuranceMemberId || '').trim(),
        emergencyContactName: (payload.newProfile.emergencyContactName || '').trim(),
        emergencyContactPhone: (payload.newProfile.emergencyContactPhone || '').trim(),
        preferredVisitMode: payload.newProfile.preferredVisitMode || 'Video Visit',
        preferredClinic: payload.newProfile.preferredClinic || 'Main Pavilion',
        smsReminders: payload.newProfile.smsReminders ?? true,
        emailSummaries: payload.newProfile.emailSummaries ?? true,
        updatedAt: new Date().toISOString(),
      };

      const validation = validateProfileInput(candidate);
      if (!validation.valid) {
        return {
          ok: false,
          error: 'Please complete the required patient fields.',
          fieldErrors: validation.errors,
        };
      }

      this.state.profiles.push(candidate);
      this.state.activeProfileId = candidate.id;
      this.saveToDisk(this.state);
      return {
        ok: true,
        activeProfile: candidate,
        profiles: this.state.profiles,
      };
    }

    return { ok: false, error: 'Missing profileId or newProfile payload.' };
  }

  public createAppointment(input: {
    doctorId: string;
    date: string;
    timeSlot: string;
    visitMode: VisitMode;
    reason: string;
    notes?: string;
  }): {
    ok: boolean;
    appointment?: Appointment;
    error?: string;
    fieldErrors?: Record<string, string>;
  } {
    const activeProfile =
      this.state.profiles.find((p) => p.id === this.state.activeProfileId) ||
      this.state.profiles[0];

    const validation = validateBookingInput({
      doctorId: input.doctorId || '',
      date: input.date || '',
      timeSlot: input.timeSlot || '',
      visitMode: input.visitMode,
      reason: input.reason || '',
      patientName: activeProfile.fullName,
    });

    if (!validation.valid) {
      return {
        ok: false,
        error: 'Please review the booking fields before confirming.',
        fieldErrors: validation.errors,
      };
    }

    const doctor = this.state.doctors.find((d) => d.id === input.doctorId);
    if (!doctor) {
      return { ok: false, error: 'Selected clinician was not found.' };
    }

    const availableSlots = getAvailableSlotsForDate(
      doctor,
      input.date,
      this.state.appointments
    );
    if (!availableSlots.includes(input.timeSlot)) {
      return {
        ok: false,
        error: `${input.timeSlot} on ${input.date} is no longer available for ${doctor.name}.`,
      };
    }

    const now = new Date().toISOString();
    const created: Appointment = {
      id: `apt-${Date.now().toString(36)}-${Math.floor(Math.random() * 90 + 10)}`,
      patientId: activeProfile.id,
      patientName: activeProfile.fullName,
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      doctorAvatarUrl: doctor.avatarUrl,
      date: input.date,
      timeSlot: input.timeSlot,
      visitMode: input.visitMode,
      reason: input.reason.trim(),
      notes: (input.notes || '').trim() || 'Standard pre-visit intake synced from patient profile.',
      status: 'upcoming',
      location:
        input.visitMode === 'Video Visit'
          ? 'Clinical Clarity Secure Video'
          : doctor.location,
      createdAt: now,
      updatedAt: now,
    };

    this.state.appointments.unshift(created);
    this.saveToDisk(this.state);
    return { ok: true, appointment: created };
  }

  public updateAppointment(
    id: string,
    updates: {
      date?: string;
      timeSlot?: string;
      visitMode?: VisitMode;
      status?: AppointmentStatus;
      notes?: string;
    }
  ): {
    ok: boolean;
    appointment?: Appointment;
    error?: string;
  } {
    const idx = this.state.appointments.findIndex((a) => a.id === id);
    if (idx === -1) {
      return { ok: false, error: 'Appointment not found.' };
    }

    const current = this.state.appointments[idx];
    const doctor = this.state.doctors.find((d) => d.id === current.doctorId);

    if (updates.status && updates.status !== current.status) {
      if (!canTransitionAppointmentStatus(current.status, updates.status)) {
        return {
          ok: false,
          error: `Cannot change appointment status from "${current.status}" to "${updates.status}".`,
        };
      }
    }

    const nextDate = updates.date ?? current.date;
    const nextSlot = updates.timeSlot ?? current.timeSlot;
    const nextMode = updates.visitMode ?? current.visitMode;

    if (
      (updates.date && updates.date !== current.date) ||
      (updates.timeSlot && updates.timeSlot !== current.timeSlot)
    ) {
      if (!doctor) {
        return { ok: false, error: 'Clinician record missing.' };
      }
      const available = getAvailableSlotsForDate(
        doctor,
        nextDate,
        this.state.appointments,
        current.id
      );
      if (!available.includes(nextSlot)) {
        return {
          ok: false,
          error: `${nextSlot} on ${nextDate} is unavailable.`,
        };
      }
    }

    const updated: Appointment = {
      ...current,
      date: nextDate,
      timeSlot: nextSlot,
      visitMode: nextMode,
      status: updates.status ?? current.status,
      notes: updates.notes !== undefined ? updates.notes.trim() : current.notes,
      location:
        nextMode === 'Video Visit'
          ? 'Clinical Clarity Secure Video'
          : doctor?.location || current.location,
      updatedAt: new Date().toISOString(),
    };

    this.state.appointments[idx] = updated;
    this.saveToDisk(this.state);
    return { ok: true, appointment: updated };
  }
}
