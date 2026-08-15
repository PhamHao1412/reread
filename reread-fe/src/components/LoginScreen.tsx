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
      setError('Vui lòng nhập tên tài khoản (username) và mật khẩu');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full max-w-[420px] md:border-x md:border-purple-primary/20 md:shadow-2xl bg-plum-deep text-white flex flex-col justify-between pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-6 px-6 select-none overflow-y-auto no-scrollbar">
      {/* Brand Icon Header */}
      <div className="pt-4 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-primary/30 to-orange-warm/20 border border-purple-primary/20 shadow-2xl mb-6">
          <BookOpen className="h-10 w-10 text-purple-light" />
        </div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-purple-light via-white to-orange-warm bg-clip-text text-transparent">
          Reread
        </h1>
        <p className="text-sm text-text-secondary mt-2">
          Ứng dụng đọc sách di động cho tài khoản Readthrough
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 my-auto py-6">
        {error && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
            Tên tài khoản (Username)
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nhập username"
              autoCapitalize="none"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-plum-surface border border-purple-primary/10 text-base text-white placeholder-text-muted focus:outline-none focus:border-purple-primary focus:ring-1 focus:ring-purple-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-plum-surface border border-purple-primary/10 text-base text-white placeholder-text-muted focus:outline-none focus:border-purple-primary focus:ring-1 focus:ring-purple-primary transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center py-4 rounded-2xl bg-gradient-to-r from-purple-primary to-purple-light text-white font-bold text-base shadow-[0_4px_20px_rgba(168,47,208,0.4)] hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Đang kết nối...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>Đăng nhập vào Tủ sách</span>
              <ArrowRight className="h-5 w-5" />
            </div>
          )}
        </button>
      </form>

      {/* Info note */}
      <div className="pb-4 text-center">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-plum-surface/40 border border-purple-primary/5 text-text-muted text-xs">
          <KeyRound className="h-3.5 w-3.5 text-purple-light" />
          <span>Sử dụng tài khoản từ hệ thống Readthrough</span>
        </div>
      </div>
    </div>
  );
};
