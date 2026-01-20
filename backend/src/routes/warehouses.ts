import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all warehouses
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { status, type } = req.query;

  try {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        _count: {
          select: { locations: true, warehouseTasks: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: warehouses });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения складов' });
  }
});

// Get warehouse by ID with locations
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            _count: { select: { productStocks: true } }
          },
          orderBy: { code: 'asc' }
        },
        _count: {
          select: { warehouseTasks: true }
        }
      }
    });

    if (!warehouse) {
      return res.status(404).json({ success: false, error: 'Склад не найден' });
    }

    res.json({ success: true, data: warehouse });
  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения склада' });
  }
});

// Create warehouse
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('name').notEmpty().withMessage('Введите название склада'),
    body('code').notEmpty().withMessage('Введите код склада'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { name, code, address, type, description } = req.body;

    try {
      const warehouse = await prisma.warehouse.create({
        data: { name, code, address, type, description }
      });

      res.status(201).json({ success: true, data: warehouse });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'Склад с таким кодом уже существует' });
      }
      console.error('Create warehouse error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания склада' });
    }
  }
);

// Update warehouse
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { name, code, address, type, status, description } = req.body;

    try {
      const warehouse = await prisma.warehouse.update({
        where: { id },
        data: { name, code, address, type, status, description }
      });

      res.json({ success: true, data: warehouse });
    } catch (error) {
      console.error('Update warehouse error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления склада' });
    }
  }
);

// Delete warehouse
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      await prisma.warehouse.delete({ where: { id } });
      res.json({ success: true, message: 'Склад удален' });
    } catch (error) {
      console.error('Delete warehouse error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления склада' });
    }
  }
);

// ==================== STORAGE LOCATIONS ====================

// Get locations for a warehouse
router.get('/:warehouseId/locations', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { warehouseId } = req.params;
  const { status, type, zone } = req.query;

  try {
    const where: any = { warehouseId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (zone) where.zone = zone;

    const locations = await prisma.storageLocation.findMany({
      where,
      include: {
        productStocks: {
          include: { product: true }
        },
        _count: { select: { productStocks: true } }
      },
      orderBy: { code: 'asc' }
    });

    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения ячеек' });
  }
});

// Create location
router.post(
  '/:warehouseId/locations',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('code').notEmpty().withMessage('Введите код ячейки'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { warehouseId } = req.params;
    const { code, name, type, length, width, height, maxVolume, maxWeight, zone, row, level } = req.body;

    try {
      const location = await prisma.storageLocation.create({
        data: {
          warehouseId,
          code,
          name,
          type,
          length,
          width,
          height,
          maxVolume,
          maxWeight,
          zone,
          row,
          level
        }
      });

      res.status(201).json({ success: true, data: location });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'Ячейка с таким кодом уже существует на этом складе' });
      }
      console.error('Create location error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания ячейки' });
    }
  }
);

// Update location
router.put(
  '/locations/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const data = req.body;

    try {
      const location = await prisma.storageLocation.update({
        where: { id },
        data
      });

      res.json({ success: true, data: location });
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления ячейки' });
    }
  }
);

// Delete location
router.delete(
  '/locations/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      await prisma.storageLocation.delete({ where: { id } });
      res.json({ success: true, message: 'Ячейка удалена' });
    } catch (error) {
      console.error('Delete location error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления ячейки' });
    }
  }
);

export default router;
