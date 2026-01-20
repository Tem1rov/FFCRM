import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get income operations for an order
router.get('/order/:orderId', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { orderId } = req.params;

  try {
    const operations = await prisma.incomeOperation.findMany({
      where: { orderId },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: operations });
  } catch (error) {
    console.error('Get income operations error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения приходных операций' });
  }
});

// Create income operation (payment)
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('orderId').notEmpty().withMessage('Укажите заказ'),
    body('invoiceAmount').isNumeric().withMessage('Укажите сумму счета'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const {
      orderId,
      invoiceAmount,
      paidAmount,
      paymentMethod,
      paymentDate,
      description,
    } = req.body;

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { clientId: true },
      });

      if (!order) {
        return res.status(404).json({ success: false, error: 'Заказ не найден' });
      }

      const operation = await prisma.incomeOperation.create({
        data: {
          orderId,
          clientId: order.clientId,
          invoiceAmount,
          paidAmount: paidAmount || 0,
          paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          description,
        },
        include: {
          client: { select: { id: true, name: true } },
        },
      });

      // Update order income
      const totalIncome = await prisma.incomeOperation.aggregate({
        where: { orderId },
        _sum: { paidAmount: true },
      });

      const currentOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { actualCost: true },
      });

      const income = totalIncome._sum.paidAmount?.toNumber() || 0;
      const cost = currentOrder?.actualCost.toNumber() || 0;
      const profit = income - cost;

      await prisma.order.update({
        where: { id: orderId },
        data: {
          totalIncome: income,
          profit,
          marginPercent: income > 0 ? (profit / income) * 100 : 0,
        },
      });

      res.status(201).json({ success: true, data: operation });
    } catch (error) {
      console.error('Create income operation error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания приходной операции' });
    }
  }
);

// Record payment
router.post(
  '/:id/payment',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('amount').isNumeric().withMessage('Укажите сумму платежа'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { amount, paymentMethod, paymentDate } = req.body;

    try {
      const current = await prisma.incomeOperation.findUnique({ where: { id } });

      if (!current) {
        return res.status(404).json({ success: false, error: 'Операция не найдена' });
      }

      const newPaidAmount = current.paidAmount.toNumber() + amount;

      const operation = await prisma.incomeOperation.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          paymentMethod,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        },
      });

      // Update order
      const totalIncome = await prisma.incomeOperation.aggregate({
        where: { orderId: current.orderId },
        _sum: { paidAmount: true },
      });

      const order = await prisma.order.findUnique({
        where: { id: current.orderId },
        select: { actualCost: true },
      });

      const income = totalIncome._sum.paidAmount?.toNumber() || 0;
      const cost = order?.actualCost.toNumber() || 0;
      const profit = income - cost;

      await prisma.order.update({
        where: { id: current.orderId },
        data: {
          totalIncome: income,
          profit,
          marginPercent: income > 0 ? (profit / income) * 100 : 0,
        },
      });

      res.json({ success: true, data: operation });
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json({ success: false, error: 'Ошибка записи платежа' });
    }
  }
);

// Update income operation
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { invoiceAmount, paidAmount, paymentMethod, description } = req.body;

    try {
      const operation = await prisma.incomeOperation.update({
        where: { id },
        data: {
          invoiceAmount,
          paidAmount,
          paymentMethod,
          description,
        },
      });

      res.json({ success: true, data: operation });
    } catch (error) {
      console.error('Update income operation error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления операции' });
    }
  }
);

// Delete income operation
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      const operation = await prisma.incomeOperation.findUnique({ where: { id } });

      if (!operation) {
        return res.status(404).json({ success: false, error: 'Операция не найдена' });
      }

      await prisma.incomeOperation.delete({ where: { id } });

      res.json({ success: true, message: 'Операция удалена' });
    } catch (error) {
      console.error('Delete income operation error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления операции' });
    }
  }
);

export default router;
