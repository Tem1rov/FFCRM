import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

// Routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import vendorsRoutes from './routes/vendors';
import vendorServicesRoutes from './routes/vendorServices';
import clientsRoutes from './routes/clients';
import ordersRoutes from './routes/orders';
import costOperationsRoutes from './routes/costOperations';
import incomeOperationsRoutes from './routes/incomeOperations';
import accountsRoutes from './routes/accounts';
import transactionsRoutes from './routes/transactions';
import dashboardRoutes from './routes/dashboard';
import reportsRoutes from './routes/reports';

// Warehouse module routes
import warehousesRoutes from './routes/warehouses';
import productsRoutes from './routes/products';
import warehouseTasksRoutes from './routes/warehouseTasks';
import stockMovementsRoutes from './routes/stockMovements';

// Order expenses module
import orderExpensesRoutes from './routes/orderExpenses';
import expenseTemplatesRoutes from './routes/expenseTemplates';

// Middleware
import { errorHandler } from './middleware/errorHandler';

// dotenv already configured above

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make prisma available in requests
app.use((req, res, next) => {
  (req as any).prisma = prisma;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/vendor-services', vendorServicesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cost-operations', costOperationsRoutes);
app.use('/api/income-operations', incomeOperationsRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

// Warehouse module
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/warehouse-tasks', warehouseTasksRoutes);
app.use('/api/stock-movements', stockMovementsRoutes);

// Order expenses
app.use('/api/order-expenses', orderExpensesRoutes);
app.use('/api/expense-templates', expenseTemplatesRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FulfillmentFinance API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export { prisma };
