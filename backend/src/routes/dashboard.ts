import { Router, Request, Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get dashboard KPIs
router.get('/kpi', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { period } = req.query;

  try {
    // Calculate date range based on period
    const now = new Date();
    let dateFrom = new Date();

    switch (period) {
      case 'day':
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case 'week':
        dateFrom.setDate(now.getDate() - 7);
        break;
      case 'month':
        dateFrom.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        dateFrom.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
      default:
        dateFrom.setMonth(now.getMonth() - 1); // Default: last month
    }

    // Get aggregated data
    const [orderStats, previousStats, shippedItems, previousShippedItems] = await Promise.all([
      prisma.order.aggregate({
        where: {
          orderDate: { gte: dateFrom },
          status: { notIn: ['CANCELLED', 'RETURNED'] },
        },
        _sum: {
          totalIncome: true,
          actualCost: true,
          profit: true,
        },
        _count: true,
        _avg: {
          marginPercent: true,
        },
      }),
      // Previous period for comparison
      prisma.order.aggregate({
        where: {
          orderDate: {
            gte: new Date(dateFrom.getTime() - (now.getTime() - dateFrom.getTime())),
            lt: dateFrom,
          },
          status: { notIn: ['CANCELLED', 'RETURNED'] },
        },
        _sum: {
          totalIncome: true,
          profit: true,
        },
        _count: true,
      }),
      // Shipped items count (from orders with status SHIPPED, DELIVERED, or COMPLETED)
      prisma.orderItem.aggregate({
        where: {
          order: {
            orderDate: { gte: dateFrom },
            status: { in: ['SHIPPED', 'DELIVERED', 'COMPLETED'] },
          },
        },
        _sum: {
          quantity: true,
        },
      }),
      // Previous period shipped items
      prisma.orderItem.aggregate({
        where: {
          order: {
            orderDate: {
              gte: new Date(dateFrom.getTime() - (now.getTime() - dateFrom.getTime())),
              lt: dateFrom,
            },
            status: { in: ['SHIPPED', 'DELIVERED', 'COMPLETED'] },
          },
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    const revenue = orderStats._sum.totalIncome?.toNumber() || 0;
    const profit = orderStats._sum.profit?.toNumber() || 0;
    const cost = orderStats._sum.actualCost?.toNumber() || 0;
    const orders = orderStats._count;
    const margin = orderStats._avg.marginPercent?.toNumber() || 0;
    const shippedItemsCount = shippedItems._sum.quantity || 0;

    const prevRevenue = previousStats._sum.totalIncome?.toNumber() || 0;
    const prevProfit = previousStats._sum.profit?.toNumber() || 0;
    const prevOrders = previousStats._count;
    const prevShippedItemsCount = previousShippedItems._sum.quantity || 0;

    // Calculate changes
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const profitChange = prevProfit > 0 ? ((profit - prevProfit) / prevProfit) * 100 : 0;
    const ordersChange = prevOrders > 0 ? ((orders - prevOrders) / prevOrders) * 100 : 0;
    const shippedItemsChange = prevShippedItemsCount > 0 ? ((shippedItemsCount - prevShippedItemsCount) / prevShippedItemsCount) * 100 : 0;

    res.json({
      success: true,
      data: {
        revenue: {
          value: Math.round(revenue * 100) / 100,
          change: Math.round(revenueChange * 10) / 10,
        },
        profit: {
          value: Math.round(profit * 100) / 100,
          change: Math.round(profitChange * 10) / 10,
        },
        cost: {
          value: Math.round(cost * 100) / 100,
        },
        orders: {
          value: orders,
          change: Math.round(ordersChange * 10) / 10,
        },
        shippedItems: {
          value: shippedItemsCount,
          change: Math.round(shippedItemsChange * 10) / 10,
        },
        margin: {
          value: Math.round(margin * 10) / 10,
        },
        averageOrderValue: orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0,
        period: {
          from: dateFrom.toISOString(),
          to: now.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Get KPI error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения KPI' });
  }
});

// Get revenue and profit chart data
router.get('/chart/revenue', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { period = 'month', groupBy = 'day' } = req.query;

  try {
    const now = new Date();
    let dateFrom = new Date();

    switch (period) {
      case 'week':
        dateFrom.setDate(now.getDate() - 7);
        break;
      case 'month':
        dateFrom.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        dateFrom.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
    }

    const orders = await prisma.order.findMany({
      where: {
        orderDate: { gte: dateFrom },
        status: { notIn: ['CANCELLED', 'RETURNED'] },
      },
      select: {
        orderDate: true,
        totalIncome: true,
        profit: true,
        actualCost: true,
      },
      orderBy: { orderDate: 'asc' },
    });

    // Group by date
    const grouped: Record<string, { revenue: number; profit: number; cost: number; count: number }> = {};

    for (const order of orders) {
      let key: string;
      const date = order.orderDate;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { revenue: 0, profit: 0, cost: 0, count: 0 };
      }

      grouped[key].revenue += order.totalIncome.toNumber();
      grouped[key].profit += order.profit.toNumber();
      grouped[key].cost += order.actualCost.toNumber();
      grouped[key].count++;
    }

    const chartData = Object.entries(grouped).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      profit: Math.round(data.profit * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      orders: data.count,
    }));

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения данных графика' });
  }
});

// Get cost breakdown by service type
router.get('/chart/costs', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { period = 'month' } = req.query;

  try {
    const now = new Date();
    let dateFrom = new Date();

    switch (period) {
      case 'week':
        dateFrom.setDate(now.getDate() - 7);
        break;
      case 'month':
        dateFrom.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        dateFrom.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
    }

    const costs = await prisma.costOperation.findMany({
      where: {
        operationDate: { gte: dateFrom },
      },
      include: {
        vendorService: { select: { type: true } },
      },
    });

    const byType: Record<string, number> = {};

    for (const cost of costs) {
      const type = cost.vendorService.type;
      byType[type] = (byType[type] || 0) + cost.actualAmount.toNumber();
    }

    const typeLabels: Record<string, string> = {
      STORAGE: 'Хранение',
      PICKING: 'Комплектация',
      PACKING: 'Упаковка',
      SHIPPING: 'Доставка',
      RECEIVING: 'Приемка',
      LABELING: 'Маркировка',
      RETURNS: 'Возвраты',
      OTHER: 'Прочее',
    };

    const chartData = Object.entries(byType).map(([type, value]) => ({
      type,
      label: typeLabels[type] || type,
      value: Math.round(value * 100) / 100,
    }));

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Get cost breakdown error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения структуры расходов' });
  }
});

// Get top clients by profit
router.get('/top-clients', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { period = 'month', limit = '10' } = req.query;

  try {
    const now = new Date();
    let dateFrom = new Date();

    switch (period) {
      case 'week':
        dateFrom.setDate(now.getDate() - 7);
        break;
      case 'month':
        dateFrom.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        dateFrom.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
    }

    const clients = await prisma.client.findMany({
      include: {
        orders: {
          where: {
            orderDate: { gte: dateFrom },
            status: { notIn: ['CANCELLED', 'RETURNED'] },
          },
          select: {
            totalIncome: true,
            profit: true,
          },
        },
      },
    });

    const clientStats = clients
      .map((client) => ({
        id: client.id,
        name: client.name,
        companyName: client.companyName,
        ordersCount: client.orders.length,
        revenue: client.orders.reduce((sum, o) => sum + o.totalIncome.toNumber(), 0),
        profit: client.orders.reduce((sum, o) => sum + o.profit.toNumber(), 0),
      }))
      .filter((c) => c.ordersCount > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, parseInt(limit as string));

    res.json({ success: true, data: clientStats });
  } catch (error) {
    console.error('Get top clients error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения топ клиентов' });
  }
});

// Get orders by status
router.get('/orders-by-status', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;

  try {
    const counts = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    const statusLabels: Record<string, string> = {
      NEW: 'Новый',
      PROCESSING: 'В обработке',
      PICKING: 'На сборке',
      PACKED: 'Упакован',
      SHIPPED: 'Отправлен',
      DELIVERED: 'Доставлен',
      COMPLETED: 'Выполнен',
      CANCELLED: 'Отменен',
      RETURNED: 'Возврат',
    };

    const data = counts.map((item) => ({
      status: item.status,
      label: statusLabels[item.status] || item.status,
      count: item._count,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get orders by status error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения статусов заказов' });
  }
});

export default router;
