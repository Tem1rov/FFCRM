import { useState } from 'react';
import { reportsApi } from '../lib/api';
import toast from 'react-hot-toast';
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const downloadReport = async (type: 'orders' | 'clients', format: 'xlsx' | 'csv') => {
    setLoading(`${type}-${format}`);
    try {
      const response = await (type === 'orders' 
        ? reportsApi.getOrders({ dateFrom, dateTo, format })
        : reportsApi.getClients({ dateFrom, dateTo, format })
      );

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Отчет загружен');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка загрузки отчета');
    } finally {
      setLoading(null);
    }
  };

  const reports = [
    {
      id: 'orders',
      title: 'Отчет по заказам',
      description: 'Полный отчет по заказам с P&L детализацией, включая выручку, себестоимость и прибыль',
      icon: ChartBarIcon,
    },
    {
      id: 'clients',
      title: 'Отчет по клиентам',
      description: 'Аналитика по клиентам: количество заказов, общая выручка и прибыль',
      icon: ChartBarIcon,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Отчеты</h1>
        <p className="text-surface-400">Формирование и экспорт отчетов</p>
      </div>

      {/* Date Filter */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-brand-400" />
          Период отчета
        </h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="label">Дата начала</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex-1">
            <label className="label">Дата окончания</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                setDateFrom(firstDay.toISOString().split('T')[0]);
                setDateTo(now.toISOString().split('T')[0]);
              }}
              className="btn-secondary"
            >
              Этот месяц
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), 0, 1);
                setDateFrom(firstDay.toISOString().split('T')[0]);
                setDateTo(now.toISOString().split('T')[0]);
              }}
              className="btn-secondary"
            >
              Этот год
            </button>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="card-hover">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-xl bg-brand-500/10">
                <report.icon className="w-6 h-6 text-brand-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{report.title}</h3>
                <p className="text-surface-400 text-sm mt-1">{report.description}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => downloadReport(report.id as 'orders' | 'clients', 'xlsx')}
                disabled={loading !== null}
                className="btn-primary flex-1"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                {loading === `${report.id}-xlsx` ? 'Загрузка...' : 'Excel'}
              </button>
              <button
                onClick={() => downloadReport(report.id as 'orders' | 'clients', 'csv')}
                disabled={loading !== null}
                className="btn-secondary flex-1"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                {loading === `${report.id}-csv` ? 'Загрузка...' : 'CSV'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="card bg-surface-800/50">
        <h3 className="text-lg font-semibold text-white mb-2">📊 О формате отчетов</h3>
        <ul className="text-surface-400 text-sm space-y-2">
          <li>• <strong>Excel (XLSX)</strong> — Полнофункциональный формат с форматированием. Рекомендуется для детального анализа.</li>
          <li>• <strong>CSV</strong> — Текстовый формат для импорта в другие системы или Excel.</li>
          <li>• Если период не указан, отчет формируется за все время.</li>
        </ul>
      </div>
    </div>
  );
}
