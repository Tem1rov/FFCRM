import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsApi, ordersApi } from '../lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  weight: number;
  volume: number;
  unitCost: number;
  unitPrice: number;
}

interface Client {
  id: string;
  name: string;
  companyName?: string;
}

export default function CreateOrder() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { id: '1', sku: '', name: '', quantity: 1, weight: 0, volume: 0, unitCost: 0, unitPrice: 0 },
  ]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await clientsApi.getAll({ isActive: true });
      setClients(response.data.data);
    } catch (error) {
      toast.error('Ошибка загрузки клиентов');
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        sku: '',
        name: '',
        quantity: 1,
        weight: 0,
        volume: 0,
        unitCost: 0,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateTotals = () => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const totalVolume = items.reduce((sum, item) => sum + item.volume * item.quantity, 0);
    return { totalItems, totalWeight, totalVolume };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      toast.error('Выберите клиента');
      return;
    }

    if (items.every((item) => !item.name)) {
      toast.error('Добавьте хотя бы один товар');
      return;
    }

    setLoading(true);
    try {
      const response = await ordersApi.create({
        clientId: selectedClient,
        items: items.filter((item) => item.name),
        shippingAddress,
        notes,
      });
      
      toast.success('Заказ создан');
      navigate(`/orders/${response.data.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка создания заказа');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/orders')} className="btn-icon btn-ghost">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Новый заказ</h1>
          <p className="text-surface-400">Создание заказа с автоматическим расчетом себестоимости</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Клиент</h3>
          <div className="max-w-md">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="select"
              required
            >
              <option value="">Выберите клиента</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.companyName && `(${client.companyName})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Order Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Товары</h3>
            <button type="button" onClick={addItem} className="btn-secondary">
              <PlusIcon className="w-4 h-4" />
              Добавить товар
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-surface-800/50 border border-surface-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-surface-400">
                    Товар #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg text-surface-500 hover:bg-danger-500/10 hover:text-danger-400"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <label className="label">Название *</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      className="input"
                      placeholder="Название товара"
                    />
                  </div>
                  <div>
                    <label className="label">Артикул (SKU)</label>
                    <input
                      type="text"
                      value={item.sku}
                      onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                      className="input"
                      placeholder="ABC-123"
                    />
                  </div>
                  <div>
                    <label className="label">Количество *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Вес (кг)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.weight}
                      onChange={(e) => updateItem(item.id, 'weight', parseFloat(e.target.value) || 0)}
                      className="input"
                      placeholder="0.5"
                    />
                  </div>
                  <div>
                    <label className="label">Объем (м³)</label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      value={item.volume}
                      onChange={(e) => updateItem(item.id, 'volume', parseFloat(e.target.value) || 0)}
                      className="input"
                      placeholder="0.001"
                    />
                  </div>
                  <div>
                    <label className="label">Себестоимость (₽)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="input"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="label">Цена продажи (₽)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="input"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="mt-4 pt-4 border-t border-surface-700 flex flex-wrap gap-6">
            <div>
              <span className="text-surface-500 text-sm">Всего товаров:</span>
              <span className="ml-2 font-semibold text-surface-100">{totals.totalItems} шт.</span>
            </div>
            <div>
              <span className="text-surface-500 text-sm">Общий вес:</span>
              <span className="ml-2 font-semibold text-surface-100">{totals.totalWeight.toFixed(3)} кг</span>
            </div>
            <div>
              <span className="text-surface-500 text-sm">Общий объем:</span>
              <span className="ml-2 font-semibold text-surface-100">{totals.totalVolume.toFixed(6)} м³</span>
            </div>
          </div>
        </div>

        {/* Shipping & Notes */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Доставка и примечания</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Адрес доставки</label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="input"
                placeholder="г. Москва, ул. Примерная, д. 1, кв. 10"
              />
            </div>
            <div>
              <label className="label">Примечания</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder="Дополнительная информация о заказе..."
              />
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="card bg-brand-500/10 border-brand-500/20">
          <p className="text-brand-300 text-sm">
            💡 После создания заказа система автоматически рассчитает себестоимость на основе
            активных услуг поставщиков и характеристик товаров (вес, объем).
          </p>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="btn-secondary"
          >
            Отмена
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Создание...' : 'Создать заказ'}
          </button>
        </div>
      </form>
    </div>
  );
}
