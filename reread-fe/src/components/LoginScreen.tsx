import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, KeyRound, User as UserIcon, Loader2, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full max-w-[420px] bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col justify-between p-6 select-none overflow-y-auto no-scrollbar">
      {/* Brand Header */}
      <div className="pt-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-xl mb-6 text-[var(--app-accent)]">
          <BookOpen className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--app-text)]">
          ReRead
        </h1>
        <p className="text-xs text-[var(--app-muted)] mt-2 font-medium max-w-[260px] leading-relaxed">
          Không gian đọc sách di động thông minh với chế độ đọc nhanh Readthrough
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4 my-auto py-6">
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--app-text-secondary)] px-1">
            Tên đăng nhập
          </label>
          <div className="relative flex items-center">
            <UserIcon className="absolute left-4 h-5 w-5 text-[var(--app-muted)] pointer-events-none" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username của bạn"
              disabled={loading}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] text-base text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)] transition-all shadow-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--app-text-secondary)] px-1">
            Mật khẩu
          </label>
          <div className="relative flex items-center">
            <KeyRound className="absolute left-4 h-5 w-5 text-[var(--app-muted)] pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] text-base text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)] transition-all shadow-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center py-4 rounded-2xl bg-[var(--app-accent)] text-white font-bold text-base shadow-lg hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Đăng nhập để đọc sách'
          )}
        </button>
      </form>

      {/* Footer Info */}
      <div className="pb-4 text-center">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-muted)] text-xs">
          <KeyRound className="h-3.5 w-3.5 text-[var(--app-accent)]" />
          <span>Sử dụng tài khoản Readthrough đã có của bạn</span>
        </div>
      </div>
    </div>
  );
};
