import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientsApi } from '../lib/api';
import { useIsManager } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface Client {
  id: string;
  name: string;
  companyName?: string;
  inn?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  _count: { orders: number };
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const isManager = useIsManager();
  
  // Multi-select state
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, [search]);

  const loadClients = async () => {
    try {
      const response = await clientsApi.getAll({ search: search || undefined });
      setClients(response.data.data);
    } catch (error) {
      toast.error('Ошибка загрузки клиентов');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить клиента?')) return;
    
    try {
      await clientsApi.delete(id);
      toast.success('Клиент удален');
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  // Multi-select handlers
  const toggleSelectClient = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(clients.map(c => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedClients(new Set());
  };

  // Bulk actions
  const handleBulkActivate = async (isActive: boolean) => {
    if (selectedClients.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedClients).map(id => 
        clientsApi.update(id, { isActive })
      );
      await Promise.all(promises);
      toast.success(`${isActive ? 'Активировано' : 'Деактивировано'} ${selectedClients.size} клиентов`);
      setSelectedClients(new Set());
      loadClients();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClients.size === 0) return;
    if (!confirm(`Удалить ${selectedClients.size} выбранных клиентов?`)) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedClients).map(id => 
        clientsApi.delete(id)
      );
      await Promise.all(promises);
      toast.success(`Удалено ${selectedClients.size} клиентов`);
      setSelectedClients(new Set());
      loadClients();
    } catch (error) {
      toast.error('Ошибка удаления клиентов');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getSelectedEmails = () => {
    return clients
      .filter(c => selectedClients.has(c.id) && c.email)
      .map(c => c.email)
      .join(', ');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Клиенты</h1>
          <p className="text-surface-400">Управление базой клиентов</p>
        </div>
        {isManager && (
          <button
            onClick={() => {
              setEditingClient(null);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <PlusIcon className="w-5 h-5" />
            Добавить клиента
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
        <input
          type="text"
          placeholder="Поиск по имени, email, ИНН..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Bulk Actions Bar */}
      {selectedClients.size > 0 && (
        <div className="card bg-brand-500/10 border-brand-500/30 p-4 flex flex-wrap items-center gap-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-brand-400" />
            <span className="text-brand-300 font-medium">
              Выбрано: {selectedClients.size}
            </span>
          </div>
          
          <div className="h-6 w-px bg-surface-700" />
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkActivate(true)}
              disabled={bulkActionLoading}
              className="btn-secondary py-1.5 px-3 text-sm"
            >
              <CheckIcon className="w-4 h-4" />
              Активировать
            </button>
            <button
              onClick={() => handleBulkActivate(false)}
              disabled={bulkActionLoading}
              className="btn-secondary py-1.5 px-3 text-sm"
            >
              <XMarkIcon className="w-4 h-4" />
              Деактивировать
            </button>
          </div>
          
          <div className="h-6 w-px bg-surface-700" />
          
          {getSelectedEmails() && (
            <>
              <a
                href={`mailto:${getSelectedEmails()}`}
                className="btn-secondary py-1.5 px-3 text-sm"
              >
                <EnvelopeIcon className="w-4 h-4" />
                Написать письмо
              </a>
              <div className="h-6 w-px bg-surface-700" />
            </>
          )}
          
          <button
            onClick={handleBulkDelete}
            disabled={bulkActionLoading}
            className="btn-danger py-1.5 px-3 text-sm"
          >
            <TrashIcon className="w-4 h-4" />
            Удалить
          </button>
          
          <button
            onClick={clearSelection}
            className="btn-secondary py-1.5 px-3 text-sm ml-auto"
          >
            <XMarkIcon className="w-4 h-4" />
            Отменить выбор
          </button>
          
          {bulkActionLoading && (
            <ArrowPathIcon className="w-5 h-5 text-brand-400 animate-spin" />
          )}
        </div>
      )}

      {/* Clients Table */}
      {loading ? (
        <div className="card skeleton h-96" />
      ) : clients.length === 0 ? (
        <div className="card text-center py-12">
          <UsersIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-semibold text-surface-300 mb-2">Нет клиентов</h3>
          <p className="text-surface-500 mb-4">Добавьте первого клиента для начала работы</p>
          {isManager && (
            <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" />
              Добавить клиента
            </button>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container border-0">
            <table className="table">
              <thead>
                <tr>
                  {isManager && (
                    <th className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedClients.size === clients.length && clients.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                      />
                    </th>
                  )}
                  <th>Клиент</th>
                  <th>Контакты</th>
                  <th>ИНН</th>
                  <th>Заказов</th>
                  <th>Статус</th>
                  {isManager && <th className="w-24"></th>}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr 
                    key={client.id}
                    className={selectedClients.has(client.id) ? 'bg-brand-500/10' : ''}
                  >
                    {isManager && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedClients.has(client.id)}
                          onChange={() => toggleSelectClient(client.id)}
                          className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                        />
                      </td>
                    )}
                    <td>
                      <Link
                        to={`/clients/${client.id}`}
                        className="font-semibold text-surface-100 hover:text-brand-400"
                      >
                        {client.name}
                      </Link>
                      {client.companyName && (
                        <p className="text-xs text-surface-500">{client.companyName}</p>
                      )}
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {client.email && <p className="text-surface-300">{client.email}</p>}
                        {client.phone && <p className="text-surface-500">{client.phone}</p>}
                      </div>
                    </td>
                    <td className="font-mono text-surface-400">{client.inn || '—'}</td>
                    <td>
                      <span className="badge-info">{client._count.orders}</span>
                    </td>
                    <td>
                      {client.isActive ? (
                        <span className="badge-success">Активен</span>
                      ) : (
                        <span className="badge-neutral">Неактивен</span>
                      )}
                    </td>
                    {isManager && (
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingClient(client);
                              setShowModal(true);
                            }}
                            className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-800 hover:text-surface-300"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="p-1.5 rounded-lg text-surface-500 hover:bg-danger-500/10 hover:text-danger-400"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={() => {
            setShowModal(false);
            setEditingClient(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingClient(null);
            loadClients();
          }}
        />
      )}
    </div>
  );
}

// Client Modal Component
function ClientModal({
  client,
  onClose,
  onSave,
}: {
  client: Client | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    companyName: client?.companyName || '',
    inn: client?.inn || '',
    email: client?.email || '',
    phone: client?.phone || '',
    isActive: client?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Введите имя клиента');
      return;
    }

    setLoading(true);
    try {
      if (client) {
        await clientsApi.update(client.id, formData);
        toast.success('Клиент обновлен');
      } else {
        await clientsApi.create(formData);
        toast.success('Клиент создан');
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
            {client ? 'Редактировать клиента' : 'Новый клиент'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Имя / Название *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder='Магазин "Электроника+"'
            />
          </div>

          <div>
            <label className="label">Компания / Юр. лицо</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="input"
              placeholder="ИП Петров А.А."
            />
          </div>

          <div>
            <label className="label">ИНН</label>
            <input
              type="text"
              value={formData.inn}
              onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
              className="input"
              placeholder="771234567890"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label className="label">Телефон</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                placeholder="+7 (495) 123-45-67"
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
            <label htmlFor="isActive" className="text-surface-300">Клиент активен</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Сохранение...' : client ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
