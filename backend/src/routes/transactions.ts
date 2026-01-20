import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all transactions with filtering
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'ANALYST'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { 
      accountId, 
      dateFrom, 
      dateTo,
      page = '1',
      limit = '50',
    } = req.query;

    try {
      const where: any = {};

      if (accountId) {
        where.OR = [
          { debitAccountId: accountId },
          { creditAccountId: accountId },
        ];
      }

      if (dateFrom || dateTo) {
        where.transactionDate = {};
        if (dateFrom) where.transactionDate.gte = new Date(dateFrom as string);
        if (dateTo) where.transactionDate.lte = new Date(dateTo as string);
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [transactions, total] = await Promise.all([
        prisma.finTransaction.findMany({
          where,
          include: {
            debitAccount: { select: { code: true, name: true } },
            creditAccount: { select: { code: true, name: true } },
            costOperation: { 
              select: { 
                id: true, 
                order: { select: { orderNumber: true } } 
              } 
            },
            incomeOperation: { 
              select: { 
                id: true, 
                order: { select: { orderNumber: true } } 
              } 
            },
          },
          orderBy: { transactionDate: 'desc' },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.finTransaction.count({ where }),
      ]);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ success: false, error: 'Ошибка получения проводок' });
    }
  }
);

// Create manual transaction (double-entry)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('debitAccountId').notEmpty().withMessage('Укажите дебетовый счет'),
    body('creditAccountId').notEmpty().withMessage('Укажите кредитовый счет'),
    body('amount').isNumeric().custom((value) => value > 0)
      .withMessage('Сумма должна быть положительной'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { debitAccountId, creditAccountId, amount, description, transactionDate } = req.body;

    try {
      // Verify accounts exist
      const [debitAccount, creditAccount] = await Promise.all([
        prisma.account.findUnique({ where: { id: debitAccountId } }),
        prisma.account.findUnique({ where: { id: creditAccountId } }),
      ]);

      if (!debitAccount || !creditAccount) {
        return res.status(404).json({ success: false, error: 'Счет не найден' });
      }

      if (debitAccountId === creditAccountId) {
        return res.status(400).json({
          success: false,
          error: 'Дебетовый и кредитовый счета должны быть разными',
        });
      }

      // Create transaction and update balances
      const transaction = await prisma.$transaction(async (tx) => {
        // Create transaction record
        const txn = await tx.finTransaction.create({
          data: {
            debitAccountId,
            creditAccountId,
            amount,
            description,
            transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          },
          include: {
            debitAccount: { select: { code: true, name: true } },
            creditAccount: { select: { code: true, name: true } },
          },
        });

        // Update debit account balance (increase for ASSET/EXPENSE, decrease for others)
        const debitMultiplier = ['ASSET', 'EXPENSE'].includes(debitAccount.type) ? 1 : -1;
        await tx.account.update({
          where: { id: debitAccountId },
          data: { balance: { increment: amount * debitMultiplier } },
        });

        // Update credit account balance (increase for LIABILITY/REVENUE/EQUITY, decrease for others)
        const creditMultiplier = ['LIABILITY', 'REVENUE', 'EQUITY'].includes(creditAccount.type) ? 1 : -1;
        await tx.account.update({
          where: { id: creditAccountId },
          data: { balance: { increment: amount * creditMultiplier } },
        });

        return txn;
      });

      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания проводки' });
    }
  }
);

// Reverse transaction (create opposite entry)
router.post(
  '/:id/reverse',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { description } = req.body;

    try {
      const original = await prisma.finTransaction.findUnique({ where: { id } });

      if (!original) {
        return res.status(404).json({ success: false, error: 'Проводка не найдена' });
      }

      // Create reverse transaction (swap debit/credit)
      const reverseTransaction = await prisma.$transaction(async (tx) => {
        const reverse = await tx.finTransaction.create({
          data: {
            debitAccountId: original.creditAccountId,
            creditAccountId: original.debitAccountId,
            amount: original.amount,
            description: description || `Сторно проводки ${id}`,
          },
          include: {
            debitAccount: { select: { code: true, name: true } },
            creditAccount: { select: { code: true, name: true } },
          },
        });

        // Reverse balance changes (simplified)
        const [debitAccount, creditAccount] = await Promise.all([
          tx.account.findUnique({ where: { id: original.debitAccountId } }),
          tx.account.findUnique({ where: { id: original.creditAccountId } }),
        ]);

        if (debitAccount) {
          const multiplier = ['ASSET', 'EXPENSE'].includes(debitAccount.type) ? -1 : 1;
          await tx.account.update({
            where: { id: original.debitAccountId },
            data: { balance: { increment: original.amount.toNumber() * multiplier } },
          });
        }

        if (creditAccount) {
          const multiplier = ['LIABILITY', 'REVENUE', 'EQUITY'].includes(creditAccount.type) ? -1 : 1;
          await tx.account.update({
            where: { id: original.creditAccountId },
            data: { balance: { increment: original.amount.toNumber() * multiplier } },
          });
        }

        return reverse;
      });

      res.status(201).json({ success: true, data: reverseTransaction });
    } catch (error) {
      console.error('Reverse transaction error:', error);
      res.status(500).json({ success: false, error: 'Ошибка сторнирования проводки' });
    }
  }
);

export default router;
