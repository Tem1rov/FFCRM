import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  PlayIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { api } from '../lib/api';

interface WarehouseTask {
  id: string;
  taskNumber: string;
  type: string;
  status: string;
  priority: string;
  plannedDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count: {
    taskItems: number;
    stockMovements: number;
  };
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

const typeLabels: Record<string, string> = {
  RECEIVING: 'Приемка',
  PLACEMENT: 'Размещение',
  PICKING: 'Сборка',
  PACKING: 'Упаковка',
  SHIPPING: 'Отгрузка',
  INVENTORY: 'Инвентаризация',
  TRANSFER: 'Перемещение',
};

const typeColors: Record<string, string> = {
  RECEIVING: 'bg-blue-500/20 text-blue-400',
  PLACEMENT: 'bg-cyan-500/20 text-cyan-400',
  PICKING: 'bg-violet-500/20 text-violet-400',
  PACKING: 'bg-purple-500/20 text-purple-400',
  SHIPPING: 'bg-emerald-500/20 text-emerald-400',
  INVENTORY: 'bg-amber-500/20 text-amber-400',
  TRANSFER: 'bg-gray-500/20 text-gray-400',
};

const statusLabels: Record<string, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнена',
  CANCELLED: 'Отменена',
};

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  IN_PROGRESS: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Низкий',
  NORMAL: 'Обычный',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-gray-400',
  NORMAL: 'text-blue-400',
  HIGH: 'text-amber-400',
  URGENT: 'text-red-400',
};

export default function WarehouseTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<WarehouseTask[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    type: searchParams.get('type') || '',
    warehouseId: searchParams.get('warehouseId') || '',
  });

  const [formData, setFormData] = useState({
    warehouseId: '',
    type: 'RECEIVING',
    priority: 'NORMAL',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.warehouseId) params.warehouseId = filters.warehouseId;

      const [tasksRes, warehousesRes] = await Promise.all([
        api.get('/warehouse-tasks', { params }),
        api.get('/warehouses'),
      ]);

      setTasks(tasksRes.data.data);
      setWarehouses(warehousesRes.data.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/warehouse-tasks', formData);
      setShowCreateModal(false);
      setFormData({ warehouseId: '', type: 'RECEIVING', priority: 'NORMAL', notes: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка создания задачи');
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      await api.post(`/warehouse-tasks/${taskId}/start`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка начала задачи');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    if (!confirm('Отменить задачу?')) return;
    try {
      await api.post(`/warehouse-tasks/${taskId}/cancel`, { reason: 'Отменена пользователем' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка отмены задачи');
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group tasks by status
  const tasksByStatus = {
    NEW: tasks.filter(t => t.status === 'NEW'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    COMPLETED: tasks.filter(t => t.status === 'COMPLETED'),
    CANCELLED: tasks.filter(t => t.status === 'CANCELLED'),
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
          <h1 className="text-2xl font-bold text-white">Задачи склада</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Новая задача
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Все статусы</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Все типы</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filters.warehouseId}
          onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Все склады</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name}</option>
          ))}
        </select>
        <div className="text-sm text-gray-400">
          Всего: {tasks.length}
        </div>
      </div>

      {/* Kanban-style view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
          <div key={status} className="bg-slate-800/30 rounded-xl border border-slate-700/50">
            <div className={`px-4 py-3 border-b border-slate-700/50 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-md text-xs ${statusColors[status]}`}>
                  {statusLabels[status]}
                </span>
                <span className="text-gray-400 text-sm">({tasksByStatus[status].length})</span>
              </div>
            </div>
            <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {tasksByStatus[status].map((task) => (
                <div
                  key={task.id}
                  className="bg-slate-800 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link 
                        to={`/warehouse/tasks/${task.id}`}
                        className="text-sm font-medium text-white hover:text-violet-400"
                      >
                        {task.taskNumber}
                      </Link>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${typeColors[task.type]}`}>
                        {typeLabels[task.type]}
                      </span>
                    </div>
                    <span className={`text-xs ${priorityColors[task.priority]}`}>
                      {task.priority === 'URGENT' && '⚡'}
                      {task.priority === 'HIGH' && '↑'}
                    </span>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-400">
                    <div>{task.warehouse.name}</div>
                    {task.assignedTo && (
                      <div className="mt-1">
                        👤 {task.assignedTo.firstName} {task.assignedTo.lastName}
                      </div>
                    )}
                    <div className="mt-1">📅 {formatDate(task.createdAt)}</div>
                  </div>

                  {task.status === 'NEW' && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleStartTask(task.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs py-1.5 rounded transition-colors"
                      >
                        <PlayIcon className="w-3 h-3" />
                        Начать
                      </button>
                      <button
                        onClick={() => handleCancelTask(task.id)}
                        className="flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs py-1.5 px-2 rounded transition-colors"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {task.status === 'IN_PROGRESS' && (
                    <Link
                      to={`/warehouse/tasks/${task.id}`}
                      className="mt-2 flex items-center justify-center gap-1 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-xs py-1.5 rounded transition-colors"
                    >
                      <CheckIcon className="w-3 h-3" />
                      Продолжить
                    </Link>
                  )}
                </div>
              ))}
              {tasksByStatus[status].length === 0 && (
                <div className="text-center text-gray-500 text-sm py-4">
                  Нет задач
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Новая задача</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Склад *</label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                >
                  <option value="">Выберите склад</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Тип задачи *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Приоритет</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    {Object.entries(priorityLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Примечание</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
