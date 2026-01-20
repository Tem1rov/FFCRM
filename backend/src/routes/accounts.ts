import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all accounts
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { type, isActive } = req.query;

  try {
    const where: any = {};

    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения счетов' });
  }
});

// Get single account with recent transactions
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  try {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        debitTransactions: {
          orderBy: { transactionDate: 'desc' },
          take: 50,
          include: {
            creditAccount: { select: { code: true, name: true } },
          },
        },
        creditTransactions: {
          orderBy: { transactionDate: 'desc' },
          take: 50,
          include: {
            debitAccount: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({ success: false, error: 'Счет не найден' });
    }

    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения счета' });
  }
});

// Get account balance sheet (оборотно-сальдовая ведомость)
router.get(
  '/:id/balance-sheet',
  authenticate,
  authorize('ADMIN', 'ANALYST'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { dateFrom, dateTo } = req.query;

    try {
      const account = await prisma.account.findUnique({ where: { id } });

      if (!account) {
        return res.status(404).json({ success: false, error: 'Счет не найден' });
      }

      const dateFilter: any = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom as string);
      if (dateTo) dateFilter.lte = new Date(dateTo as string);

      const where = Object.keys(dateFilter).length > 0 
        ? { transactionDate: dateFilter } 
        : {};

      // Get debit turnover
      const debitTurnover = await prisma.finTransaction.aggregate({
        where: { debitAccountId: id, ...where },
        _sum: { amount: true },
      });

      // Get credit turnover
      const creditTurnover = await prisma.finTransaction.aggregate({
        where: { creditAccountId: id, ...where },
        _sum: { amount: true },
      });

      const debit = debitTurnover._sum.amount?.toNumber() || 0;
      const credit = creditTurnover._sum.amount?.toNumber() || 0;

      res.json({
        success: true,
        data: {
          account: {
            code: account.code,
            name: account.name,
            type: account.type,
          },
          period: {
            from: dateFrom || 'начало',
            to: dateTo || 'настоящее время',
          },
          openingBalance: account.balance.toNumber(), // Simplified: should calculate from start
          debitTurnover: debit,
          creditTurnover: credit,
          closingBalance: account.balance.toNumber() + debit - credit,
        },
      });
    } catch (error) {
      console.error('Get balance sheet error:', error);
      res.status(500).json({ success: false, error: 'Ошибка получения ведомости' });
    }
  }
);

// Create account (Admin only)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('code').notEmpty().withMessage('Введите код счета'),
    body('name').notEmpty().withMessage('Введите название счета'),
    body('type').isIn(['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY'])
      .withMessage('Неверный тип счета'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { code, name, type, description, currency } = req.body;

    try {
      const account = await prisma.account.create({
        data: {
          code,
          name,
          type,
          description,
          currency: currency || 'RUB',
        },
      });

      res.status(201).json({ success: true, data: account });
    } catch (error) {
      console.error('Create account error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания счета' });
    }
  }
);

// Update account
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    try {
      const account = await prisma.account.update({
        where: { id },
        data: { name, description, isActive },
      });

      res.json({ success: true, data: account });
    } catch (error) {
      console.error('Update account error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления счета' });
    }
  }
);

export default router;
