import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { createWriteOffEntry } from '../utils/financeHelpers';

const router = Router();

// Get all stock movements with filters
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { productId, movementType, warehouseId, fromDate, toDate, limit } = req.query;

  try {
    const where: any = {};
    
    if (productId) where.productId = productId;
    if (movementType) where.movementType = movementType;
    
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate as string);
      if (toDate) where.createdAt.lte = new Date(toDate as string);
    }

    // Filter by warehouse through locations
    if (warehouseId) {
      where.OR = [
        { fromLocation: { warehouseId } },
        { toLocation: { warehouseId } }
      ];
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: { id: true, sku: true, name: true }
        },
        fromLocation: {
          include: { warehouse: { select: { id: true, name: true, code: true } } }
        },
        toLocation: {
          include: { warehouse: { select: { id: true, name: true, code: true } } }
        },
        task: {
          select: { id: true, taskNumber: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 100
    });

    res.json({ success: true, data: movements });
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения движений' });
  }
});

// Get movements for a product
router.get('/product/:productId', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { productId } = req.params;
  const { limit } = req.query;

  try {
    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      include: {
        fromLocation: {
          include: { warehouse: { select: { name: true, code: true } } }
        },
        toLocation: {
          include: { warehouse: { select: { name: true, code: true } } }
        },
        task: {
          select: { taskNumber: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 50
    });

    res.json({ success: true, data: movements });
  } catch (error) {
    console.error('Get product movements error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения движений товара' });
  }
});

// Get movements for a location
router.get('/location/:locationId', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { locationId } = req.params;
  const { limit } = req.query;

  try {
    const movements = await prisma.stockMovement.findMany({
      where: {
        OR: [
          { fromLocationId: locationId },
          { toLocationId: locationId }
        ]
      },
      include: {
        product: {
          select: { sku: true, name: true }
        },
        fromLocation: true,
        toLocation: true,
        task: {
          select: { taskNumber: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 50
    });

    res.json({ success: true, data: movements });
  } catch (error) {
    console.error('Get location movements error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения движений по ячейке' });
  }
});

// Create inbound movement (receive stock)
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'WAREHOUSE'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { productId, toLocationId, quantity, movementType, batchNumber, reason } = req.body;

    if (!productId || !toLocationId || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Укажите товар, ячейку и количество' 
      });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Find or create stock record
        const existingStock = await tx.productStock.findFirst({
          where: {
            productId,
            storageLocationId: toLocationId,
            batchNumber: batchNumber || ''
          }
        });

        if (existingStock) {
          await tx.productStock.update({
            where: { id: existingStock.id },
            data: {
              quantity: { increment: quantity },
              availableQty: { increment: quantity },
              lastMovementAt: new Date()
            }
          });
        } else {
          await tx.productStock.create({
            data: {
              productId,
              storageLocationId: toLocationId,
              quantity,
              availableQty: quantity,
              batchNumber: batchNumber || ''
            }
          });
        }

        // Create movement record
        await tx.stockMovement.create({
          data: {
            productId,
            toLocationId,
            quantity,
            movementType: movementType || 'INBOUND',
            batchNumber,
            reason,
            createdBy: req.user!.userId
          }
        });

        // Update location status
        await tx.storageLocation.update({
          where: { id: toLocationId },
          data: { status: 'OCCUPIED' }
        });
      });

      res.status(201).json({ success: true, message: 'Приход товара зарегистрирован' });
    } catch (error: any) {
      console.error('Inbound error:', error);
      res.status(400).json({ success: false, error: error.message || 'Ошибка прихода товара' });
    }
  }
);

// Create manual movement (transfer between locations)
router.post(
  '/transfer',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'WAREHOUSE'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { productId, fromLocationId, toLocationId, quantity, batchNumber, reason } = req.body;

    if (!productId || !fromLocationId || !toLocationId || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Укажите товар, ячейки и количество' 
      });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Check source stock
        const fromStock = await tx.productStock.findFirst({
          where: {
            productId,
            storageLocationId: fromLocationId,
            batchNumber: batchNumber || null
          }
        });

        if (!fromStock || fromStock.availableQty < quantity) {
          throw new Error('Недостаточно товара для перемещения');
        }

        // Decrease from source
        await tx.productStock.update({
          where: { id: fromStock.id },
          data: {
            quantity: { decrement: quantity },
            availableQty: { decrement: quantity },
            lastMovementAt: new Date()
          }
        });

        // Increase at destination
        const toStock = await tx.productStock.findFirst({
          where: {
            productId,
            storageLocationId: toLocationId,
            batchNumber: batchNumber || null
          }
        });

        if (toStock) {
          await tx.productStock.update({
            where: { id: toStock.id },
            data: {
              quantity: { increment: quantity },
              availableQty: { increment: quantity },
              lastMovementAt: new Date()
            }
          });
        } else {
          await tx.productStock.create({
            data: {
              productId,
              storageLocationId: toLocationId,
              quantity,
              availableQty: quantity,
              batchNumber
            }
          });
        }

        // Create movement record
        await tx.stockMovement.create({
          data: {
            productId,
            fromLocationId,
            toLocationId,
            quantity,
            movementType: 'TRANSFER',
            batchNumber,
            reason,
            createdBy: req.user!.userId
          }
        });

        // Update location statuses
        const fromStockAfter = await tx.productStock.aggregate({
          where: { storageLocationId: fromLocationId },
          _sum: { quantity: true }
        });
        
        await tx.storageLocation.update({
          where: { id: fromLocationId },
          data: { 
            status: (fromStockAfter._sum.quantity || 0) > 0 ? 'OCCUPIED' : 'FREE' 
          }
        });

        await tx.storageLocation.update({
          where: { id: toLocationId },
          data: { status: 'OCCUPIED' }
        });
      });

      res.json({ success: true, message: 'Товар перемещен' });
    } catch (error: any) {
      console.error('Transfer error:', error);
      res.status(400).json({ success: false, error: error.message || 'Ошибка перемещения' });
    }
  }
);

// Write off stock
router.post(
  '/write-off',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { productId, locationId, quantity, reason, batchNumber } = req.body;

    if (!productId || !locationId || !quantity || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'Укажите товар, ячейку, количество и причину' 
      });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Check stock
        const stock = await tx.productStock.findFirst({
          where: {
            productId,
            storageLocationId: locationId,
            batchNumber: batchNumber || null
          }
        });

        if (!stock || stock.quantity < quantity) {
          throw new Error('Недостаточно товара для списания');
        }

        // Decrease stock
        await tx.productStock.update({
          where: { id: stock.id },
          data: {
            quantity: { decrement: quantity },
            availableQty: { decrement: Math.min(quantity, stock.availableQty) },
            lastMovementAt: new Date()
          }
        });

        // Create movement record
        await tx.stockMovement.create({
          data: {
            productId,
            fromLocationId: locationId,
            quantity,
            movementType: 'WRITE_OFF',
            batchNumber,
            reason,
            createdBy: req.user!.userId
          }
        });

        // Get product for cost calculation
        const product = await tx.product.findUnique({
          where: { id: productId }
        });

        // Create financial entry for write-off
        if (product && Number(product.unitCost) > 0) {
          const writeOffAmount = Number(product.unitCost) * quantity;
          await createWriteOffEntry(
            tx,
            writeOffAmount,
            `Списание: ${product.name} x${quantity}. ${reason}`
          );
        }

        // Update location status
        const totalAfter = await tx.productStock.aggregate({
          where: { storageLocationId: locationId },
          _sum: { quantity: true }
        });
        
        await tx.storageLocation.update({
          where: { id: locationId },
          data: { 
            status: (totalAfter._sum.quantity || 0) > 0 ? 'OCCUPIED' : 'FREE' 
          }
        });
      });

      res.json({ success: true, message: 'Товар списан' });
    } catch (error: any) {
      console.error('Write-off error:', error);
      res.status(400).json({ success: false, error: error.message || 'Ошибка списания' });
    }
  }
);

// Get movement statistics
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { warehouseId, fromDate, toDate } = req.query;

  try {
    const where: any = {};
    
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate as string);
      if (toDate) where.createdAt.lte = new Date(toDate as string);
    }

    // Get counts by type
    const movements = await prisma.stockMovement.groupBy({
      by: ['movementType'],
      where,
      _count: { id: true },
      _sum: { quantity: true }
    });

    // Get today's movements count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await prisma.stockMovement.count({
      where: {
        createdAt: { gte: today }
      }
    });

    res.json({
      success: true,
      data: {
        byType: movements,
        todayCount
      }
    });
  } catch (error) {
    console.error('Get movement stats error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения статистики' });
  }
});

export default router;
