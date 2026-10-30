import React, { useState } from 'react';
import { Sparkles, Lock, Mail, User, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    login,
    register,
    changePassword,
    mustChangePasswordModalOpen,
    user,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Forced password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'register') {
        await register(email, password, name);
        onClose();
      } else if (mode === 'forgot') {
        await fetch('/api/auth/reset-password-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        setForgotSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPass !== confirmNewPass) {
      setError('New passwords do not match.');
      return;
    }
    if (newPass.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPass || 'bhavyakth', newPass);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // If force change is required, render non-closable security setup screen
  if (mustChangePasswordModalOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-3xl border border-amber-500/30 p-6 shadow-2xl text-gray-900 dark:text-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Security Setup Required</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-6 leading-relaxed">
            Welcome! You are currently using the initial setup credential for account{' '}
            <strong className="text-gray-900 dark:text-white font-mono">{user?.email}</strong>. For security, you must set a new secure password before proceeding.
          </p>

          <form onSubmit={handleForcePasswordChange} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Current Password</label>
              <input
                type="password"
                required
                placeholder="Initial password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                className="w-full bg-gray-100 dark:bg-[#282828] px-3.5 py-2.5 rounded-xl text-xs outline-none border border-transparent focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">New Strong Password</label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="w-full bg-gray-100 dark:bg-[#282828] px-3.5 py-2.5 rounded-xl text-xs outline-none border border-transparent focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="Repeat new password"
                value={confirmNewPass}
                onChange={e => setConfirmNewPass(e.target.value)}
                className="w-full bg-gray-100 dark:bg-[#282828] px-3.5 py-2.5 rounded-xl text-xs outline-none border border-transparent focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating Credentials...' : 'Save New Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-2xl text-gray-900 dark:text-gray-100">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mb-3 shadow-md shadow-emerald-500/20">
            <Sparkles size={24} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : 'Reset password'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'login'
              ? 'Enter your credentials to access ChatGPT Pro'
              : mode === 'register'
              ? 'Join ChatGPT Pro with full access to AI models and search'
              : 'Enter your email to request recovery instructions'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 font-medium">
            {error}
          </div>
        )}

        {forgotSent ? (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <p className="text-xs text-gray-400">
              Password reset instructions have been logged to the security console.
            </p>
            <button
              onClick={() => {
                setForgotSent(false);
                setMode('login');
              }}
              className="text-xs text-emerald-500 font-semibold hover:underline"
            >
              Back to log in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-[#252525] pl-10 pr-3.5 py-2.5 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-[#252525] pl-10 pr-3.5 py-2.5 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-[#252525] pl-10 pr-3.5 py-2.5 rounded-xl text-xs border border-transparent focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* Footer switch */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-500">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
