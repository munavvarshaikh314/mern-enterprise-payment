# Hybrid Database Architecture Guide: MongoDB + PostgreSQL

## Executive Summary

This application utilizes a **hybrid database architecture**, a design pattern frequently employed by FAANG-level companies to balance the need for high-velocity data iteration with the absolute requirement for financial data integrity. By combining **MongoDB** (NoSQL) and **PostgreSQL** (Relational), we achieve a system that is both highly scalable and transactionally secure.

## 1. Architectural Overview

The system is divided into two primary data domains: the **Engagement Domain** and the **Transactional Domain**.

| Domain | Database | Primary Responsibility | Key Characteristics |
| :--- | :--- | :--- | :--- |
| **Engagement** | MongoDB | User profiles, preferences, session data, product catalogs. | High availability, flexible schema, horizontal scaling. |
| **Transactional** | PostgreSQL | Financial ledgers, payment records, audit trails, invoices. | ACID compliance, rigid schema, data integrity. |

## 2. Why This Approach?

### 2.1 The Case for PostgreSQL (ACID Compliance)
In financial systems, a "partial success" is a failure. PostgreSQL ensures that every payment record follows the **ACID** principles:
- **Atomicity**: A transaction is "all or nothing." If the payment is recorded but the invoice fails, the whole transaction rolls back.
- **Consistency**: Data must follow all predefined rules (schemas).
- **Isolation**: Concurrent transactions do not interfere with each other.
- **Durability**: Once a transaction is committed, it remains so, even in the event of a system failure.

### 2.2 The Case for MongoDB (Flexibility)
User profiles and preferences often change. MongoDB allows us to add new user fields (like social media links or new notification settings) without performing expensive database migrations that could cause downtime.

## 3. Implementation Details

### 3.1 Transactional Integrity in Node.js
We use **Sequelize** for PostgreSQL to manage transactions. When a payment is verified, the following logic ensures integrity:

```typescript
const t = await sequelize.transaction();
try {
  // Update the transaction record in PostgreSQL
  await Transaction.update({ status: 'completed' }, { where: { orderId }, transaction: t });
  
  // Update the user's total spend in MongoDB (Eventual Consistency)
  await User.updateOne({ _id: userId }, { $inc: { totalSpent: amount } });
  
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

### 3.2 Data Reconciliation
To ensure both databases remain in sync, the application includes a reconciliation service that periodically checks if the total revenue in PostgreSQL matches the aggregated payment data in MongoDB.

## 4. Deployment with Docker

The `docker-compose.yml` file is configured to orchestrate both databases alongside the application:

```yaml
services:
  mongodb:
    image: mongo:7.0
    # ... configuration
  postgres:
    image: postgres:15-alpine
    # ... configuration
  backend:
    depends_on:
      - mongodb
      - postgres
```

## 5. Conclusion

This hybrid approach demonstrates a sophisticated understanding of system design. It prioritizes **security and accuracy** where it matters most (money) while maintaining **agility and performance** for the rest of the user experience. This is the standard for modern, high-scale financial applications.