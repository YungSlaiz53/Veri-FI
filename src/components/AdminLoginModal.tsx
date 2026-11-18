import React, { useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { useVeriFi } from '../lib/store';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const { loginAdminPortal } = useVeriFi();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!login.trim() || !password) {
      setErrorMsg('Administrator login and password are required.');
      return;
    }
    setSubmitting(true);
    const res = await loginAdminPortal(login.trim(), password);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Invalid administrator credentials.');
      return;
    }
    setLogin('');
    setPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-heading"
        className="w-full max-w-sm bg-[#0D101B] border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
            <h2 id="admin-login-heading" className="text-base font-semibold text-white">
              Admin Login Portal
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close admin login portal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 leading-relaxed">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="admin-portal-login" className="block text-xs font-medium text-slate-300 mb-1">
              Login
            </label>
            <input
              id="admin-portal-login"
              type="text"
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Administrator username"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label htmlFor="admin-portal-password" className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              id="admin-portal-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            {submitting ? 'Verifying...' : 'Sign In as Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
