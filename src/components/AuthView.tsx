import { ArrowLeft, Check } from 'lucide-react';
import { useState } from 'react';
import { farmAccessService } from '../services/farmAccessService';
import type { Profile, ServiceType } from '../types/farmaccess';

interface AuthViewProps {
  initialMode: 'login' | 'register';
  initialRole?: 'farmer' | 'provider';
  requestedService?: ServiceType | null;
  onSuccess: (profile: Profile) => void;
  onBack: () => void;
}

export function AuthView({
  initialMode,
  initialRole = 'farmer',
  requestedService,
  onSuccess,
  onBack,
}: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'farmer' | 'provider'>(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Shared minimal auth fields
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!contact.trim() || !password) {
        setError('Please enter your email or phone number and password.');
        return;
      }
      setLoading(true);
      try {
        const profile = await farmAccessService.login(contact, password);
        onSuccess(profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to sign in.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!fullName.trim() || !contact.trim() || !password) {
      setError('Please enter your name, email or phone number, and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const profile = await farmAccessService.register({
        fullName,
        contact,
        password,
        role,
      });
      onSuccess(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1040px] mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#14532D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to FarmAccess Home</span>
          </button>
          <span className="font-display text-lg font-bold text-[#14532D]">
            FarmAccess
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-[1040px] w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="border-b border-slate-200 pb-5">
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {mode === 'login'
                ? 'Sign in to FarmAccess'
                : 'Create your FarmAccess account'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {mode === 'login'
                ? 'Access your Farmer, Equipment Provider, or Admin workspace.'
                : 'Quick registration — complete your Bio and farm or business profile after signing in.'}
            </p>
          </div>

          {requestedService && mode === 'register' && (
            <div className="mt-5 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-sm text-[#14532D]">
              Sign up below to request <span className="font-semibold">{requestedService}</span> and receive quotations from equipment providers.
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-[#14532D] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white text-[#14532D] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div
              className="mt-5 p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <span className="block text-sm font-medium text-slate-700 mb-2">
                    Account Type
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('farmer')}
                      className={`p-3.5 rounded-lg border text-left transition-colors ${
                        role === 'farmer'
                          ? 'border-[#14532D] bg-emerald-50/70 text-[#14532D]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold">Farmer</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Request services &amp; accept quotes
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('provider')}
                      className={`p-3.5 rounded-lg border text-left transition-colors ${
                        role === 'provider'
                          ? 'border-[#14532D] bg-emerald-50/70 text-[#14532D]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-semibold">Equipment Provider</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        List machinery &amp; fulfil jobs
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-fullname"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="auth-contact"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email or Phone Number <span className="text-rose-600">*</span>
              </label>
              <input
                id="auth-contact"
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="name@example.com or +234 803 000 0000"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Password <span className="text-rose-600">*</span>
              </label>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === 'register'
                    ? 'Create a password (min. 6 characters)'
                    : 'Enter your password'
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14532D]"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>
        </div>

        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900">
            What happens after sign up?
          </h2>
          <ul className="space-y-3 text-sm text-slate-600">
            {[
              'Update your Bio, location, and contact profile directly inside your dashboard.',
              'Farmers can submit requests for ploughing, harrowing, ridging, tractor hiring, maize shelling, and rice threshing.',
              'Equipment providers can complete their business details, list machinery with Naira pricing, and send quotations.',
              'Every confirmed quotation generates a unique booking reference number tracked through completion.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}
