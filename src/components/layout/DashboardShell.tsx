import { LogOut, Menu, Tractor, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Profile } from '../../types/farmaccess';

export interface NavTabItem {
  id: string;
  label: string;
  icon: typeof Tractor;
  badgeCount?: number;
}

interface DashboardShellProps {
  profile: Profile;
  portalTitle: string;
  tabs: NavTabItem[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onGoHome: () => void;
  onLogout: () => void;
  primaryAction?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  profile,
  portalTitle,
  tabs,
  activeTab,
  onSelectTab,
  onGoHome,
  onLogout,
  primaryAction,
  children,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTabObj = tabs.find((t) => t.id === activeTab);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-5 py-5 border-b border-slate-200 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onGoHome}
          className="text-left focus-visible:outline-2 focus-visible:outline-[#14532D] rounded"
        >
          <span className="font-display text-xl font-bold text-[#14532D] block">
            FarmAccess
          </span>
          <span className="text-xs text-slate-500 block mt-0.5">{portalTitle}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Dashboard navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSelectTab(tab.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#14532D] text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
              </span>
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span
                  className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3 bg-[#F8FAF8]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {profile.full_name}
          </p>
          <p className="text-xs text-slate-600 truncate">
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            {profile.state ? ` · ${profile.state}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex">
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">{portalTitle}</p>
                <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {activeTabObj?.label || 'Dashboard'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {primaryAction}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
