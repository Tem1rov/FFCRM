import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CubeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unitWeight: number;
  unitCost: number;
  unitPrice: number;
  minStock: number;
  isActive: boolean;
  totalQuantity: number;
  totalReserved: number;
  totalAvailable: number;
  stocks: Array<{
    id: string;
    quantity: number;
    availableQty: number;
    storageLocation: {
      code: string;
      warehouse: { name: string };
    };
  }>;
}

export default function WarehouseProducts() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(searchParams.get('lowStock') === 'true');
  
  // Multi-select state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category: '',
    unitWeight: '',
    unitCost: '',
    unitPrice: '',
    minStock: '5',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products', { params: { search } });
      setProducts(res.data.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchProducts();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', {
        ...formData,
        unitWeight: parseFloat(formData.unitWeight) || 0,
        unitCost: parseFloat(formData.unitCost) || 0,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        minStock: parseInt(formData.minStock) || 0,
      });
      setShowCreateModal(false);
      setFormData({ sku: '', barcode: '', name: '', description: '', category: '', unitWeight: '', unitCost: '', unitPrice: '', minStock: '5' });
      fetchProducts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка создания товара');
    }
  };

  const filteredProducts = filterLowStock
    ? products.filter(p => p.totalAvailable < p.minStock)
    : products;

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Multi-select handlers
  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  // Bulk actions
  const handleBulkActivate = async (isActive: boolean) => {
    if (selectedProducts.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedProducts).map(id => 
        api.put(`/products/${id}`, { isActive })
      );
      await Promise.all(promises);
      toast.success(`${isActive ? 'Активировано' : 'Деактивировано'} ${selectedProducts.size} товаров`);
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(`Удалить ${selectedProducts.size} выбранных товаров?`)) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedProducts).map(id => 
        api.delete(`/products/${id}`)
      );
      await Promise.all(promises);
      toast.success(`Удалено ${selectedProducts.size} товаров`);
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error) {
      toast.error('Ошибка удаления товаров');
    } finally {
      setBulkActionLoading(false);
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
        <div className="flex items-center gap-4">
          <Link to="/warehouse" className="text-gray-400 hover:text-white">
            Склады
          </Link>
          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
          <h1 className="text-2xl font-bold text-white">Товары</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Добавить товар
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по артикулу, названию или штрихкоду..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white"
            />
          </div>
        </form>
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            filterLowStock
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
              : 'bg-slate-800 border-slate-700 text-gray-400 hover:text-white'
          }`}
        >
          <ExclamationTriangleIcon className="w-5 h-5" />
          Мало на складе
        </button>
        <div className="text-sm text-gray-400">
          Показано: {filteredProducts.length} из {products.length}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-5 h-5 text-violet-400" />
            <span className="text-violet-300 font-medium">
              Выбрано: {selectedProducts.size}
            </span>
          </div>
          
          <div className="h-6 w-px bg-slate-700" />
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkActivate(true)}
              disabled={bulkActionLoading}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
              Активировать
            </button>
            <button
              onClick={() => handleBulkActivate(false)}
              disabled={bulkActionLoading}
              className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              Деактивировать
            </button>
          </div>
          
          <div className="h-6 w-px bg-slate-700" />
          
          <button
            onClick={handleBulkDelete}
            disabled={bulkActionLoading}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            Удалить
          </button>
          
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors ml-auto"
          >
            <XMarkIcon className="w-4 h-4" />
            Отменить
          </button>
          
          {bulkActionLoading && (
            <ArrowPathIcon className="w-5 h-5 text-violet-400 animate-spin" />
          )}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                  />
                </th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Товар</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Категория</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase px-4 py-3">На складе</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase px-4 py-3">Резерв</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase px-4 py-3">Доступно</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase px-4 py-3">Себестоимость</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase px-4 py-3">Цена</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  className={`hover:bg-slate-700/30 ${selectedProducts.has(product.id) ? 'bg-violet-500/10' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                        <CubeIcon className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{product.name}</span>
                          {product.totalAvailable < product.minStock && (
                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" title="Мало на складе" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>{product.sku}</span>
                          {product.barcode && <span>• {product.barcode}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">{product.category || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-white font-medium">{product.totalQuantity}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-amber-400">{product.totalReserved}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${product.totalAvailable < product.minStock ? 'text-red-400' : 'text-emerald-400'}`}>
                      {product.totalAvailable}
                    </span>
                    <span className="text-gray-500 text-sm"> / {product.minStock}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-gray-300">{Number(product.unitCost).toLocaleString()} ₽</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-white font-medium">{Number(product.unitPrice).toLocaleString()} ₽</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/warehouse/products/${product.id}`}
                      className="text-violet-400 hover:text-violet-300"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    {filterLowStock ? 'Нет товаров с низким остатком' : 'Товары не найдены'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Новый товар</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Категория</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(cat => <option key={cat} value={cat!} />)}
                  </datalist>
                </div>
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
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Себестоимость</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Цена продажи</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Мин. остаток</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
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
