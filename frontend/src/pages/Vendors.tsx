import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vendorsApi } from '../lib/api';
import { useIsManager } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Menu } from '@headlessui/react';

interface Vendor {
  id: string;
  name: string;
  legalName?: string;
  inn?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  _count: { services: number };
}

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const isManager = useIsManager();
  
  // Multi-select state
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    loadVendors();
  }, [search, statusFilter]);

  const loadVendors = async () => {
    try {
      const response = await vendorsApi.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setVendors(response.data.data);
    } catch (error) {
      toast.error('Ошибка загрузки поставщиков');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить поставщика?')) return;
    
    try {
      await vendorsApi.delete(id);
      toast.success('Поставщик удален');
      loadVendors();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  // Multi-select handlers
  const toggleSelectVendor = (vendorId: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendorId)) {
      newSelected.delete(vendorId);
    } else {
      newSelected.add(vendorId);
    }
    setSelectedVendors(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedVendors.size === vendors.length) {
      setSelectedVendors(new Set());
    } else {
      setSelectedVendors(new Set(vendors.map(v => v.id)));
    }
  };

  const clearSelection = () => {
    setSelectedVendors(new Set());
  };

  // Bulk actions
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedVendors.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedVendors).map(id => 
        vendorsApi.update(id, { status: newStatus })
      );
      await Promise.all(promises);
      toast.success(`Статус изменен для ${selectedVendors.size} поставщиков`);
      setSelectedVendors(new Set());
      loadVendors();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVendors.size === 0) return;
    if (!confirm(`Удалить ${selectedVendors.size} выбранных поставщиков?`)) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedVendors).map(id => 
        vendorsApi.delete(id)
      );
      await Promise.all(promises);
      toast.success(`Удалено ${selectedVendors.size} поставщиков`);
      setSelectedVendors(new Set());
      loadVendors();
    } catch (error) {
      toast.error('Ошибка удаления поставщиков');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const statusLabels: Record<string, { label: string; class: string }> = {
    ACTIVE: { label: 'Активен', class: 'badge-success' },
    INACTIVE: { label: 'Неактивен', class: 'badge-neutral' },
    SUSPENDED: { label: 'Приостановлен', class: 'badge-warning' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Поставщики</h1>
          <p className="text-surface-400">Управление поставщиками и их услугами</p>
        </div>
        {isManager && (
          <button
            onClick={() => {
              setEditingVendor(null);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <PlusIcon className="w-5 h-5" />
            Добавить поставщика
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            placeholder="Поиск по названию, ИНН..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select w-full sm:w-48"
        >
          <option value="">Все статусы</option>
          <option value="ACTIVE">Активные</option>
          <option value="INACTIVE">Неактивные</option>
          <option value="SUSPENDED">Приостановлены</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedVendors.size > 0 && (
        <div className="card bg-brand-500/10 border-brand-500/30 p-4 flex flex-wrap items-center gap-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-brand-400" />
            <span className="text-brand-300 font-medium">
              Выбрано: {selectedVendors.size}
            </span>
          </div>
          
          <div className="h-6 w-px bg-surface-700" />
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-surface-400 text-sm">Изменить статус:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusChange(e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={bulkActionLoading}
              className="select py-1.5 text-sm w-44"
            >
              <option value="">Выберите...</option>
              <option value="ACTIVE">Активен</option>
              <option value="INACTIVE">Неактивен</option>
              <option value="SUSPENDED">Приостановлен</option>
            </select>
          </div>
          
          <div className="h-6 w-px bg-surface-700" />
          
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

      {/* Select All Checkbox */}
      {isManager && vendors.length > 0 && !loading && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedVendors.size === vendors.length && vendors.length > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
          />
          <span className="text-surface-400 text-sm">
            {selectedVendors.size === vendors.length ? 'Снять выделение со всех' : 'Выбрать все'}
          </span>
        </div>
      )}

      {/* Vendors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 skeleton rounded-2xl" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="card text-center py-12">
          <BuildingStorefrontIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-semibold text-surface-300 mb-2">Нет поставщиков</h3>
          <p className="text-surface-500 mb-4">Добавьте первого поставщика для начала работы</p>
          {isManager && (
            <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" />
              Добавить поставщика
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <div 
              key={vendor.id} 
              className={`card-hover group relative ${selectedVendors.has(vendor.id) ? 'ring-2 ring-brand-500 bg-brand-500/5' : ''}`}
            >
              {isManager && (
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedVendors.has(vendor.id)}
                    onChange={() => toggleSelectVendor(vendor.id)}
                    className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                  />
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3" style={{ marginLeft: isManager ? '28px' : '0' }}>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-success-500/20 flex items-center justify-center">
                    <BuildingStorefrontIcon className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <Link
                      to={`/vendors/${vendor.id}`}
                      className="font-semibold text-surface-100 hover:text-brand-400 transition-colors"
                    >
                      {vendor.name}
                    </Link>
                    <p className="text-xs text-surface-500">{vendor.legalName || 'Без юр. лица'}</p>
                  </div>
                </div>
                
                {isManager && (
                  <Menu as="div" className="relative">
                    <Menu.Button className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-800 hover:text-surface-300 transition-colors opacity-0 group-hover:opacity-100">
                      <EllipsisVerticalIcon className="w-5 h-5" />
                    </Menu.Button>
                    <Menu.Items className="absolute right-0 mt-1 w-40 bg-surface-800 border border-surface-700 rounded-xl shadow-xl overflow-hidden z-10">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => {
                              setEditingVendor(vendor);
                              setShowModal(true);
                            }}
                            className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm ${
                              active ? 'bg-surface-700 text-surface-100' : 'text-surface-300'
                            }`}
                          >
                            <PencilIcon className="w-4 h-4" />
                            Редактировать
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => handleDelete(vendor.id)}
                            className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm ${
                              active ? 'bg-danger-500/10 text-danger-400' : 'text-danger-500'
                            }`}
                          >
                            <TrashIcon className="w-4 h-4" />
                            Удалить
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Menu>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {vendor.inn && (
                  <p className="text-surface-500">
                    ИНН: <span className="text-surface-300 font-mono">{vendor.inn}</span>
                  </p>
                )}
                {vendor.contactName && (
                  <p className="text-surface-500">
                    Контакт: <span className="text-surface-300">{vendor.contactName}</span>
                  </p>
                )}
                {vendor.contactPhone && (
                  <p className="text-surface-500">
                    Телефон: <span className="text-surface-300">{vendor.contactPhone}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-800">
                <span className={statusLabels[vendor.status].class}>
                  {statusLabels[vendor.status].label}
                </span>
                <span className="text-sm text-surface-500">
                  {vendor._count.services} услуг
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <VendorModal
          vendor={editingVendor}
          onClose={() => {
            setShowModal(false);
            setEditingVendor(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingVendor(null);
            loadVendors();
          }}
        />
      )}
    </div>
  );
}

// Vendor Modal Component
function VendorModal({
  vendor,
  onClose,
  onSave,
}: {
  vendor: Vendor | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    legalName: vendor?.legalName || '',
    inn: vendor?.inn || '',
    contactName: vendor?.contactName || '',
    contactPhone: vendor?.contactPhone || '',
    contactEmail: vendor?.contactEmail || '',
    status: vendor?.status || 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Введите название поставщика');
      return;
    }

    setLoading(true);
    try {
      if (vendor) {
        await vendorsApi.update(vendor.id, formData);
        toast.success('Поставщик обновлен');
      } else {
        await vendorsApi.create(formData);
        toast.success('Поставщик создан');
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
            {vendor ? 'Редактировать поставщика' : 'Новый поставщик'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Название *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Склад-Партнер"
            />
          </div>

          <div>
            <label className="label">Юридическое название</label>
            <input
              type="text"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              className="input"
              placeholder='ООО "Склад-Партнер"'
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">ИНН</label>
              <input
                type="text"
                value={formData.inn}
                onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                className="input"
                placeholder="7701234567"
              />
            </div>
            <div>
              <label className="label">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="select"
              >
                <option value="ACTIVE">Активен</option>
                <option value="INACTIVE">Неактивен</option>
                <option value="SUSPENDED">Приостановлен</option>
              </select>
            </div>
          </div>

          <div className="divider" />

          <div>
            <label className="label">Контактное лицо</label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="input"
              placeholder="Иванов Иван"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Телефон</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="input"
                placeholder="+7 (495) 123-45-67"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="input"
                placeholder="contact@vendor.ru"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Сохранение...' : vendor ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
