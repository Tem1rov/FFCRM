import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Generate order number
const generateOrderNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
};

// Calculate order costs from vendor services
const calculateOrderCosts = async (
  prisma: PrismaClient,
  items: Array<{ weight: number; volume: number; quantity: number }>
) => {
  // Get active services
  const services = await prisma.vendorService.findMany({
    where: { isActive: true },
    include: { vendor: { select: { id: true, name: true } } },
  });

  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  const totalVolume = items.reduce((sum, item) => sum + (item.volume * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const costs: Array<{
    vendorId: string;
    vendorServiceId: string;
    quantity: number;
    unitPrice: number;
    calculatedAmount: number;
    description: string;
  }> = [];

  // Find applicable services
  for (const service of services) {
    let quantity = 0;
    let applicable = false;

    switch (service.type) {
      case 'PICKING':
        if (service.unit === 'ORDER') {
          quantity = 1;
          applicable = true;
        } else if (service.unit === 'PIECE') {
          quantity = totalItems;
          applicable = totalItems > 0;
        }
        break;

      case 'PACKING':
        if (service.unit === 'ORDER') {
          quantity = 1;
          applicable = true;
        }
        break;

      case 'SHIPPING':
        // Select shipping service based on weight
        if (service.unit === 'ORDER') {
          if (service.name.includes('до 1кг') && totalWeight <= 1) {
            quantity = 1;
            applicable = true;
          } else if (service.name.includes('1-5кг') && totalWeight > 1 && totalWeight <= 5) {
            quantity = 1;
            applicable = true;
          } else if (service.name.includes('5-10кг') && totalWeight > 5 && totalWeight <= 10) {
            quantity = 1;
            applicable = true;
          } else if (totalWeight > 10 && service.name.includes('10')) {
            quantity = 1;
            applicable = true;
          }
        } else if (service.unit === 'KG') {
          quantity = totalWeight;
          applicable = totalWeight > 0;
        }
        break;

      case 'STORAGE':
        // Skip storage calculation for now (monthly)
        break;
    }

    if (applicable && quantity > 0) {
      const unitPrice = service.price.toNumber();
      costs.push({
        vendorId: service.vendorId,
        vendorServiceId: service.id,
        quantity,
        unitPrice,
        calculatedAmount: quantity * unitPrice,
        description: `${service.vendor.name}: ${service.name}`,
      });
    }
  }

  return costs;
};

// Get all orders with filtering
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { 
    status, 
    clientId, 
    search, 
    dateFrom, 
    dateTo,
    page = '1',
    limit = '20',
  } = req.query;

  try {
    const where: any = {};

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string } },
        { client: { name: { contains: search as string } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.orderDate = {};
      if (dateFrom) where.orderDate.gte = new Date(dateFrom as string);
      if (dateTo) where.orderDate.lte = new Date(dateTo as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения заказов' });
  }
});

// Get single order with full details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        client: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: true,
        expenses: {
          include: {
            vendor: { select: { id: true, name: true } },
            vendorService: { select: { id: true, name: true, type: true, unit: true, price: true } },
          },
          orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
        },
        costOperations: {
          include: {
            vendor: { select: { id: true, name: true } },
            vendorService: { select: { id: true, name: true, type: true } },
          },
        },
        incomeOperations: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Заказ не найден' });
    }

    // Calculate PNL summary
    const totalCost = order.costOperations.reduce(
      (sum, op) => sum + op.actualAmount.toNumber(),
      0
    );
    const totalIncome = order.incomeOperations.reduce(
      (sum, op) => sum + op.paidAmount.toNumber(),
      0
    );
    const profit = totalIncome - totalCost;
    const marginPercent = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    // Group costs by service type
    const costsByType: Record<string, number> = {};
    for (const op of order.costOperations) {
      const type = op.vendorService.type;
      costsByType[type] = (costsByType[type] || 0) + op.actualAmount.toNumber();
    }

    // Unit economics
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const profitPerUnit = totalItems > 0 ? profit / totalItems : 0;

    res.json({
      success: true,
      data: {
        ...order,
        pnl: {
          totalCost,
          totalIncome,
          profit,
          marginPercent: Math.round(marginPercent * 100) / 100,
          costsByType,
          unitEconomics: {
            totalItems,
            profitPerUnit: Math.round(profitPerUnit * 100) / 100,
          },
        },
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения заказа' });
  }
});

// Create order with auto-cost calculation
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('clientId').notEmpty().withMessage('Выберите клиента'),
    body('items').isArray({ min: 1 }).withMessage('Добавьте хотя бы один товар'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { clientId, items, shippingAddress, notes, incomeAmount } = req.body;

    try {
      // Verify client exists
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) {
        return res.status(404).json({ success: false, error: 'Клиент не найден' });
      }

      // Calculate estimated costs
      const estimatedCosts = await calculateOrderCosts(prisma, items);
      const estimatedCostTotal = estimatedCosts.reduce((sum, c) => sum + c.calculatedAmount, 0);

      // Calculate income (from request or based on client tariff)
      const income = incomeAmount || (estimatedCostTotal * (client.tariffRate?.toNumber() || 1.3));

      // Create order with items and cost operations in a transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            clientId,
            managerId: req.user!.userId,
            shippingAddress,
            notes,
            estimatedCost: estimatedCostTotal,
            actualCost: estimatedCostTotal,
            totalIncome: income,
            profit: income - estimatedCostTotal,
            marginPercent: income > 0 ? ((income - estimatedCostTotal) / income) * 100 : 0,
            items: {
              create: items.map((item: any) => ({
                sku: item.sku || '',
                name: item.name,
                quantity: item.quantity || 1,
                weight: item.weight || 0,
                volume: item.volume || 0,
                unitCost: item.unitCost || 0,
                unitPrice: item.unitPrice || 0,
              })),
            },
          },
          include: {
            items: true,
            client: { select: { id: true, name: true } },
          },
        });

        // Create cost operations
        for (const cost of estimatedCosts) {
          await tx.costOperation.create({
            data: {
              orderId: newOrder.id,
              vendorId: cost.vendorId,
              vendorServiceId: cost.vendorServiceId,
              quantity: cost.quantity,
              unitPrice: cost.unitPrice,
              calculatedAmount: cost.calculatedAmount,
              actualAmount: cost.calculatedAmount,
              description: cost.description,
            },
          });
        }

        // Create income operation
        await tx.incomeOperation.create({
          data: {
            orderId: newOrder.id,
            clientId,
            invoiceAmount: income,
            paidAmount: 0,
            description: `Оплата за заказ ${newOrder.orderNumber}`,
          },
        });

        return newOrder;
      });

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания заказа' });
    }
  }
);

// Update order status
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('status').isIn([
      'NEW', 'PROCESSING', 'PICKING', 'PACKED', 
      'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED'
    ]).withMessage('Неверный статус'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { status } = req.body;

    try {
      const updateData: any = { status };

      // Set dates based on status
      if (status === 'SHIPPED') {
        updateData.shippedDate = new Date();
      } else if (status === 'DELIVERED' || status === 'COMPLETED') {
        updateData.deliveredDate = new Date();
      }

      const order = await prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          client: { select: { id: true, name: true } },
        },
      });

      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления статуса' });
    }
  }
);

// Update order
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { shippingAddress, notes, status } = req.body;

    try {
      const order = await prisma.order.update({
        where: { id },
        data: {
          shippingAddress,
          notes,
          status,
        },
      });

      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления заказа' });
    }
  }
);

// Delete order (ADMIN can delete any, MANAGER only NEW)
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const userRole = req.user?.role;

    try {
      const order = await prisma.order.findUnique({ where: { id } });

      if (!order) {
        return res.status(404).json({ success: false, error: 'Заказ не найден' });
      }

      // MANAGER can only delete NEW orders, ADMIN can delete any
      if (userRole !== 'ADMIN' && order.status !== 'NEW') {
        return res.status(400).json({
          success: false,
          error: 'Можно удалить только заказы в статусе "Новый"',
        });
      }

      await prisma.order.delete({ where: { id } });
      res.json({ success: true, message: 'Заказ удален' });
    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления заказа' });
    }
  }
);

// Recalculate order PNL
router.post(
  '/:id/recalculate',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          costOperations: true,
          incomeOperations: true,
        },
      });

      if (!order) {
        return res.status(404).json({ success: false, error: 'Заказ не найден' });
      }

      const totalCost = order.costOperations.reduce(
        (sum, op) => sum + op.actualAmount.toNumber(),
        0
      );
      const totalIncome = order.incomeOperations.reduce(
        (sum, op) => sum + op.paidAmount.toNumber(),
        0
      );
      const profit = totalIncome - totalCost;
      const marginPercent = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

      const updated = await prisma.order.update({
        where: { id },
        data: {
          actualCost: totalCost,
          totalIncome,
          profit,
          marginPercent,
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Recalculate order error:', error);
      res.status(500).json({ success: false, error: 'Ошибка пересчета заказа' });
    }
  }
);

export default router;
