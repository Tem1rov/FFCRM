-- CreateTable
CREATE TABLE "order_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "vendorId" TEXT,
    "vendorServiceId" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PIECE',
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "plannedAmount" DECIMAL NOT NULL DEFAULT 0,
    "actualAmount" DECIMAL NOT NULL DEFAULT 0,
    "isPriceLocked" BOOLEAN NOT NULL DEFAULT false,
    "priceLockedAt" DATETIME,
    "originalPrice" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "order_expenses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_expenses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_expenses_vendorServiceId_fkey" FOREIGN KEY ("vendorServiceId") REFERENCES "vendor_services" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expense_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productCategory" TEXT,
    "minWeight" DECIMAL,
    "maxWeight" DECIMAL,
    "deliveryMethod" TEXT,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "expense_template_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "description" TEXT NOT NULL,
    "vendorServiceId" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PIECE',
    "defaultQuantity" DECIMAL NOT NULL DEFAULT 1,
    "defaultPrice" DECIMAL NOT NULL DEFAULT 0,
    "quantityFormula" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "expense_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "expense_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "expense_template_items_vendorServiceId_fkey" FOREIGN KEY ("vendorServiceId") REFERENCES "vendor_services" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "order_expenses_orderId_idx" ON "order_expenses"("orderId");

-- CreateIndex
CREATE INDEX "order_expenses_category_idx" ON "order_expenses"("category");

-- CreateIndex
CREATE INDEX "order_expenses_vendorId_idx" ON "order_expenses"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_templates_name_key" ON "expense_templates"("name");
