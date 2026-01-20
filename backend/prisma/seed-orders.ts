/**
 * Скрипт импорта данных из Excel файла "MPSELL _ Фулфилмент.xlsx"
 * 
 * Запуск: npm run db:import-excel
 * Или: npx ts-node prisma/seed-orders.ts
 */

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

// Тарифы фулфилмента
const fulfillmentRates: Record<string, number> = {
  'Шапки': 30,
  'Штаны': 50,
  'Куртки': 55,
  'Инструменты': 80,
  'Другое': 40,
};

// Тарифы доставки палет
const palletDeliveryRates: Record<string, number> = {
  'Электросталь': 2000,
  'Коледино': 2000,
  'Рязань': 3000,
  'Тула': 3000,
  'Краснодар': 6300,
  'Подольск': 2500,
  'Казань': 4000,
  'Хоругвино': 2500,
  'Невинномысск': 5500,
  'СЦ Вёшки': 2000,
  'Пушкино': 2000,
};

// Тарифы коробов по направлениям
const boxDeliveryRates: Record<string, number> = {
  'Электросталь': 200,
  'Коледино': 200,
  'Рязань': 300,
  'Тула': 300,
  'Краснодар': 500,
  'Подольск': 250,
  'Казань': 400,
  'Хоругвино': 250,
  'Невинномысск': 450,
  'СЦ Вёшки': 200,
  'Пушкино': 200,
};

interface ShipmentRow {
  date: Date;
  client: string;
  productType: string;
  quantity: number;
  warehouse: string;
  pallets?: number;
  boxes?: number;
}

async function readExcelFile(): Promise<ShipmentRow[]> {
  // Путь относительно корня backend директории  
  const filePath = path.resolve(__dirname, '../../MPSELL _ Фулфилмент.xlsx');
  
  console.log('📖 Читаем Excel файл:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find(name => 
    name.toLowerCase().includes('отгрузк') || 
    name.toLowerCase().includes('shipment') ||
    name === workbook.SheetNames[1] // Второй лист
  ) || workbook.SheetNames[1] || workbook.SheetNames[0];
  
  console.log('📋 Используем лист:', sheetName);
  
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (rawData.length < 2) {
    console.log('⚠️ Недостаточно данных в Excel файле');
    return [];
  }
  
  // Определяем заголовки (первая строка) - фильтруем пустые
  const headers = rawData[0].map((h: any) => (h ? String(h).toLowerCase().trim() : ''));
  console.log('📝 Заголовки:', headers);
  
  // Безопасная функция поиска индекса
  const safeFind = (patterns: string[]) => {
    return headers.findIndex((h: string) => {
      if (!h) return false;
      return patterns.some(p => h.includes(p));
    });
  };
  
  // Индексы колонок (на основе структуры файла)
  const dateIdx = safeFind(['дата', 'date']);
  const clientIdx = safeFind(['клиент', 'client', 'заказчик']);
  const warehouseIdx = safeFind(['склад', 'warehouse', 'направление']);
  const productIdx = safeFind(['товар', 'product', 'вид', 'категория']);
  const qtyIdx = safeFind(['отгруз', 'кол', 'qty', 'количество']);
  const palletIdx = safeFind(['палет', 'pallet']);
  const boxIdx = safeFind(['короб', 'box']);
  const priceIdx = safeFind(['цена', 'price']);
  
  console.log('🔍 Индексы колонок:', { dateIdx, clientIdx, warehouseIdx, productIdx, qtyIdx, priceIdx, palletIdx, boxIdx });
  
  const shipments: ShipmentRow[] = [];
  
  // Показываем первые 3 строки данных для отладки
  console.log('📊 Первые строки данных:');
  for (let i = 1; i < Math.min(4, rawData.length); i++) {
    console.log(`   Строка ${i}:`, rawData[i]);
  }
  
  for (let i = 1; i < rawData.length; i++) {
    try {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      // Пропускаем строки-разделители или пустые
      const firstCell = row[0];
      if (!firstCell && !row[1]) continue;
      
      // Парсим дату
      let date: Date;
      const dateValue = row[dateIdx >= 0 ? dateIdx : 0];
      if (typeof dateValue === 'number') {
        // Excel serial date
        date = new Date((dateValue - 25569) * 86400 * 1000);
      } else if (dateValue) {
        date = new Date(dateValue);
      } else {
        date = new Date('2025-10-01'); // дефолтная дата
      }
      
      const client = String(row[clientIdx >= 0 ? clientIdx : 1] || '').trim();
      const warehouse = String(row[warehouseIdx >= 0 ? warehouseIdx : 2] || 'Электросталь').trim();
      const productType = String(row[productIdx >= 0 ? productIdx : 3] || 'Другое').trim();
      const quantity = parseInt(row[qtyIdx >= 0 ? qtyIdx : 4]) || 1;
      const pallets = palletIdx >= 0 ? parseInt(row[palletIdx]) || 0 : 0;
      const boxes = boxIdx >= 0 ? parseInt(row[boxIdx]) || 0 : 0;
      
      // Нормализуем тип товара к известным категориям
      let normalizedProduct = 'Другое';
      const productLower = productType.toLowerCase();
      if (productLower.includes('штан')) normalizedProduct = 'Штаны';
      else if (productLower.includes('шапк')) normalizedProduct = 'Шапки';
      else if (productLower.includes('куртк')) normalizedProduct = 'Куртки';
      else if (productLower.includes('инструм')) normalizedProduct = 'Инструменты';
      
      if (client) {
        shipments.push({
          date: isNaN(date.getTime()) ? new Date('2025-10-01') : date,
          client,
          productType: normalizedProduct,
          quantity,
          warehouse: warehouse || 'Электросталь',
          pallets,
          boxes,
        });
      }
    } catch (rowError) {
      console.log(`⚠️ Ошибка в строке ${i}:`, rowError);
    }
  }
  
  console.log(`✅ Прочитано ${shipments.length} отгрузок`);
  
  if (shipments.length > 0) {
    console.log('📊 Примеры прочитанных данных:');
    for (let i = 0; i < Math.min(3, shipments.length); i++) {
      console.log(`   ${i + 1}:`, shipments[i]);
    }
  }
  
  return shipments;
}

async function main() {
  console.log('🚀 Начинаем импорт данных из Excel...\n');
  
  // Читаем данные из Excel
  let shipments: ShipmentRow[];
  try {
    shipments = await readExcelFile();
    
    if (shipments.length === 0) {
      console.log('⚠️ Нет данных в Excel файле, используем демо-данные');
      shipments = generateDemoData();
    }
  } catch (error: any) {
    console.log('⚠️ Не удалось прочитать Excel файл:', error.message || error);
    console.log('🎲 Используем демо-данные');
    shipments = generateDemoData();
  }
  
  // Получаем уникальных клиентов и склады
  const uniqueClients = [...new Set(shipments.map(s => s.client))];
  const uniqueWarehouses = [...new Set(shipments.map(s => s.warehouse))];
  const uniqueProducts = [...new Set(shipments.map(s => s.productType))];
  
  console.log(`\n📊 Статистика данных:`);
  console.log(`   - Отгрузок: ${shipments.length}`);
  console.log(`   - Клиентов: ${uniqueClients.length}`);
  console.log(`   - Складов: ${uniqueWarehouses.length}`);
  console.log(`   - Типов товаров: ${uniqueProducts.length}`);
  
  // 1. Создаем поставщика MPSELL
  console.log('\n📦 Создаем поставщика MPSELL...');
  let vendor = await prisma.vendor.findFirst({
    where: { name: 'MPSELL Фулфилмент' }
  });
  
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: 'MPSELL Фулфилмент',
        inn: '7712345678',
        legalName: 'ООО "МПСЕЛЛ"',
        status: 'ACTIVE',
        contactEmail: 'info@mpsell.ru',
        contactPhone: '+7 (495) 123-45-67',
        address: 'г. Москва, ул. Складская, д. 10',
        contactName: 'Менеджер MPSELL',
        notes: 'Основной поставщик фулфилмент-услуг',
      },
    });
  }
  console.log(`   ✅ Поставщик: ${vendor.name} (ID: ${vendor.id})`);
  
  // 2. Создаем услуги фулфилмента
  console.log('\n🛠️ Создаем услуги фулфилмента...');
  const services: Record<string, string> = {};
  
  for (const [productType, rate] of Object.entries(fulfillmentRates)) {
    const serviceName = `Фулфилмент: ${productType}`;
    // Проверяем существует ли услуга
    let service = await prisma.vendorService.findFirst({
      where: { vendorId: vendor.id, name: serviceName }
    });
    
    if (service) {
      service = await prisma.vendorService.update({
        where: { id: service.id },
        data: { price: rate },
      });
    } else {
      service = await prisma.vendorService.create({
        data: {
          vendorId: vendor.id,
          name: serviceName,
          type: 'PICKING',
          unit: 'PIECE',
          price: rate,
          notes: `Обработка и упаковка товаров категории "${productType}"`,
          isActive: true,
        },
      });
    }
    services[`fulfillment_${productType}`] = service.id;
    console.log(`   ✅ ${service.name}: ${rate}₽/шт`);
  }
  
  // 3. Создаем услуги доставки палет
  console.log('\n🚚 Создаем услуги доставки палет...');
  for (const [warehouse, rate] of Object.entries(palletDeliveryRates)) {
    const serviceName = `Доставка палеты: ${warehouse}`;
    let service = await prisma.vendorService.findFirst({
      where: { vendorId: vendor.id, name: serviceName }
    });
    
    if (service) {
      service = await prisma.vendorService.update({
        where: { id: service.id },
        data: { price: rate },
      });
    } else {
      service = await prisma.vendorService.create({
        data: {
          vendorId: vendor.id,
          name: serviceName,
          type: 'SHIPPING',
          unit: 'PALLET',
          price: rate,
          notes: `Доставка палеты на склад ${warehouse}`,
          isActive: true,
        },
      });
    }
    services[`pallet_${warehouse}`] = service.id;
    console.log(`   ✅ ${service.name}: ${rate}₽`);
  }
  
  // 4. Создаем услуги доставки коробов
  console.log('\n📦 Создаем услуги доставки коробов...');
  for (const [warehouse, rate] of Object.entries(boxDeliveryRates)) {
    const serviceName = `Доставка короба: ${warehouse}`;
    let service = await prisma.vendorService.findFirst({
      where: { vendorId: vendor.id, name: serviceName }
    });
    
    if (service) {
      service = await prisma.vendorService.update({
        where: { id: service.id },
        data: { price: rate },
      });
    } else {
      service = await prisma.vendorService.create({
        data: {
          vendorId: vendor.id,
          name: serviceName,
          type: 'SHIPPING',
          unit: 'ORDER',
          price: rate,
          notes: `Доставка короба на склад ${warehouse}`,
          isActive: true,
        },
      });
    }
    services[`box_${warehouse}`] = service.id;
    console.log(`   ✅ ${service.name}: ${rate}₽`);
  }
  
  // 5. Создаем клиентов
  console.log('\n👥 Создаем клиентов...');
  const clients: Record<string, string> = {};
  
  for (const clientName of uniqueClients) {
    const cleanName = clientName.trim();
    if (!cleanName) continue;
    
    // Ищем клиента по имени
    let client = await prisma.client.findFirst({
      where: { name: cleanName }
    });
    
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: cleanName,
          email: `${cleanName.toLowerCase().replace(/\s+/g, '.')}@client.mpsell.ru`,
          phone: `+7 (9${Math.floor(Math.random() * 90) + 10}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 90) + 10}`,
          isActive: true,
        },
      });
    }
    clients[cleanName] = client.id;
    console.log(`   ✅ ${client.name}`);
  }
  
  // 6. Удаляем старые импортированные заказы и создаем новые
  console.log('\n🗑️ Удаляем старые импортированные заказы...');
  const deletedOrders = await prisma.order.deleteMany({
    where: { 
      notes: { contains: 'Импортировано из Excel' }
    }
  });
  console.log(`   Удалено ${deletedOrders.count} старых заказов`);
  
  console.log('\n📝 Создаем заказы...');
  let orderNumber = 1000;
  let totalRevenue = 0;
  let ordersCreated = 0;
  
  // Группируем отгрузки по клиенту и дате
  const groupedShipments: Record<string, ShipmentRow[]> = {};
  for (const shipment of shipments) {
    const key = `${shipment.client}_${shipment.date.toISOString().split('T')[0]}`;
    if (!groupedShipments[key]) {
      groupedShipments[key] = [];
    }
    groupedShipments[key].push(shipment);
  }
  
  for (const [key, items] of Object.entries(groupedShipments)) {
    const firstItem = items[0];
    const clientId = clients[firstItem.client];
    if (!clientId) continue;
    
    orderNumber++;
    
    // Рассчитываем стоимость заказа
    let orderTotal = 0;
    const orderItems: any[] = [];
    
    for (const item of items) {
      // Фулфилмент
      const fulfillmentRate = fulfillmentRates[item.productType] || fulfillmentRates['Другое'];
      const fulfillmentCost = fulfillmentRate * item.quantity;
      orderTotal += fulfillmentCost;
      
      orderItems.push({
        sku: `FF-${item.productType.substring(0, 3).toUpperCase()}`,
        name: `Фулфилмент: ${item.productType}`,
        quantity: item.quantity,
        unitPrice: fulfillmentRate,
        unitCost: fulfillmentRate * 0.7, // ~70% себестоимость
      });
      
      // Доставка палет
      if (item.pallets && item.pallets > 0) {
        const palletRate = palletDeliveryRates[item.warehouse] || 2500;
        const palletCost = palletRate * item.pallets;
        orderTotal += palletCost;
        
        orderItems.push({
          sku: `DLV-PLT-${item.warehouse.substring(0, 3).toUpperCase()}`,
          name: `Доставка палеты: ${item.warehouse}`,
          quantity: item.pallets,
          unitPrice: palletRate,
          unitCost: palletRate * 0.6, // ~60% себестоимость
        });
      }
      
      // Доставка коробов
      if (item.boxes && item.boxes > 0) {
        const boxRate = boxDeliveryRates[item.warehouse] || 300;
        const boxCost = boxRate * item.boxes;
        orderTotal += boxCost;
        
        orderItems.push({
          sku: `DLV-BOX-${item.warehouse.substring(0, 3).toUpperCase()}`,
          name: `Доставка короба: ${item.warehouse}`,
          quantity: item.boxes,
          unitPrice: boxRate,
          unitCost: boxRate * 0.6, // ~60% себестоимость
        });
      }
      
      // Если нет палет и коробов, добавляем доставку по умолчанию
      if ((!item.pallets || item.pallets === 0) && (!item.boxes || item.boxes === 0)) {
        const defaultRate = boxDeliveryRates[item.warehouse] || 300;
        const deliveryCost = defaultRate * Math.ceil(item.quantity / 50); // 1 короб на 50 единиц
        orderTotal += deliveryCost;
        
        orderItems.push({
          sku: `DLV-STD-${item.warehouse.substring(0, 3).toUpperCase()}`,
          name: `Доставка: ${item.warehouse}`,
          quantity: Math.ceil(item.quantity / 50),
          unitPrice: defaultRate,
          unitCost: defaultRate * 0.6, // ~60% себестоимость
        });
      }
    }
    
    // Создаем заказ
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${orderNumber}`,
        clientId,
        status: 'COMPLETED',
        orderDate: firstItem.date,
        shippedDate: new Date(firstItem.date.getTime() + 1 * 24 * 60 * 60 * 1000), // +1 день
        deliveredDate: new Date(firstItem.date.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 дня
        totalIncome: orderTotal,
        actualCost: orderTotal * 0.7, // ~70% от выручки - себестоимость
        profit: orderTotal * 0.3, // ~30% маржа
        marginPercent: 30,
        shippingAddress: firstItem.warehouse,
        notes: `Импортировано из Excel. Склад: ${firstItem.warehouse}`,
        items: {
          create: orderItems,
        },
      },
    });
    
    totalRevenue += orderTotal;
    ordersCreated++;
    
    if (ordersCreated % 20 === 0) {
      console.log(`   📊 Создано ${ordersCreated} заказов...`);
    }
  }
  
  console.log(`\n✅ Импорт завершен!`);
  console.log(`\n📊 Итоговая статистика:`);
  console.log(`   - Создано заказов: ${ordersCreated}`);
  console.log(`   - Общая выручка: ${totalRevenue.toLocaleString('ru-RU')} ₽`);
  console.log(`   - Средний чек: ${Math.round(totalRevenue / ordersCreated).toLocaleString('ru-RU')} ₽`);
  console.log(`   - Клиентов: ${Object.keys(clients).length}`);
  console.log(`   - Услуг создано: ${Object.keys(services).length}`);
}

// Генерация демо-данных если Excel не доступен
function generateDemoData(): ShipmentRow[] {
  console.log('🎲 Генерируем демо-данные на основе известной статистики...');
  
  const clients = [
    'Исламова', 'Петров', 'Сидорова', 'Козлов', 'Новикова',
    'Морозов', 'Волкова', 'Соколов', 'Михайлова', 'Федоров',
    'Алексеева', 'Дмитриев', 'Иванов', 'Кузнецов', 'Попова',
    'Смирнов', 'Васильева', 'Николаев'
  ];
  
  const products = ['Штаны', 'Шапки', 'Куртки', 'Инструменты', 'Другое'];
  const productWeights = [0.50, 0.20, 0.15, 0.10, 0.05]; // 50% штаны, 20% шапки и т.д.
  
  const warehouses = [
    'Электросталь', 'Коледино', 'Рязань', 'Тула', 'Краснодар',
    'Подольск', 'Казань', 'Хоругвино', 'Невинномысск', 'СЦ Вёшки', 'Пушкино'
  ];
  const warehouseWeights = [0.55, 0.15, 0.08, 0.06, 0.04, 0.03, 0.03, 0.02, 0.02, 0.01, 0.01];
  
  // Исламова - 35% выручки, значит больше заказов
  const clientWeights: Record<string, number> = {
    'Исламова': 0.35,
  };
  // Остальные клиенты делят оставшиеся 65%
  const otherWeight = 0.65 / (clients.length - 1);
  for (const client of clients) {
    if (!clientWeights[client]) {
      clientWeights[client] = otherWeight;
    }
  }
  
  const shipments: ShipmentRow[] = [];
  const startDate = new Date('2025-09-01');
  const endDate = new Date('2025-12-10');
  
  // Генерируем 158 отгрузок
  for (let i = 0; i < 158; i++) {
    // Выбираем клиента с учетом весов
    const clientRand = Math.random();
    let cumWeight = 0;
    let selectedClient = clients[0];
    for (const client of clients) {
      cumWeight += clientWeights[client];
      if (clientRand <= cumWeight) {
        selectedClient = client;
        break;
      }
    }
    
    // Выбираем товар с учетом весов
    const productRand = Math.random();
    cumWeight = 0;
    let selectedProduct = products[0];
    for (let j = 0; j < products.length; j++) {
      cumWeight += productWeights[j];
      if (productRand <= cumWeight) {
        selectedProduct = products[j];
        break;
      }
    }
    
    // Выбираем склад с учетом весов
    const warehouseRand = Math.random();
    cumWeight = 0;
    let selectedWarehouse = warehouses[0];
    for (let j = 0; j < warehouses.length; j++) {
      cumWeight += warehouseWeights[j];
      if (warehouseRand <= cumWeight) {
        selectedWarehouse = warehouses[j];
        break;
      }
    }
    
    // Генерируем дату
    const dateRange = endDate.getTime() - startDate.getTime();
    const randomDate = new Date(startDate.getTime() + Math.random() * dateRange);
    
    // Генерируем количество (50-500)
    const quantity = Math.floor(Math.random() * 450) + 50;
    
    // Генерируем палеты и коробы
    const pallets = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
    const boxes = pallets === 0 ? Math.floor(Math.random() * 5) + 1 : 0;
    
    shipments.push({
      date: randomDate,
      client: selectedClient,
      productType: selectedProduct,
      quantity,
      warehouse: selectedWarehouse,
      pallets,
      boxes,
    });
  }
  
  return shipments;
}

main()
  .catch((e) => {
    console.error('❌ Ошибка импорта:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
