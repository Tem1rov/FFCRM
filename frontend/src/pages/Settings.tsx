import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser, useIsManager } from '../store/authStore';
import { authApi } from '../lib/api';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export default function Settings() {
  const user = useUser();
  const isManager = useIsManager();
  const [activeTab, setActiveTab] = useState('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error('Заполните все поля');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success('Пароль успешно изменен');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка изменения пароля');
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    ADMIN: 'Администратор',
    MANAGER: 'Менеджер',
    ANALYST: 'Аналитик',
  };

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: UserCircleIcon },
    { id: 'security', label: 'Безопасность', icon: KeyIcon },
    { id: 'notifications', label: 'Уведомления', icon: BellIcon },
    ...(isManager ? [{ id: 'system', label: 'Система', icon: Cog6ToothIcon }] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Настройки</h1>
        <p className="text-surface-400">Управление профилем и настройками аккаунта</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="card p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-6">Информация профиля</h3>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-success-500 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-white">
                    {user?.firstName} {user?.lastName}
                  </h4>
                  <p className="text-surface-400">{user?.email}</p>
                  <p className="text-sm text-brand-400 mt-1">
                    {user?.role && roleLabels[user.role]}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Имя</label>
                  <input
                    type="text"
                    value={user?.firstName || ''}
                    className="input"
                    disabled
                  />
                </div>
                <div>
                  <label className="label">Фамилия</label>
                  <input
                    type="text"
                    value={user?.lastName || ''}
                    className="input"
                    disabled
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="input"
                    disabled
                  />
                </div>
                <div>
                  <label className="label">Роль</label>
                  <input
                    type="text"
                    value={user?.role ? roleLabels[user.role] : ''}
                    className="input"
                    disabled
                  />
                </div>
              </div>

              <p className="text-surface-500 text-sm mt-6">
                Для изменения данных профиля обратитесь к администратору.
              </p>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-6">Изменение пароля</h3>
              
              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <div>
                  <label className="label">Текущий пароль</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="label">Новый пароль</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="label">Подтвердите новый пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Сохранение...' : 'Изменить пароль'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-6">Настройки уведомлений</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50">
                  <div>
                    <p className="font-medium text-surface-100">Email-уведомления о новых заказах</p>
                    <p className="text-sm text-surface-500">Получать уведомления при создании новых заказов</p>
                  </div>
                  <button className="w-12 h-6 bg-brand-500 rounded-full relative">
                    <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50">
                  <div>
                    <p className="font-medium text-surface-100">Уведомления о платежах</p>
                    <p className="text-sm text-surface-500">Получать уведомления при поступлении оплаты</p>
                  </div>
                  <button className="w-12 h-6 bg-brand-500 rounded-full relative">
                    <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50">
                  <div>
                    <p className="font-medium text-surface-100">Еженедельный отчет</p>
                    <p className="text-sm text-surface-500">Получать сводку по результатам за неделю</p>
                  </div>
                  <button className="w-12 h-6 bg-surface-600 rounded-full relative">
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>
              </div>

              <p className="text-surface-500 text-sm mt-6">
                Настройки уведомлений будут доступны в следующей версии.
              </p>
            </div>
          )}

          {activeTab === 'system' && isManager && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-6">Системные настройки</h3>
              
              <div className="space-y-3">
                <Link
                  to="/settings/expense-templates"
                  className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                      <DocumentDuplicateIcon className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <p className="font-medium text-surface-100">Шаблоны расходов</p>
                      <p className="text-sm text-surface-500">
                        Управление шаблонами для автозаполнения расходов заказа
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-surface-500 group-hover:text-surface-300 transition-colors" />
                </Link>

                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50 opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center">
                      <Cog6ToothIcon className="w-5 h-5 text-surface-500" />
                    </div>
                    <div>
                      <p className="font-medium text-surface-100">Интеграции</p>
                      <p className="text-sm text-surface-500">
                        Настройка интеграций с внешними системами
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-surface-700 text-surface-400">Скоро</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
