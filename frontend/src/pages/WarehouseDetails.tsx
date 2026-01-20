import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  CubeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';

interface StorageLocation {
  id: string;
  code: string;
  name: string | null;
  type: string;
  status: string;
  zone: string | null;
  row: number | null;
  level: number | null;
  maxVolume: string | null;
  maxWeight: string | null;
  _count?: {
    productStocks: number;
  };
}

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  address: string | null;
  type: string;
  status: string;
  description: string | null;
  locations: StorageLocation[];
  _count: {
    locations: number;
    warehouseTasks: number;
  };
}

interface ProductStock {
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  product: {
    id: string;
    sku: string;
    name: string;
    category: string | null;
  };
  storageLocation: {
    id: string;
    code: string;
    name: string | null;
  };
}

const typeLabels: Record<string, string> = {
  MAIN: 'Основной',
  RETURNS: 'Возвратный',
  QUARANTINE: 'Карантин',
};

const locationTypeLabels: Record<string, string> = {
  SHELF: 'Полка',
  PALLET: 'Паллет',
  BOX: 'Короб',
  FLOOR: 'Пол',
  RACK: 'Стеллаж',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  INACTIVE: 'bg-gray-500/20 text-gray-400',
  FREE: 'bg-emerald-500/20 text-emerald-400',
  OCCUPIED: 'bg-blue-500/20 text-blue-400',
  RESERVED: 'bg-amber-500/20 text-amber-400',
  BLOCKED: 'bg-red-500/20 text-red-400',
};

const statusLabels: Record<string, string> = {
  FREE: 'Свободна',
  OCCUPIED: 'Занята',
  RESERVED: 'Зарезервирована',
  BLOCKED: 'Заблокирована',
};

export default function WarehouseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null);
  const [stocks, setStocks] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'locations' | 'stocks'>('locations');
  const [editMode, setEditMode] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    type: 'MAIN',
    status: 'ACTIVE',
    description: '',
  });

  const [locationForm, setLocationForm] = useState({
    code: '',
    name: '',
    type: 'SHELF',
    status: 'FREE',
    zone: '',
    row: '',
    level: '',
    maxWeight: '',
    maxVolume: '',
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [warehouseRes, stocksRes] = await Promise.all([
        api.get(`/warehouses/${id}`),
        api.get('/products/stocks', { params: { warehouseId: id } }),
      ]);
      
      const wh = warehouseRes.data.data;
      setWarehouse(wh);
      setFormData({
        code: wh.code,
        name: wh.name,
        address: wh.address || '',
        type: wh.type,
        status: wh.status,
        description: wh.description || '',
      });
      setStocks(stocksRes.data.data || []);
    } catch (error) {
      console.error('Error fetching warehouse:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.put(`/warehouses/${id}`, formData);
      setEditMode(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка обновления склада');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить этот склад? Все ячейки и остатки будут удалены!')) return;
    if (!id) return;
    try {
      await api.delete(`/warehouses/${id}`);
      navigate('/warehouse');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка удаления склада');
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const data = {
        ...locationForm,
        warehouseId: id,
        row: locationForm.row ? parseInt(locationForm.row) : null,
        level: locationForm.level ? parseInt(locationForm.level) : null,
        maxWeight: locationForm.maxWeight ? parseFloat(locationForm.maxWeight) : null,
        maxVolume: locationForm.maxVolume ? parseFloat(locationForm.maxVolume) : null,
      };

      if (editingLocation) {
        await api.put(`/warehouses/locations/${editingLocation.id}`, data);
      } else {
        await api.post(`/warehouses/${id}/locations`, data);
      }

      setShowLocationModal(false);
      setEditingLocation(null);
      resetLocationForm();
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка сохранения ячейки');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Удалить эту ячейку?')) return;
    try {
      await api.delete(`/warehouses/locations/${locationId}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка удаления ячейки');
    }
  };

  const openEditLocation = (location: StorageLocation) => {
    setEditingLocation(location);
    setLocationForm({
      code: location.code,
      name: location.name || '',
      type: location.type,
      status: location.status,
      zone: location.zone || '',
      row: location.row?.toString() || '',
      level: location.level?.toString() || '',
      maxWeight: location.maxWeight || '',
      maxVolume: location.maxVolume || '',
    });
    setShowLocationModal(true);
  };

  const resetLocationForm = () => {
    setLocationForm({
      code: '',
      name: '',
      type: 'SHELF',
      status: 'FREE',
      zone: '',
      row: '',
      level: '',
      maxWeight: '',
      maxVolume: '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Склад не найден</p>
        <Link to="/warehouse" className="text-violet-400 hover:underline mt-2 inline-block">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/warehouse"
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Склады
          </Link>
          <span className="text-gray-600">/</span>
          <h1 className="text-2xl font-bold text-white">{warehouse.name}</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[warehouse.status]}`}>
            {warehouse.status === 'ACTIVE' ? 'Активен' : 'Неактивен'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditMode(!editMode)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            {editMode ? 'Отмена' : 'Редактировать'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            Удалить
          </button>
        </div>
      </div>

      {/* Warehouse Info / Edit Form */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        {editMode ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Код склада *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Адрес</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Статус</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="ACTIVE">Активен</option>
                  <option value="INACTIVE">Неактивен</option>
                </select>
              </div>
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
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Сохранить
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <BuildingStorefrontIcon className="w-10 h-10 text-violet-400" />
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">Код</p>
                <p className="text-white font-medium">{warehouse.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Тип</p>
                <p className="text-white font-medium">{typeLabels[warehouse.type]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Адрес</p>
                <p className="text-white font-medium">{warehouse.address || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Ячеек</p>
                <p className="text-white font-medium">{warehouse._count.locations}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Активных задач</p>
                <p className="text-white font-medium">{warehouse._count.warehouseTasks}</p>
              </div>
              {warehouse.description && (
                <div className="col-span-3">
                  <p className="text-sm text-gray-400">Описание</p>
                  <p className="text-white">{warehouse.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            activeTab === 'locations'
              ? 'text-violet-400 border-b-2 border-violet-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <MapPinIcon className="w-5 h-5 inline mr-2" />
          Ячейки хранения ({warehouse.locations?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('stocks')}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            activeTab === 'stocks'
              ? 'text-violet-400 border-b-2 border-violet-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CubeIcon className="w-5 h-5 inline mr-2" />
          Остатки товаров ({stocks.length})
        </button>
      </div>

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Ячейки хранения</h2>
            <button
              onClick={() => {
                resetLocationForm();
                setEditingLocation(null);
                setShowLocationModal(true);
              }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Добавить ячейку
            </button>
          </div>

          {warehouse.locations && warehouse.locations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {warehouse.locations.map((loc) => (
                <div
                  key={loc.id}
                  className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-5 h-5 text-violet-400" />
                      <span className="text-white font-medium">{loc.code}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[loc.status]}`}>
                      {statusLabels[loc.status]}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-400">
                      Тип: <span className="text-white">{locationTypeLabels[loc.type]}</span>
                    </p>
                    {loc.zone && (
                      <p className="text-gray-400">
                        Зона: <span className="text-white">{loc.zone}</span>
                        {loc.row && `, Ряд: ${loc.row}`}
                        {loc.level && `, Уровень: ${loc.level}`}
                      </p>
                    )}
                    {(loc.maxWeight || loc.maxVolume) && (
                      <p className="text-gray-400">
                        {loc.maxWeight && `Макс. вес: ${loc.maxWeight} кг`}
                        {loc.maxWeight && loc.maxVolume && ' • '}
                        {loc.maxVolume && `Объем: ${loc.maxVolume} м³`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
                    <button
                      onClick={() => openEditLocation(loc)}
                      className="flex-1 flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-white py-1.5 rounded-lg text-sm transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="flex items-center justify-center bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <MapPinIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Нет ячеек хранения</p>
              <p className="text-gray-500 text-sm mt-1">Добавьте ячейки для размещения товаров</p>
            </div>
          )}
        </div>
      )}

      {/* Stocks Tab */}
      {activeTab === 'stocks' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Остатки товаров на складе</h2>

          {stocks.length > 0 ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Товар</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Ячейка</th>
                    <th className="text-right p-4 text-gray-400 text-sm font-medium">Количество</th>
                    <th className="text-right p-4 text-gray-400 text-sm font-medium">Резерв</th>
                    <th className="text-right p-4 text-gray-400 text-sm font-medium">Доступно</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {stocks.map((stock) => (
                    <tr key={stock.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <Link
                          to={`/warehouse/products/${stock.product.id}`}
                          className="text-white hover:text-violet-400 font-medium"
                        >
                          {stock.product.name}
                        </Link>
                        <p className="text-sm text-gray-400">{stock.product.sku}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-white">{stock.storageLocation.code}</span>
                        {stock.storageLocation.name && (
                          <span className="text-gray-400"> ({stock.storageLocation.name})</span>
                        )}
                      </td>
                      <td className="p-4 text-right text-white">{stock.quantity}</td>
                      <td className="p-4 text-right text-amber-400">{stock.reservedQty}</td>
                      <td className="p-4 text-right text-emerald-400">{stock.availableQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <CubeIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Нет товаров на этом складе</p>
            </div>
          )}
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {editingLocation ? 'Редактировать ячейку' : 'Новая ячейка'}
              </h2>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setEditingLocation(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleLocationSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Код ячейки *</label>
                  <input
                    type="text"
                    value={locationForm.code}
                    onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="A-01-01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Название</label>
                  <input
                    type="text"
                    value={locationForm.name}
                    onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="Полка 1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Тип</label>
                  <select
                    value={locationForm.type}
                    onChange={(e) => setLocationForm({ ...locationForm, type: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="SHELF">Полка</option>
                    <option value="PALLET">Паллет</option>
                    <option value="BOX">Короб</option>
                    <option value="FLOOR">Пол</option>
                    <option value="RACK">Стеллаж</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Статус</label>
                  <select
                    value={locationForm.status}
                    onChange={(e) => setLocationForm({ ...locationForm, status: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="FREE">Свободна</option>
                    <option value="OCCUPIED">Занята</option>
                    <option value="RESERVED">Зарезервирована</option>
                    <option value="BLOCKED">Заблокирована</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Зона</label>
                  <input
                    type="text"
                    value={locationForm.zone}
                    onChange={(e) => setLocationForm({ ...locationForm, zone: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="A"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ряд</label>
                  <input
                    type="number"
                    value={locationForm.row}
                    onChange={(e) => setLocationForm({ ...locationForm, row: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Уровень</label>
                  <input
                    type="number"
                    value={locationForm.level}
                    onChange={(e) => setLocationForm({ ...locationForm, level: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Макс. вес (кг)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={locationForm.maxWeight}
                    onChange={(e) => setLocationForm({ ...locationForm, maxWeight: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Макс. объем (м³)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={locationForm.maxVolume}
                    onChange={(e) => setLocationForm({ ...locationForm, maxVolume: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="0.5"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLocationModal(false);
                    setEditingLocation(null);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg transition-colors"
                >
                  {editingLocation ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
