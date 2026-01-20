import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import * as XLSX from 'xlsx';

const router = Router();

// Get orders report with PNL
router.get(
  '/orders',
  authenticate,
  authorize('ADMIN', 'ANALYST', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { dateFrom, dateTo, clientId, status, format } = req.query;

    try {
      const where: any = {};

      if (dateFrom || dateTo) {
        where.orderDate = {};
        if (dateFrom) where.orderDate.gte = new Date(dateFrom as string);
        if (dateTo) where.orderDate.lte = new Date(dateTo as string);
      }

      if (clientId) where.clientId = clientId;
      if (status) where.status = status;

      const orders = await prisma.order.findMany({
        where,
        include: {
          client: { select: { name: true, companyName: true } },
          manager: { select: { firstName: true, lastName: true } },
          items: true,
          costOperations: {
            include: {
              vendorService: { select: { type: true, name: true } },
            },
          },
        },
        orderBy: { orderDate: 'desc' },
      });

      const reportData = orders.map((order) => {
        const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
        const totalWeight = order.items.reduce((sum, i) => sum + i.weight.toNumber() * i.quantity, 0);

        // Costs by type
        const costsByType: Record<string, number> = {};
        for (const op of order.costOperations) {
          const type = op.vendorService.type;
          costsByType[type] = (costsByType[type] || 0) + op.actualAmount.toNumber();
        }

        return {
          orderNumber: order.orderNumber,
          orderDate: order.orderDate.toISOString().split('T')[0],
          status: order.status,
          clientName: order.client.name,
          clientCompany: order.client.companyName || '',
          manager: order.manager 
            ? `${order.manager.firstName} ${order.manager.lastName}` 
            : '',
          itemsCount,
          totalWeight: Math.round(totalWeight * 1000) / 1000,
          revenue: order.totalIncome.toNumber(),
          storageCost: costsByType['STORAGE'] || 0,
          pickingCost: costsByType['PICKING'] || 0,
          packingCost: costsByType['PACKING'] || 0,
          shippingCost: costsByType['SHIPPING'] || 0,
          otherCost: (costsByType['RECEIVING'] || 0) + 
                     (costsByType['LABELING'] || 0) + 
                     (costsByType['RETURNS'] || 0) +
                     (costsByType['OTHER'] || 0),
          totalCost: order.actualCost.toNumber(),
          profit: order.profit.toNumber(),
          marginPercent: order.marginPercent.toNumber(),
        };
      });

      // Export to Excel if requested
      if (format === 'xlsx' || format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Отчет по заказам');

        const buffer = XLSX.write(wb, { 
          type: 'buffer', 
          bookType: format === 'csv' ? 'csv' : 'xlsx' 
        });

        const contentType = format === 'csv' 
          ? 'text/csv' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        res.setHeader('Content-Type', contentType);
        res.setHeader(
          'Content-Disposition', 
          `attachment; filename=orders-report.${format}`
        );
        return res.send(buffer);
      }

      // Return JSON
      const summary = {
        totalOrders: reportData.length,
        totalRevenue: reportData.reduce((sum, r) => sum + r.revenue, 0),
        totalCost: reportData.reduce((sum, r) => sum + r.totalCost, 0),
        totalProfit: reportData.reduce((sum, r) => sum + r.profit, 0),
        averageMargin: reportData.length > 0
          ? reportData.reduce((sum, r) => sum + r.marginPercent, 0) / reportData.length
          : 0,
      };

      res.json({
        success: true,
        data: {
          orders: reportData,
          summary,
        },
      });
    } catch (error) {
      console.error('Get orders report error:', error);
      res.status(500).json({ success: false, error: 'Ошибка формирования отчета' });
    }
  }
);

// Get PNL report for specific order
router.get(
  '/order/:id/pnl',
  authenticate,
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      const order = await prisma.order.findFirst({
        where: { OR: [{ id }, { orderNumber: id }] },
        include: {
          client: true,
          items: true,
          costOperations: {
            include: {
              vendor: { select: { name: true } },
              vendorService: { select: { name: true, type: true, unit: true } },
            },
          },
          incomeOperations: true,
        },
      });

      if (!order) {
        return res.status(404).json({ success: false, error: 'Заказ не найден' });
      }

      // Build detailed PNL
      const costDetails = order.costOperations.map((op) => ({
        vendor: op.vendor.name,
        service: op.vendorService.name,
        type: op.vendorService.type,
        unit: op.vendorService.unit,
        quantity: op.quantity.toNumber(),
        unitPrice: op.unitPrice.toNumber(),
        calculatedAmount: op.calculatedAmount.toNumber(),
        actualAmount: op.actualAmount.toNumber(),
        date: op.operationDate,
      }));

      const incomeDetails = order.incomeOperations.map((op) => ({
        invoiceAmount: op.invoiceAmount.toNumber(),
        paidAmount: op.paidAmount.toNumber(),
        paymentMethod: op.paymentMethod,
        paymentDate: op.paymentDate,
      }));

      // Group costs by type
      const costsByType: Record<string, { amount: number; items: typeof costDetails }> = {};
      for (const cost of costDetails) {
        if (!costsByType[cost.type]) {
          costsByType[cost.type] = { amount: 0, items: [] };
        }
        costsByType[cost.type].amount += cost.actualAmount;
        costsByType[cost.type].items.push(cost);
      }

      // Calculate unit economics
      const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);
      const totalCost = costDetails.reduce((sum, c) => sum + c.actualAmount, 0);
      const totalIncome = incomeDetails.reduce((sum, i) => sum + i.paidAmount, 0);
      const profit = totalIncome - totalCost;

      res.json({
        success: true,
        data: {
          order: {
            orderNumber: order.orderNumber,
            status: order.status,
            orderDate: order.orderDate,
            client: order.client.name,
          },
          items: order.items.map((i) => ({
            sku: i.sku,
            name: i.name,
            quantity: i.quantity,
            weight: i.weight.toNumber(),
            volume: i.volume.toNumber(),
          })),
          income: {
            total: totalIncome,
            invoiced: incomeDetails.reduce((sum, i) => sum + i.invoiceAmount, 0),
            details: incomeDetails,
          },
          costs: {
            total: totalCost,
            byType: costsByType,
            details: costDetails,
          },
          pnl: {
            revenue: totalIncome,
            cost: totalCost,
            profit,
            marginPercent: totalIncome > 0 ? (profit / totalIncome) * 100 : 0,
          },
          unitEconomics: {
            totalItems,
            revenuePerItem: totalItems > 0 ? totalIncome / totalItems : 0,
            costPerItem: totalItems > 0 ? totalCost / totalItems : 0,
            profitPerItem: totalItems > 0 ? profit / totalItems : 0,
          },
        },
      });
    } catch (error) {
      console.error('Get order PNL error:', error);
      res.status(500).json({ success: false, error: 'Ошибка формирования PNL отчета' });
    }
  }
);

// Get vendors report
router.get(
  '/vendors',
  authenticate,
  authorize('ADMIN', 'ANALYST'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { dateFrom, dateTo } = req.query;

    try {
      const where: any = {};

      if (dateFrom || dateTo) {
        where.operationDate = {};
        if (dateFrom) where.operationDate.gte = new Date(dateFrom as string);
        if (dateTo) where.operationDate.lte = new Date(dateTo as string);
      }

      const vendors = await prisma.vendor.findMany({
        include: {
          costOperations: {
            where,
            select: { actualAmount: true },
          },
          services: {
            select: { id: true },
          },
        },
      });

      const reportData = vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        legalName: vendor.legalName,
        status: vendor.status,
        servicesCount: vendor.services.length,
        totalSpent: vendor.costOperations.reduce(
          (sum, op) => sum + op.actualAmount.toNumber(),
          0
        ),
        operationsCount: vendor.costOperations.length,
      }));

      reportData.sort((a, b) => b.totalSpent - a.totalSpent);

      res.json({
        success: true,
        data: reportData,
        summary: {
          totalVendors: reportData.length,
          activeVendors: reportData.filter((v) => v.status === 'ACTIVE').length,
          totalSpent: reportData.reduce((sum, v) => sum + v.totalSpent, 0),
        },
      });
    } catch (error) {
      console.error('Get vendors report error:', error);
      res.status(500).json({ success: false, error: 'Ошибка формирования отчета' });
    }
  }
);

// Get clients report
router.get(
  '/clients',
  authenticate,
  authorize('ADMIN', 'ANALYST', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { dateFrom, dateTo, format } = req.query;

    try {
      const orderWhere: any = {};

      if (dateFrom || dateTo) {
        orderWhere.orderDate = {};
        if (dateFrom) orderWhere.orderDate.gte = new Date(dateFrom as string);
        if (dateTo) orderWhere.orderDate.lte = new Date(dateTo as string);
      }

      const clients = await prisma.client.findMany({
        include: {
          orders: {
            where: {
              ...orderWhere,
              status: { notIn: ['CANCELLED', 'RETURNED'] },
            },
            select: {
              totalIncome: true,
              actualCost: true,
              profit: true,
            },
          },
        },
      });

      const reportData = clients.map((client) => {
        const revenue = client.orders.reduce((sum, o) => sum + o.totalIncome.toNumber(), 0);
        const cost = client.orders.reduce((sum, o) => sum + o.actualCost.toNumber(), 0);
        const profit = client.orders.reduce((sum, o) => sum + o.profit.toNumber(), 0);

        return {
          id: client.id,
          name: client.name,
          companyName: client.companyName || '',
          email: client.email || '',
          phone: client.phone || '',
          isActive: client.isActive,
          ordersCount: client.orders.length,
          revenue: Math.round(revenue * 100) / 100,
          cost: Math.round(cost * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          marginPercent: revenue > 0 
            ? Math.round((profit / revenue) * 10000) / 100 
            : 0,
        };
      });

      reportData.sort((a, b) => b.profit - a.profit);

      // Export if requested
      if (format === 'xlsx' || format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Отчет по клиентам');

        const buffer = XLSX.write(wb, { 
          type: 'buffer', 
          bookType: format === 'csv' ? 'csv' : 'xlsx' 
        });

        res.setHeader(
          'Content-Type',
          format === 'csv' 
            ? 'text/csv' 
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition', 
          `attachment; filename=clients-report.${format}`
        );
        return res.send(buffer);
      }

      res.json({
        success: true,
        data: reportData,
        summary: {
          totalClients: reportData.length,
          activeClients: reportData.filter((c) => c.isActive).length,
          totalRevenue: reportData.reduce((sum, c) => sum + c.revenue, 0),
          totalProfit: reportData.reduce((sum, c) => sum + c.profit, 0),
        },
      });
    } catch (error) {
      console.error('Get clients report error:', error);
      res.status(500).json({ success: false, error: 'Ошибка формирования отчета' });
    }
  }
);

export default router;
