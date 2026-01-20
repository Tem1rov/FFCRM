import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Категории расходов
const EXPENSE_CATEGORIES = {
  PACKAGING: { name: 'Упаковка', description: 'Пакеты, коробки, материалы' },
  LABOR: { name: 'ФОТ', description: 'Фонд оплаты труда сотрудников' },
  RENT: { name: 'Аренда', description: 'Аренда склада/оборудования' },
  LOGISTICS: { name: 'Логистика', description: 'Доставка, транспорт' },
  MATERIALS: { name: 'Материалы', description: 'Расходные материалы' },
  OTHER: { name: 'Прочее', description: 'Другие расходы' },
};

// Получить список категорий расходов
router.get('/categories', authenticate, async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: Object.entries(EXPENSE_CATEGORIES).map(([key, value]) => ({
      id: key,
      ...value,
    })),
  });
});

// Получить все расходы заказа
router.get(
  '/order/:orderId',
  authenticate,
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { orderId } = req.params;

    try {
      const expenses = await prisma.orderExpense.findMany({
        where: { orderId },
        include: {
          vendor: { select: { id: true, name: true } },
          vendorService: { select: { id: true, name: true, type: true, unit: true, price: true } },
        },
        orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      });

      // Группировка по категориям
      const byCategory = expenses.reduce((acc, expense) => {
        if (!acc[expense.category]) {
          acc[expense.category] = {
            category: expense.category,
            categoryName: EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES]?.name || expense.category,
            items: [],
            totalPlanned: 0,
            totalActual: 0,
          };
        }
        acc[expense.category].items.push(expense);
        acc[expense.category].totalPlanned += Number(expense.plannedAmount);
        acc[expense.category].totalActual += Number(expense.actualAmount || expense.totalAmount);
        return acc;
      }, {} as Record<string, any>);

      // Итоги
      const summary = {
        totalPlanned: expenses.reduce((sum, e) => sum + Number(e.plannedAmount), 0),
        totalActual: expenses.reduce((sum, e) => sum + Number(e.actualAmount || e.totalAmount), 0),
        totalItems: expenses.length,
        byCategory: Object.values(byCategory),
      };

      res.json({
        success: true,
        data: expenses,
        summary,
      });
    } catch (error) {
      console.error('Get order expenses error:', error);
      res.status(500).json({ success: false, error: 'Ошибка получения расходов заказа' });
    }
  }
);

// Добавить расход к заказу
router.post(
  '/order/:orderId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { orderId } = req.params;
    const {
      category,
      subcategory,
      vendorId,
      vendorServiceId,
      description,
      unit,
      quantity,
      unitPrice,
      plannedAmount,
      isPriceLocked,
      notes,
    } = req.body;

    try {
      // Проверяем существование заказа
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return res.status(404).json({ success: false, error: 'Заказ не найден' });
      }

      // Если указана услуга поставщика, получаем актуальную цену
      let actualUnitPrice = unitPrice;
      let originalPrice = null;
      
      if (vendorServiceId) {
        const service = await prisma.vendorService.findUnique({
          where: { id: vendorServiceId },
          include: { vendor: true },
        });
        
        if (service) {
          actualUnitPrice = unitPrice ?? Number(service.price);
          originalPrice = Number(service.price);
        }
      }

      const totalAmount = Number(quantity || 1) * Number(actualUnitPrice || 0);
      const finalPlannedAmount = plannedAmount ?? totalAmount;

      const expense = await prisma.orderExpense.create({
        data: {
          orderId,
          category: category || 'OTHER',
          subcategory,
          vendorId,
          vendorServiceId,
          description: description || 'Расход',
          unit: unit || 'PIECE',
          quantity: quantity || 1,
          unitPrice: actualUnitPrice || 0,
          totalAmount,
          plannedAmount: finalPlannedAmount,
          actualAmount: 0,
          isPriceLocked: isPriceLocked || false,
          priceLockedAt: isPriceLocked ? new Date() : null,
          originalPrice,
          status: 'PLANNED',
          notes,
        },
        include: {
          vendor: { select: { id: true, name: true } },
          vendorService: { select: { id: true, name: true, type: true, unit: true, price: true } },
        },
      });

      // Пересчитать стоимость заказа
      await recalculateOrderCost(prisma, orderId);

      res.status(201).json({ success: true, data: expense });
    } catch (error) {
      console.error('Create order expense error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания расхода' });
    }
  }
);

// Обновить расход
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const {
      category,
      subcategory,
      vendorId,
      vendorServiceId,
      description,
      unit,
      quantity,
      unitPrice,
      plannedAmount,
      actualAmount,
      isPriceLocked,
      status,
      notes,
    } = req.body;

    try {
      const existing = await prisma.orderExpense.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Расход не найден' });
      }

      const newQuantity = quantity ?? existing.quantity;
      const newUnitPrice = unitPrice ?? existing.unitPrice;
      const newTotalAmount = Number(newQuantity) * Number(newUnitPrice);

      const expense = await prisma.orderExpense.update({
        where: { id },
        data: {
          category,
          subcategory,
          vendorId,
          vendorServiceId,
          description,
          unit,
          quantity: newQuantity,
          unitPrice: newUnitPrice,
          totalAmount: newTotalAmount,
          plannedAmount: plannedAmount ?? newTotalAmount,
          actualAmount,
          isPriceLocked,
          priceLockedAt: isPriceLocked && !existing.isPriceLocked ? new Date() : existing.priceLockedAt,
          status,
          notes,
        },
        include: {
          vendor: { select: { id: true, name: true } },
          vendorService: { select: { id: true, name: true, type: true, unit: true, price: true } },
        },
      });

      // Пересчитать стоимость заказа
      await recalculateOrderCost(prisma, existing.orderId);

      res.json({ success: true, data: expense });
    } catch (error) {
      console.error('Update order expense error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления расхода' });
    }
  }
);

// Удалить расход
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      const expense = await prisma.orderExpense.findUnique({ where: { id } });
      if (!expense) {
        return res.status(404).json({ success: false, error: 'Расход не найден' });
      }

      await prisma.orderExpense.delete({ where: { id } });

      // Пересчитать стоимость заказа
      await recalculateOrderCost(prisma, expense.orderId);

      res.json({ success: true, message: 'Расход удален' });
    } catch (error) {
      console.error('Delete order expense error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления расхода' });
    }
  }
);

// Массовое добавление расходов (из шаблона)
router.post(
  '/order/:orderId/bulk',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { orderId } = req.params;
    const { expenses } = req.body;

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({ success: false, error: 'Необходимо указать массив расходов' });
    }

    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return res.status(404).json({ success: false, error: 'Заказ не найден' });
      }

      const createdExpenses = [];
      
      for (const expenseData of expenses) {
        const {
          category,
          subcategory,
          vendorId,
          vendorServiceId,
          description,
          unit,
          quantity,
          unitPrice,
          notes,
        } = expenseData;

        let actualUnitPrice = unitPrice;
        let originalPrice = null;

        if (vendorServiceId) {
          const service = await prisma.vendorService.findUnique({ where: { id: vendorServiceId } });
          if (service) {
            actualUnitPrice = unitPrice ?? Number(service.price);
            originalPrice = Number(service.price);
          }
        }

        const totalAmount = Number(quantity || 1) * Number(actualUnitPrice || 0);

        const expense = await prisma.orderExpense.create({
          data: {
            orderId,
            category: category || 'OTHER',
            subcategory,
            vendorId,
            vendorServiceId,
            description: description || 'Расход',
            unit: unit || 'PIECE',
            quantity: quantity || 1,
            unitPrice: actualUnitPrice || 0,
            totalAmount,
            plannedAmount: totalAmount,
            actualAmount: 0,
            originalPrice,
            status: 'PLANNED',
            notes,
          },
        });
        createdExpenses.push(expense);
      }

      await recalculateOrderCost(prisma, orderId);

      res.status(201).json({ success: true, data: createdExpenses, count: createdExpenses.length });
    } catch (error) {
      console.error('Bulk create expenses error:', error);
      res.status(500).json({ success: false, error: 'Ошибка массового создания расходов' });
    }
  }
);

// Клонировать расходы из другого заказа
router.post(
  '/order/:orderId/clone/:sourceOrderId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { orderId, sourceOrderId } = req.params;

    try {
      const [order, sourceExpenses] = await Promise.all([
        prisma.order.findUnique({ where: { id: orderId } }),
        prisma.orderExpense.findMany({ where: { orderId: sourceOrderId } }),
      ]);

      if (!order) {
        return res.status(404).json({ success: false, error: 'Целевой заказ не найден' });
      }

      if (sourceExpenses.length === 0) {
        return res.status(404).json({ success: false, error: 'У исходного заказа нет расходов' });
      }

      const createdExpenses = [];

      for (const src of sourceExpenses) {
        // Получить актуальную цену услуги, если она привязана
        let unitPrice = Number(src.unitPrice);
        let originalPrice = src.originalPrice ? Number(src.originalPrice) : null;

        if (src.vendorServiceId) {
          const service = await prisma.vendorService.findUnique({ where: { id: src.vendorServiceId } });
          if (service) {
            unitPrice = Number(service.price);
            originalPrice = Number(service.price);
          }
        }

        const totalAmount = Number(src.quantity) * unitPrice;

        const expense = await prisma.orderExpense.create({
          data: {
            orderId,
            category: src.category,
            subcategory: src.subcategory,
            vendorId: src.vendorId,
            vendorServiceId: src.vendorServiceId,
            description: src.description,
            unit: src.unit,
            quantity: src.quantity,
            unitPrice,
            totalAmount,
            plannedAmount: totalAmount,
            actualAmount: 0,
            originalPrice,
            status: 'PLANNED',
            notes: src.notes,
          },
        });
        createdExpenses.push(expense);
      }

      await recalculateOrderCost(prisma, orderId);

      res.status(201).json({
        success: true,
        data: createdExpenses,
        count: createdExpenses.length,
        message: `Скопировано ${createdExpenses.length} расходов`,
      });
    } catch (error) {
      console.error('Clone expenses error:', error);
      res.status(500).json({ success: false, error: 'Ошибка клонирования расходов' });
    }
  }
);

// Получить шаблоны расходов
router.get('/templates', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;

  try {
    const templates = await prisma.expenseTemplate.findMany({
      where: { isActive: true },
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

// Применить шаблон к заказу
router.post(
  '/order/:orderId/apply-template/:templateId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { orderId, templateId } = req.params;

    try {
      const [order, template] = await Promise.all([
        prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        }),
        prisma.expenseTemplate.findUnique({
          where: { id: templateId },
          include: {
            items: {
              include: { vendorService: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        }),
      ]);

      if (!order) {
        return res.status(404).json({ success: false, error: 'Заказ не найден' });
      }

      if (!template) {
        return res.status(404).json({ success: false, error: 'Шаблон не найден' });
      }

      const createdExpenses = [];
      const orderItemsCount = order.items.length;
      const totalWeight = order.items.reduce((sum, item) => sum + Number(item.weight) * item.quantity, 0);
      const totalVolume = order.items.reduce((sum, item) => sum + Number(item.volume) * item.quantity, 0);

      for (const item of template.items) {
        let quantity = Number(item.defaultQuantity);

        // Применить формулу расчета количества
        if (item.quantityFormula) {
          try {
            const formula = item.quantityFormula
              .replace(/itemsCount/g, String(orderItemsCount))
              .replace(/totalWeight/g, String(totalWeight))
              .replace(/totalVolume/g, String(totalVolume));
            quantity = Math.ceil(eval(formula));
          } catch (e) {
            // Используем дефолтное количество при ошибке в формуле
          }
        }

        let unitPrice = Number(item.defaultPrice);
        let originalPrice = null;

        if (item.vendorServiceId && item.vendorService) {
          unitPrice = Number(item.vendorService.price);
          originalPrice = unitPrice;
        }

        const totalAmount = quantity * unitPrice;

        const expense = await prisma.orderExpense.create({
          data: {
            orderId,
            category: item.category,
            subcategory: item.subcategory,
            vendorServiceId: item.vendorServiceId,
            vendorId: item.vendorService?.vendorId,
            description: item.description,
            unit: item.unit,
            quantity,
            unitPrice,
            totalAmount,
            plannedAmount: totalAmount,
            actualAmount: 0,
            originalPrice,
            status: 'PLANNED',
          },
        });
        createdExpenses.push(expense);
      }

      await recalculateOrderCost(prisma, orderId);

      res.status(201).json({
        success: true,
        data: createdExpenses,
        count: createdExpenses.length,
        message: `Применен шаблон "${template.name}"`,
      });
    } catch (error) {
      console.error('Apply template error:', error);
      res.status(500).json({ success: false, error: 'Ошибка применения шаблона' });
    }
  }
);

// Проверить изменения цен поставщиков для расходов заказа
router.get(
  '/order/:orderId/price-changes',
  authenticate,
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { orderId } = req.params;

    try {
      const expenses = await prisma.orderExpense.findMany({
        where: {
          orderId,
          vendorServiceId: { not: null },
          isPriceLocked: false,
        },
        include: {
          vendorService: { select: { id: true, name: true, price: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      const priceChanges = [];

      for (const expense of expenses) {
        if (expense.vendorService && expense.originalPrice) {
          const currentPrice = Number(expense.vendorService.price);
          const originalPrice = Number(expense.originalPrice);

          if (currentPrice !== originalPrice) {
            const diff = currentPrice - originalPrice;
            const diffPercent = ((diff / originalPrice) * 100).toFixed(1);

            priceChanges.push({
              expenseId: expense.id,
              description: expense.description,
              vendor: expense.vendor?.name,
              service: expense.vendorService.name,
              originalPrice,
              currentPrice,
              difference: diff,
              differencePercent: diffPercent,
              potentialImpact: diff * Number(expense.quantity),
            });
          }
        }
      }

      res.json({
        success: true,
        data: priceChanges,
        summary: {
          totalChanges: priceChanges.length,
          totalImpact: priceChanges.reduce((sum, c) => sum + c.potentialImpact, 0),
        },
      });
    } catch (error) {
      console.error('Check price changes error:', error);
      res.status(500).json({ success: false, error: 'Ошибка проверки изменений цен' });
    }
  }
);

// Функция пересчета себестоимости заказа
async function recalculateOrderCost(prisma: PrismaClient, orderId: string) {
  const expenses = await prisma.orderExpense.findMany({
    where: { orderId },
  });

  const totalCost = expenses.reduce((sum, e) => {
    const amount = Number(e.actualAmount) > 0 ? Number(e.actualAmount) : Number(e.totalAmount);
    return sum + amount;
  }, 0);

  // Получаем данные о товарах для расчета выручки
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) return;

  const itemsCost = order.items.reduce((sum, item) => sum + Number(item.unitCost) * item.quantity, 0);
  const itemsRevenue = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

  const actualCost = totalCost + itemsCost;
  const totalIncome = itemsRevenue > 0 ? itemsRevenue : Number(order.totalIncome);
  const profit = totalIncome - actualCost;
  const marginPercent = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      estimatedCost: totalCost,
      actualCost,
      profit,
      marginPercent,
    },
  });
}

export default router;
