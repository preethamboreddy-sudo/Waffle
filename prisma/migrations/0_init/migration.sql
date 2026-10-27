-- Migration 0_init for PostgreSQL (Waffle Pops and Company)
-- Generated for full compatibility with PostgreSQL 14+

CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN', 'OPERATOR');
CREATE TYPE "FulfilmentMode" AS ENUM ('DELIVERY', 'TAKEAWAY');
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'UPI');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE "OrderStatus" AS ENUM (
    'ORDER_PLACED',
    'ACCEPTED',
    'PREPARING',
    'READY_FOR_DISPATCH',
    'OUT_FOR_DELIVERY',
    'READY_FOR_PICKUP',
    'DELIVERED',
    'PICKED_UP',
    'REJECTED',
    'CANCELLED'
);
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Users table
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL UNIQUE,
    "email" TEXT UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Branches table
CREATE TABLE "Branch" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "address" TEXT NOT NULL,
    "landmark" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Mandadam',
    "state" TEXT NOT NULL DEFAULT 'Andhra Pradesh',
    "postalCode" TEXT,
    "phone" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "orderAcceptancePaused" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAvailable" BOOLEAN NOT NULL DEFAULT true,
    "takeawayAvailable" BOOLEAN NOT NULL DEFAULT true,
    "minOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 99.00,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 30.00,
    "estimatedPrepTimeMins" INTEGER NOT NULL DEFAULT 20,
    "isProvisional" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Addresses table
CREATE TABLE "Address" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "street" TEXT NOT NULL,
    "landmark" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Mandadam',
    "postalCode" TEXT,
    "instructions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE "Category" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE "Product" (
    "id" TEXT PRIMARY KEY,
    "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDemoPrice" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ProductVariants table
CREATE TABLE "ProductVariant" (
    "id" TEXT PRIMARY KEY,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

-- ProductAddons table
CREATE TABLE "ProductAddon" (
    "id" TEXT PRIMARY KEY,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "maxQuantity" INTEGER NOT NULL DEFAULT 3
);

-- Orders table
CREATE TABLE "Order" (
    "id" TEXT PRIMARY KEY,
    "orderNumber" TEXT NOT NULL UNIQUE,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "branchId" TEXT NOT NULL REFERENCES "Branch"("id") ON DELETE RESTRICT,
    "fulfilmentMode" "FulfilmentMode" NOT NULL,
    "deliveryAddressId" TEXT REFERENCES "Address"("id") ON DELETE SET NULL,
    "deliveryAddressSnapshot" JSONB,
    "takeawayPickupTime" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'ORDER_PLACED',
    "cancellationReason" TEXT,
    "rejectionReason" TEXT,
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "idempotencyKey" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OrderItems table
CREATE TABLE "OrderItem" (
    "id" TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT,
    "productName" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "variantSnapshot" JSONB,
    "addonsSnapshot" JSONB,
    "subtotal" DECIMAL(10,2) NOT NULL
);

-- OrderStatusHistory table
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "fromStatus" "OrderStatus" NOT NULL,
    "toStatus" "OrderStatus" NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PaymentRecords table
CREATE TABLE "PaymentRecord" (
    "id" TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "method" "PaymentMethod" NOT NULL,
    "provider" TEXT NOT NULL,
    "transactionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "collectedBy" TEXT,
    "collectedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- SupportTickets table
CREATE TABLE "SupportTicket" (
    "id" TEXT PRIMARY KEY,
    "ticketNumber" TEXT NOT NULL UNIQUE,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "orderId" TEXT REFERENCES "Order"("id") ON DELETE SET NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- SupportMessages table
CREATE TABLE "SupportMessage" (
    "id" TEXT PRIMARY KEY,
    "ticketId" TEXT NOT NULL REFERENCES "SupportTicket"("id") ON DELETE CASCADE,
    "senderId" TEXT,
    "senderRole" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table
CREATE TABLE "Feedback" (
    "id" TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE CASCADE,
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "customerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AuditLogs table
CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "actorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-frequency queries
CREATE INDEX "idx_user_phone" ON "User"("phone");
CREATE INDEX "idx_address_userid" ON "Address"("userId");
CREATE INDEX "idx_product_category" ON "Product"("categoryId");
CREATE INDEX "idx_product_available" ON "Product"("isAvailable");
CREATE INDEX "idx_order_number" ON "Order"("orderNumber");
CREATE INDEX "idx_order_userid" ON "Order"("userId");
CREATE INDEX "idx_order_branchid" ON "Order"("branchId");
CREATE INDEX "idx_order_status" ON "Order"("orderStatus");
CREATE INDEX "idx_order_createdat" ON "Order"("createdAt");
CREATE INDEX "idx_orderitem_orderid" ON "OrderItem"("orderId");
CREATE INDEX "idx_statushistory_orderid" ON "OrderStatusHistory"("orderId");
CREATE INDEX "idx_payment_orderid" ON "PaymentRecord"("orderId");
CREATE INDEX "idx_ticket_userid" ON "SupportTicket"("userId");
CREATE INDEX "idx_ticket_orderid" ON "SupportTicket"("orderId");
CREATE INDEX "idx_ticket_status" ON "SupportTicket"("status");
CREATE INDEX "idx_feedback_rating" ON "Feedback"("rating");
CREATE INDEX "idx_audit_entity" ON "AuditLog"("entityType", "entityId");
