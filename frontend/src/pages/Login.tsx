import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../lib/api';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Заполните все поля');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login(email, password);
      const { token, user } = response.data.data;
      
      login(user, token);
      toast.success(`Добро пожаловать, ${user.firstName}!`);
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Ошибка авторизации';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-success-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-xl shadow-brand-500/25 mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 32 32" fill="currentColor">
              <path d="M5 8h22v3H5zM5 14h16v3H5zM5 20h18v3H5zM5 26h12v3H5z" opacity="0.9"/>
              <circle cx="25" cy="24" r="5" fill="#10b981"/>
              <path d="M23 24l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Fulfillment<span className="text-brand-400">Finance</span>
          </h1>
          <p className="text-surface-400">
            CRM для учета фулфилмент-услуг
          </p>
        </div>

        {/* Login form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin@fulfillment.local"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Вход...
                </div>
              ) : (
                'Войти в систему'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-surface-800">
            <p className="text-xs text-surface-500 text-center mb-3">
              Тестовые учетные записи:
            </p>
            <div className="grid gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@fulfillment.local');
                  setPassword('admin123');
                }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-800/50 hover:bg-surface-800 transition-colors text-left"
              >
                <div>
                  <span className="text-surface-300">admin@fulfillment.local</span>
                  <span className="text-surface-600 mx-2">/</span>
                  <span className="text-surface-400">admin123</span>
                </div>
                <span className="badge-info">Админ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('manager@fulfillment.local');
                  setPassword('manager123');
                }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-800/50 hover:bg-surface-800 transition-colors text-left"
              >
                <div>
                  <span className="text-surface-300">manager@fulfillment.local</span>
                  <span className="text-surface-600 mx-2">/</span>
                  <span className="text-surface-400">manager123</span>
                </div>
                <span className="badge-success">Менеджер</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-surface-600 mt-6">
          FulfillmentFinance CRM v1.0.0
        </p>
      </div>
    </div>
  );
}
