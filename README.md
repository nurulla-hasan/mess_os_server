# MessManagerOS Backend API 🚀

Welcome to the **MessManagerOS** backend! This is a highly scalable, robust, and feature-rich REST API built to manage every aspect of a bachelor or student mess (hostel). From intelligent accounting and billing to AI-powered shopping lists and dynamic meal management, MessManagerOS serves as the central operating system for modern mess management.

---

## ✨ Key Features

* **🔐 Advanced Role-Based Access Control (RBAC):** Hierarchical permissions including `Super Admin`, `Mess Manager`, and `Mess Member`. Users can be managers in one mess and members in another.
* **💰 Intelligent Ledger & Accounting:** Built with strict Double-Entry Accounting principles. Safely handles `Payments`, `Expenses`, `Reimbursements`, and `Utility Bills` with transactional guarantees.
* **📅 Automated Billing Cycles:** Generate and finalize monthly bills effortlessly based on dynamic equal-shares and personal meal consumption.
* **🍽️ Dynamic Meal & Menu Planning:** Track daily meals, approve "Meal Off Requests", and plan weekly menus.
* **🛒 AI-Powered Shopping Lists:** AI-integrated system to automatically generate market schedules from the weekly menu plan.
* **🏢 Member & Mess Administration:** Easy invite-code based joining, member approval flows, and ownership transfers.
* **📣 Social & Operational Tools:** Includes `Notices` (with pinning) and `Complaints` management.
* **📊 Comprehensive Reports:** Export individual member statements, monthly financials, and detailed expense/payment reports.

---

## 🛠️ Technology Stack

* **Runtime & Framework:** Node.js, Express.js
* **Language:** TypeScript (Strictly typed)
* **Database:** MongoDB with Mongoose (with full Transaction support)
* **Validation:** Zod (Schema-based request payload validation)
* **Authentication:** JWT (Access & Refresh Tokens) + Bcrypt
* **Architecture:** Modular Pattern (Route -> Middleware -> Controller -> Service -> Model)

---

## ⚙️ Getting Started

### 1. Environment Setup
Please refer to the detailed environment setup guide to configure your `.env` variables correctly:
👉 [View ENV_SETUP.md](./docs/ENV_SETUP.md)

### 2. Installation
Ensure you have Node.js (v18+) and MongoDB installed.

```bash
# Clone the repository and navigate to the project directory
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 3. Build & Production
```bash
# Compile TypeScript to JavaScript
npm run build

# Run in production
npm run start
```

---

## 📖 API Documentation (Postman)

The entire API is fully documented and ready to use via Postman. 
You can find the comprehensive collection (with over 80+ endpoints and detailed request payloads) inside the `docs/` folder:

* **File:** `docs/Mess-Manager-OS.json`
* **How to use:** Open Postman -> Click `Import` -> Select this JSON file. Ensure you set up an environment in Postman with `{{baseUrl}}` pointing to `http://localhost:5000`.

---

## 🔒 Security Practices Built-in

* MongoDB Transactions for financial integrity.
* No `any` type loopholes in critical services; full Zod schema inference.
* Centralized Error Handler (Mongoose Cast, Duplicate Key, JWT expiration).
* Pagination embedded in large data extraction APIs to prevent server overload.

---

*Designed and developed for seamless, transparent, and modern mess management.*
