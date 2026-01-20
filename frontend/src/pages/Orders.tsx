import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ordersApi, clientsApi } from '../lib/api';
import { useIsManager } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  client: { id: string; name: string };
  manager?: { firstName: string; lastName: string };
  totalIncome: number;
  actualCost: number;
  profit: number;
  marginPercent: number;
  orderDate: string;
  _count: { items: number };
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

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [clientFilter, setClientFilter] = useState(searchParams.get('clientId') || '');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const isManager = useIsManager();
  
  // Multi-select state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [search, statusFilter, clientFilter, pagination.page]);

  const loadClients = async () => {
    try {
      const response = await clientsApi.getAll();
      setClients(response.data.data.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await ordersApi.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        clientId: clientFilter || undefined,
        page: pagination.page,
        limit: 20,
      });
      setOrders(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Ошибка загрузки заказов');
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

  // Multi-select handlers
  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  // Bulk actions
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedOrders.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedOrders).map(id => 
        ordersApi.update(id, { status: newStatus })
      );
      await Promise.all(promises);
      toast.success(`Статус изменен для ${selectedOrders.size} заказов`);
      setSelectedOrders(new Set());
      loadOrders();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) return;
    if (!confirm(`Удалить ${selectedOrders.size} выбранных заказов?`)) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedOrders).map(id => 
        ordersApi.delete(id)
      );
      await Promise.all(promises);
      toast.success(`Удалено ${selectedOrders.size} заказов`);
      setSelectedOrders(new Set());
      loadOrders();
    } catch (error) {
      toast.error('Ошибка удаления заказов');
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Заказы</h1>
          <p className="text-surface-400">Управление заказами и операциями</p>
        </div>
        {isManager && (
          <Link to="/orders/new" className="btn-primary">
            <PlusIcon className="w-5 h-5" />
            Создать заказ
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            placeholder="Поиск по номеру заказа..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select w-full sm:w-44"
          >
            <option value="">Все статусы</option>
            {Object.entries(statusLabels).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="select w-full sm:w-48"
          >
            <option value="">Все клиенты</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrders.size > 0 && (
        <div className="card bg-brand-500/10 border-brand-500/30 p-4 flex flex-wrap items-center gap-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-brand-400" />
            <span className="text-brand-300 font-medium">
              Выбрано: {selectedOrders.size}
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
              className="select py-1.5 text-sm w-40"
            >
              <option value="">Выберите...</option>
              {Object.entries(statusLabels).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
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

      {/* Orders Table */}
      {loading ? (
        <div className="card skeleton h-96" />
      ) : orders.length === 0 ? (
        <div className="card text-center py-12">
          <ClipboardDocumentListIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-semibold text-surface-300 mb-2">Нет заказов</h3>
          <p className="text-surface-500 mb-4">Создайте первый заказ для начала работы</p>
          {isManager && (
            <Link to="/orders/new" className="btn-primary mx-auto">
              <PlusIcon className="w-5 h-5" />
              Создать заказ
            </Link>
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
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                      />
                    </th>
                  )}
                  <th>Заказ</th>
                  <th>Клиент</th>
                  <th>Дата</th>
                  <th>Статус</th>
                  <th>Товаров</th>
                  <th>Выручка</th>
                  <th>Себестоимость</th>
                  <th>Прибыль</th>
                  <th>Маржа</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr 
                    key={order.id}
                    className={selectedOrders.has(order.id) ? 'bg-brand-500/10' : ''}
                  >
                    {isManager && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                        />
                      </td>
                    )}
                    <td>
                      <Link
                        to={`/orders/${order.id}`}
                        className="font-mono font-semibold text-brand-400 hover:text-brand-300"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      <Link
                        to={`/clients/${order.client.id}`}
                        className="text-surface-100 hover:text-brand-400"
                      >
                        {order.client.name}
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
                    <td className="text-surface-400">{order._count.items}</td>
                    <td className="font-mono">{formatCurrency(Number(order.totalIncome))}</td>
                    <td className="font-mono text-surface-400">{formatCurrency(Number(order.actualCost))}</td>
                    <td className={`font-mono font-semibold ${Number(order.profit) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                      {formatCurrency(Number(order.profit))}
                    </td>
                    <td>
                      <span className={`font-mono ${Number(order.marginPercent) >= 20 ? 'text-success-400' : Number(order.marginPercent) >= 10 ? 'text-warning-400' : 'text-danger-400'}`}>
                        {Number(order.marginPercent).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800">
              <p className="text-sm text-surface-500">
                Показано {orders.length} из {pagination.total}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setPagination({ ...pagination, page })}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      page === pagination.page
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
