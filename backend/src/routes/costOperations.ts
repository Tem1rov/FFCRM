import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get cost operations for an order
router.get('/order/:orderId', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { orderId } = req.params;

  try {
    const operations = await prisma.costOperation.findMany({
      where: { orderId },
      include: {
        vendor: { select: { id: true, name: true } },
        vendorService: { select: { id: true, name: true, type: true, unit: true } },
      },
      orderBy: { operationDate: 'desc' },
    });

    res.json({ success: true, data: operations });
  } catch (error) {
    console.error('Get cost operations error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения расходных операций' });
  }
});

// Create cost operation
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('orderId').notEmpty().withMessage('Укажите заказ'),
    body('vendorId').notEmpty().withMessage('Укажите поставщика'),
    body('vendorServiceId').notEmpty().withMessage('Укажите услугу'),
    body('quantity').isNumeric().withMessage('Укажите количество'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const {
      orderId,
      vendorId,
      vendorServiceId,
      operationType,
      quantity,
      actualAmount,
      description,
    } = req.body;

    try {
      // Get service price
      const service = await prisma.vendorService.findUnique({
        where: { id: vendorServiceId },
      });

      if (!service) {
        return res.status(404).json({ success: false, error: 'Услуга не найдена' });
      }

      const unitPrice = service.price.toNumber();
      const calculatedAmount = quantity * unitPrice;

      const operation = await prisma.costOperation.create({
        data: {
          orderId,
          vendorId,
          vendorServiceId,
          operationType: operationType || 'CHARGE',
          quantity,
          unitPrice,
          calculatedAmount,
          actualAmount: actualAmount || calculatedAmount,
          description,
        },
        include: {
          vendor: { select: { id: true, name: true } },
          vendorService: { select: { id: true, name: true, type: true } },
        },
      });

      // Update order costs
      const totalCost = await prisma.costOperation.aggregate({
        where: { orderId },
        _sum: { actualAmount: true },
      });

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { totalIncome: true },
      });

      const newCost = totalCost._sum.actualAmount?.toNumber() || 0;
      const income = order?.totalIncome.toNumber() || 0;
      const profit = income - newCost;

      await prisma.order.update({
        where: { id: orderId },
        data: {
          actualCost: newCost,
          profit,
          marginPercent: income > 0 ? (profit / income) * 100 : 0,
        },
      });

      res.status(201).json({ success: true, data: operation });
    } catch (error) {
      console.error('Create cost operation error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания расходной операции' });
    }
  }
);

// Update cost operation
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { quantity, actualAmount, description } = req.body;

    try {
      const current = await prisma.costOperation.findUnique({ where: { id } });

      if (!current) {
        return res.status(404).json({ success: false, error: 'Операция не найдена' });
      }

      const calculatedAmount = quantity 
        ? quantity * current.unitPrice.toNumber() 
        : current.calculatedAmount;

      const operation = await prisma.costOperation.update({
        where: { id },
        data: {
          quantity: quantity || current.quantity,
          calculatedAmount,
          actualAmount: actualAmount || calculatedAmount,
          description,
        },
      });

      res.json({ success: true, data: operation });
    } catch (error) {
      console.error('Update cost operation error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления операции' });
    }
  }
);

// Delete cost operation
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      const operation = await prisma.costOperation.findUnique({ where: { id } });

      if (!operation) {
        return res.status(404).json({ success: false, error: 'Операция не найдена' });
      }

      await prisma.costOperation.delete({ where: { id } });

      // Recalculate order
      const totalCost = await prisma.costOperation.aggregate({
        where: { orderId: operation.orderId },
        _sum: { actualAmount: true },
      });

      const order = await prisma.order.findUnique({
        where: { id: operation.orderId },
        select: { totalIncome: true },
      });

      const newCost = totalCost._sum.actualAmount?.toNumber() || 0;
      const income = order?.totalIncome.toNumber() || 0;
      const profit = income - newCost;

      await prisma.order.update({
        where: { id: operation.orderId },
        data: {
          actualCost: newCost,
          profit,
          marginPercent: income > 0 ? (profit / income) * 100 : 0,
        },
      });

      res.json({ success: true, message: 'Операция удалена' });
    } catch (error) {
      console.error('Delete cost operation error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления операции' });
    }
  }
);

export default router;
