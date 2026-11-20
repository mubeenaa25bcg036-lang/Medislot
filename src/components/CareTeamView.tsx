import { useState } from 'react';
import { Globe, MapPin, Shield, Star, Video } from 'lucide-react';
import type { Doctor, Specialty } from '../types/clinic';
import { SPECIALTIES } from '../utils/clinicLogic';

interface CareTeamViewProps {
  doctors: Doctor[];
  onBookDoctor: (doctor: Doctor) => void;
}

export function CareTeamView({ doctors, onBookDoctor }: CareTeamViewProps) {
  const [specialty, setSpecialty] = useState<Specialty | 'All'>('All');

  const visible =
    specialty === 'All'
      ? doctors
      : doctors.filter((doc) => doc.specialty === specialty);

  return (
    <section aria-label="Clinical Care Team Directory" className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F172A] text-balance">
          Board-Certified Care Team
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Review specialist credentials, accepted insurance networks, languages, and consultation formats.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSpecialty('All')}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            specialty === 'All'
              ? 'bg-[#0284C7] text-white'
              : 'bg-white border border-[#E2E8F0] text-[#3F4850] hover:border-[#0284C7]'
          }`}
        >
          All Specialties ({doctors.length})
        </button>
        {SPECIALTIES.map((spec) => (
          <button
            key={spec}
            type="button"
            onClick={() => setSpecialty(spec)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              specialty === spec
                ? 'bg-[#0284C7] text-white'
                : 'bg-white border border-[#E2E8F0] text-[#3F4850] hover:border-[#0284C7]'
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visible.map((doc) => (
          <article
            key={doc.id}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-[#0EA5E9] hover:shadow-md transition-all"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <img
                  src={doc.avatarUrl}
                  alt={doc.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover border border-[#E2E8F0] shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold text-[#0F172A]">
                    {doc.name}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    {doc.credentials} · <span className="text-[#0284C7] font-medium">{doc.specialty}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#64748B] tabular-nums">
                    <span className="inline-flex items-center gap-1 text-[#0F172A] font-medium">
                      <Star className="w-3.5 h-3.5 fill-[#0EA5E9] text-[#0EA5E9]" />
                      {doc.rating.toFixed(1)} ({doc.reviewCount} reviews)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{doc.yearsExperience} yrs clinical practice</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#3F4850] leading-relaxed">{doc.bio}</p>

              <div className="pt-3 border-t border-[#E2E8F0] space-y-2 text-xs text-[#64748B]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#94A3B8] shrink-0" />
                  <span>{doc.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span>Available for: {doc.visitModes.join(' & ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#94A3B8] shrink-0" />
                  <span>Spoken Languages: {doc.languages.join(', ')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                  <span>Accepted Plans: {doc.acceptsInsurance.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-[#0F172A] tabular-nums">
                ${doc.consultationFee}{' '}
                <span className="text-xs font-normal text-[#64748B]">self-pay</span>
              </span>
              <button
                type="button"
                onClick={() => onBookDoctor(doc)}
                className="h-10 px-4 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                Select Time Slot
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
