import React, { useState } from 'react';
import { ArrowRight, Mail, ShieldCheck, User } from 'lucide-react';
import { SCHOOL_ASSETS } from '../../data/seedData';
import type { AdminUser } from '../../domain/types';
import {
  loginAdmin,
  setupInitialAdmin,
  type AuthStatusResponse,
} from '../../services/adminApi';
import { SafeImage } from '../ui/CommonPrimitives';

export function LoginScreen({
  authStatus,
  onAuthenticated,
}: {
  authStatus: AuthStatusResponse;
  onAuthenticated: (admin: AdminUser) => void;
}) {
  const mode: 'login' | 'setup' = authStatus.setupRequired ? 'setup' : 'login';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(authStatus.setupRequired ? 'admin@sunshineschool.edu' : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await setupInitialAdmin({ fullName, email });
      onAuthenticated(res.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initial setup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginAdmin(email);
      onAuthenticated(res.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Administrator authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row items-stretch">
      {/* Left Institutional Showcase Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white relative overflow-hidden flex-col justify-between p-12">
        <SafeImage
          src={SCHOOL_ASSETS.campusBanner}
          alt="Sunshine School Campus"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/75 to-slate-900/60" />
        <div className="relative z-10 flex items-center gap-3.5">
          <SafeImage
            src={authStatus.schoolLogo || SCHOOL_ASSETS.logo}
            alt="Sunshine School Crest"
            className="w-11 h-11 rounded-lg object-cover bg-white p-0.5"
          />
          <div>
            <p className="font-display font-bold text-lg tracking-tight">
              {authStatus.schoolName || 'Sunshine School Social'}
            </p>
            <p className="text-xs text-slate-300">Super Admin Governance Portal</p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-5">
          <h1 className="font-display text-3xl xl:text-4xl font-bold leading-tight text-balance">
            Centralized authority for campus safety, faculty permissions, and live broadcasts.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Review teacher registrations, enforce granular capability permissions at the API layer, moderate public posts and advertisements, and monitor active LiveKit streams in real time.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/15 text-xs">
            <div>
              <p className="font-semibold text-white">Zero Public Sign-Up</p>
              <p className="text-slate-400 mt-0.5">Authorized admin provisioning only</p>
            </div>
            <div>
              <p className="font-semibold text-white">Shared Backend</p>
              <p className="text-slate-400 mt-0.5">Unified REST API &amp; LiveKit Engine</p>
            </div>
            <div>
              <p className="font-semibold text-white">Audit Logged</p>
              <p className="text-slate-400 mt-0.5">Every moderation decision tracked</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-400">
          Sunshine School Administration · Protected Console
        </p>
      </div>

      {/* Right Authentication Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <SafeImage
              src={authStatus.schoolLogo || SCHOOL_ASSETS.logo}
              alt="Sunshine School Crest"
              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
            />
            <div>
              <p className="font-display font-bold text-base text-slate-900">
                {authStatus.schoolName || 'Sunshine School Social'}
              </p>
              <p className="text-xs text-slate-500">Super Admin Portal</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {mode === 'setup'
                  ? 'Initial Super Admin Setup'
                  : 'Authorized Super Admin Sign In'}
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 pt-1">
              {mode === 'setup'
                ? 'Configure Primary Super Admin'
                : 'Sign in to Governance Console'}
            </h2>
            <p className="text-sm text-slate-600">
              {mode === 'setup'
                ? 'Configure the first authorized Super Admin profile. Additional administrators can only be added from inside Website Settings.'
                : 'Access is restricted to authorized Sunshine School Super Administrators via JWT authentication.'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800"
            >
              {error}
            </div>
          )}

          {mode === 'setup' ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="setup-name" className="block text-xs font-medium text-slate-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="setup-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Margaret Sterling"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="setup-email" className="block text-xs font-medium text-slate-700">
                  Super Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="setup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sunshineschool.edu"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
              >
                <span>{loading ? 'Provisioning Super Admin...' : 'Complete Initial Admin Setup'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-medium text-slate-700">
                  Super Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sunshineschool.edu"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
              >
                <span>{loading ? 'Authenticating Session...' : 'Sign In to Console'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
