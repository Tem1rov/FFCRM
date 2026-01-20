import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingStorefrontIcon,
  PlusIcon,
  CubeIcon,
  MapPinIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  type: string;
  status: string;
  description: string | null;
  _count: {
    locations: number;
    warehouseTasks: number;
  };
}

interface WarehouseStats {
  totalWarehouses: number;
  totalLocations: number;
  occupiedLocations: number;
  totalProducts: number;
  lowStockProducts: number;
  pendingTasks: number;
}

const typeLabels: Record<string, string> = {
  MAIN: 'Основной',
  RETURNS: 'Возвратный',
  QUARANTINE: 'Карантин',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  INACTIVE: 'bg-gray-500/20 text-gray-400',
};

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    type: 'MAIN',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [warehousesRes, productsRes, tasksRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/products'),
        api.get('/warehouse-tasks', { params: { status: 'NEW' } }),
      ]);

      const wh = warehousesRes.data.data;
      setWarehouses(wh);

      const products = productsRes.data.data;
      const tasks = tasksRes.data.data;

      const totalLocations = wh.reduce((sum: number, w: Warehouse) => sum + w._count.locations, 0);
      
      setStats({
        totalWarehouses: wh.length,
        totalLocations,
        occupiedLocations: 0, // Would need additional API call
        totalProducts: products.length,
        lowStockProducts: products.filter((p: any) => p.totalAvailable < p.minStock).length,
        pendingTasks: tasks.length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/warehouses', formData);
      setShowCreateModal(false);
      setFormData({ code: '', name: '', address: '', type: 'MAIN', description: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка создания склада');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Склады</h1>
          <p className="text-gray-400 mt-1">Управление складами и ячейками хранения</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Добавить склад
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <BuildingStorefrontIcon className="w-8 h-8 text-violet-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalWarehouses}</p>
            <p className="text-sm text-gray-400">Складов</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <MapPinIcon className="w-8 h-8 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalLocations}</p>
            <p className="text-sm text-gray-400">Ячеек</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <CubeIcon className="w-8 h-8 text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalProducts}</p>
            <p className="text-sm text-gray-400">Товаров</p>
          </div>
          <Link 
            to="/warehouse/products?lowStock=true"
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-amber-500/50 transition-colors"
          >
            <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center mb-2">
              <span className="text-amber-400 text-lg">!</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.lowStockProducts}</p>
            <p className="text-sm text-gray-400">Мало на складе</p>
          </Link>
          <Link 
            to="/warehouse/tasks?status=NEW"
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-violet-500/50 transition-colors"
          >
            <div className="w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center mb-2">
              <span className="text-violet-400 text-lg">{stats.pendingTasks}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.pendingTasks}</p>
            <p className="text-sm text-gray-400">Новых задач</p>
          </Link>
          <Link 
            to="/warehouse/movements"
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-cyan-500/50 transition-colors"
          >
            <ArrowPathIcon className="w-8 h-8 text-cyan-400 mb-2" />
            <p className="text-sm text-gray-400 mt-4">Движения товаров</p>
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/warehouse/products"
          className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-xl p-5 hover:border-violet-400/50 transition-colors group"
        >
          <CubeIcon className="w-10 h-10 text-violet-400 mb-3" />
          <h3 className="text-lg font-semibold text-white">Товары</h3>
          <p className="text-sm text-gray-400 mt-1">Справочник товаров и остатки</p>
          <ChevronRightIcon className="w-5 h-5 text-violet-400 mt-3 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/warehouse/tasks"
          className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-5 hover:border-blue-400/50 transition-colors group"
        >
          <svg className="w-10 h-10 text-blue-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Задачи</h3>
          <p className="text-sm text-gray-400 mt-1">Приемка, сборка, отгрузка</p>
          <ChevronRightIcon className="w-5 h-5 text-blue-400 mt-3 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/warehouse/movements"
          className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl p-5 hover:border-emerald-400/50 transition-colors group"
        >
          <ArrowPathIcon className="w-10 h-10 text-emerald-400 mb-3" />
          <h3 className="text-lg font-semibold text-white">Движения</h3>
          <p className="text-sm text-gray-400 mt-1">История операций</p>
          <ChevronRightIcon className="w-5 h-5 text-emerald-400 mt-3 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/warehouse/tasks"
          className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-5 hover:border-amber-400/50 transition-colors group"
        >
          <svg className="w-10 h-10 text-amber-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Инвентаризация</h3>
          <p className="text-sm text-gray-400 mt-1">Задачи и проверка остатков</p>
          <ChevronRightIcon className="w-5 h-5 text-amber-400 mt-3 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Warehouses List */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white">Список складов</h2>
        </div>
        <div className="divide-y divide-slate-700/50">
          {warehouses.map((warehouse) => (
            <Link
              key={warehouse.id}
              to={`/warehouse/${warehouse.id}`}
              className="flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <BuildingStorefrontIcon className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{warehouse.code}</span>
                    <h3 className="text-white font-medium">{warehouse.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[warehouse.status]}`}>
                      {warehouse.status === 'ACTIVE' ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                    <span>{typeLabels[warehouse.type]}</span>
                    {warehouse.address && <span>• {warehouse.address}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">{warehouse._count.locations}</p>
                  <p className="text-xs text-gray-400">ячеек</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">{warehouse._count.warehouseTasks}</p>
                  <p className="text-xs text-gray-400">задач</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))}
          {warehouses.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              Нет складов. Создайте первый склад.
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Новый склад</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Код склада *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="WH-03"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Тип</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="MAIN">Основной</option>
                    <option value="RETURNS">Возвратный</option>
                    <option value="QUARANTINE">Карантин</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Склад №3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Адрес</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="г. Москва, ул. ..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg transition-colors"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
