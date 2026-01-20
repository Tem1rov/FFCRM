import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all products with stock info
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { search, category, isActive } = req.query;

  try {
    const where: any = {};
    
    if (search) {
      where.OR = [
        { sku: { contains: search as string } },
        { name: { contains: search as string } },
        { barcode: { contains: search as string } }
      ];
    }
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const products = await prisma.product.findMany({
      where,
      include: {
        stocks: {
          include: {
            storageLocation: {
              include: { warehouse: true }
            }
          }
        },
        _count: { select: { stocks: true, stockMovements: true } }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate total stock for each product
    const productsWithTotals = products.map(product => {
      const totalQuantity = product.stocks.reduce((sum, s) => sum + s.quantity, 0);
      const totalReserved = product.stocks.reduce((sum, s) => sum + s.reservedQty, 0);
      const totalAvailable = product.stocks.reduce((sum, s) => sum + s.availableQty, 0);
      
      return {
        ...product,
        totalQuantity,
        totalReserved,
        totalAvailable
      };
    });

    res.json({ success: true, data: productsWithTotals });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения товаров' });
  }
});

// Get all stocks (optionally filtered by warehouse) - must be before /:id route
router.get('/stocks', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { warehouseId, productId } = req.query;

  try {
    const where: any = {};
    
    if (productId) {
      where.productId = productId;
    }
    
    if (warehouseId) {
      where.storageLocation = { warehouseId };
    }

    const stocks = await prisma.productStock.findMany({
      where,
      include: {
        product: {
          select: { id: true, sku: true, name: true, category: true }
        },
        storageLocation: {
          include: { warehouse: { select: { id: true, name: true, code: true } } }
        }
      },
      orderBy: [
        { product: { name: 'asc' } },
        { storageLocation: { code: 'asc' } }
      ]
    });

    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error('Get stocks error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения остатков' });
  }
});

// Get product by SKU or barcode - must be before /:id route
router.get('/lookup/:code', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { code } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: code },
          { barcode: code }
        ]
      },
      include: {
        stocks: {
          where: { availableQty: { gt: 0 } },
          include: {
            storageLocation: {
              include: { warehouse: true }
            }
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Товар не найден' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Lookup product error:', error);
    res.status(500).json({ success: false, error: 'Ошибка поиска товара' });
  }
});

// Get product by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stocks: {
          include: {
            storageLocation: {
              include: { warehouse: true }
            }
          }
        },
        stockMovements: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            fromLocation: true,
            toLocation: true,
            task: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Товар не найден' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения товара' });
  }
});

// Create product
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('sku').notEmpty().withMessage('Введите артикул'),
    body('name').notEmpty().withMessage('Введите название товара'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { sku, barcode, name, description, category, unitWeight, unitVolume, unitCost, unitPrice, imageUrl, minStock } = req.body;

    try {
      const product = await prisma.product.create({
        data: {
          sku,
          barcode,
          name,
          description,
          category,
          unitWeight: unitWeight || 0,
          unitVolume: unitVolume || 0,
          unitCost: unitCost || 0,
          unitPrice: unitPrice || 0,
          imageUrl,
          minStock: minStock || 0
        }
      });

      res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'Товар с таким артикулом или штрихкодом уже существует' });
      }
      console.error('Create product error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания товара' });
    }
  }
);

// Update product
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const data = req.body;

    try {
      const product = await prisma.product.update({
        where: { id },
        data
      });

      res.json({ success: true, data: product });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления товара' });
    }
  }
);

// Delete product
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      await prisma.product.delete({ where: { id } });
      res.json({ success: true, message: 'Товар удален' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления товара' });
    }
  }
);

// ==================== STOCK OPERATIONS ====================

// Get stock for a product across all locations
router.get('/:productId/stock', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { productId } = req.params;

  try {
    const stocks = await prisma.productStock.findMany({
      where: { productId },
      include: {
        storageLocation: {
          include: { warehouse: true }
        }
      }
    });

    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения остатков' });
  }
});

// Adjust stock (manual correction)
router.post(
  '/:productId/adjust',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  [
    body('locationId').notEmpty().withMessage('Укажите ячейку'),
    body('quantity').isInt().withMessage('Укажите количество'),
    body('reason').notEmpty().withMessage('Укажите причину корректировки'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { productId } = req.params;
    const { locationId, quantity, reason, batchNumber } = req.body;

    try {
      await prisma.$transaction(async (tx) => {
        // Find or create stock record
        let stock = await tx.productStock.findFirst({
          where: {
            productId,
            storageLocationId: locationId,
            batchNumber: batchNumber || null
          }
        });

        const oldQty = stock?.quantity || 0;
        const newQty = quantity;
        const diff = newQty - oldQty;

        if (stock) {
          // Update existing stock
          await tx.productStock.update({
            where: { id: stock.id },
            data: {
              quantity: newQty,
              availableQty: newQty - stock.reservedQty,
              lastMovementAt: new Date()
            }
          });
        } else {
          // Create new stock
          await tx.productStock.create({
            data: {
              productId,
              storageLocationId: locationId,
              quantity: newQty,
              availableQty: newQty,
              batchNumber
            }
          });
        }

        // Create movement record
        await tx.stockMovement.create({
          data: {
            productId,
            toLocationId: locationId,
            quantity: diff,
            movementType: 'ADJUSTMENT',
            reason,
            batchNumber,
            createdBy: req.user!.userId
          }
        });

        // Update location status
        const locationStocks = await tx.productStock.findMany({
          where: { storageLocationId: locationId }
        });
        const totalQty = locationStocks.reduce((sum, s) => sum + s.quantity, 0);
        
        await tx.storageLocation.update({
          where: { id: locationId },
          data: { status: totalQty > 0 ? 'OCCUPIED' : 'FREE' }
        });
      });

      res.json({ success: true, message: 'Остаток скорректирован' });
    } catch (error) {
      console.error('Adjust stock error:', error);
      res.status(500).json({ success: false, error: 'Ошибка корректировки остатка' });
    }
  }
);

export default router;
