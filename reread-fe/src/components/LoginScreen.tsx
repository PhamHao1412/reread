import React, { useState } from 'react';
import { BookOpen, KeyRound, User, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-[100dvh] w-full max-w-[420px] md:border-x md:shadow-2xl flex flex-col justify-between px-6 select-none overflow-y-auto no-scrollbar"
      style={{
        backgroundColor: '#F7EFE1',
        color: '#2D2013',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
        borderColor: 'rgba(126, 104, 81, 0.2)',
      }}
    >
      {/* ── Brand Header ── */}
      <div className="pt-4 text-center">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(194,120,3,0.18) 0%, rgba(126,104,81,0.12) 100%)',
            border: '1px solid rgba(194, 120, 3, 0.25)',
          }}
        >
          <BookOpen className="h-10 w-10" style={{ color: '#C27803' }} />
        </div>
        <h1
          className="text-3xl font-black tracking-tight"
          style={{ color: '#2D2013' }}
        >
          Reread
        </h1>
        <p className="text-sm mt-2" style={{ color: '#7E6851' }}>
          Your personal mobile reading companion
        </p>
      </div>

      {/* ── Login Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4 my-auto py-6">
        {error && (
          <div
            className="flex items-center space-x-2.5 p-3.5 rounded-2xl text-xs"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              color: '#B91C1C',
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Username */}
        <div>
          <label
            className="block text-xs font-bold mb-1.5 uppercase tracking-wider"
            style={{ color: '#7E6851' }}
          >
            Username
          </label>
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5"
              style={{ color: '#7E6851' }}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoCapitalize="none"
              autoComplete="username"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-base transition-all focus:outline-none"
              style={{
                backgroundColor: '#EDE2CE',
                border: '1px solid rgba(126, 104, 81, 0.3)',
                color: '#2D2013',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#C27803';
                e.target.style.boxShadow = '0 0 0 2px rgba(194,120,3,0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(126, 104, 81, 0.3)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            className="block text-xs font-bold mb-1.5 uppercase tracking-wider"
            style={{ color: '#7E6851' }}
          >
            Password
          </label>
          <div className="relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5"
              style={{ color: '#7E6851' }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-base transition-all focus:outline-none"
              style={{
                backgroundColor: '#EDE2CE',
                border: '1px solid rgba(126, 104, 81, 0.3)',
                color: '#2D2013',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#C27803';
                e.target.style.boxShadow = '0 0 0 2px rgba(194,120,3,0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(126, 104, 81, 0.3)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #C27803 0%, #D4850A 100%)',
            color: '#FFFFFF',
            boxShadow: '0 4px 20px rgba(194, 120, 3, 0.35)',
          }}
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Signing in...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>Sign in to your Library</span>
              <ArrowRight className="h-5 w-5" />
            </div>
          )}
        </button>
      </form>

      {/* ── Footer note ── */}
      <div className="pb-4 text-center">
        <div
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs"
          style={{
            backgroundColor: 'rgba(126, 104, 81, 0.1)',
            border: '1px solid rgba(126, 104, 81, 0.15)',
            color: '#7E6851',
          }}
        >
          <KeyRound className="h-3.5 w-3.5" style={{ color: '#C27803' }} />
          <span>Uses your Readthrough account credentials</span>
        </div>
      </div>
    </div>
  );
};
