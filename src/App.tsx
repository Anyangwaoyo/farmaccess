import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthView } from './components/AuthView';
import { FarmerDashboard } from './components/farmer/FarmerDashboard';
import { LandingPage } from './components/LandingPage';
import { ProviderDashboard } from './components/provider/ProviderDashboard';
import { ToastContainer } from './components/ui/ToastContainer';
import {
  farmAccessService,
  type ServiceSnapshot,
} from './services/farmAccessService';
import type {
  AppNotification,
  Profile,
  ServiceType,
} from './types/farmaccess';

type ViewState = 'landing' | 'auth' | 'dashboard';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authPreselectRole, setAuthPreselectRole] = useState<'farmer' | 'provider'>('farmer');

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [snapshot, setSnapshot] = useState<ServiceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [preselectedService, setPreselectedService] = useState<{
    serviceType: ServiceType;
    equipmentId?: string;
  } | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const notify = useCallback(
    (type: AppNotification['type'], title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setNotifications((prev) => [...prev, { id, type, title, message }]);
      window.setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== id));
      }, 4500);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const refreshData = useCallback(async (activeProfile?: Profile | null) => {
    try {
      setLoadError(null);
      const targetUser =
        activeProfile !== undefined
          ? activeProfile
          : await farmAccessService.getCurrentSessionProfile();
      const data = await farmAccessService.fetchSnapshot(targetUser);
      setCurrentUser(targetUser);
      setSnapshot(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Unable to load FarmAccess data.'
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionUser = await farmAccessService.getCurrentSessionProfile();
        const data = await farmAccessService.fetchSnapshot(sessionUser);
        if (!mounted) return;
        setCurrentUser(sessionUser);
        setSnapshot(data);
        if (sessionUser) {
          setView('dashboard');
        }
      } catch (err) {
        if (!mounted) return;
        setLoadError(
          err instanceof Error ? err.message : 'Failed to initialize application.'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenAuth = (
    mode: 'login' | 'register',
    role: 'farmer' | 'provider' = 'farmer'
  ) => {
    setAuthMode(mode);
    setAuthPreselectRole(role);
    setView('auth');
  };

  const handleAuthSuccess = async (profile: Profile) => {
    await refreshData(profile);
    setView('dashboard');
    notify('success', `Welcome to FarmAccess, ${profile.full_name}`);
  };

  const handleLogout = async () => {
    await farmAccessService.logout();
    setCurrentUser(null);
    setPreselectedService(null);
    await refreshData(null);
    setView('landing');
    notify('info', 'Signed out of FarmAccess');
  };

  const handleSelectServiceToBook = (
    serviceType: ServiceType,
    equipmentId?: string
  ) => {
    setPreselectedService({ serviceType, equipmentId });
    if (currentUser && currentUser.role === 'farmer') {
      setView('dashboard');
    } else if (currentUser) {
      notify(
        'info',
        'Farmer account required',
        'Service requests can only be submitted from a Farmer account.'
      );
    } else {
      handleOpenAuth('register', 'farmer');
      notify(
        'info',
        'Create an account to continue',
        `Sign up to submit a request for ${serviceType}.`
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-[#14532D] animate-spin mb-3" aria-hidden="true" />
        <p className="font-display text-base font-semibold text-slate-900">
          Loading FarmAccess...
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Preparing agricultural services and machinery availability
        </p>
      </div>
    );
  }

  if (loadError || !snapshot) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-6">
          <h1 className="font-display text-lg font-bold text-slate-900">
            Unable to Load FarmAccess
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {loadError || 'An unexpected error occurred while loading platform data.'}
          </p>
          <button
            type="button"
            onClick={() => refreshData(currentUser)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534]"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const activeProviderProfile = currentUser
    ? snapshot.providers.find((p) => p.profile_id === currentUser.id)
    : undefined;

  return (
    <>
      {view === 'landing' && (
        <LandingPage
          currentUser={currentUser}
          equipmentList={snapshot.equipment}
          onOpenAuth={(mode, role) => {
            setPreselectedService(null);
            handleOpenAuth(mode, role);
          }}
          onGoToDashboard={() => setView('dashboard')}
          onSelectServiceToBook={handleSelectServiceToBook}
        />
      )}

      {view === 'auth' && (
        <AuthView
          initialMode={authMode}
          initialRole={authPreselectRole}
          requestedService={preselectedService?.serviceType}
          onSuccess={handleAuthSuccess}
          onBack={() => setView('landing')}
        />
      )}

      {view === 'dashboard' && currentUser && currentUser.role === 'farmer' && (
        <FarmerDashboard
          profile={currentUser}
          equipment={snapshot.equipment}
          providers={snapshot.providers}
          serviceRequests={snapshot.serviceRequests}
          quotations={snapshot.quotations}
          bookings={snapshot.bookings}
          preselectedService={preselectedService}
          onClearPreselectedService={() => setPreselectedService(null)}
          onRefresh={() => refreshData(currentUser)}
          onNotify={notify}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
          onGoHome={() => setView('landing')}
          onLogout={handleLogout}
        />
      )}

      {view === 'dashboard' && currentUser && currentUser.role === 'provider' && (
        <ProviderDashboard
          profile={currentUser}
          providerProfile={activeProviderProfile}
          equipment={snapshot.equipment}
          serviceRequests={snapshot.serviceRequests}
          quotations={snapshot.quotations}
          bookings={snapshot.bookings}
          onRefresh={() => refreshData(currentUser)}
          onNotify={notify}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
          onGoHome={() => setView('landing')}
          onLogout={handleLogout}
        />
      )}

      {view === 'dashboard' && currentUser && currentUser.role === 'admin' && (
        <AdminDashboard
          profile={currentUser}
          profiles={snapshot.profiles}
          providers={snapshot.providers}
          equipment={snapshot.equipment}
          serviceRequests={snapshot.serviceRequests}
          quotations={snapshot.quotations}
          bookings={snapshot.bookings}
          transactionRecords={snapshot.transactionRecords}
          onRefresh={() => refreshData(currentUser)}
          onNotify={notify}
          onGoHome={() => setView('landing')}
          onLogout={handleLogout}
        />
      )}

      <ToastContainer
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </>
  );
}
