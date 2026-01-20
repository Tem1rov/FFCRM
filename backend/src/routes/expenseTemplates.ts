import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Получить все шаблоны
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;

  try {
    const templates = await prisma.expenseTemplate.findMany({
      include: {
        items: {
          include: {
            vendorService: {
              include: { vendor: { select: { id: true, name: true } } },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Get expense templates error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения шаблонов' });
  }
});

// Получить один шаблон
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  try {
    const template = await prisma.expenseTemplate.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            vendorService: {
              include: { vendor: { select: { id: true, name: true } } },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ success: false, error: 'Шаблон не найден' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Get expense template error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения шаблона' });
  }
});

// Создать шаблон
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const {
      name,
      description,
      productCategory,
      minWeight,
      maxWeight,
      deliveryMethod,
      region,
      items,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Название обязательно' });
    }

    try {
      const template = await prisma.expenseTemplate.create({
        data: {
          name,
          description,
          productCategory,
          minWeight,
          maxWeight,
          deliveryMethod,
          region,
          items: {
            create: items?.map((item: any, index: number) => ({
              category: item.category || 'OTHER',
              subcategory: item.subcategory,
              description: item.description,
              vendorServiceId: item.vendorServiceId || null,
              unit: item.unit || 'PIECE',
              defaultQuantity: item.defaultQuantity || 1,
              defaultPrice: item.defaultPrice || 0,
              quantityFormula: item.quantityFormula,
              isRequired: item.isRequired ?? true,
              sortOrder: item.sortOrder ?? index,
            })) || [],
          },
        },
        include: {
          items: {
            include: {
              vendorService: {
                include: { vendor: { select: { id: true, name: true } } },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      res.status(201).json({ success: true, data: template });
    } catch (error) {
      console.error('Create expense template error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания шаблона' });
    }
  }
);

// Обновить шаблон
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const {
      name,
      description,
      productCategory,
      minWeight,
      maxWeight,
      deliveryMethod,
      region,
      isActive,
      items,
    } = req.body;

    try {
      const existing = await prisma.expenseTemplate.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Шаблон не найден' });
      }

      // Удалить старые items и создать новые
      await prisma.expenseTemplateItem.deleteMany({ where: { templateId: id } });

      const template = await prisma.expenseTemplate.update({
        where: { id },
        data: {
          name,
          description,
          productCategory,
          minWeight,
          maxWeight,
          deliveryMethod,
          region,
          isActive,
          items: {
            create: items?.map((item: any, index: number) => ({
              category: item.category || 'OTHER',
              subcategory: item.subcategory,
              description: item.description,
              vendorServiceId: item.vendorServiceId || null,
              unit: item.unit || 'PIECE',
              defaultQuantity: item.defaultQuantity || 1,
              defaultPrice: item.defaultPrice || 0,
              quantityFormula: item.quantityFormula,
              isRequired: item.isRequired ?? true,
              sortOrder: item.sortOrder ?? index,
            })) || [],
          },
        },
        include: {
          items: {
            include: {
              vendorService: {
                include: { vendor: { select: { id: true, name: true } } },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      res.json({ success: true, data: template });
    } catch (error) {
      console.error('Update expense template error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления шаблона' });
    }
  }
);

// Удалить шаблон
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      const existing = await prisma.expenseTemplate.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Шаблон не найден' });
      }

      await prisma.expenseTemplate.delete({ where: { id } });

      res.json({ success: true, message: 'Шаблон удален' });
    } catch (error) {
      console.error('Delete expense template error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления шаблона' });
    }
  }
);

// Дублировать шаблон
router.post(
  '/:id/duplicate',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      const source = await prisma.expenseTemplate.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!source) {
        return res.status(404).json({ success: false, error: 'Шаблон не найден' });
      }

      const template = await prisma.expenseTemplate.create({
        data: {
          name: `${source.name} (копия)`,
          description: source.description,
          productCategory: source.productCategory,
          minWeight: source.minWeight,
          maxWeight: source.maxWeight,
          deliveryMethod: source.deliveryMethod,
          region: source.region,
          items: {
            create: source.items.map((item) => ({
              category: item.category,
              subcategory: item.subcategory,
              description: item.description,
              vendorServiceId: item.vendorServiceId,
              unit: item.unit,
              defaultQuantity: item.defaultQuantity,
              defaultPrice: item.defaultPrice,
              quantityFormula: item.quantityFormula,
              isRequired: item.isRequired,
              sortOrder: item.sortOrder,
            })),
          },
        },
        include: {
          items: {
            include: {
              vendorService: {
                include: { vendor: { select: { id: true, name: true } } },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      res.status(201).json({ success: true, data: template });
    } catch (error) {
      console.error('Duplicate expense template error:', error);
      res.status(500).json({ success: false, error: 'Ошибка дублирования шаблона' });
    }
  }
);

export default router;
