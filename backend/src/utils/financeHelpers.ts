import { PrismaClient, Prisma } from '@prisma/client';

// Helper type for transaction client
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Создает финансовую проводку при приемке товара на склад
 * Дебет: 41 "Товары на складе"
 * Кредит: 60 "Расчеты с поставщиками"
 */
export async function createReceivingEntry(
  tx: TransactionClient,
  amount: number,
  description: string
) {
  const debitAccount = await tx.account.findUnique({ where: { code: '41' } });
  const creditAccount = await tx.account.findUnique({ where: { code: '60' } });

  if (!debitAccount || !creditAccount) {
    console.warn('Accounts 41 or 60 not found, skipping financial entry');
    return null;
  }

  // Create transaction
  const transaction = await tx.finTransaction.create({
    data: {
      debitAccountId: debitAccount.id,
      creditAccountId: creditAccount.id,
      amount: new Prisma.Decimal(amount),
      description,
    }
  });

  // Update account balances
  await tx.account.update({
    where: { id: debitAccount.id },
    data: { balance: { increment: amount } }
  });

  await tx.account.update({
    where: { id: creditAccount.id },
    data: { balance: { increment: amount } }
  });

  return transaction;
}

/**
 * Создает финансовую проводку при отгрузке товара (списание себестоимости)
 * Дебет: 90.2 "Себестоимость продаж"
 * Кредит: 41 "Товары на складе"
 */
export async function createShippingCostEntry(
  tx: TransactionClient,
  amount: number,
  description: string,
  orderId?: string
) {
  const debitAccount = await tx.account.findUnique({ where: { code: '90.2' } });
  const creditAccount = await tx.account.findUnique({ where: { code: '41' } });

  if (!debitAccount || !creditAccount) {
    console.warn('Accounts 90.2 or 41 not found, skipping financial entry');
    return null;
  }

  // Create transaction
  const transaction = await tx.finTransaction.create({
    data: {
      debitAccountId: debitAccount.id,
      creditAccountId: creditAccount.id,
      amount: new Prisma.Decimal(amount),
      description,
    }
  });

  // Update account balances
  await tx.account.update({
    where: { id: debitAccount.id },
    data: { balance: { increment: amount } }
  });

  await tx.account.update({
    where: { id: creditAccount.id },
    data: { balance: { decrement: amount } }
  });

  // Update order actual cost if orderId provided
  if (orderId) {
    await tx.order.update({
      where: { id: orderId },
      data: {
        actualCost: { increment: amount }
      }
    });
  }

  return transaction;
}

/**
 * Создает финансовую проводку при списании/недостаче
 * Дебет: 91.2 "Потери и недостачи"
 * Кредит: 41 "Товары на складе"
 */
export async function createWriteOffEntry(
  tx: TransactionClient,
  amount: number,
  description: string
) {
  const debitAccount = await tx.account.findUnique({ where: { code: '91.2' } });
  const creditAccount = await tx.account.findUnique({ where: { code: '41' } });

  if (!debitAccount || !creditAccount) {
    console.warn('Accounts 91.2 or 41 not found, skipping financial entry');
    return null;
  }

  // Create transaction
  const transaction = await tx.finTransaction.create({
    data: {
      debitAccountId: debitAccount.id,
      creditAccountId: creditAccount.id,
      amount: new Prisma.Decimal(amount),
      description,
    }
  });

  // Update account balances
  await tx.account.update({
    where: { id: debitAccount.id },
    data: { balance: { increment: amount } }
  });

  await tx.account.update({
    where: { id: creditAccount.id },
    data: { balance: { decrement: amount } }
  });

  return transaction;
}

/**
 * Создает корректирующую проводку при инвентаризации
 * При излишке: Дебет 41, Кредит 91.1 "Прочие доходы"
 * При недостаче: Дебет 91.2, Кредит 41
 */
export async function createInventoryAdjustmentEntry(
  tx: TransactionClient,
  amount: number, // positive = surplus, negative = shortage
  description: string
) {
  if (amount === 0) return null;

  if (amount < 0) {
    // Shortage - write off
    return createWriteOffEntry(tx, Math.abs(amount), description);
  } else {
    // Surplus - increase inventory (unusual but possible)
    const debitAccount = await tx.account.findUnique({ where: { code: '41' } });
    const creditAccount = await tx.account.findUnique({ where: { code: '99' } }); // P&L

    if (!debitAccount || !creditAccount) {
      console.warn('Accounts not found, skipping financial entry');
      return null;
    }

    const transaction = await tx.finTransaction.create({
      data: {
        debitAccountId: debitAccount.id,
        creditAccountId: creditAccount.id,
        amount: new Prisma.Decimal(amount),
        description,
      }
    });

    await tx.account.update({
      where: { id: debitAccount.id },
      data: { balance: { increment: amount } }
    });

    await tx.account.update({
      where: { id: creditAccount.id },
      data: { balance: { increment: amount } }
    });

    return transaction;
  }
}
