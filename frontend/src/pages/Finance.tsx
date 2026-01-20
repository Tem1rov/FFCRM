import { useEffect, useState } from 'react';
import { accountsApi, transactionsApi } from '../lib/api';
import { useCanViewFinance, useIsAdmin } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  BanknotesIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  debitAccount: { code: string; name: string };
  creditAccount: { code: string; name: string };
  amount: number;
  description?: string;
  transactionDate: string;
  costOperation?: { order: { orderNumber: string } };
  incomeOperation?: { order: { orderNumber: string } };
}

const typeLabels: Record<string, string> = {
  ASSET: 'Актив',
  LIABILITY: 'Обязательство',
  REVENUE: 'Доход',
  EXPENSE: 'Расход',
  EQUITY: 'Капитал',
};

export default function Finance() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions'>('accounts');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const canViewFinance = useCanViewFinance();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        accountsApi.getAll(),
        transactionsApi.getAll({ limit: 50 }),
      ]);
      setAccounts(accountsRes.data.data);
      setTransactions(transactionsRes.data.data);
    } catch (error) {
      toast.error('Ошибка загрузки финансовых данных');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (!canViewFinance) {
    return (
      <div className="card text-center py-12">
        <BanknotesIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
        <h3 className="text-lg font-semibold text-surface-300 mb-2">Доступ ограничен</h3>
        <p className="text-surface-500">У вас нет прав для просмотра финансовых данных</p>
      </div>
    );
  }

  // Group accounts by type
  const accountsByType = accounts.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = [];
    acc[account.type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Финансы</h1>
          <p className="text-surface-400">Бухгалтерский учет и проводки</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary">
            <ArrowPathIcon className="w-4 h-4" />
            Обновить
          </button>
          {isAdmin && (
            <button onClick={() => setShowTransactionModal(true)} className="btn-primary">
              <PlusIcon className="w-4 h-4" />
              Проводка
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'accounts'
              ? 'bg-brand-500 text-white'
              : 'text-surface-400 hover:text-surface-200'
          }`}
        >
          Счета
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'transactions'
              ? 'bg-brand-500 text-white'
              : 'text-surface-400 hover:text-surface-200'
          }`}
        >
          Проводки
        </button>
      </div>

      {loading ? (
        <div className="card skeleton h-96" />
      ) : activeTab === 'accounts' ? (
        /* Accounts View */
        <div className="space-y-6">
          {Object.entries(accountsByType).map(([type, accs]) => (
            <div key={type} className="card">
              <h3 className="text-lg font-semibold text-white mb-4">
                {typeLabels[type] || type}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accs.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 rounded-xl bg-surface-800/50 border border-surface-700"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-brand-400 text-sm">{account.code}</p>
                        <p className="font-medium text-surface-100 mt-1">{account.name}</p>
                      </div>
                      <p className={`font-mono font-semibold ${
                        Number(account.balance) >= 0 ? 'text-success-400' : 'text-danger-400'
                      }`}>
                        {formatCurrency(Number(account.balance))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Transactions View */
        <div className="card p-0 overflow-hidden">
          <div className="table-container border-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Дебет</th>
                  <th>Кредит</th>
                  <th>Сумма</th>
                  <th>Описание</th>
                  <th>Заказ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="text-surface-400">
                      {new Date(txn.transactionDate).toLocaleDateString('ru-RU')}
                    </td>
                    <td>
                      <span className="font-mono text-brand-400">{txn.debitAccount.code}</span>
                      <span className="text-surface-500 ml-2">{txn.debitAccount.name}</span>
                    </td>
                    <td>
                      <span className="font-mono text-success-400">{txn.creditAccount.code}</span>
                      <span className="text-surface-500 ml-2">{txn.creditAccount.name}</span>
                    </td>
                    <td className="font-mono font-semibold text-surface-100">
                      {formatCurrency(Number(txn.amount))}
                    </td>
                    <td className="text-surface-400 max-w-xs truncate">
                      {txn.description || '—'}
                    </td>
                    <td>
                      {txn.costOperation?.order?.orderNumber || txn.incomeOperation?.order?.orderNumber ? (
                        <span className="font-mono text-xs text-brand-400">
                          {txn.costOperation?.order?.orderNumber || txn.incomeOperation?.order?.orderNumber}
                        </span>
                      ) : (
                        <span className="text-surface-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <TransactionModal
          accounts={accounts}
          onClose={() => setShowTransactionModal(false)}
          onSave={() => {
            setShowTransactionModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function TransactionModal({
  accounts,
  onClose,
  onSave,
}: {
  accounts: Account[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [debitAccountId, setDebitAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!debitAccountId || !creditAccountId || !amount) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    if (debitAccountId === creditAccountId) {
      toast.error('Дебетовый и кредитовый счета должны быть разными');
      return;
    }

    setLoading(true);
    try {
      await transactionsApi.create({
        debitAccountId,
        creditAccountId,
        amount: parseFloat(amount),
        description,
      });
      toast.success('Проводка создана');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка создания проводки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-xl w-full max-w-lg animate-scale-in">
        <div className="p-6 border-b border-surface-800">
          <h2 className="text-xl font-semibold text-white">Новая проводка</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Дебет (увеличение) *</label>
            <select
              value={debitAccountId}
              onChange={(e) => setDebitAccountId(e.target.value)}
              className="select"
              required
            >
              <option value="">Выберите счет</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} — {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Кредит (уменьшение) *</label>
            <select
              value={creditAccountId}
              onChange={(e) => setCreditAccountId(e.target.value)}
              className="select"
              required
            >
              <option value="">Выберите счет</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} — {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Сумма *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label">Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="Комментарий к проводке"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
