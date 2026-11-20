import { useEffect, useState } from 'react';
import { CheckCircle2, UserPlus, Users } from 'lucide-react';
import type { PatientProfile, VisitMode } from '../types/clinic';
import {
  BLOOD_TYPES,
  computeProfileCompleteness,
  validateProfileInput,
} from '../utils/clinicLogic';

interface PatientProfileViewProps {
  activeProfile: PatientProfile;
  profiles: PatientProfile[];
  onSaveProfile: (
    updates: Partial<PatientProfile>
  ) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  onSwitchProfile: (payload: {
    profileId?: string;
    newProfile?: Partial<PatientProfile>;
  }) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>;
}

export function PatientProfileView({
  activeProfile,
  profiles,
  onSaveProfile,
  onSwitchProfile,
}: PatientProfileViewProps) {
  const [form, setForm] = useState<PatientProfile>(activeProfile);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('1990-01-15');
  const [newInsurance, setNewInsurance] = useState('Blue Cross PPO');

  useEffect(() => {
    setForm(activeProfile);
    setErrors({});
    setServerError(null);
  }, [activeProfile]);

  const completeness = computeProfileCompleteness(form);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(null);
    setServerError(null);

    const validation = validateProfileInput(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSaving(true);
    const res = await onSaveProfile(form);
    setSaving(false);

    if (!res.ok) {
      setServerError(res.error || 'Could not save profile.');
      if (res.fieldErrors) setErrors(res.fieldErrors);
    } else {
      setSavedNotice('Patient profile saved and synced across connected views.');
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSaving(true);
    const res = await onSwitchProfile({
      newProfile: {
        fullName: newName,
        email: newEmail,
        phone: newPhone,
        dateOfBirth: newDob,
        insuranceProvider: newInsurance,
      },
    });
    setSaving(false);
    if (!res.ok) {
      setServerError(res.error || 'Unable to create patient profile.');
    } else {
      setCreatingNew(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setSavedNotice('New patient profile created and activated.');
    }
  };

  return (
    <section aria-label="Patient Profile and Real-Time Sync" className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F172A] text-balance">
            Patient Profile & Clinical Intake
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Updates immediately synchronize across your dashboard, booking confirmations, and active sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] mr-1">
            <Users className="w-4 h-4 text-[#0284C7]" />
            Active Account:
          </span>
          {profiles.map((p) => {
            const isCurrent = p.id === activeProfile.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSwitchProfile({ profileId: p.id })}
                className={`h-9 px-3.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[#0284C7] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#0F172A] hover:border-[#0284C7]'
                }`}
              >
                {p.fullName}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCreatingNew((prev) => !prev)}
            className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-medium text-[#0F172A] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#0D9488]" />
            Add Member
          </button>
        </div>
      </div>

      {creatingNew ? (
        <form
          onSubmit={handleCreateProfile}
          className="bg-white border border-[#0284C7] rounded-2xl p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#0F172A]">
              Add Household Patient Profile
            </h2>
            <button
              type="button"
              onClick={() => setCreatingNew(false)}
              className="text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label htmlFor="new-pat-name" className="block text-xs font-medium text-[#3F4850] mb-1">
                Full Name
              </label>
              <input
                id="new-pat-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Jordan Taylor"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-pat-email" className="block text-xs font-medium text-[#3F4850] mb-1">
                Email
              </label>
              <input
                id="new-pat-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="jordan@example.com"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-pat-phone" className="block text-xs font-medium text-[#3F4850] mb-1">
                Phone
              </label>
              <input
                id="new-pat-phone"
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="(415) 555-0199"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-pat-dob" className="block text-xs font-medium text-[#3F4850] mb-1">
                Date of Birth
              </label>
              <input
                id="new-pat-dob"
                type="date"
                required
                value={newDob}
                onChange={(e) => setNewDob(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-pat-ins" className="block text-xs font-medium text-[#3F4850] mb-1">
                Insurance
              </label>
              <input
                id="new-pat-ins"
                type="text"
                required
                value={newInsurance}
                onChange={(e) => setNewInsurance(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-medium"
            >
              Create & Switch Profile
            </button>
          </div>
        </form>
      ) : null}

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
          <div>
            <p className="text-xs font-medium text-[#64748B]">
              Clinical Readiness & Intake Completeness
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-[#0F172A] tabular-nums">
              {completeness}% Complete
            </p>
          </div>
          <div className="w-full sm:w-64">
            <div className="h-2.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0D9488] transition-all duration-300"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[#64748B] tabular-nums">
              Last synced: {new Date(activeProfile.updatedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="pt-6 space-y-6">
          {savedNotice ? (
            <div
              role="status"
              className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[#CCFBF1] text-[#0F766E] text-sm font-medium"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {savedNotice}
            </div>
          ) : null}

          {serverError ? (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]"
            >
              {serverError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="profile-fullname"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="profile-fullname"
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7] focus:ring-3 focus:ring-[#0284C7]/12"
              />
              {errors.fullName ? (
                <p className="mt-1 text-xs text-[#BA1A1A]">{errors.fullName}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7] focus:ring-3 focus:ring-[#0284C7]/12"
              />
              {errors.email ? (
                <p className="mt-1 text-xs text-[#BA1A1A]">{errors.email}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Mobile Phone
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0284C7] focus:ring-3 focus:ring-[#0284C7]/12"
              />
              {errors.phone ? (
                <p className="mt-1 text-xs text-[#BA1A1A]">{errors.phone}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-dob"
                  className="block text-xs font-medium text-[#3F4850] mb-1.5"
                >
                  Date of Birth
                </label>
                <input
                  id="profile-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0284C7]"
                />
                {errors.dateOfBirth ? (
                  <p className="mt-1 text-xs text-[#BA1A1A]">{errors.dateOfBirth}</p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="profile-blood"
                  className="block text-xs font-medium text-[#3F4850] mb-1.5"
                >
                  Blood Type
                </label>
                <select
                  id="profile-blood"
                  value={form.bloodType}
                  onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                >
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-insurance"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Insurance Provider
              </label>
              <input
                id="profile-insurance"
                type="text"
                value={form.insuranceProvider}
                onChange={(e) =>
                  setForm({ ...form, insuranceProvider: e.target.value })
                }
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
              {errors.insuranceProvider ? (
                <p className="mt-1 text-xs text-[#BA1A1A]">
                  {errors.insuranceProvider}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="profile-member-id"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Insurance Member ID
              </label>
              <input
                id="profile-member-id"
                type="text"
                value={form.insuranceMemberId}
                onChange={(e) =>
                  setForm({ ...form, insuranceMemberId: e.target.value })
                }
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm font-mono text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label
                htmlFor="profile-allergies"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Known Allergies
              </label>
              <input
                id="profile-allergies"
                type="text"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label
                htmlFor="profile-medications"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Current Medications
              </label>
              <input
                id="profile-medications"
                type="text"
                value={form.medications}
                onChange={(e) => setForm({ ...form, medications: e.target.value })}
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label
                htmlFor="profile-emergency-name"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Emergency Contact Name
              </label>
              <input
                id="profile-emergency-name"
                type="text"
                value={form.emergencyContactName}
                onChange={(e) =>
                  setForm({ ...form, emergencyContactName: e.target.value })
                }
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            <div>
              <label
                htmlFor="profile-emergency-phone"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Emergency Contact Phone
              </label>
              <input
                id="profile-emergency-phone"
                type="tel"
                value={form.emergencyContactPhone}
                onChange={(e) =>
                  setForm({ ...form, emergencyContactPhone: e.target.value })
                }
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] tabular-nums focus:outline-none focus:border-[#0284C7]"
              />
            </div>
          </div>

          <div className="pt-5 border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            <div>
              <label
                htmlFor="profile-visit-mode"
                className="block text-xs font-medium text-[#3F4850] mb-1.5"
              >
                Preferred Consultation Format
              </label>
              <select
                id="profile-visit-mode"
                value={form.preferredVisitMode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    preferredVisitMode: e.target.value as VisitMode,
                  })
                }
                className="w-full h-11 px-3.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              >
                <option value="Video Visit">Video Visit</option>
                <option value="In-Person">In-Person</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 md:pt-5">
              <label className="inline-flex items-center gap-2.5 text-sm text-[#0F172A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.smsReminders}
                  onChange={(e) =>
                    setForm({ ...form, smsReminders: e.target.checked })
                  }
                  className="w-4.5 h-4.5 rounded border-[#CBD5E1] accent-[#0284C7]"
                />
                SMS Appointment Reminders
              </label>
              <label className="inline-flex items-center gap-2.5 text-sm text-[#0F172A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.emailSummaries}
                  onChange={(e) =>
                    setForm({ ...form, emailSummaries: e.target.checked })
                  }
                  className="w-4.5 h-4.5 rounded border-[#CBD5E1] accent-[#0284C7]"
                />
                Email Visit Summaries
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setForm(activeProfile);
                setErrors({});
                setSavedNotice(null);
              }}
              className="h-11 px-4 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-sm font-medium text-[#0F172A]"
            >
              Reset Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-6 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
