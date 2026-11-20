import { useState, type RefObject } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import type { Doctor, Specialty, TriageRecommendation } from '../types/clinic';

interface TriageBarProps {
  inputRef: RefObject<HTMLInputElement | null>;
  doctors: Doctor[];
  onApplySpecialty: (specialty: Specialty) => void;
  onSelectDoctorForBooking: (doctor: Doctor) => void;
}

const SAMPLE_PROMPTS = [
  'Migraine & light sensitivity · Video',
  'Chest tightness during exercise',
  'Persistent skin rash · Telehealth',
];

export function TriageBar({
  inputRef,
  doctors,
  onApplySpecialty,
  onSelectDoctorForBooking,
}: TriageBarProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageRecommendation | null>(null);

  const runTriage = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (trimmed.length < 4) {
      setError('Please describe your symptoms or scheduling preference (at least 4 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to run clinical triage.');
        setResult(null);
      } else {
        setResult(data.triage as TriageRecommendation);
      }
    } catch {
      setError('Network error while contacting clinical triage service.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runTriage(prompt);
  };

  const matchedDoctor = result
    ? doctors.find((d) => d.id === result.recommendedDoctorId) ||
      doctors.find((d) => d.specialty === result.recommendedSpecialty)
    : undefined;

  return (
    <section
      aria-label="AI Symptom & Scheduling Triage"
      className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="font-display text-base font-semibold text-[#0F172A]">
            Intelligent Intake & Care Routing
          </h2>
          <p className="text-sm text-[#64748B]">
            Describe your symptoms or preferred visit timing to match with the right specialist.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="ai-triage-input" className="sr-only">
            Describe symptoms or scheduling preferences
          </label>
          <input
            ref={inputRef}
            id="ai-triage-input"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Persistent headaches since Tuesday, prefer afternoon telehealth..."
            className="w-full h-12 pl-4 pr-12 rounded-2xl bg-white/90 border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0284C7] focus:ring-3 focus:ring-[#0284C7]/12 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Analyze symptoms with AI Triage"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-[#F0FDFA] text-[#0D9488] hover:bg-[#CCFBF1] flex items-center justify-center transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-12 px-5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0EA5E9]/30"
        >
          {loading ? 'Analyzing...' : 'Match Care'}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[#64748B]">Quick examples:</span>
        {SAMPLE_PROMPTS.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setPrompt(sample);
              void runTriage(sample);
            }}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#3F4850] transition-colors text-left"
          >
            {sample}
          </button>
        ))}
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Clinical Triage Unavailable</p>
            <p className="mt-0.5 text-xs text-[#B91C1C]">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss triage error"
            className="p-1 text-[#991B1B] hover:bg-[#FEE2E2] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Recommended: {result.recommendedSpecialty}
                </span>
                <span className="text-[#64748B]">·</span>
                <span className="text-[#0F172A]">Urgency: {result.urgency}</span>
                <span className="text-[#64748B]">·</span>
                <span className="text-[#0D9488]">Suggested: {result.suggestedVisitMode}</span>
              </div>
              <p className="text-sm text-[#0F172A] leading-relaxed">
                {result.clinicalSummary}
              </p>
              {result.prepChecklist?.length > 0 ? (
                <ul className="pt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#64748B]">
                  {result.prepChecklist.map((step, index) => (
                    <li
                      key={index}
                      className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]"
                    >
                      {index + 1}. {step}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onApplySpecialty(result.recommendedSpecialty)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#0284C7] text-sm font-medium text-[#0F172A] transition-colors whitespace-nowrap"
              >
                Filter to {result.recommendedSpecialty}
              </button>
              {matchedDoctor ? (
                <button
                  type="button"
                  onClick={() => onSelectDoctorForBooking(matchedDoctor)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Book {matchedDoctor.name}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setResult(null)}
                aria-label="Clear triage recommendation"
                className="p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
