import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Role types as strings since SQLite doesn't support enums
type UserRole = 'ADMIN' | 'MANAGER' | 'ANALYST';

interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Требуется авторизация',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Недействительный токен',
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Недостаточно прав для выполнения операции',
      });
    }

    next();
  };
};
