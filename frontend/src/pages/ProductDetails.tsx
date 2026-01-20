import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CubeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';

interface ProductStock {
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  status: string;
  batchNumber: string | null;
  storageLocation: {
    id: string;
    code: string;
    name: string | null;
    warehouse: {
      id: string;
      name: string;
      code: string;
    };
  };
}

interface StockMovement {
  id: string;
  quantity: number;
  movementType: string;
  reason: string | null;
  createdAt: string;
  fromLocation: { code: string; warehouse: { name: string } } | null;
  toLocation: { code: string; warehouse: { name: string } } | null;
}

interface ProductData {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unitWeight: string;
  unitVolume: string;
  unitCost: string;
  unitPrice: string;
  imageUrl: string | null;
  minStock: number;
  isActive: boolean;
  stocks: ProductStock[];
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  locations: { id: string; code: string; name: string | null }[];
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500/20 text-emerald-400',
  RESERVED: 'bg-amber-500/20 text-amber-400',
  BLOCKED: 'bg-red-500/20 text-red-400',
  DEFECT: 'bg-gray-500/20 text-gray-400',
};

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Доступен',
  RESERVED: 'Зарезервирован',
  BLOCKED: 'Заблокирован',
  DEFECT: 'Брак',
};

const movementTypeLabels: Record<string, string> = {
  INBOUND: 'Приход',
  OUTBOUND: 'Расход',
  TRANSFER: 'Перемещение',
  ADJUSTMENT: 'Корректировка',
  WRITE_OFF: 'Списание',
};

const movementTypeColors: Record<string, string> = {
  INBOUND: 'text-emerald-400',
  OUTBOUND: 'text-red-400',
  TRANSFER: 'text-blue-400',
  ADJUSTMENT: 'text-amber-400',
  WRITE_OFF: 'text-gray-400',
};

const categories = ['Электроника', 'Одежда', 'Книги', 'Игрушки', 'Продукты', 'Косметика', 'Другое'];

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stocks' | 'movements'>('stocks');
  const [editMode, setEditMode] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category: '',
    unitWeight: '',
    unitVolume: '',
    unitCost: '',
    unitPrice: '',
    minStock: 5,
    isActive: true,
  });

  const [stockForm, setStockForm] = useState({
    warehouseId: '',
    locationId: '',
    quantity: '',
    batchNumber: '',
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [productRes, movementsRes, warehousesRes] = await Promise.all([
        api.get(`/products/${id}`),
        api.get('/stock-movements', { params: { productId: id, limit: 20 } }),
        api.get('/warehouses'),
      ]);
      
      const prod = productRes.data.data;
      setProduct(prod);
      setFormData({
        sku: prod.sku,
        barcode: prod.barcode || '',
        name: prod.name,
        description: prod.description || '',
        category: prod.category || '',
        unitWeight: prod.unitWeight || '',
        unitVolume: prod.unitVolume || '',
        unitCost: prod.unitCost || '',
        unitPrice: prod.unitPrice || '',
        minStock: prod.minStock || 5,
        isActive: prod.isActive,
      });
      setMovements(movementsRes.data.data || []);
      setWarehouses(warehousesRes.data.data || []);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.put(`/products/${id}`, {
        ...formData,
        unitWeight: formData.unitWeight ? parseFloat(formData.unitWeight) : 0,
        unitVolume: formData.unitVolume ? parseFloat(formData.unitVolume) : 0,
        unitCost: formData.unitCost ? parseFloat(formData.unitCost) : 0,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : 0,
      });
      setEditMode(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка обновления товара');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить этот товар? Все остатки будут удалены!')) return;
    if (!id) return;
    try {
      await api.delete(`/products/${id}`);
      navigate('/warehouse/products');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка удаления товара');
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.post('/stock-movements', {
        productId: id,
        toLocationId: stockForm.locationId,
        quantity: parseInt(stockForm.quantity),
        movementType: 'INBOUND',
        batchNumber: stockForm.batchNumber || null,
        reason: 'Приход товара',
      });
      setShowStockModal(false);
      setStockForm({ warehouseId: '', locationId: '', quantity: '', batchNumber: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка добавления остатка');
    }
  };

  const selectedWarehouse = warehouses.find(w => w.id === stockForm.warehouseId);

  // Calculate totals
  const totalQuantity = product?.stocks?.reduce((sum, s) => sum + s.quantity, 0) || 0;
  const totalReserved = product?.stocks?.reduce((sum, s) => sum + s.reservedQty, 0) || 0;
  const totalAvailable = product?.stocks?.reduce((sum, s) => sum + s.availableQty, 0) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Товар не найден</p>
        <Link to="/warehouse/products" className="text-violet-400 hover:underline mt-2 inline-block">
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
            to="/warehouse/products"
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Товары
          </Link>
          <span className="text-gray-600">/</span>
          <h1 className="text-2xl font-bold text-white">{product.name}</h1>
          {!product.isActive && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
              Неактивен
            </span>
          )}
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

      {/* Product Info / Edit Form */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        {editMode ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Артикул (SKU) *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Штрихкод</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Категория</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Без категории</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
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
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Вес (кг)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.unitWeight}
                  onChange={(e) => setFormData({ ...formData, unitWeight: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Объем (м³)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.unitVolume}
                  onChange={(e) => setFormData({ ...formData, unitVolume: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Себестоимость (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unitCost}
                  onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Цена продажи (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Мин. остаток</label>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-violet-500 bg-slate-700 border-slate-600 rounded"
                />
                <label htmlFor="isActive" className="text-white">Активен</label>
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
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <CubeIcon className="w-10 h-10 text-violet-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-400">Артикул</p>
                  <p className="text-white font-medium">{product.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Штрихкод</p>
                  <p className="text-white font-medium">{product.barcode || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Категория</p>
                  <p className="text-white font-medium">{product.category || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Вес</p>
                  <p className="text-white font-medium">{product.unitWeight} кг</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Себестоимость</p>
                  <p className="text-white font-medium">{parseFloat(product.unitCost).toLocaleString('ru-RU')} ₽</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Цена продажи</p>
                  <p className="text-white font-medium">{parseFloat(product.unitPrice).toLocaleString('ru-RU')} ₽</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Мин. остаток</p>
                  <p className="text-white font-medium">{product.minStock} шт.</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Маржа</p>
                  <p className="text-emerald-400 font-medium">
                    {((parseFloat(product.unitPrice) - parseFloat(product.unitCost)) / parseFloat(product.unitPrice) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              {product.description && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-sm text-gray-400">Описание</p>
                  <p className="text-white">{product.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stock Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <p className="text-sm text-gray-400">На складе</p>
          <p className="text-2xl font-bold text-white">{totalQuantity}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <p className="text-sm text-gray-400">В резерве</p>
          <p className="text-2xl font-bold text-amber-400">{totalReserved}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <p className="text-sm text-gray-400">Доступно</p>
          <p className={`text-2xl font-bold ${totalAvailable < product.minStock ? 'text-red-400' : 'text-emerald-400'}`}>
            {totalAvailable}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <p className="text-sm text-gray-400">Стоимость остатка</p>
          <p className="text-2xl font-bold text-white">
            {(totalQuantity * parseFloat(product.unitCost)).toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('stocks')}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            activeTab === 'stocks'
              ? 'text-violet-400 border-b-2 border-violet-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <MapPinIcon className="w-5 h-5 inline mr-2" />
          Остатки по ячейкам ({product.stocks?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            activeTab === 'movements'
              ? 'text-violet-400 border-b-2 border-violet-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ArrowPathIcon className="w-5 h-5 inline mr-2" />
          История движений ({movements.length})
        </button>
      </div>

      {/* Stocks Tab */}
      {activeTab === 'stocks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Остатки по ячейкам</h2>
            <button
              onClick={() => setShowStockModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Приход товара
            </button>
          </div>

          {product.stocks && product.stocks.length > 0 ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Склад</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Ячейка</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Партия</th>
                    <th className="text-center p-4 text-gray-400 text-sm font-medium">Статус</th>
                    <th className="text-right p-4 text-gray-400 text-sm font-medium">Кол-во</th>
                    <th className="text-right p-4 text-gray-400 text-sm font-medium">Резерв</th>
                    <th className="text-right p-4 text-gray-400 text-sm font-medium">Доступно</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {product.stocks.map((stock) => (
                    <tr key={stock.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <Link
                          to={`/warehouse/${stock.storageLocation.warehouse.id}`}
                          className="text-white hover:text-violet-400"
                        >
                          {stock.storageLocation.warehouse.name}
                        </Link>
                        <p className="text-sm text-gray-400">{stock.storageLocation.warehouse.code}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-white">{stock.storageLocation.code}</span>
                        {stock.storageLocation.name && (
                          <span className="text-gray-400"> ({stock.storageLocation.name})</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400">{stock.batchNumber || '—'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[stock.status]}`}>
                          {statusLabels[stock.status]}
                        </span>
                      </td>
                      <td className="p-4 text-right text-white font-medium">{stock.quantity}</td>
                      <td className="p-4 text-right text-amber-400">{stock.reservedQty}</td>
                      <td className="p-4 text-right text-emerald-400 font-medium">{stock.availableQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <CubeIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Нет остатков на складах</p>
              <p className="text-gray-500 text-sm mt-1">Добавьте приход товара</p>
            </div>
          )}
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">История движений</h2>

          {movements.length > 0 ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Дата</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Тип</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Откуда</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Куда</th>
                    <th className="text-right p-4 text-gray-400 text-sm font-medium">Кол-во</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Причина</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 text-gray-400">
                        {new Date(mov.createdAt).toLocaleString('ru-RU')}
                      </td>
                      <td className="p-4">
                        <span className={movementTypeColors[mov.movementType]}>
                          {movementTypeLabels[mov.movementType]}
                        </span>
                      </td>
                      <td className="p-4 text-white">
                        {mov.fromLocation
                          ? `${mov.fromLocation.warehouse.name} / ${mov.fromLocation.code}`
                          : '—'}
                      </td>
                      <td className="p-4 text-white">
                        {mov.toLocation
                          ? `${mov.toLocation.warehouse.name} / ${mov.toLocation.code}`
                          : '—'}
                      </td>
                      <td className="p-4 text-right text-white font-medium">
                        {mov.movementType === 'OUTBOUND' || mov.movementType === 'WRITE_OFF' ? '-' : '+'}
                        {mov.quantity}
                      </td>
                      <td className="p-4 text-gray-400">{mov.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <ArrowPathIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Нет истории движений</p>
            </div>
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Приход товара</h2>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Склад *</label>
                <select
                  value={stockForm.warehouseId}
                  onChange={(e) => setStockForm({ ...stockForm, warehouseId: e.target.value, locationId: '' })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                >
                  <option value="">Выберите склад</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ячейка *</label>
                <select
                  value={stockForm.locationId}
                  onChange={(e) => setStockForm({ ...stockForm, locationId: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                  disabled={!stockForm.warehouseId}
                >
                  <option value="">Выберите ячейку</option>
                  {selectedWarehouse?.locations?.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.code}{loc.name ? ` (${loc.name})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Количество *</label>
                  <input
                    type="number"
                    min="1"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Партия</label>
                  <input
                    type="text"
                    value={stockForm.batchNumber}
                    onChange={(e) => setStockForm({ ...stockForm, batchNumber: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="LOT-001"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
