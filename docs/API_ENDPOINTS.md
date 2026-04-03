# Mess Manager OS – API V1 Documentation (Exhaustive)

All requests should be prefixed with `{{baseUrl}}/api/v1`.

## Authentication

| Method | Endpoint | Auth Rule | Sample Body | Sample Query | Description |
|--------|----------|-----------|-------------|--------------|-------------|
| POST | `/auth/register` | Public | `{"fullName":"John Doe","email":"...","password":"...","phone":"..."}` | - | Initialize user account. |
| POST | `/auth/login` | Public | `{"email":"...","password":"..."}` | - | Returns JWT `accessToken` & `refreshToken`. |

## User Profile

| Method | Endpoint | Auth Rule | Sample Body | Sample Query | Description |
|--------|----------|-----------|-------------|--------------|-------------|
| GET | `/users/me` | Authenticated | - | - | Retrieve own profile data. |
| PATCH | `/users/update` | Authenticated | `{"fullName":"John Updated"}` | - | Update profile metadata. |

## Mess Core & Membership

| Method | Endpoint | Auth Rule | Sample Body | Sample Query | Description |
|--------|----------|-----------|-------------|--------------|-------------|
| POST | `/messes` | Authenticated | `{"name":"The Mess","address":"Dhaka"}` | - | Create new mess (becomes Manager). |
| POST | `/messes/join` | Authenticated | `{"inviteCode":"..."}` | - | Submit join request to a mess. |
| GET | `/messes/:messId` | Member/Manager | - | - | Mess metadata overview. |
| PATCH | `/messes/:messId` | Manager | `{"name":"New Mess Name"}` | - | Update mess config. |
| POST | `/messes/:messId/regenerate-invite-code` | Manager | - | - | Cycle invite code. |
| POST | `/messes/:messId/transfer-ownership` | Manager | `{"newManagerId":"..."}` | - | Transfer mess ownership. |
| GET | `/messes/:messId/members` | Member/Manager | - | - | List members/join requests. |
| POST | `/messes/:messId/members/:memberId/approve` | Manager | - | - | Approve joining request. |
| POST | `/messes/:messId/members/:memberId/reject` | Manager | - | - | Reject joining request. |
| DELETE | `/messes/:messId/members/:memberId/remove` | Manager | - | - | Remove active member. |

## Payments & Expenses

| Method | Endpoint | Auth Rule | Sample Body | Sample Query | Description |
|--------|----------|-----------|-------------|--------------|-------------|
| POST | `/messes/:messId/payments` | Member/Manager | `{"amount":1000,"method":"cash"}` | - | Submit payment (Actor bound). |
| GET | `/messes/:messId/payments` | Member/Manager | - | `status=pending` | List mess payments. |
| GET | `/messes/:messId/payments/me` | Member/Manager | - | - | Your own payment history. |
| GET | `/messes/:messId/payments/:paymentId` | Owner/Manager | - | - | Individual payment detail. |
| POST | `/messes/:messId/payments/:paymentId/approve` | Manager | - | - | Finalize and ledger payment. |
| POST | `/messes/:messId/payments/:paymentId/reject` | Manager | - | - | Manager disapproval. |
| POST | `/messes/:messId/payments/:paymentId/cancel` | Owner/Manager | - | - | Soft-delete (cancel) pending record. |
| POST | `/messes/:messId/expenses` | Member/Manager | `{"amount":500,"category":"bazar","fundSource":"mess_cash"}` | - | Submit expense (Actor bound). |
| GET | `/messes/:messId/expenses` | Member/Manager | - | - | Mess expense history. |
| GET | `/messes/:messId/expenses/:expenseId` | Owner/Manager | - | - | Individual expense detail. |
| POST | `/messes/:messId/expenses/:expenseId/approve` | Manager | - | - | Ledger expense and credit member. |
| POST | `/messes/:messId/expenses/:expenseId/reject` | Manager | - | - | Manager disapproval. |
| POST | `/messes/:messId/expenses/:expenseId/reimburse` | Manager | - | - | Liquidate personal cash expense. |
| DELETE | `/messes/:messId/expenses/:expenseId` | Owner/Manager | - | - | Soft-delete (cancel) pending expense. |

## Billing & Finance

| Method | Endpoint | Auth Rule | Sample Body | Sample Query | Description |
|--------|----------|-----------|-------------|--------------|-------------|
| GET | `/messes/:messId/billing/preview` | Manager | - | - | Real-time calc preview. |
| POST | `/messes/:messId/billing/finalize` | Manager | `{"month":3,"year":2024}` | - | Seal period & generate bills. |
| GET | `/messes/:messId/billing` | Member/Manager | - | - | List finalized billing cycles. |
| GET | `/messes/:messId/billing/:cycleId/members/:memberId` | Owner/Manager | - | - | Specific member bill detail. |

## Operations (Meals, Menus, Notice)

| Method | Endpoint | Auth Rule | Sample Body | Sample Query | Description |
|--------|----------|-----------|-------------|--------------|-------------|
| POST | `/messes/:messId/meals` | Manager/Member | `{"messMemberId":"...","date":"2024-03-24","count":1}` | - | Add meal entry. |
| GET | `/messes/:messId/meals` | Member/Manager | - | `date=2024-03-24` | List meals. |
| POST | `/messes/:messId/meal-off-requests` | Member/Manager | `{"startDate":"...","endDate":"..."}` | - | Apply for meal off. |
| POST | `/messes/:messId/menu-plans` | Manager | `{"date":"...","meals":{...}}` | - | Set day menu. |
| POST | `/messes/:messId/notices` | Manager | `{"title":"...","content":"..."}` | - | Post mess announcement. |
| POST | `/messes/:messId/complaints` | Member/Manager | `{"title":"...","description":"..."}` | - | Submit mess complaint. |
| POST | `/messes/:messId/ai-shopping/generate` | Manager | `{"menuPlanId":"..."}` | - | AI-assisted bazar list. |

## Reports & Subscriptions

| Method | Endpoint | Auth Rule | Sample Body | Sample Query | Description |
|--------|----------|-----------|-------------|--------------|-------------|
| GET | `/messes/:messId/reports/summary` | Member/Manager | - | - | Real-time dash stats. |
| GET | `/messes/:messId/reports/financial` | Member/Manager | - | `start=...&end=...` | Approved transaction audit. |
| GET | `/messes/:messId/reports/export/csv` | Member/Manager | - | `type=expenses` | Download analytics CSV. |
| GET | `/subscriptions/plans` | Public | - | - | Global pricing tiers. |
| POST | `/messes/:messId/subscriptions/trial` | Manager | - | - | Activate 7-day trial. |
| POST | `/messes/:messId/subscriptions/history` | Manager | - | - | Mess payment history audit. |

## Platform Administration

| Method | Endpoint | Auth Rule | Sample Body | Sample Query | Description |
|--------|----------|-----------|-------------|--------------|-------------|
| GET | `/admin/users` | Super Admin | - | `page=1&limit=20` | Manage all platform users. |
| GET | `/admin/stats` | Super Admin | - | - | Health/Usage metric overview. |
| PATCH | `/admin/messes/:messId/suspend` | Super Admin | - | - | Platform-level suspension. |
