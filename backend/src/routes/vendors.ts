import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all vendors
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { status, search } = req.query;

  try {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { legalName: { contains: search as string } },
        { inn: { contains: search as string } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: { services: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения поставщиков' });
  }
});

// Get single vendor with services
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { type: 'asc' },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Поставщик не найден' });
    }

    res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения поставщика' });
  }
});

// Create vendor
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('name').notEmpty().withMessage('Введите название поставщика'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const {
      name,
      legalName,
      inn,
      kpp,
      address,
      contactName,
      contactPhone,
      contactEmail,
      status,
      notes,
    } = req.body;

    try {
      const vendor = await prisma.vendor.create({
        data: {
          name,
          legalName,
          inn,
          kpp,
          address,
          contactName,
          contactPhone,
          contactEmail,
          status: status || 'ACTIVE',
          notes,
        },
      });

      res.status(201).json({ success: true, data: vendor });
    } catch (error) {
      console.error('Create vendor error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания поставщика' });
    }
  }
);

// Update vendor
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const {
      name,
      legalName,
      inn,
      kpp,
      address,
      contactName,
      contactPhone,
      contactEmail,
      status,
      notes,
    } = req.body;

    try {
      const vendor = await prisma.vendor.update({
        where: { id },
        data: {
          name,
          legalName,
          inn,
          kpp,
          address,
          contactName,
          contactPhone,
          contactEmail,
          status,
          notes,
        },
      });

      res.json({ success: true, data: vendor });
    } catch (error) {
      console.error('Update vendor error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления поставщика' });
    }
  }
);

// Delete vendor
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      await prisma.vendor.delete({ where: { id } });
      res.json({ success: true, message: 'Поставщик удален' });
    } catch (error) {
      console.error('Delete vendor error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления поставщика' });
    }
  }
);

export default router;
