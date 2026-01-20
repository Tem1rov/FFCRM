import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import * as XLSX from 'xlsx';

const router = Router();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Get all services (optionally by vendor)
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { vendorId, type, isActive } = req.query;

  try {
    const where: any = {};

    if (vendorId) where.vendorId = vendorId;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const services = await prisma.vendorService.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ vendorId: 'asc' }, { type: 'asc' }],
    });

    res.json({ success: true, data: services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения услуг' });
  }
});

// Get single service with price history
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  try {
    const service = await prisma.vendorService.findUnique({
      where: { id },
      include: {
        vendor: true,
        priceHistory: {
          orderBy: { changedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!service) {
      return res.status(404).json({ success: false, error: 'Услуга не найдена' });
    }

    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения услуги' });
  }
});

// Create service
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('vendorId').notEmpty().withMessage('Выберите поставщика'),
    body('name').notEmpty().withMessage('Введите название услуги'),
    body('type').isIn([
      'STORAGE', 'PICKING', 'PACKING', 'SHIPPING', 
      'RECEIVING', 'LABELING', 'RETURNS', 'OTHER'
    ]).withMessage('Неверный тип услуги'),
    body('unit').isIn([
      'PIECE', 'KG', 'CUBIC_METER', 'ORDER', 'PALLET', 'DAY', 'MONTH'
    ]).withMessage('Неверная единица измерения'),
    body('price').isNumeric().withMessage('Введите корректную цену'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const {
      vendorId,
      name,
      type,
      unit,
      price,
      currency,
      minQuantity,
      maxQuantity,
      validFrom,
      validTo,
      notes,
    } = req.body;

    try {
      const service = await prisma.vendorService.create({
        data: {
          vendorId,
          name,
          type,
          unit,
          price,
          currency: currency || 'RUB',
          minQuantity,
          maxQuantity,
          validFrom: validFrom ? new Date(validFrom) : new Date(),
          validTo: validTo ? new Date(validTo) : null,
          notes,
        },
        include: {
          vendor: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ success: true, data: service });
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания услуги' });
    }
  }
);

// Update service (with price history tracking)
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { price, ...updateData } = req.body;

    try {
      // Get current service to track price change
      const currentService = await prisma.vendorService.findUnique({
        where: { id },
      });

      if (!currentService) {
        return res.status(404).json({ success: false, error: 'Услуга не найдена' });
      }

      // If price changed, log to history
      if (price && price !== currentService.price.toNumber()) {
        await prisma.priceHistory.create({
          data: {
            vendorServiceId: id,
            oldPrice: currentService.price,
            newPrice: price,
            changedBy: req.user!.userId,
          },
        });
      }

      const service = await prisma.vendorService.update({
        where: { id },
        data: {
          ...updateData,
          price: price || currentService.price,
        },
        include: {
          vendor: { select: { id: true, name: true } },
        },
      });

      res.json({ success: true, data: service });
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления услуги' });
    }
  }
);

// Delete service
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      await prisma.vendorService.delete({ where: { id } });
      res.json({ success: true, message: 'Услуга удалена' });
    } catch (error) {
      console.error('Delete service error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления услуги' });
    }
  }
);

// Import services from Excel/CSV
router.post(
  '/import/:vendorId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { vendorId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    try {
      // Check vendor exists
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Поставщик не найден' });
      }

      // Parse Excel/CSV
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      const typeMap: Record<string, string> = {
        'хранение': 'STORAGE',
        'комплектация': 'PICKING',
        'упаковка': 'PACKING',
        'доставка': 'SHIPPING',
        'приемка': 'RECEIVING',
        'маркировка': 'LABELING',
        'возврат': 'RETURNS',
        'прочее': 'OTHER',
      };

      const unitMap: Record<string, string> = {
        'шт': 'PIECE', 'штука': 'PIECE',
        'кг': 'KG', 'килограмм': 'KG',
        'куб.м': 'CUBIC_METER', 'м3': 'CUBIC_METER',
        'заказ': 'ORDER',
        'паллета': 'PALLET',
        'день': 'DAY',
        'месяц': 'MONTH',
      };

      const imported: any[] = [];

      for (const row of data as any[]) {
        const name = row['Название'] || row['name'];
        const typeRaw = (row['Тип'] || row['type'] || 'other').toLowerCase();
        const unitRaw = (row['Единица'] || row['unit'] || 'шт').toLowerCase();
        const price = parseFloat(row['Цена'] || row['price'] || 0);

        if (!name || !price) continue;

        const service = await prisma.vendorService.create({
          data: {
            vendorId,
            name,
            type: (typeMap[typeRaw] || 'OTHER') as any,
            unit: (unitMap[unitRaw] || 'PIECE') as any,
            price,
          },
        });

        imported.push(service);
      }

      res.json({
        success: true,
        message: `Импортировано ${imported.length} услуг`,
        data: imported,
      });
    } catch (error) {
      console.error('Import services error:', error);
      res.status(500).json({ success: false, error: 'Ошибка импорта услуг' });
    }
  }
);

export default router;
