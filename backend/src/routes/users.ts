import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all users (Admin only)
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;

    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ success: false, error: 'Ошибка получения пользователей' });
    }
  }
);

// Create user (Admin only)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('email').isEmail().withMessage('Введите корректный email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Пароль должен быть не менее 6 символов'),
    body('firstName').notEmpty().withMessage('Введите имя'),
    body('lastName').notEmpty().withMessage('Введите фамилию'),
    body('role').isIn(['ADMIN', 'MANAGER', 'ANALYST']).withMessage('Неверная роль'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { email, password, firstName, lastName, role, phone } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          phone,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          createdAt: true,
        },
      });

      res.status(201).json({ success: true, data: user });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания пользователя' });
    }
  }
);

// Update user (Admin only)
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { email, firstName, lastName, role, phone, isActive, password } = req.body;

    try {
      const updateData: any = {
        email,
        firstName,
        lastName,
        role,
        phone,
        isActive,
      };

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          isActive: true,
          updatedAt: true,
        },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления пользователя' });
    }
  }
);

// Delete user (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      // Prevent self-deletion
      if (id === req.user!.userId) {
        return res.status(400).json({
          success: false,
          error: 'Нельзя удалить собственный аккаунт',
        });
      }

      await prisma.user.delete({ where: { id } });

      res.json({ success: true, message: 'Пользователь удален' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления пользователя' });
    }
  }
);

export default router;
