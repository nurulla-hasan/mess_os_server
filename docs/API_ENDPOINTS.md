# Mess Manager OS – API V1 Platform Specification (Exhaustive)

All requests should be prefixed with `{{baseUrl}}/api/v1`. 
The system uses **JWT Authentication** via `Authorization: Bearer <accessToken>`.
Refresh tokens are handled via **secure httpOnly cookies**.

---

## 1. Authentication Lifecycle
| Method | Endpoint | Auth Rule | Description |
|:---:|:---|:---:|:---|
| POST | `/auth/register` | Public | Create account. |
| POST | `/auth/login` | Public | Auth (sets Cookie). |
| POST | `/auth/verify-email` | Public | Verify account via 6-digit OTP. |
| POST | `/auth/resend-otp` | Public | Resend OTP (60s cooldown). |
| POST | `/auth/refresh-token` | Public | Rotate session. |
| POST | `/auth/logout` | Public | Invalidate session. |
| POST | `/auth/forgot-password` | Public | Request reset. |
| POST | `/auth/verify-reset-otp` | Public | Validate reset OTP. |
| POST | `/auth/reset-password` | Public | Reset password. |
| POST | `/auth/change-password` | Auth | Update password. |

---

## 2. User & Profile
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| GET | `/users/me` | Auth | Get profile. |
| PATCH | `/users/me` | Auth | Update profile. |

---

## 3. Mess Core
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| POST | `/messes` | Auth | Create mess. |
| POST | `/messes/join` | Auth | Join request. |
| GET | `/messes/:messId` | Member+ | Metadata. |
| PATCH | `/messes/:messId` | Manager | Update mess. |
| POST | `/messes/:messId/regenerate-invite-code` | Manager | Cycle code. |
| POST | `/messes/:messId/transfer-ownership` | Manager | Transfer owner. |

---

## 4. Membership Management
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| GET | `/messes/:messId/members` | Member+ | List members/requests. |
| POST | `/messes/:messId/members/:memberId/approve` | Manager | Admit applicant. |
| POST | `/messes/:messId/members/:memberId/reject` | Manager | Deny applicant. |
| DELETE | `/messes/:messId/members/:memberId/remove` | Manager | Kick member. |

---

## 5. Payments
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| POST | `/messes/:messId/payments` | Member+ | Submit payment. |
| GET | `/messes/:messId/payments` | Member+ | List messy payments. |
| GET | `/messes/:messId/payments/me` | Member+ | Own history. |
| GET | `/messes/:messId/payments/:paymentId` | Owner/Mgr | Detail. |
| POST | `/messes/:messId/payments/:paymentId/approve` | Manager | Ledger it. |
| POST | `/messes/:messId/payments/:paymentId/cancel` | Owner/Mgr | Soft-cancel. |

---

## 6. Expenses
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| POST | `/messes/:messId/expenses` | Member+ | Submit expense. |
| GET | `/messes/:messId/expenses` | Member+ | History. |
| GET | `/messes/:messId/expenses/:expenseId` | Owner/Mgr | Detail. |
| POST | `/messes/:messId/expenses/:expenseId/approve` | Manager | Ledger it. |
| POST | `/messes/:messId/expenses/:expenseId/cancel` | Owner/Mgr | Soft-cancel. |
| POST | `/messes/:messId/expenses/:expenseId/reimburse` | Manager | Liquidate debt. |

---

## 7. Billing cycle
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| GET | `/messes/:messId/billing` | Member+ | View cycles. |
| POST | `/messes/:messId/billing/preview` | Manager | Calc preview. |
| POST | `/messes/:messId/billing/finalize` | Manager | Seal period. |
| GET | `/messes/:messId/billing/:cycleId/members` | Member+ | Detailed bills. |
| POST | `/messes/:messId/billing/:cycleId/reopen` | Manager | Unseal period. |

---

## 8. Meals & Management
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| GET | `/messes/:messId/meals` | Member+ | Consumption list. |
| POST | `/messes/:messId/meals` | Manager | Log entry. |
| GET | `/messes/:messId/meal-off-requests` | Member+ | Off requests. |
| POST | `/messes/:messId/meal-off-requests` | Member+ | Apply off. |
| POST | `/messes/:messId/meal-off-requests/:requestId/approve` | Manager | Approve off. |

---

## 9. Operation Sub-modules (Notice, Complaint, UI, etc.)
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| GET | `/messes/:messId/notices` | Member+ | List. |
| POST | `/messes/:messId/notices` | Manager | Post. |
| GET | `/messes/:messId/complaints` | Member+ | List. |
| POST | `/messes/:messId/complaints` | Member+ | Submit. |
| POST | `/messes/:messId/utility-bills` | Manager | Log bill. |
| POST | `/messes/:messId/market-schedule` | Manager | Set duty. |
| POST | `/messes/:messId/menu-plans` | Manager | Set menu. |
| POST | `/messes/:messId/ai-shopping/generate` | Manager | AI bazar list. |

---

## 10. Reports
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| GET | `/messes/:messId/reports/summary` | Member+ | Dashboard stats. |
| GET | `/messes/:messId/reports/financial` | Member+ | Audit trail. |

---

## 11. Subscriptions
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| GET | `/subscriptions/plans` | Public | Global tiers. |
| POST | `/messes/:messId/subscriptions/trial` | Manager | Activate trial. |

---

## 12. Administration
| Method | Endpoint | Auth | Description |
|:---:|:---|:---:|:---|
| GET | `/admin/users` | Admin | List all. |
| GET | `/admin/messes` | Admin | List all. |
| PATCH | `/admin/messes/:messId/suspend` | Admin | Block mess. |
