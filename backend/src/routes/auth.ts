import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Введите корректный email'),
    body('password').notEmpty().withMessage('Введите пароль'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Неверный email или пароль',
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Неверный email или пароль',
        });
      }

      const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn } as jwt.SignOptions
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка авторизации',
      });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
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

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
      });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения данных пользователя',
    });
  }
});

// Change password
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Введите текущий пароль'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Новый пароль должен быть не менее 6 символов'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { currentPassword, newPassword } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Пользователь не найден',
        });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);

      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: 'Неверный текущий пароль',
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.json({
        success: true,
        message: 'Пароль успешно изменен',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка изменения пароля',
      });
    }
  }
);

export default router;
