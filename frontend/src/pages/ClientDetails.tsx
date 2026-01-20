import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { clientsApi } from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Client {
  id: string;
  name: string;
  companyName?: string;
  inn?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalIncome: number;
    profit: number;
    orderDate: string;
  }>;
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalProfit: number;
  };
}

const statusLabels: Record<string, { label: string; class: string }> = {
  NEW: { label: 'Новый', class: 'badge-info' },
  PROCESSING: { label: 'В обработке', class: 'badge-warning' },
  PICKING: { label: 'На сборке', class: 'badge-warning' },
  PACKED: { label: 'Упакован', class: 'badge-info' },
  SHIPPED: { label: 'Отправлен', class: 'badge-info' },
  DELIVERED: { label: 'Доставлен', class: 'badge-success' },
  COMPLETED: { label: 'Выполнен', class: 'badge-success' },
  CANCELLED: { label: 'Отменен', class: 'badge-danger' },
  RETURNED: { label: 'Возврат', class: 'badge-danger' },
};

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
  }, [id]);

  const loadClient = async () => {
    try {
      const response = await clientsApi.getOne(id!);
      setClient(response.data.data);
    } catch (error) {
      toast.error('Ошибка загрузки клиента');
    } finally {
      setLoading(false);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
        <div className="card h-64 skeleton" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-400">Клиент не найден</p>
        <Link to="/clients" className="btn-secondary mt-4">
          <ArrowLeftIcon className="w-4 h-4" />
          К списку клиентов
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/clients" className="btn-icon btn-ghost">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-white">{client.name}</h1>
          <p className="text-surface-400">{client.companyName || 'Информация о клиенте'}</p>
        </div>
        {client.isActive ? (
          <span className="badge-success">Активен</span>
        ) : (
          <span className="badge-neutral">Неактивен</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card text-brand-400">
          <p className="text-surface-400 text-sm">Всего заказов</p>
          <p className="text-2xl font-bold text-white mt-1">{client.stats.totalOrders}</p>
        </div>
        <div className="stat-card text-success-500">
          <p className="text-surface-400 text-sm">Выручка</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(Number(client.stats.totalRevenue))}
          </p>
        </div>
        <div className="stat-card text-purple-400">
          <p className="text-surface-400 text-sm">Прибыль</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(Number(client.stats.totalProfit))}
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Контактная информация</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {client.inn && (
            <div>
              <p className="text-surface-500 text-sm">ИНН</p>
              <p className="text-surface-100 font-mono">{client.inn}</p>
            </div>
          )}
          {client.email && (
            <div>
              <p className="text-surface-500 text-sm">Email</p>
              <p className="text-surface-100">{client.email}</p>
            </div>
          )}
          {client.phone && (
            <div>
              <p className="text-surface-500 text-sm">Телефон</p>
              <p className="text-surface-100">{client.phone}</p>
            </div>
          )}
          {client.address && (
            <div className="md:col-span-2">
              <p className="text-surface-500 text-sm">Адрес</p>
              <p className="text-surface-100">{client.address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Последние заказы</h3>
          <Link to={`/orders?clientId=${client.id}`} className="text-brand-400 text-sm hover:text-brand-300">
            Все заказы →
          </Link>
        </div>

        {client.orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-surface-500">Нет заказов</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Дата</th>
                  <th>Статус</th>
                  <th>Выручка</th>
                  <th>Прибыль</th>
                </tr>
              </thead>
              <tbody>
                {client.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        to={`/orders/${order.id}`}
                        className="font-mono font-medium text-brand-400 hover:text-brand-300"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="text-surface-400">
                      {new Date(order.orderDate).toLocaleDateString('ru-RU')}
                    </td>
                    <td>
                      <span className={statusLabels[order.status]?.class || 'badge-neutral'}>
                        {statusLabels[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="font-mono">{formatCurrency(Number(order.totalIncome))}</td>
                    <td className={`font-mono ${Number(order.profit) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                      {formatCurrency(Number(order.profit))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
