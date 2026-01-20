import { useEffect, useState } from 'react';
import { usersApi } from '../lib/api';
import { useIsAdmin } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'ANALYST';
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

const roleLabels: Record<string, { label: string; class: string }> = {
  ADMIN: { label: 'Администратор', class: 'badge-danger' },
  MANAGER: { label: 'Менеджер', class: 'badge-success' },
  ANALYST: { label: 'Аналитик', class: 'badge-info' },
};

export default function Users() {
  const isAdmin = useIsAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setUsers(response.data.data);
    } catch (error) {
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить пользователя?')) return;

    try {
      await usersApi.delete(id);
      toast.success('Пользователь удален');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Пользователи</h1>
          <p className="text-surface-400">Управление пользователями системы</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowModal(true);
          }}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5" />
          Добавить пользователя
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="card skeleton h-96" />
      ) : users.length === 0 ? (
        <div className="card text-center py-12">
          <UserGroupIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-semibold text-surface-300">Нет пользователей</h3>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Телефон</th>
                  <th>Статус</th>
                  <th>Создан</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-semibold text-surface-100">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="text-surface-400">{user.email}</td>
                    <td>
                      <span className={roleLabels[user.role]?.class || 'badge-neutral'}>
                        {roleLabels[user.role]?.label || user.role}
                      </span>
                    </td>
                    <td className="text-surface-400">{user.phone || '—'}</td>
                    <td>
                      {user.isActive ? (
                        <span className="badge-success">Активен</span>
                      ) : (
                        <span className="badge-neutral">Неактивен</span>
                      )}
                    </td>
                    <td className="text-surface-400">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowModal(true);
                          }}
                          className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-800 hover:text-surface-300"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 rounded-lg text-surface-500 hover:bg-danger-500/10 hover:text-danger-400"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}

function UserModal({
  user,
  onClose,
  onSave,
}: {
  user: User | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    role: user?.role || 'MANAGER',
    phone: user?.phone || '',
    isActive: user?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast.error('Заполните обязательные поля');
      return;
    }

    if (!user && !formData.password) {
      toast.error('Введите пароль');
      return;
    }

    setLoading(true);
    try {
      const data = { ...formData };
      if (!data.password) delete (data as any).password;

      if (user) {
        await usersApi.update(user.id, data);
        toast.success('Пользователь обновлен');
      } else {
        await usersApi.create(data);
        toast.success('Пользователь создан');
      }
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-xl w-full max-w-lg animate-scale-in">
        <div className="p-6 border-b border-surface-800">
          <h2 className="text-xl font-semibold text-white">
            {user ? 'Редактировать пользователя' : 'Новый пользователь'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Имя *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Фамилия *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">{user ? 'Новый пароль' : 'Пароль *'}</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              placeholder={user ? 'Оставьте пустым, чтобы не менять' : ''}
              required={!user}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Роль *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="select"
              >
                <option value="ADMIN">Администратор</option>
                <option value="MANAGER">Менеджер</option>
                <option value="ANALYST">Аналитик</option>
              </select>
            </div>
            <div>
              <label className="label">Телефон</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-surface-300">Пользователь активен</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Сохранение...' : user ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
