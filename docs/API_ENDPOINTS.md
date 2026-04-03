# MessManagerOS Endpoint Docs

## Global Endpoints
### Auth (`/api/v1/auth`)
- **POST /register** (Public) - Body: `{fullName, email, password, phone}`
- **POST /login** (Public) - Body: `{email, password}`

### Users (`/api/v1/users`)
- **GET /me** (User) - Own profile.
- **PATCH /update** (User) - Body: `{fullName, phone}`

### Admin (`/api/v1/admin`)
- **GET /users** (SuperAdmin) - Query: `?page=1&limit=20`
- **GET /messes** (SuperAdmin) - Query: `?page=1&limit=20`
- **GET /stats** (SuperAdmin) - Global stats.
- **PATCH /users/:userId/role** (SuperAdmin) - Escalate global roles dynamically. Body: `{globalRole}`
- **PATCH /users/:userId/block** (SuperAdmin)
- **PATCH /messes/:messId/suspend** (SuperAdmin)

### Global Subscriptions (`/api/v1/subscriptions`)
- **GET /plans** (Public) - List pricing.

---

## Mess Context Endpoints (`/api/v1/messes`)
- **POST /** (User) - Create mess. Body: `{name, address}`
- **POST /join** (User) - Join securely. Body: `{inviteCode}`

*All below nest inside `/api/v1/messes/:messId` and require Member/Manager role:*

### Mess Management
- **GET /** (Both) - Get details.
- **PATCH /** (Manager) - Update mess.
- **POST /transfer-ownership** (Manager) - Body: `{newManagerId}`
- **POST /regenerate-invite-code** (Manager)

### Members (`/members`)
- **GET /** (Both)
- **POST /:memberId/approve** (Manager)
- **POST /:memberId/reject** (Manager)
- **POST /:memberId/remove** (Manager)

### Payments (`/payments`)
- **POST /** (Manager) - Body: `{messMemberId, amount, paymentMethod}`
- **GET /** (Both)
- **POST /:paymentId/approve** (Manager)
- **POST /:paymentId/reject** (Manager)

### Expenses (`/expenses`)
- **POST /** (Both/Manager) - Body: `{category, amount, date, fundSource}`
- **GET /** (Both)
- **POST /:expenseId/approve** (Manager)
- **POST /:expenseId/reject** (Manager)

### Billing (`/billing`)
- **GET /preview** (Manager)
- **POST /finalize** (Manager) - Body: `{month, year}`
- **GET /** (Both)
- **GET /:cycleId/members/:memberId** (Both - restricted to self or manager)

### Meals (`/meals`)
- **POST /** (Manager) - Body: `{messMemberId, count, date}`
- **GET /** (Both)

### Meal Off Requests (`/meal-off-requests`)
- **POST /** (Member) - Body: `{startDate, endDate}`
- **POST /:requestId/approve** (Manager)

### Utility Bills (`/utility-bills`)
- **POST /** (Manager) - Body: `{title, amount, dueDate}`
- **POST /:billId/mark-paid** (Manager)

### Market Schedules (`/market-schedules`)
- **POST /** (Manager) - Body: `{assignedTo, targetDate, estimatedBudget}`
- **POST /:scheduleId/complete** (Both) - Body: `{actualSpent, fundSource}`

### Menu Plans (`/menu-plans`)
- **POST /** (Manager) - Body: `{date, meals}`
- **POST /:planId/publish** (Manager)

### AI Shopping (`/ai-shopping`)
- **POST /generate** (Manager) - Body: `{menuPlanId, targetDate}`
- **POST /:listId/convert** (Manager) - Body: `{assignedTo, estimatedBudget}`

### Notices (`/notices`)
- **POST /** (Manager) - Body: `{title, content}`
- **POST /:noticeId/pin** (Manager)

### Complaints (`/complaints`)
- **POST /** (Member) - Body: `{title, description}`
- **POST /:complaintId/resolve** (Manager) - Body: `{resolvedNote}`

### Reports (`/reports`)
- **GET /summary** (Both)
- **GET /financial?month&year** (Both)
- **GET /members/:memberId** (Both)
- **GET /expenses** (Both)
- **GET /payments** (Both)
- **GET /export/csv?type=expenses** (Manager)

### Subscriptions (`/subscriptions`)
- **GET /current** (Manager)
- **GET /history** (Manager)
- **POST /trial** (Manager)
- **POST /subscribe** (Manager) - Body: `{planId, paymentToken}`
- **POST /cancel** (Manager)
