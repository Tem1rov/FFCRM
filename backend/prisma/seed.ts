import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Создание бухгалтерских счетов
  const accounts = [
    { code: '41', name: 'Товары на складе', type: 'ASSET' },
    { code: '50', name: 'Касса', type: 'ASSET' },
    { code: '51', name: 'Расчетный счет', type: 'ASSET' },
    { code: '60', name: 'Расчеты с поставщиками', type: 'LIABILITY' },
    { code: '62', name: 'Расчеты с клиентами', type: 'ASSET' },
    { code: '90.1', name: 'Выручка', type: 'REVENUE' },
    { code: '90.2', name: 'Себестоимость продаж', type: 'EXPENSE' },
    { code: '44.1', name: 'Затраты на хранение', type: 'EXPENSE' },
    { code: '44.2', name: 'Затраты на комплектацию', type: 'EXPENSE' },
    { code: '44.3', name: 'Затраты на доставку', type: 'EXPENSE' },
    { code: '44.4', name: 'Затраты на упаковку', type: 'EXPENSE' },
    { code: '44.5', name: 'Прочие затраты фулфилмента', type: 'EXPENSE' },
    { code: '91.2', name: 'Потери и недостачи', type: 'EXPENSE' },
    { code: '99', name: 'Прибыли и убытки', type: 'EQUITY' },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }
  console.log('✅ Accounts created');

  // Создание администратора по умолчанию
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@fulfillment.local' },
    update: {},
    create: {
      email: 'admin@fulfillment.local',
      password: adminPassword,
      firstName: 'Администратор',
      lastName: 'Системы',
      role: 'ADMIN',
      phone: '+7 (000) 000-00-00',
    },
  });
  console.log('✅ Admin user created (admin@fulfillment.local / admin123)');

  // Создание тестового менеджера
  const managerPassword = await bcrypt.hash('manager123', 10);
  await prisma.user.upsert({
    where: { email: 'manager@fulfillment.local' },
    update: {},
    create: {
      email: 'manager@fulfillment.local',
      password: managerPassword,
      firstName: 'Менеджер',
      lastName: 'Тестовый',
      role: 'MANAGER',
    },
  });
  console.log('✅ Manager user created (manager@fulfillment.local / manager123)');

  // Создание тестового аналитика
  const analystPassword = await bcrypt.hash('analyst123', 10);
  await prisma.user.upsert({
    where: { email: 'analyst@fulfillment.local' },
    update: {},
    create: {
      email: 'analyst@fulfillment.local',
      password: analystPassword,
      firstName: 'Аналитик',
      lastName: 'Тестовый',
      role: 'ANALYST',
    },
  });
  console.log('✅ Analyst user created (analyst@fulfillment.local / analyst123)');

  // Создание тестового поставщика
  const vendor = await prisma.vendor.upsert({
    where: { id: 'test-vendor-1' },
    update: {},
    create: {
      id: 'test-vendor-1',
      name: 'Склад-Партнер',
      legalName: 'ООО "Склад-Партнер"',
      inn: '7701234567',
      contactName: 'Иванов Иван',
      contactPhone: '+7 (495) 123-45-67',
      contactEmail: 'partner@warehouse.ru',
      address: 'г. Москва, ул. Складская, д. 1',
    },
  });
  console.log('✅ Test vendor created');

  // Создание услуг поставщика
  const services = [
    { name: 'Хранение (куб.м/мес)', type: 'STORAGE', unit: 'CUBIC_METER', price: 450 },
    { name: 'Хранение (паллета/мес)', type: 'STORAGE', unit: 'PALLET', price: 800 },
    { name: 'Комплектация заказа', type: 'PICKING', unit: 'ORDER', price: 50 },
    { name: 'Комплектация (за единицу)', type: 'PICKING', unit: 'PIECE', price: 10 },
    { name: 'Упаковка стандартная', type: 'PACKING', unit: 'ORDER', price: 30 },
    { name: 'Упаковка хрупкое', type: 'PACKING', unit: 'ORDER', price: 80 },
    { name: 'Доставка СДЭК (до 1кг)', type: 'SHIPPING', unit: 'ORDER', price: 300 },
    { name: 'Доставка СДЭК (1-5кг)', type: 'SHIPPING', unit: 'ORDER', price: 450 },
    { name: 'Доставка СДЭК (5-10кг)', type: 'SHIPPING', unit: 'ORDER', price: 650 },
    { name: 'Приемка товара', type: 'RECEIVING', unit: 'PIECE', price: 5 },
    { name: 'Маркировка', type: 'LABELING', unit: 'PIECE', price: 3 },
    { name: 'Обработка возврата', type: 'RETURNS', unit: 'ORDER', price: 100 },
  ];

  for (const service of services) {
    await prisma.vendorService.create({
      data: {
        vendorId: vendor.id,
        name: service.name,
        type: service.type as any,
        unit: service.unit as any,
        price: service.price,
      },
    });
  }
  console.log('✅ Vendor services created');

  // Создание тестовых клиентов
  const clients = [
    { name: 'Магазин "Электроника+"', companyName: 'ИП Петров А.А.', inn: '771234567890', email: 'shop@electronics.ru', phone: '+7 (495) 111-11-11' },
    { name: 'Онлайн-бутик "Стиль"', companyName: 'ООО "Модный Дом"', inn: '7712345678', email: 'orders@style.ru', phone: '+7 (495) 222-22-22' },
    { name: 'Детские товары "Малыш"', companyName: 'ИП Сидорова М.В.', inn: '772345678901', email: 'info@malysh.ru', phone: '+7 (495) 333-33-33' },
  ];

  for (const client of clients) {
    await prisma.client.create({ data: client });
  }
  console.log('✅ Test clients created');

  // ==================== СКЛАДСКОЙ МОДУЛЬ ====================

  // Создание складов
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-01' },
    update: {},
    create: {
      code: 'WH-01',
      name: 'Основной склад',
      address: 'г. Москва, ул. Складская, д. 1',
      type: 'MAIN',
      description: 'Главный склад для хранения и отгрузки товаров'
    }
  });

  await prisma.warehouse.upsert({
    where: { code: 'WH-02' },
    update: {},
    create: {
      code: 'WH-02',
      name: 'Склад возвратов',
      address: 'г. Москва, ул. Складская, д. 1, стр. 2',
      type: 'RETURNS',
      description: 'Склад для обработки возвратов'
    }
  });
  console.log('✅ Warehouses created');

  // Создание ячеек хранения
  const zones = ['A', 'B', 'C'];
  const rows = [1, 2, 3];
  const levels = [1, 2, 3, 4];
  
  for (const zone of zones) {
    for (const row of rows) {
      for (const level of levels) {
        const code = `${zone}-${String(row).padStart(2, '0')}-${String(level).padStart(2, '0')}`;
        await prisma.storageLocation.upsert({
          where: { 
            warehouseId_code: { warehouseId: mainWarehouse.id, code }
          },
          update: {},
          create: {
            warehouseId: mainWarehouse.id,
            code,
            name: `Полка ${zone}${row}-${level}`,
            type: level <= 2 ? 'PALLET' : 'SHELF',
            zone,
            row,
            level,
            maxWeight: level <= 2 ? 500 : 50,
            maxVolume: level <= 2 ? 1.5 : 0.3
          }
        });
      }
    }
  }
  console.log('✅ Storage locations created (36 cells)');

  // Создание тестовых товаров
  const products = [
    { sku: 'PHONE-001', barcode: '4600000000001', name: 'Смартфон Samsung Galaxy', category: 'Электроника', unitWeight: 0.2, unitCost: 25000, unitPrice: 35000 },
    { sku: 'PHONE-002', barcode: '4600000000002', name: 'Смартфон iPhone 14', category: 'Электроника', unitWeight: 0.18, unitCost: 60000, unitPrice: 85000 },
    { sku: 'LAPTOP-001', barcode: '4600000000003', name: 'Ноутбук Lenovo ThinkPad', category: 'Электроника', unitWeight: 1.8, unitCost: 45000, unitPrice: 65000 },
    { sku: 'DRESS-001', barcode: '4600000000004', name: 'Платье летнее', category: 'Одежда', unitWeight: 0.3, unitCost: 1500, unitPrice: 3500 },
    { sku: 'SHIRT-001', barcode: '4600000000005', name: 'Рубашка мужская', category: 'Одежда', unitWeight: 0.25, unitCost: 800, unitPrice: 2200 },
    { sku: 'TOY-001', barcode: '4600000000006', name: 'Конструктор LEGO', category: 'Игрушки', unitWeight: 0.5, unitCost: 2000, unitPrice: 3500 },
    { sku: 'TOY-002', barcode: '4600000000007', name: 'Мягкая игрушка Медведь', category: 'Игрушки', unitWeight: 0.4, unitCost: 500, unitPrice: 1200 },
    { sku: 'BOOK-001', barcode: '4600000000008', name: 'Книга "Программирование"', category: 'Книги', unitWeight: 0.6, unitCost: 400, unitPrice: 900 },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        ...product,
        unitVolume: 0.001,
        minStock: 5
      }
    });
  }
  console.log('✅ Products created');

  // Добавление остатков на склад
  const allProducts = await prisma.product.findMany();
  const locations = await prisma.storageLocation.findMany({
    where: { warehouseId: mainWarehouse.id },
    take: 8
  });

  for (let i = 0; i < Math.min(allProducts.length, locations.length); i++) {
    const qty = Math.floor(Math.random() * 50) + 10;
    
    // Check if stock already exists
    const existingStock = await prisma.productStock.findFirst({
      where: {
        productId: allProducts[i].id,
        storageLocationId: locations[i].id,
      }
    });

    if (existingStock) {
      await prisma.productStock.update({
        where: { id: existingStock.id },
        data: { quantity: qty, availableQty: qty }
      });
    } else {
      await prisma.productStock.create({
        data: {
          productId: allProducts[i].id,
          storageLocationId: locations[i].id,
          quantity: qty,
          availableQty: qty,
          status: 'AVAILABLE'
        }
      });
    }

    // Update location status
    await prisma.storageLocation.update({
      where: { id: locations[i].id },
      data: { status: 'OCCUPIED' }
    });
  }
  console.log('✅ Product stocks created');

  // Создание кладовщика
  const warehousePassword = await bcrypt.hash('warehouse123', 10);
  await prisma.user.upsert({
    where: { email: 'warehouse@fulfillment.local' },
    update: {},
    create: {
      email: 'warehouse@fulfillment.local',
      password: warehousePassword,
      firstName: 'Кладовщик',
      lastName: 'Тестовый',
      role: 'WAREHOUSE',
    },
  });
  console.log('✅ Warehouse user created (warehouse@fulfillment.local / warehouse123)');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
