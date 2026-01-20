import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { vendorsApi, vendorServicesApi } from '../lib/api';
import { useIsManager } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface VendorService {
  id: string;
  name: string;
  type: string;
  unit: string;
  price: number;
  currency: string;
  isActive: boolean;
  validFrom: string;
  priceHistory?: Array<{
    id: string;
    oldPrice: number;
    newPrice: number;
    changedAt: string;
  }>;
}

interface Vendor {
  id: string;
  name: string;
  legalName?: string;
  inn?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  status: string;
  services: VendorService[];
}

const typeLabels: Record<string, string> = {
  STORAGE: 'Хранение',
  PICKING: 'Комплектация',
  PACKING: 'Упаковка',
  SHIPPING: 'Доставка',
  RECEIVING: 'Приемка',
  LABELING: 'Маркировка',
  RETURNS: 'Возвраты',
  OTHER: 'Прочее',
};

const unitLabels: Record<string, string> = {
  PIECE: 'шт.',
  KG: 'кг',
  CUBIC_METER: 'м³',
  ORDER: 'заказ',
  PALLET: 'паллета',
  DAY: 'день',
  MONTH: 'месяц',
};

export default function VendorDetails() {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<VendorService | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const isManager = useIsManager();

  useEffect(() => {
    loadVendor();
  }, [id]);

  const loadVendor = async () => {
    try {
      const response = await vendorsApi.getOne(id!);
      setVendor(response.data.data);
    } catch (error) {
      toast.error('Ошибка загрузки поставщика');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Удалить услугу?')) return;
    
    try {
      await vendorServicesApi.delete(serviceId);
      toast.success('Услуга удалена');
      loadVendor();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await vendorServicesApi.import(id!, file);
      toast.success(response.data.message);
      loadVendor();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка импорта');
    }
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 skeleton rounded" />
        <div className="card h-48 skeleton" />
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-400">Поставщик не найден</p>
        <Link to="/vendors" className="btn-secondary mt-4">
          <ArrowLeftIcon className="w-4 h-4" />
          К списку поставщиков
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/vendors" className="btn-icon btn-ghost">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-white">{vendor.name}</h1>
          <p className="text-surface-400">{vendor.legalName || 'Информация о поставщике'}</p>
        </div>
      </div>

      {/* Vendor Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Контактная информация</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendor.inn && (
            <div>
              <p className="text-surface-500 text-sm">ИНН</p>
              <p className="text-surface-100 font-mono">{vendor.inn}</p>
            </div>
          )}
          {vendor.contactName && (
            <div>
              <p className="text-surface-500 text-sm">Контактное лицо</p>
              <p className="text-surface-100">{vendor.contactName}</p>
            </div>
          )}
          {vendor.contactPhone && (
            <div>
              <p className="text-surface-500 text-sm">Телефон</p>
              <p className="text-surface-100">{vendor.contactPhone}</p>
            </div>
          )}
          {vendor.contactEmail && (
            <div>
              <p className="text-surface-500 text-sm">Email</p>
              <p className="text-surface-100">{vendor.contactEmail}</p>
            </div>
          )}
          {vendor.address && (
            <div className="md:col-span-2">
              <p className="text-surface-500 text-sm">Адрес</p>
              <p className="text-surface-100">{vendor.address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Services */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Услуги и цены</h3>
          {isManager && (
            <div className="flex items-center gap-2">
              <label className="btn-secondary cursor-pointer">
                <ArrowUpTrayIcon className="w-4 h-4" />
                Импорт
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => {
                  setEditingService(null);
                  setShowServiceModal(true);
                }}
                className="btn-primary"
              >
                <PlusIcon className="w-4 h-4" />
                Добавить услугу
              </button>
            </div>
          )}
        </div>

        {vendor.services.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-surface-500">Нет добавленных услуг</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Услуга</th>
                  <th>Тип</th>
                  <th>Ед. изм.</th>
                  <th>Цена</th>
                  <th>Действует с</th>
                  <th>Статус</th>
                  {isManager && <th className="w-20"></th>}
                </tr>
              </thead>
              <tbody>
                {vendor.services.map((service) => (
                  <tr key={service.id}>
                    <td className="font-medium text-surface-100">{service.name}</td>
                    <td>
                      <span className="badge-info">{typeLabels[service.type]}</span>
                    </td>
                    <td className="text-surface-400">{unitLabels[service.unit]}</td>
                    <td className="font-mono font-semibold text-surface-100">
                      {Number(service.price).toLocaleString('ru-RU')} {service.currency}
                    </td>
                    <td className="text-surface-400">
                      {new Date(service.validFrom).toLocaleDateString('ru-RU')}
                    </td>
                    <td>
                      {service.isActive ? (
                        <span className="badge-success">Активна</span>
                      ) : (
                        <span className="badge-neutral">Неактивна</span>
                      )}
                    </td>
                    {isManager && (
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowHistory(showHistory === service.id ? null : service.id)}
                            className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-800 hover:text-surface-300"
                            title="История цен"
                          >
                            <ClockIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingService(service);
                              setShowServiceModal(true);
                            }}
                            className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-800 hover:text-surface-300"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
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
        )}
      </div>

      {/* Service Modal */}
      {showServiceModal && (
        <ServiceModal
          vendorId={vendor.id}
          service={editingService}
          onClose={() => {
            setShowServiceModal(false);
            setEditingService(null);
          }}
          onSave={() => {
            setShowServiceModal(false);
            setEditingService(null);
            loadVendor();
          }}
        />
      )}
    </div>
  );
}

// Service Modal Component
function ServiceModal({
  vendorId,
  service,
  onClose,
  onSave,
}: {
  vendorId: string;
  service: VendorService | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    vendorId,
    name: service?.name || '',
    type: service?.type || 'OTHER',
    unit: service?.unit || 'PIECE',
    price: service?.price?.toString() || '',
    currency: service?.currency || 'RUB',
    isActive: service?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast.error('Заполните обязательные поля');
      return;
    }

    setLoading(true);
    try {
      const data = { ...formData, price: parseFloat(formData.price) };
      
      if (service) {
        await vendorServicesApi.update(service.id, data);
        toast.success('Услуга обновлена');
      } else {
        await vendorServicesApi.create(data);
        toast.success('Услуга создана');
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
            {service ? 'Редактировать услугу' : 'Новая услуга'}
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
              placeholder="Комплектация заказа"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Тип услуги *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="select"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Единица измерения *</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="select"
              >
                {Object.entries(unitLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Цена *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input"
                placeholder="100.00"
              />
            </div>
            <div>
              <label className="label">Валюта</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="select"
              >
                <option value="RUB">RUB (₽)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
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
            <label htmlFor="isActive" className="text-surface-300">Услуга активна</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Сохранение...' : service ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
