import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Generate task number
async function generateTaskNumber(prisma: PrismaClient): Promise<string> {
  const today = new Date();
  const prefix = `WT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  const lastTask = await prisma.warehouseTask.findFirst({
    where: { taskNumber: { startsWith: prefix } },
    orderBy: { taskNumber: 'desc' }
  });

  let seq = 1;
  if (lastTask) {
    const lastSeq = parseInt(lastTask.taskNumber.split('-').pop() || '0');
    seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

// Get all tasks
router.get('/', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { warehouseId, type, status, assignedToId, orderId } = req.query;

  try {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (orderId) where.orderId = orderId;

    const tasks = await prisma.warehouseTask.findMany({
      where,
      include: {
        warehouse: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true }
        },
        taskItems: {
          include: { task: false }
        },
        _count: { select: { taskItems: true, stockMovements: true } }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения задач' });
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const prisma: PrismaClient = (req as any).prisma;
  const { id } = req.params;

  try {
    const task = await prisma.warehouseTask.findUnique({
      where: { id },
      include: {
        warehouse: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        taskItems: true,
        stockMovements: {
          include: {
            product: true,
            fromLocation: true,
            toLocation: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения задачи' });
  }
});

// Create task
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'WAREHOUSE'),
  [
    body('warehouseId').notEmpty().withMessage('Выберите склад'),
    body('type').notEmpty().withMessage('Выберите тип задачи'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const prisma: PrismaClient = (req as any).prisma;
    const { warehouseId, orderId, type, priority, assignedToId, plannedDate, notes, items } = req.body;

    try {
      const taskNumber = await generateTaskNumber(prisma);

      const task = await prisma.warehouseTask.create({
        data: {
          taskNumber,
          warehouseId,
          orderId,
          type,
          priority: priority || 'NORMAL',
          assignedToId,
          plannedDate: plannedDate ? new Date(plannedDate) : null,
          notes,
          taskItems: items ? {
            create: items.map((item: any) => ({
              productId: item.productId,
              expectedQty: item.expectedQty || 0,
              fromLocationId: item.fromLocationId,
              toLocationId: item.toLocationId,
              notes: item.notes
            }))
          } : undefined
        },
        include: {
          warehouse: true,
          taskItems: true
        }
      });

      res.status(201).json({ success: true, data: task });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ success: false, error: 'Ошибка создания задачи' });
    }
  }
);

// Update task
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'WAREHOUSE'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { status, priority, assignedToId, plannedDate, notes } = req.body;

    try {
      const updateData: any = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
      if (plannedDate) updateData.plannedDate = new Date(plannedDate);
      if (notes !== undefined) updateData.notes = notes;

      // Set timestamps based on status
      if (status === 'IN_PROGRESS') {
        updateData.startedAt = new Date();
      } else if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      const task = await prisma.warehouseTask.update({
        where: { id },
        data: updateData,
        include: {
          warehouse: true,
          assignedTo: true
        }
      });

      res.json({ success: true, data: task });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ success: false, error: 'Ошибка обновления задачи' });
    }
  }
);

// Start task
router.post(
  '/:id/start',
  authenticate,
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      const task = await prisma.warehouseTask.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          assignedToId: req.user!.userId
        }
      });

      res.json({ success: true, data: task });
    } catch (error) {
      console.error('Start task error:', error);
      res.status(500).json({ success: false, error: 'Ошибка начала задачи' });
    }
  }
);

// Complete task item
router.post(
  '/:taskId/items/:itemId/complete',
  authenticate,
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { taskId, itemId } = req.params;
    const { actualQty, toLocationId } = req.body;

    try {
      await prisma.$transaction(async (tx) => {
        const taskItem = await tx.taskItem.findUnique({
          where: { id: itemId },
          include: { task: true }
        });

        if (!taskItem || taskItem.taskId !== taskId) {
          throw new Error('Позиция не найдена');
        }

        // Update task item
        await tx.taskItem.update({
          where: { id: itemId },
          data: {
            actualQty: actualQty || taskItem.expectedQty,
            toLocationId: toLocationId || taskItem.toLocationId,
            isCompleted: true
          }
        });

        // Create stock movement if product specified
        if (taskItem.productId) {
          const task = taskItem.task;
          let movementType = 'TRANSFER';
          
          if (task.type === 'RECEIVING') movementType = 'INBOUND';
          else if (task.type === 'SHIPPING') movementType = 'OUTBOUND';
          else if (task.type === 'INVENTORY') movementType = 'ADJUSTMENT';

          await tx.stockMovement.create({
            data: {
              productId: taskItem.productId,
              fromLocationId: taskItem.fromLocationId,
              toLocationId: toLocationId || taskItem.toLocationId,
              quantity: actualQty || taskItem.expectedQty,
              movementType,
              taskId,
              orderId: task.orderId,
              createdBy: req.user!.userId
            }
          });

          // Update stock
          const qty = actualQty || taskItem.expectedQty;
          const targetLocationId = toLocationId || taskItem.toLocationId;

          if (taskItem.fromLocationId && movementType !== 'INBOUND') {
            // Decrease from source
            const fromStock = await tx.productStock.findFirst({
              where: {
                productId: taskItem.productId,
                storageLocationId: taskItem.fromLocationId
              }
            });

            if (fromStock) {
              await tx.productStock.update({
                where: { id: fromStock.id },
                data: {
                  quantity: { decrement: qty },
                  availableQty: { decrement: qty },
                  lastMovementAt: new Date()
                }
              });
            }
          }

          if (targetLocationId && movementType !== 'OUTBOUND') {
            // Increase at target
            const toStock = await tx.productStock.findFirst({
              where: {
                productId: taskItem.productId,
                storageLocationId: targetLocationId
              }
            });

            if (toStock) {
              await tx.productStock.update({
                where: { id: toStock.id },
                data: {
                  quantity: { increment: qty },
                  availableQty: { increment: qty },
                  lastMovementAt: new Date()
                }
              });
            } else {
              await tx.productStock.create({
                data: {
                  productId: taskItem.productId,
                  storageLocationId: targetLocationId,
                  quantity: qty,
                  availableQty: qty
                }
              });
            }

            // Update location status
            await tx.storageLocation.update({
              where: { id: targetLocationId },
              data: { status: 'OCCUPIED' }
            });
          }
        }

        // Check if all items completed
        const allItems = await tx.taskItem.findMany({
          where: { taskId }
        });
        
        const allCompleted = allItems.every(i => i.isCompleted);
        if (allCompleted) {
          await tx.warehouseTask.update({
            where: { id: taskId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          });
        }
      });

      res.json({ success: true, message: 'Позиция выполнена' });
    } catch (error) {
      console.error('Complete task item error:', error);
      res.status(500).json({ success: false, error: 'Ошибка выполнения позиции' });
    }
  }
);

// Cancel task
router.post(
  '/:id/cancel',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const task = await prisma.warehouseTask.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: reason ? `Отменена: ${reason}` : undefined
        }
      });

      res.json({ success: true, data: task });
    } catch (error) {
      console.error('Cancel task error:', error);
      res.status(500).json({ success: false, error: 'Ошибка отмены задачи' });
    }
  }
);

// Delete task
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response) => {
    const prisma: PrismaClient = (req as any).prisma;
    const { id } = req.params;

    try {
      await prisma.warehouseTask.delete({ where: { id } });
      res.json({ success: true, message: 'Задача удалена' });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ success: false, error: 'Ошибка удаления задачи' });
    }
  }
);

export default router;
