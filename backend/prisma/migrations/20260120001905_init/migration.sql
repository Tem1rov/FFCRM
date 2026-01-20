-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vendor_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "minQuantity" DECIMAL,
    "maxQuantity" DECIMAL,
    "validFrom" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vendor_services_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorServiceId" TEXT NOT NULL,
    "oldPrice" DECIMAL NOT NULL,
    "newPrice" DECIMAL NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,
    CONSTRAINT "price_history_vendorServiceId_fkey" FOREIGN KEY ("vendorServiceId") REFERENCES "vendor_services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "inn" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tariffRate" DECIMAL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "managerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "shippingAddress" TEXT,
    "estimatedCost" DECIMAL NOT NULL DEFAULT 0,
    "actualCost" DECIMAL NOT NULL DEFAULT 0,
    "totalIncome" DECIMAL NOT NULL DEFAULT 0,
    "profit" DECIMAL NOT NULL DEFAULT 0,
    "marginPercent" DECIMAL NOT NULL DEFAULT 0,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shippedDate" DATETIME,
    "deliveredDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight" DECIMAL NOT NULL DEFAULT 0,
    "volume" DECIMAL NOT NULL DEFAULT 0,
    "unitCost" DECIMAL NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cost_operations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorServiceId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL DEFAULT 'CHARGE',
    "quantity" DECIMAL NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "calculatedAmount" DECIMAL NOT NULL,
    "actualAmount" DECIMAL NOT NULL,
    "description" TEXT,
    "operationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cost_operations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cost_operations_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cost_operations_vendorServiceId_fkey" FOREIGN KEY ("vendorServiceId") REFERENCES "vendor_services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "income_operations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceAmount" DECIMAL NOT NULL,
    "paidAmount" DECIMAL NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "paymentDate" DATETIME,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "income_operations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "income_operations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "fin_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "debitAccountId" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "costOperationId" TEXT,
    "incomeOperationId" TEXT,
    "description" TEXT,
    "transactionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fin_transactions_debitAccountId_fkey" FOREIGN KEY ("debitAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fin_transactions_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fin_transactions_costOperationId_fkey" FOREIGN KEY ("costOperationId") REFERENCES "cost_operations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fin_transactions_incomeOperationId_fkey" FOREIGN KEY ("incomeOperationId") REFERENCES "income_operations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_clientId_idx" ON "orders"("clientId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_orderDate_idx" ON "orders"("orderDate");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_code_key" ON "accounts"("code");
