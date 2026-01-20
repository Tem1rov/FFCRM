import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersApi, incomeOperationsApi, orderExpensesApi, vendorsApi, vendorServicesApi } from '../lib/api';
import { useIsManager } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CheckIcon,
  BanknotesIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  ReceiptPercentIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  client: { id: string; name: string; companyName?: string };
  manager?: { firstName: string; lastName: string };
  items: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    weight: number;
    volume: number;
    unitCost: number;
    unitPrice: number;
  }>;
  expenses: Array<OrderExpense>;
  costOperations: Array<{
    id: string;
    vendor: { name: string };
    vendorService: { name: string; type: string };
    quantity: number;
    unitPrice: number;
    actualAmount: number;
  }>;
  incomeOperations: Array<{
    id: string;
    invoiceAmount: number;
    paidAmount: number;
    paymentMethod?: string;
    paymentDate?: string;
  }>;
  shippingAddress?: string;
  orderDate: string;
  estimatedCost: number;
  actualCost: number;
  totalIncome: number;
  profit: number;
  marginPercent: number;
  pnl: {
    totalCost: number;
    totalIncome: number;
    profit: number;
    marginPercent: number;
    costsByType: Record<string, number>;
    unitEconomics: {
      totalItems: number;
      profitPerUnit: number;
    };
  };
}

interface OrderExpense {
  id: string;
  category: string;
  subcategory?: string;
  description: string;
  vendor?: { id: string; name: string };
  vendorService?: { id: string; name: string; type: string; unit: string; price: number };
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  plannedAmount: number;
  actualAmount: number;
  isPriceLocked: boolean;
  originalPrice?: number;
  status: string;
  notes?: string;
}

interface ExpenseSummary {
  totalPlanned: number;
  totalActual: number;
  totalItems: number;
  byCategory: Array<{
    category: string;
    categoryName: string;
    items: OrderExpense[];
    totalPlanned: number;
    totalActual: number;
  }>;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
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

const categoryLabels: Record<string, { name: string; color: string }> = {
  PACKAGING: { name: 'Упаковка', color: 'text-blue-400' },
  LABOR: { name: 'ФОТ', color: 'text-purple-400' },
  RENT: { name: 'Аренда', color: 'text-orange-400' },
  LOGISTICS: { name: 'Логистика', color: 'text-green-400' },
  MATERIALS: { name: 'Материалы', color: 'text-cyan-400' },
  OTHER: { name: 'Прочее', color: 'text-gray-400' },
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

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'expenses' | 'payments'>('items');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [expenses, setExpenses] = useState<OrderExpense[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const isManager = useIsManager();

  useEffect(() => {
    loadOrder();
    loadCategories();
    loadTemplates();
  }, [id]);

  useEffect(() => {
    if (order && activeTab === 'expenses') {
      loadExpenses();
    }
  }, [order, activeTab]);

  const loadOrder = async () => {
    try {
      const response = await ordersApi.getOne(id!);
      setOrder(response.data.data);
    } catch (error) {
      toast.error('Ошибка загрузки заказа');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await orderExpensesApi.getCategories();
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await orderExpensesApi.getTemplates();
      setTemplates(response.data.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      await orderExpensesApi.applyTemplate(id!, templateId);
      toast.success('Шаблон применен');
      setShowTemplateSelector(false);
      loadExpenses();
      loadOrder();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка применения шаблона');
    }
  };

  const loadExpenses = async () => {
    try {
      const response = await orderExpensesApi.getByOrder(id!);
      setExpenses(response.data.data);
      setExpenseSummary(response.data.summary);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await ordersApi.updateStatus(id!, newStatus);
      toast.success('Статус обновлен');
      loadOrder();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка обновления');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Удалить этот расход?')) return;
    
    try {
      await orderExpensesApi.delete(expenseId);
      toast.success('Расход удален');
      loadExpenses();
      loadOrder();
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
        <div className="card h-64 skeleton" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-400">Заказ не найден</p>
        <Link to="/orders" className="btn-secondary mt-4">
          <ArrowLeftIcon className="w-4 h-4" />
          К списку заказов
        </Link>
      </div>
    );
  }

  const statusFlow = ['NEW', 'PROCESSING', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
  const currentStatusIndex = statusFlow.indexOf(order.status);

  // Calculate totals from expenses
  const expensesTotal = expenseSummary?.totalActual || 0;
  const itemsTotal = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  const itemsCostTotal = order.items.reduce((sum, item) => sum + Number(item.unitCost) * item.quantity, 0);
  const totalCost = expensesTotal + itemsCostTotal;
  const profit = itemsTotal - totalCost;
  const marginPercent = itemsTotal > 0 ? (profit / itemsTotal) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link to="/orders" className="btn-icon btn-ghost">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-white font-mono">
              {order.orderNumber}
            </h1>
            <span className={statusLabels[order.status]?.class || 'badge-neutral'}>
              {statusLabels[order.status]?.label || order.status}
            </span>
          </div>
          <p className="text-surface-400">
            от {new Date(order.orderDate).toLocaleDateString('ru-RU')} • 
            Клиент: <Link to={`/clients/${order.client.id}`} className="text-brand-400 hover:text-brand-300">{order.client.name}</Link>
          </p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="btn-secondary"
            >
              <BanknotesIcon className="w-4 h-4" />
              Записать оплату
            </button>
          </div>
        )}
      </div>

      {/* Status Flow */}
      {isManager && !['CANCELLED', 'RETURNED', 'COMPLETED'].includes(order.status) && (
        <div className="card p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {statusFlow.map((status, idx) => {
              const isPast = idx < currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              const isNext = idx === currentStatusIndex + 1;

              return (
                <button
                  key={status}
                  onClick={() => isNext && handleStatusChange(status)}
                  disabled={!isNext}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isPast
                      ? 'bg-success-500/10 text-success-400'
                      : isCurrent
                      ? 'bg-brand-500 text-white'
                      : isNext
                      ? 'bg-surface-700 text-surface-200 hover:bg-surface-600 cursor-pointer'
                      : 'bg-surface-800/50 text-surface-500'
                  }`}
                >
                  {isPast && <CheckIcon className="w-4 h-4" />}
                  {statusLabels[status]?.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PNL Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card text-brand-400">
          <p className="text-surface-400 text-sm">Выручка</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(itemsTotal)}</p>
        </div>
        <div className="stat-card text-warning-500">
          <p className="text-surface-400 text-sm">Себестоимость</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalCost)}</p>
          <p className="text-xs text-surface-500 mt-1">
            Товары: {formatCurrency(itemsCostTotal)} + Расходы: {formatCurrency(expensesTotal)}
          </p>
        </div>
        <div className="stat-card text-success-500">
          <p className="text-surface-400 text-sm">Прибыль</p>
          <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
            {formatCurrency(profit)}
          </p>
        </div>
        <div className="stat-card text-purple-400">
          <p className="text-surface-400 text-sm">Маржинальность</p>
          <p className={`text-2xl font-bold mt-1 ${marginPercent >= 20 ? 'text-success-400' : 'text-warning-400'}`}>
            {marginPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-800">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'items'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-surface-400 hover:text-surface-300'
            }`}
          >
            <CubeIcon className="w-5 h-5" />
            Товары ({order.items.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'expenses'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-surface-400 hover:text-surface-300'
            }`}
          >
            <ReceiptPercentIcon className="w-5 h-5" />
            Расходы ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'payments'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-surface-400 hover:text-surface-300'
            }`}
          >
            <CreditCardIcon className="w-5 h-5" />
            Платежи ({order.incomeOperations.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'items' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">
            Товары ({order.items.reduce((sum, i) => sum + i.quantity, 0)} шт.)
          </h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>SKU</th>
                  <th className="text-right">Кол-во</th>
                  <th className="text-right">Себестоимость</th>
                  <th className="text-right">Цена продажи</th>
                  <th className="text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium text-surface-100">{item.name}</td>
                    <td className="text-surface-400 font-mono text-sm">{item.sku}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right font-mono text-surface-400">{formatCurrency(Number(item.unitCost))}</td>
                    <td className="text-right font-mono">{formatCurrency(Number(item.unitPrice))}</td>
                    <td className="text-right font-mono font-semibold">{formatCurrency(Number(item.unitPrice) * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-700">
                  <td colSpan={3} className="font-semibold">Итого:</td>
                  <td className="text-right font-mono text-warning-400">{formatCurrency(itemsCostTotal)}</td>
                  <td></td>
                  <td className="text-right font-mono font-bold text-success-400">{formatCurrency(itemsTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Expense Actions */}
          {isManager && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowExpenseModal(true)} className="btn-primary">
                  <PlusIcon className="w-4 h-4" />
                  Добавить расход
                </button>
                <button onClick={() => setShowTemplateSelector(true)} className="btn-secondary">
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  Применить шаблон
                </button>
              </div>
              <div className="text-sm text-surface-400">
                Всего расходов: <span className="font-semibold text-warning-400">{formatCurrency(expensesTotal)}</span>
              </div>
            </div>
          )}

          {/* Expenses by Category */}
          {expenseSummary?.byCategory.map((cat) => (
            <div key={cat.category} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${categoryLabels[cat.category]?.color || 'text-white'}`}>
                  {cat.categoryName}
                </h3>
                <span className="font-mono font-semibold text-surface-300">
                  {formatCurrency(cat.totalActual || cat.totalPlanned)}
                </span>
              </div>
              <div className="space-y-2">
                {cat.items.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-surface-100">{expense.description}</p>
                        {expense.isPriceLocked && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">Фиксирована</span>
                        )}
                        {expense.vendor && (
                          <span className="text-xs text-surface-500">({expense.vendor.name})</span>
                        )}
                      </div>
                      <p className="text-xs text-surface-500 mt-1">
                        {Number(expense.quantity)} {unitLabels[expense.unit] || expense.unit} × {formatCurrency(Number(expense.unitPrice))}
                        {expense.subcategory && ` • ${expense.subcategory}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-mono font-semibold text-surface-100">
                        {formatCurrency(Number(expense.actualAmount) || Number(expense.totalAmount))}
                      </p>
                      {isManager && (
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-danger-400 hover:text-danger-300 transition-opacity"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {expenses.length === 0 && (
            <div className="card text-center py-12">
              <ReceiptPercentIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
              <p className="text-surface-400 mb-4">Нет расходов по заказу</p>
              {isManager && (
                <button onClick={() => setShowExpenseModal(true)} className="btn-primary">
                  <PlusIcon className="w-4 h-4" />
                  Добавить первый расход
                </button>
              )}
            </div>
          )}

          {/* Category Summary Chart */}
          {expenses.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Структура расходов</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {expenseSummary?.byCategory.map((cat) => {
                  const percent = expensesTotal > 0 ? ((cat.totalActual || cat.totalPlanned) / expensesTotal) * 100 : 0;
                  return (
                    <div key={cat.category} className="p-4 rounded-xl bg-surface-800/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${categoryLabels[cat.category]?.color || 'text-surface-300'}`}>
                          {cat.categoryName}
                        </span>
                        <span className="text-sm text-surface-400">{percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            cat.category === 'PACKAGING' ? 'bg-blue-500' :
                            cat.category === 'LABOR' ? 'bg-purple-500' :
                            cat.category === 'RENT' ? 'bg-orange-500' :
                            cat.category === 'LOGISTICS' ? 'bg-green-500' :
                            cat.category === 'MATERIALS' ? 'bg-cyan-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-sm font-mono mt-2 text-surface-300">
                        {formatCurrency(cat.totalActual || cat.totalPlanned)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Платежи</h3>
          {order.incomeOperations.length === 0 ? (
            <p className="text-surface-500 text-center py-4">Нет платежей</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Сумма счета</th>
                    <th>Оплачено</th>
                    <th>Способ</th>
                    <th>Дата</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {order.incomeOperations.map((op) => (
                    <tr key={op.id}>
                      <td className="font-mono">{formatCurrency(Number(op.invoiceAmount))}</td>
                      <td className="font-mono text-success-400">{formatCurrency(Number(op.paidAmount))}</td>
                      <td className="text-surface-400">{op.paymentMethod || '—'}</td>
                      <td className="text-surface-400">
                        {op.paymentDate ? new Date(op.paymentDate).toLocaleDateString('ru-RU') : '—'}
                      </td>
                      <td>
                        {Number(op.paidAmount) >= Number(op.invoiceAmount) ? (
                          <span className="badge-success">Оплачен</span>
                        ) : Number(op.paidAmount) > 0 ? (
                          <span className="badge-warning">Частично</span>
                        ) : (
                          <span className="badge-danger">Не оплачен</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && order.incomeOperations[0] && (
        <PaymentModal
          incomeOperationId={order.incomeOperations[0].id}
          invoiceAmount={Number(order.incomeOperations[0].invoiceAmount)}
          paidAmount={Number(order.incomeOperations[0].paidAmount)}
          onClose={() => setShowPaymentModal(false)}
          onSave={() => {
            setShowPaymentModal(false);
            loadOrder();
          }}
        />
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          orderId={id!}
          categories={categories}
          onClose={() => setShowExpenseModal(false)}
          onSave={() => {
            setShowExpenseModal(false);
            loadExpenses();
            loadOrder();
          }}
        />
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-xl w-full max-w-lg animate-scale-in">
            <div className="p-6 border-b border-surface-800">
              <h2 className="text-xl font-semibold text-white">Выбрать шаблон расходов</h2>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-surface-400 text-center py-4">Нет доступных шаблонов</p>
              ) : (
                templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleApplyTemplate(tmpl.id)}
                    className="w-full text-left p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{tmpl.name}</p>
                        {tmpl.description && (
                          <p className="text-sm text-surface-400 mt-1">{tmpl.description}</p>
                        )}
                        <p className="text-xs text-surface-500 mt-2">
                          {tmpl.items?.length || 0} позиций
                        </p>
                      </div>
                      <DocumentDuplicateIcon className="w-5 h-5 text-brand-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="p-6 border-t border-surface-800">
              <button
                onClick={() => setShowTemplateSelector(false)}
                className="btn-secondary w-full"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentModal({
  incomeOperationId,
  invoiceAmount,
  paidAmount,
  onClose,
  onSave,
}: {
  incomeOperationId: string;
  invoiceAmount: number;
  paidAmount: number;
  onClose: () => void;
  onSave: () => void;
}) {
  const remaining = invoiceAmount - paidAmount;
  const [amount, setAmount] = useState(remaining.toString());
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Введите сумму платежа');
      return;
    }

    setLoading(true);
    try {
      await incomeOperationsApi.recordPayment(incomeOperationId, {
        amount: parseFloat(amount),
        paymentMethod,
      });
      toast.success('Платеж записан');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка записи платежа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-xl w-full max-w-md animate-scale-in">
        <div className="p-6 border-b border-surface-800">
          <h2 className="text-xl font-semibold text-white">Записать оплату</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-surface-800/50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-surface-400">Сумма счета:</span>
              <span className="font-mono text-surface-100">{invoiceAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-surface-400">Уже оплачено:</span>
              <span className="font-mono text-success-400">{paidAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-surface-300">К оплате:</span>
              <span className="font-mono text-warning-400">{remaining.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>

          <div>
            <label className="label">Сумма платежа</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="label">Способ оплаты</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="select"
            >
              <option value="BANK_TRANSFER">Банковский перевод</option>
              <option value="CARD">Карта</option>
              <option value="CASH">Наличные</option>
              <option value="ONLINE">Онлайн</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Сохранение...' : 'Записать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExpenseModal({
  orderId,
  categories,
  onClose,
  onSave,
}: {
  orderId: string;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [category, setCategory] = useState('OTHER');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [vendorServiceId, setVendorServiceId] = useState('');
  const [unit, setUnit] = useState('PIECE');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [notes, setNotes] = useState('');
  const [isPriceLocked, setIsPriceLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (vendorId) {
      loadServices(vendorId);
    } else {
      setServices([]);
      setVendorServiceId('');
    }
  }, [vendorId]);

  useEffect(() => {
    if (vendorServiceId) {
      const service = services.find(s => s.id === vendorServiceId);
      if (service) {
        setUnitPrice(String(service.price));
        setUnit(service.unit);
        setDescription(service.name);
      }
    }
  }, [vendorServiceId, services]);

  const loadVendors = async () => {
    try {
      const response = await vendorsApi.getAll({ status: 'ACTIVE' });
      setVendors(response.data.data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const loadServices = async (vId: string) => {
    try {
      const response = await vendorServicesApi.getAll({ vendorId: vId });
      setServices(response.data.data);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description) {
      toast.error('Введите описание расхода');
      return;
    }

    setLoading(true);
    try {
      await orderExpensesApi.create(orderId, {
        category,
        subcategory: subcategory || undefined,
        description,
        vendorId: vendorId || undefined,
        vendorServiceId: vendorServiceId || undefined,
        unit,
        quantity: parseFloat(quantity) || 1,
        unitPrice: parseFloat(unitPrice) || 0,
        isPriceLocked,
        notes: notes || undefined,
      });
      toast.success('Расход добавлен');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка добавления расхода');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="p-6 border-b border-surface-800">
          <h2 className="text-xl font-semibold text-white">Добавить расход</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Подкатегория</label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="input"
                placeholder="Например: Коробки"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-800/50 space-y-4">
            <p className="text-sm text-surface-400">Источник расхода (опционально)</p>
            <div>
              <label className="label">Поставщик</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="select"
              >
                <option value="">Без поставщика</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            {vendorId && (
              <div>
                <label className="label">Услуга поставщика</label>
                <select
                  value={vendorServiceId}
                  onChange={(e) => setVendorServiceId(e.target.value)}
                  className="select"
                >
                  <option value="">Выберите услугу...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {s.price} ₽/{s.unit}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="label">Описание расхода *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="Например: Упаковка товара"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Единица</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="select"
              >
                <option value="PIECE">Штука</option>
                <option value="KG">Килограмм</option>
                <option value="CUBIC_METER">Куб.метр</option>
                <option value="ORDER">Заказ</option>
                <option value="PALLET">Палета</option>
                <option value="HOUR">Час</option>
                <option value="DAY">День</option>
                <option value="MONTH">Месяц</option>
              </select>
            </div>
            <div>
              <label className="label">Количество</label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Цена за ед.</label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30">
            <div className="flex items-center justify-between">
              <span className="text-surface-300">Итого:</span>
              <span className="text-xl font-bold text-brand-400">{totalAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPriceLocked"
              checked={isPriceLocked}
              onChange={(e) => setIsPriceLocked(e.target.checked)}
              className="checkbox"
            />
            <label htmlFor="isPriceLocked" className="text-sm text-surface-300">
              Зафиксировать цену (не обновлять при изменении прайса поставщика)
            </label>
          </div>

          <div>
            <label className="label">Заметки</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={2}
              placeholder="Дополнительная информация..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Сохранение...' : 'Добавить расход'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
