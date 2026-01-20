import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../lib/api';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface KPIData {
  revenue: { value: number; change: number };
  profit: { value: number; change: number };
  cost: { value: number };
  orders: { value: number; change: number };
  shippedItems: { value: number; change: number };
  margin: { value: number };
  averageOrderValue: number;
}

interface ChartData {
  date: string;
  revenue: number;
  profit: number;
  cost: number;
  orders: number;
}

interface CostBreakdown {
  type: string;
  label: string;
  value: number;
}

interface TopClient {
  id: string;
  name: string;
  companyName?: string;
  ordersCount: number;
  revenue: number;
  profit: number;
}

export default function Dashboard() {
  const [period, setPeriod] = useState('month');
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [costsData, setCostsData] = useState<CostBreakdown[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<{ status: string; label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [kpiRes, chartRes, costsRes, clientsRes, statusRes] = await Promise.all([
        dashboardApi.getKPI(period),
        dashboardApi.getRevenueChart(period, period === 'year' ? 'month' : 'day'),
        dashboardApi.getCostsChart(period),
        dashboardApi.getTopClients(period, 5),
        dashboardApi.getOrdersByStatus(),
      ]);

      setKpi(kpiRes.data.data);
      setChartData(chartRes.data.data);
      setCostsData(costsRes.data.data);
      setTopClients(clientsRes.data.data);
      setOrdersByStatus(statusRes.data.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value);
  };

  const revenueChartData = {
    labels: chartData.map((d) => d.date),
    datasets: [
      {
        label: 'Выручка',
        data: chartData.map((d) => d.revenue),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Прибыль',
        data: chartData.map((d) => d.profit),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          padding: 20,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#64748b' },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#64748b' },
      },
    },
  };

  const costColors = [
    '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  const costsChartData = {
    labels: costsData.map((d) => d.label),
    datasets: [
      {
        data: costsData.map((d) => d.value),
        backgroundColor: costColors.slice(0, costsData.length),
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          padding: 12,
        },
      },
    },
    cutout: '65%',
  };

  const activeOrdersData = {
    labels: ordersByStatus.filter(s => !['COMPLETED', 'CANCELLED', 'RETURNED'].includes(s.status)).map(s => s.label),
    datasets: [{
      data: ordersByStatus.filter(s => !['COMPLETED', 'CANCELLED', 'RETURNED'].includes(s.status)).map(s => s.count),
      backgroundColor: ['#0ea5e9', '#f59e0b', '#8b5cf6', '#10b981', '#06b6d4'],
      borderWidth: 0,
      borderRadius: 4,
    }],
  };

  const periods = [
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'quarter', label: 'Квартал' },
    { value: 'year', label: 'Год' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 skeleton rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 skeleton rounded-2xl" />
          <div className="h-80 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Дашборд</h1>
          <p className="text-surface-400">Обзор ключевых показателей</p>
        </div>
        <div className="flex items-center gap-2">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p.value
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-800 text-surface-400 hover:text-surface-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card text-brand-400">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-sm font-medium">Выручка</p>
              <p className="text-2xl font-bold text-white mt-1">
                {kpi && formatCurrency(kpi.revenue.value)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-500/10">
              <CurrencyDollarIcon className="w-6 h-6 text-brand-400" />
            </div>
          </div>
          {kpi && kpi.revenue.change !== 0 && (
            <div className={`flex items-center gap-1 mt-3 text-sm ${
              kpi.revenue.change > 0 ? 'text-success-500' : 'text-danger-500'
            }`}>
              {kpi.revenue.change > 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" />
              )}
              <span>{Math.abs(kpi.revenue.change)}% к пред. периоду</span>
            </div>
          )}
        </div>

        <div className="stat-card text-success-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-sm font-medium">Прибыль</p>
              <p className="text-2xl font-bold text-white mt-1">
                {kpi && formatCurrency(kpi.profit.value)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-success-500/10">
              <ChartBarIcon className="w-6 h-6 text-success-500" />
            </div>
          </div>
          {kpi && kpi.profit.change !== 0 && (
            <div className={`flex items-center gap-1 mt-3 text-sm ${
              kpi.profit.change > 0 ? 'text-success-500' : 'text-danger-500'
            }`}>
              {kpi.profit.change > 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" />
              )}
              <span>{Math.abs(kpi.profit.change)}% к пред. периоду</span>
            </div>
          )}
        </div>

        <div className="stat-card text-warning-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-sm font-medium">Заказов</p>
              <p className="text-2xl font-bold text-white mt-1">
                {kpi && formatNumber(kpi.orders.value)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-warning-500/10">
              <ShoppingCartIcon className="w-6 h-6 text-warning-500" />
            </div>
          </div>
          {kpi && kpi.orders.change !== 0 && (
            <div className={`flex items-center gap-1 mt-3 text-sm ${
              kpi.orders.change > 0 ? 'text-success-500' : 'text-danger-500'
            }`}>
              {kpi.orders.change > 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" />
              )}
              <span>{Math.abs(kpi.orders.change)}% к пред. периоду</span>
            </div>
          )}
        </div>

        <div className="stat-card text-cyan-400">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-sm font-medium">Отправлено товаров</p>
              <p className="text-2xl font-bold text-white mt-1">
                {kpi && formatNumber(kpi.shippedItems?.value || 0)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10">
              <CubeIcon className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          {kpi && kpi.shippedItems?.change !== 0 && (
            <div className={`flex items-center gap-1 mt-3 text-sm ${
              (kpi.shippedItems?.change || 0) > 0 ? 'text-success-500' : 'text-danger-500'
            }`}>
              {(kpi.shippedItems?.change || 0) > 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" />
              )}
              <span>{Math.abs(kpi.shippedItems?.change || 0)}% к пред. периоду</span>
            </div>
          )}
        </div>

        <div className="stat-card text-purple-400">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-sm font-medium">Маржинальность</p>
              <p className="text-2xl font-bold text-white mt-1">
                {kpi && kpi.margin.value.toFixed(1)}%
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10">
              <ArrowTrendingUpIcon className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-surface-500 text-sm mt-3">
            Средний чек: {kpi && formatCurrency(kpi.averageOrderValue)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-white mb-4">Динамика выручки и прибыли</h3>
          <div className="h-72">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        {/* Costs Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Структура расходов</h3>
          <div className="h-72">
            {costsData.length > 0 ? (
              <Doughnut data={costsChartData} options={doughnutOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-surface-500">
                Нет данных
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Топ клиентов по прибыли</h3>
            <Link to="/clients" className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
              Все клиенты
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {topClients.length > 0 ? (
              topClients.map((client, idx) => (
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/20 to-success-500/20 flex items-center justify-center text-sm font-bold text-brand-400">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-100 truncate">{client.name}</p>
                    <p className="text-xs text-surface-500">{client.ordersCount} заказов</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success-400">{formatCurrency(client.profit)}</p>
                    <p className="text-xs text-surface-500">прибыль</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-surface-500 text-center py-8">Нет данных</p>
            )}
          </div>
        </div>

        {/* Orders by Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Активные заказы</h3>
            <Link to="/orders" className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
              Все заказы
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="h-64">
            {ordersByStatus.some(s => !['COMPLETED', 'CANCELLED', 'RETURNED'].includes(s.status) && s.count > 0) ? (
              <Bar
                data={activeOrdersData}
                options={{
                  ...chartOptions,
                  indexAxis: 'y' as const,
                  plugins: { ...chartOptions.plugins, legend: { display: false } },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-surface-500">
                Нет активных заказов
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
