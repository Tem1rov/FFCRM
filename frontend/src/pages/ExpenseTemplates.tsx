import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, vendorServicesApi } from '../lib/api';
import { useIsManager } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface ExpenseTemplate {
  id: string;
  name: string;
  description?: string;
  productCategory?: string;
  minWeight?: number;
  maxWeight?: number;
  deliveryMethod?: string;
  region?: string;
  isActive: boolean;
  items: ExpenseTemplateItem[];
}

interface ExpenseTemplateItem {
  id: string;
  category: string;
  subcategory?: string;
  description: string;
  vendorServiceId?: string;
  vendorService?: {
    id: string;
    name: string;
    price: number;
    unit: string;
    vendor: { id: string; name: string };
  };
  unit: string;
  defaultQuantity: number;
  defaultPrice: number;
  quantityFormula?: string;
  isRequired: boolean;
  sortOrder: number;
}

const categoryLabels: Record<string, { name: string; color: string }> = {
  PACKAGING: { name: 'Упаковка', color: 'bg-blue-500' },
  LABOR: { name: 'ФОТ', color: 'bg-purple-500' },
  RENT: { name: 'Аренда', color: 'bg-orange-500' },
  LOGISTICS: { name: 'Логистика', color: 'bg-green-500' },
  MATERIALS: { name: 'Материалы', color: 'bg-cyan-500' },
  OTHER: { name: 'Прочее', color: 'bg-gray-500' },
};

const unitLabels: Record<string, string> = {
  PIECE: 'шт.',
  KG: 'кг',
  CUBIC_METER: 'м³',
  ORDER: 'заказ',
  PALLET: 'палета',
  DAY: 'день',
  MONTH: 'месяц',
  HOUR: 'час',
};

export default function ExpenseTemplates() {
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const isManager = useIsManager();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await api.get('/expense-templates');
      setTemplates(response.data.data);
    } catch (error) {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот шаблон?')) return;
    
    try {
      await api.delete(`/expense-templates/${id}`);
      toast.success('Шаблон удален');
      loadTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка удаления');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 skeleton rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link to="/settings" className="btn-icon btn-ghost">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-white">
            Шаблоны расходов
          </h1>
          <p className="text-surface-400">
            Управление шаблонами для автоматического заполнения расходов заказа
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <PlusIcon className="w-5 h-5" />
            Создать шаблон
          </button>
        )}
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <DocumentDuplicateIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <p className="text-surface-400 mb-4">Нет шаблонов расходов</p>
          {isManager && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <PlusIcon className="w-4 h-4" />
              Создать первый шаблон
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const totalEstimate = template.items.reduce(
              (sum, item) => sum + Number(item.defaultQuantity) * Number(item.defaultPrice),
              0
            );

            return (
              <div key={template.id} className="card-hover group">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-surface-400 mt-1">{template.description}</p>
                    )}
                  </div>
                  {isManager && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowModal(true);
                        }}
                        className="p-2 text-surface-400 hover:text-brand-400 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-surface-400 hover:text-danger-400 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Conditions */}
                {(template.productCategory || template.deliveryMethod || template.region) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.productCategory && (
                      <span className="text-xs px-2 py-1 rounded bg-surface-700 text-surface-300">
                        Категория: {template.productCategory}
                      </span>
                    )}
                    {template.deliveryMethod && (
                      <span className="text-xs px-2 py-1 rounded bg-surface-700 text-surface-300">
                        Доставка: {template.deliveryMethod}
                      </span>
                    )}
                    {template.region && (
                      <span className="text-xs px-2 py-1 rounded bg-surface-700 text-surface-300">
                        Регион: {template.region}
                      </span>
                    )}
                  </div>
                )}

                {/* Items Preview */}
                <div className="space-y-2 mb-4">
                  {template.items.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${categoryLabels[item.category]?.color || 'bg-gray-500'}`} />
                        <span className="text-surface-300 truncate max-w-[150px]">{item.description}</span>
                      </div>
                      <span className="text-surface-400 font-mono">
                        {formatCurrency(Number(item.defaultQuantity) * Number(item.defaultPrice))}
                      </span>
                    </div>
                  ))}
                  {template.items.length > 4 && (
                    <p className="text-xs text-surface-500">
                      +{template.items.length - 4} ещё...
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-surface-800 flex items-center justify-between">
                  <span className="text-sm text-surface-400">
                    {template.items.length} позиций
                  </span>
                  <span className="font-mono font-semibold text-brand-400">
                    ~{formatCurrency(totalEstimate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}

function TemplateModal({
  template,
  onClose,
  onSave,
}: {
  template: ExpenseTemplate | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [productCategory, setProductCategory] = useState(template?.productCategory || '');
  const [deliveryMethod, setDeliveryMethod] = useState(template?.deliveryMethod || '');
  const [region, setRegion] = useState(template?.region || '');
  const [items, setItems] = useState<Omit<ExpenseTemplateItem, 'id'>[]>(
    template?.items.map(({ id, ...rest }) => rest) || []
  );
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await vendorServicesApi.getAll();
      setServices(response.data.data);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        category: 'OTHER',
        description: '',
        unit: 'PIECE',
        defaultQuantity: 1,
        defaultPrice: 0,
        isRequired: true,
        sortOrder: items.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleServiceSelect = (index: number, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      updateItem(index, 'vendorServiceId', serviceId);
      updateItem(index, 'description', service.name);
      updateItem(index, 'unit', service.unit);
      updateItem(index, 'defaultPrice', service.price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      toast.error('Введите название шаблона');
      return;
    }

    if (items.length === 0) {
      toast.error('Добавьте хотя бы одну позицию');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name,
        description: description || undefined,
        productCategory: productCategory || undefined,
        deliveryMethod: deliveryMethod || undefined,
        region: region || undefined,
        items: items.map((item, index) => ({
          ...item,
          sortOrder: index,
        })),
      };

      if (template) {
        await api.put(`/expense-templates/${template.id}`, data);
        toast.success('Шаблон обновлен');
      } else {
        await api.post('/expense-templates', data);
        toast.success('Шаблон создан');
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
      <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="p-6 border-b border-surface-800">
          <h2 className="text-xl font-semibold text-white">
            {template ? 'Редактировать шаблон' : 'Создать шаблон'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Название шаблона *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Например: Стандартный заказ"
                required
              />
            </div>
            <div>
              <label className="label">Описание</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                placeholder="Краткое описание..."
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="p-4 rounded-xl bg-surface-800/50 space-y-4">
            <p className="text-sm font-medium text-surface-300">Условия применения (опционально)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Категория товаров</label>
                <input
                  type="text"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="input"
                  placeholder="Одежда, Электроника..."
                />
              </div>
              <div>
                <label className="label">Способ доставки</label>
                <input
                  type="text"
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="input"
                  placeholder="Курьер, Самовывоз..."
                />
              </div>
              <div>
                <label className="label">Регион</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="input"
                  placeholder="Москва, Регионы..."
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">Позиции расходов</label>
              <button type="button" onClick={addItem} className="btn-secondary text-sm">
                <PlusIcon className="w-4 h-4" />
                Добавить позицию
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="p-4 rounded-xl bg-surface-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-400">Позиция {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 text-danger-400 hover:text-danger-300"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="label text-xs">Категория</label>
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(index, 'category', e.target.value)}
                        className="select"
                      >
                        {Object.entries(categoryLabels).map(([key, { name }]) => (
                          <option key={key} value={key}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="label text-xs">Услуга из базы (опционально)</label>
                      <select
                        value={item.vendorServiceId || ''}
                        onChange={(e) => handleServiceSelect(index, e.target.value)}
                        className="select"
                      >
                        <option value="">Выбрать услугу...</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.vendor?.name}: {s.name} - {s.price} ₽/{unitLabels[s.unit] || s.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="label text-xs">Описание *</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="input"
                        placeholder="Название расхода"
                        required
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Количество</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.defaultQuantity}
                        onChange={(e) => updateItem(index, 'defaultQuantity', parseFloat(e.target.value) || 0)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Цена за ед.</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.defaultPrice}
                        onChange={(e) => updateItem(index, 'defaultPrice', parseFloat(e.target.value) || 0)}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={item.isRequired}
                        onChange={(e) => updateItem(index, 'isRequired', e.target.checked)}
                        className="checkbox"
                      />
                      <label htmlFor={`required-${index}`} className="text-sm text-surface-300">
                        Обязательный
                      </label>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.quantityFormula || ''}
                        onChange={(e) => updateItem(index, 'quantityFormula', e.target.value)}
                        className="input text-xs"
                        placeholder="Формула кол-ва: itemsCount * 2, totalWeight / 10"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 text-surface-500">
                  Нет позиций. Нажмите "Добавить позицию" для начала.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Сохранение...' : template ? 'Сохранить' : 'Создать шаблон'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
