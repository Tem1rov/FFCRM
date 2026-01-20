import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';

interface StockMovement {
  id: string;
  quantity: number;
  movementType: string;
  batchNumber: string | null;
  reason: string | null;
  createdAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
  };
  fromLocation: {
    code: string;
    warehouse: { name: string; code: string };
  } | null;
  toLocation: {
    code: string;
    warehouse: { name: string; code: string };
  } | null;
  task: {
    taskNumber: string;
    type: string;
  } | null;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

const typeLabels: Record<string, string> = {
  INBOUND: 'Приход',
  OUTBOUND: 'Расход',
  TRANSFER: 'Перемещение',
  ADJUSTMENT: 'Корректировка',
  WRITE_OFF: 'Списание',
};

const typeIcons: Record<string, any> = {
  INBOUND: ArrowDownTrayIcon,
  OUTBOUND: ArrowUpTrayIcon,
  TRANSFER: ArrowsRightLeftIcon,
  ADJUSTMENT: ArrowPathIcon,
  WRITE_OFF: MinusCircleIcon,
};

const typeColors: Record<string, string> = {
  INBOUND: 'bg-emerald-500/20 text-emerald-400',
  OUTBOUND: 'bg-red-500/20 text-red-400',
  TRANSFER: 'bg-blue-500/20 text-blue-400',
  ADJUSTMENT: 'bg-amber-500/20 text-amber-400',
  WRITE_OFF: 'bg-gray-500/20 text-gray-400',
};

export default function WarehouseMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  const [filters, setFilters] = useState({
    movementType: '',
    warehouseId: '',
    fromDate: '',
    toDate: '',
  });

  const [transferData, setTransferData] = useState({
    productSku: '',
    productId: '',
    productName: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: '',
    reason: '',
  });

  const [productSearch, setProductSearch] = useState('');
  const [foundProduct, setFoundProduct] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      const params: any = { limit: 100 };
      if (filters.movementType) params.movementType = filters.movementType;
      if (filters.warehouseId) params.warehouseId = filters.warehouseId;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;

      const [movementsRes, warehousesRes] = await Promise.all([
        api.get('/stock-movements', { params }),
        api.get('/warehouses'),
      ]);

      setMovements(movementsRes.data.data);
      setWarehouses(warehousesRes.data.data);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSearch = async () => {
    if (!productSearch.trim()) return;
    try {
      const res = await api.get(`/products/lookup/${productSearch}`);
      const product = res.data.data;
      setFoundProduct(product);
      setTransferData({
        ...transferData,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
      });
    } catch {
      alert('Товар не найден');
      setFoundProduct(null);
    }
  };

  const fetchLocations = async (warehouseId: string) => {
    try {
      const res = await api.get(`/warehouses/${warehouseId}/locations`);
      setLocations(res.data.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/stock-movements/transfer', {
        productId: transferData.productId,
        fromLocationId: transferData.fromLocationId,
        toLocationId: transferData.toLocationId,
        quantity: parseInt(transferData.quantity),
        reason: transferData.reason,
      });
      setShowTransferModal(false);
      setTransferData({ productSku: '', productId: '', productName: '', fromLocationId: '', toLocationId: '', quantity: '', reason: '' });
      setFoundProduct(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка перемещения');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <div className="flex items-center gap-4">
          <Link to="/warehouse" className="text-gray-400 hover:text-white">
            Склады
          </Link>
          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
          <h1 className="text-2xl font-bold text-white">Движения товаров</h1>
        </div>
        <button
          onClick={() => setShowTransferModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowsRightLeftIcon className="w-5 h-5" />
          Переместить
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={filters.movementType}
          onChange={(e) => setFilters({ ...filters, movementType: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Все типы</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filters.warehouseId}
          onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Все склады</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.fromDate}
          onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={filters.toDate}
          onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
        />
        <div className="text-sm text-gray-400">
          Показано: {movements.length}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Дата</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Тип</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Товар</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase px-4 py-3">Кол-во</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Откуда</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Куда</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Задача</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {movements.map((movement) => {
                const Icon = typeIcons[movement.movementType] || ArrowPathIcon;
                return (
                  <tr key={movement.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDate(movement.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${typeColors[movement.movementType]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-white">{typeLabels[movement.movementType]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <Link 
                          to={`/warehouse/products/${movement.product.id}`}
                          className="text-white hover:text-violet-400"
                        >
                          {movement.product.name}
                        </Link>
                        <div className="text-sm text-gray-400">{movement.product.sku}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        movement.movementType === 'INBOUND' ? 'text-emerald-400' :
                        movement.movementType === 'OUTBOUND' || movement.movementType === 'WRITE_OFF' ? 'text-red-400' :
                        'text-white'
                      }`}>
                        {movement.movementType === 'INBOUND' ? '+' : 
                         movement.movementType === 'OUTBOUND' || movement.movementType === 'WRITE_OFF' ? '-' : ''}
                        {movement.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {movement.fromLocation ? (
                        <div>
                          <span className="text-white">{movement.fromLocation.code}</span>
                          <div className="text-xs text-gray-400">{movement.fromLocation.warehouse.name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {movement.toLocation ? (
                        <div>
                          <span className="text-white">{movement.toLocation.code}</span>
                          <div className="text-xs text-gray-400">{movement.toLocation.warehouse.name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {movement.task ? (
                        <Link 
                          to={`/warehouse/tasks/${movement.task.taskNumber}`}
                          className="text-violet-400 hover:text-violet-300 text-sm"
                        >
                          {movement.task.taskNumber}
                        </Link>
                      ) : movement.reason ? (
                        <span className="text-gray-400 text-sm">{movement.reason}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Нет движений за выбранный период
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Перемещение товара</h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              {/* Product Search */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Товар (SKU или штрихкод)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleProductSearch())}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="Введите SKU или штрихкод"
                  />
                  <button
                    type="button"
                    onClick={handleProductSearch}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg"
                  >
                    Найти
                  </button>
                </div>
                {foundProduct && (
                  <div className="mt-2 p-2 bg-slate-700/50 rounded text-sm text-white">
                    ✓ {foundProduct.name} ({foundProduct.sku})
                  </div>
                )}
              </div>

              {foundProduct && (
                <>
                  {/* Source Location */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Откуда</label>
                    <select
                      value={transferData.fromLocationId}
                      onChange={(e) => setTransferData({ ...transferData, fromLocationId: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      required
                    >
                      <option value="">Выберите ячейку</option>
                      {foundProduct.stocks.map((stock: any) => (
                        <option key={stock.storageLocation.code} value={stock.storageLocationId || stock.id}>
                          {stock.storageLocation.code} ({stock.storageLocation.warehouse.name}) — {stock.availableQty} шт.
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Warehouse & Location */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Склад назначения</label>
                    <select
                      onChange={(e) => fetchLocations(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">Выберите склад</option>
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                  </div>

                  {locations.length > 0 && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Куда</label>
                      <select
                        value={transferData.toLocationId}
                        onChange={(e) => setTransferData({ ...transferData, toLocationId: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                        required
                      >
                        <option value="">Выберите ячейку</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} ({loc.status === 'FREE' ? 'свободна' : 'занята'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Количество</label>
                    <input
                      type="number"
                      value={transferData.quantity}
                      onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      min="1"
                      required
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Причина</label>
                    <input
                      type="text"
                      value={transferData.reason}
                      onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      placeholder="Оптимизация размещения"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setFoundProduct(null);
                    setLocations([]);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!foundProduct}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
                >
                  Переместить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
