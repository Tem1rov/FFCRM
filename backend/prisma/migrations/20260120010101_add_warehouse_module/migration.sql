-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MAIN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "storage_locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SHELF',
    "status" TEXT NOT NULL DEFAULT 'FREE',
    "length" DECIMAL,
    "width" DECIMAL,
    "height" DECIMAL,
    "maxVolume" DECIMAL,
    "maxWeight" DECIMAL,
    "zone" TEXT,
    "row" INTEGER,
    "level" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "storage_locations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unitWeight" DECIMAL NOT NULL DEFAULT 0,
    "unitVolume" DECIMAL NOT NULL DEFAULT 0,
    "unitCost" DECIMAL NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "product_stocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "storageLocationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "batchNumber" TEXT,
    "expiryDate" DATETIME,
    "lastMovementAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "product_stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_stocks_storageLocationId_fkey" FOREIGN KEY ("storageLocationId") REFERENCES "storage_locations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskNumber" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedToId" TEXT,
    "plannedDate" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "warehouse_tasks_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "productId" TEXT,
    "expectedQty" INTEGER NOT NULL DEFAULT 0,
    "actualQty" INTEGER NOT NULL DEFAULT 0,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "task_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "warehouse_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "quantity" INTEGER NOT NULL,
    "movementType" TEXT NOT NULL,
    "taskId" TEXT,
    "orderId" TEXT,
    "batchNumber" TEXT,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "storage_locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "storage_locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "warehouse_tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "storage_locations_warehouseId_idx" ON "storage_locations"("warehouseId");

-- CreateIndex
CREATE INDEX "storage_locations_status_idx" ON "storage_locations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "storage_locations_warehouseId_code_key" ON "storage_locations"("warehouseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_barcode_idx" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "product_stocks_productId_idx" ON "product_stocks"("productId");

-- CreateIndex
CREATE INDEX "product_stocks_storageLocationId_idx" ON "product_stocks"("storageLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "product_stocks_productId_storageLocationId_batchNumber_key" ON "product_stocks"("productId", "storageLocationId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_tasks_taskNumber_key" ON "warehouse_tasks"("taskNumber");

-- CreateIndex
CREATE INDEX "warehouse_tasks_warehouseId_idx" ON "warehouse_tasks"("warehouseId");

-- CreateIndex
CREATE INDEX "warehouse_tasks_orderId_idx" ON "warehouse_tasks"("orderId");

-- CreateIndex
CREATE INDEX "warehouse_tasks_status_idx" ON "warehouse_tasks"("status");

-- CreateIndex
CREATE INDEX "warehouse_tasks_type_idx" ON "warehouse_tasks"("type");

-- CreateIndex
CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");

-- CreateIndex
CREATE INDEX "stock_movements_movementType_idx" ON "stock_movements"("movementType");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");
