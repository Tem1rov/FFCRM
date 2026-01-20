import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Prisma errors
  if ((err as any).code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Запись с такими данными уже существует',
    });
  }

  if ((err as any).code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Запись не найдена',
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Внутренняя ошибка сервера',
  });
};
