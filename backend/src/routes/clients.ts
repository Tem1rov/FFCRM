import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all clients
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { search, isActive } = req.query;

  try {
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { companyName: { contains: search as string } },
        { email: { contains: search as string } },
        { inn: { contains: search as string } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: clients });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения клиентов' });
  }
});

// Get single client with orders summary
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalIncome: true,
            profit: true,
            orderDate: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ success: false, error: 'Клиент не найден' });
    }

    // Calculate client stats
    const stats = await prisma.order.aggregate({
      where: { clientId: id },
      _sum: {
        totalIncome: true,
        profit: true,
      },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        ...client,
        stats: {
          totalOrders: stats._count,
          totalRevenue: stats._sum.totalIncome || 0,
          totalProfit: stats._sum.profit || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения клиента' });
  }
});

// Create client
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('name').notEmpty().withMessage('Введите имя клиента'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { name, companyName, inn, email, phone, address, tariffRate, notes } = req.body;

    try {
      const client = await prisma.client.create({
        data: {
          name,
          companyName,
          inn,
          email,
          phone,
          address,
          tariffRate,
          notes,
        },
      });

      res.status(201).json({ success: true, data: client });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания клиента' });
    }
  }
);

// Update client
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { name, companyName, inn, email, phone, address, tariffRate, notes, isActive } = req.body;

    try {
      const client = await prisma.client.update({
        where: { id },
        data: {
          name,
          companyName,
          inn,
          email,
          phone,
          address,
          tariffRate,
          notes,
          isActive,
        },
      });

      res.json({ success: true, data: client });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления клиента' });
    }
  }
);

// Delete client
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      // Check if client has orders
      const ordersCount = await prisma.order.count({ where: { clientId: id } });
      
      if (ordersCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Нельзя удалить клиента с заказами. Деактивируйте клиента вместо удаления.',
        });
      }

      await prisma.client.delete({ where: { id } });
      res.json({ success: true, message: 'Клиент удален' });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления клиента' });
    }
  }
);

export default router;
