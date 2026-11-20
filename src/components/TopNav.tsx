import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type NavTab = 'book' | 'appointments' | 'team' | 'profile';

interface TopNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onTriggerTriage: () => void;
  upcomingCount: number;
}

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'book', label: 'Book Care' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'team', label: 'Care Team' },
  { id: 'profile', label: 'Patient Profile' },
];

export function TopNav({
  activeTab,
  onSelectTab,
  onTriggerTriage,
  upcomingCount,
}: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('book');
          }}
          className="font-display text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0"
        >
          Clinical Clarity
        </a>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] rounded-sm ${
                  isActive
                    ? 'text-[#0284C7]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {item.label}
                {item.id === 'appointments' && upcomingCount > 0 ? (
                  <span className="ml-1.5 text-xs font-mono tabular-nums text-[#64748B]">
                    ({upcomingCount})
                  </span>
                ) : null}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-[#0284C7]"
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onTriggerTriage();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0EA5E9]/30"
          >
            AI Triage
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden p-2 rounded-lg border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-3">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#E0F2FE] text-[#0369A1]'
                      : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {item.label}
                  {item.id === 'appointments' && upcomingCount > 0 ? (
                    <span className="ml-2 text-xs font-mono tabular-nums text-[#64748B]">
                      ({upcomingCount})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
