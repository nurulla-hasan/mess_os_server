# MessManagerOS Worklog

Last updated: 2026-05-09

## Core Role Model

- `globalRole` is platform-level: `user`, `manager`, `super_admin`.
- `messRole` is mess-level membership: `manager`, `member`.
- A global `manager` can create messes.
- A mess `manager` can manage one specific mess.
- A `super_admin` can access admin panel and may also keep personal mess memberships.

## Role Change Guard

Admin endpoint:

`PATCH /api/v1/admin/users/:userId/role`

Guard added:

- Downgrading a user to `globalRole=user` is blocked if that user manages any active mess.
- Error tells admin to transfer ownership first.
- Promotion to `manager` or `super_admin` is allowed.

## Manager Access Request Flow

User endpoints:

- `POST /api/v1/users/me/manager-request`
- `GET /api/v1/users/me/manager-request`
- `POST /api/v1/users/me/switch-mess`

Switch mess body:

```json
{
  "messId": "..."
}
```

Switch mess validates that the authenticated user has an active membership in the selected active mess. It returns `messId`, `messRole`, and `redirectTo` (`/manager` or `/dashboard`) so the frontend can safely set its `activeMessId` cookie after success.

Admin endpoints:

- `GET /api/v1/admin/manager-requests?status=pending&page=1&limit=20&searchTerm=...`
- `PATCH /api/v1/admin/manager-requests/:requestId/status`

Review body:

```json
{
  "status": "approved",
  "adminNote": "Approved for mess creation."
}
```

Allowed review statuses: `approved`, `rejected`.

Approved request sets `User.globalRole = "manager"`.

## Mess Membership Flow

Members list:

`GET /api/v1/messes/:messId/members`

Lightweight active member options:

`GET /api/v1/messes/:messId/members/options`

Options response has no pagination and includes:

- `_id` as mess member id
- `name`
- `email`
- `phone`
- `avatarUrl`
- `messRole`

Query params:

- `page`
- `limit` max 100
- `status=active|pending|rejected|removed`
- `searchTerm=name/email/phone`

No `status` as manager returns all statuses.

Response includes pagination `meta`.

Pending approval/rejection is one endpoint:

`PATCH /api/v1/messes/:messId/members/:memberId/status`

Body:

```json
{
  "status": "active"
}
```

Allowed statuses: `active`, `rejected`.

Remove member stays separate:

`POST /api/v1/messes/:messId/members/:memberId/remove`

Removed members cannot rejoin automatically.

Rejected members can submit join request again; existing record is set back to `pending`.

## Manager Dashboard

Dashboard aggregate endpoint:

`GET /api/v1/messes/:messId/dashboard`

Role:

- mess manager only

Includes:

- mess header data with invite code and settings
- current subscription and plan details
- summary counters for active members, pending joins, today meals, pending payments, monthly approved expenses, pending expenses, unpaid utilities, open complaints, pending market duties, and cash fund totals
- today meal category breakdown
- recent active notices
- pending action counts

Use this endpoint for the manager dashboard main page. Use module-specific APIs for detail tables and actions.

## Menu Plan Flow

Endpoints:

- `GET /api/v1/messes/:messId/menu-plans`
- `POST /api/v1/messes/:messId/menu-plans`
- `PATCH /api/v1/messes/:messId/menu-plans/:planId`
- `PATCH /api/v1/messes/:messId/menu-plans/:planId/status`

List query params:

- `page`
- `limit` max 100
- `status=draft|published|archived`
- `start`/`end`
- `startDate`/`endDate` aliases

Rules:

- Menu plan meals use dynamic category keys from `mess.settings.mealCategories`.
- Use the list endpoint with `startDate` and `endDate` set to the same date to fetch a specific day.
- Category matching is case-insensitive, but response stores canonical category names from settings.
- AI generation uses mess meal categories, optional `aiPreference`, optional `aiBudget`, and recent menu context.
- AI create body can omit `meals` when `isAiGenerated=true`.
- Optional AI fields: `aiPreference` (max 200 chars), `aiBudget`, `avoidRecentDays` from 0 to 30, defaulting to 7 in service behavior.
- Create always starts as `draft`.
- Status endpoint accepts `published` or `archived`.
- Archived menu plans cannot be edited.
- Menu plans do not affect meal count, meal rate, or billing directly.
- AI shopping can generate shopping lists from a menu plan.

## Meals Flow

Endpoints:

- `GET /api/v1/messes/:messId/meals`
- `POST /api/v1/messes/:messId/meals`
- `POST /api/v1/messes/:messId/meals/bulk`

List query params:

- `page`
- `limit` max 100
- `memberId` for manager/super admin only
- `searchTerm` for manager/super admin, searches mess member id or member name/email/phone
- `start`/`end`
- `startDate`/`endDate` aliases

Rules:

- Managers can list all meal records.
- Members can list only their own meal records.
- Meal writes require manager role.
- `messMemberId` must be an active member of the same mess.
- `mealCount` must be from `0` to `3` in `0.5` increments.
- Preferred write body uses category breakdown from mess `settings.mealCategories`, plus special `Guest`, for example `meals: { Breakfast: 1, Lunch: 1, Dinner: 1, Guest: 2 }`.
- Backend calculates and stores total `mealCount` from `meals`.
- Guest meals increase the selected member's total meal count.
- Regular meal total cannot exceed `3`; total including `Guest` cannot exceed `50`.
- Backward compatible `mealCount`-only writes are still accepted.
- Meal writes are blocked when the related monthly billing cycle is finalized; reopen billing first.
- Bulk meal logging rejects duplicate `messMemberId` values and supports up to 200 entries.

## Meal Off Request Flow

Endpoints:

- `GET /api/v1/messes/:messId/meal-off-requests`
- `POST /api/v1/messes/:messId/meal-off-requests`
- `PATCH /api/v1/messes/:messId/meal-off-requests/:requestId/status`

List query params:

- `page`
- `limit` max 100
- `status=pending|approved|rejected|canceled`
- `messMemberId` or `memberId`
- `searchTerm` for manager/super admin, searches mess member id or member name/email/phone
- `start`/`end`
- `startDate`/`endDate` aliases

Rules:

- Managers can list all meal off requests.
- Members can list only their own meal off requests.
- Date filters return requests whose off range overlaps the selected range.
- API responses standardize on MongoDB `_id`; duplicate `id` aliases should not be returned.
- Populated `messMemberId` includes user details under `user`, matching the members list response shape.
- Response includes pagination `meta`.
- Review body accepts `status=approved|rejected|canceled`.
- Reviewed requests store audit data in `reviewedBy` and `reviewedAt`.
- Legacy `approvedBy` data is normalized to `reviewedBy` in list responses.
- Review transitions: pending requests can become `approved` or `rejected`; approved requests can become `canceled`.
- Approved meal off dates block single and bulk meal logging for the member/date.
- Canceling an approved request allows meal logging again. Existing zero meal records can be overwritten by normal meal logging.

## Unified Status Endpoints

Status/action endpoints are compressed so the same resource uses one status route instead of separate approve/reject/complete/void routes.

Payments:

- `PATCH /api/v1/messes/:messId/payments/:paymentId/status`
- Body `status=approved|rejected|canceled`
- Only managers can approve/reject; members can cancel their own pending payment.

Expenses:

- `PATCH /api/v1/messes/:messId/expenses/:expenseId/status`
- Body `status=approved|rejected|canceled`
- Only managers can approve/reject; members can cancel their own pending expense.
- Reimbursement stays separate because it is a cash movement after approval.

Market schedules:

- `PATCH /api/v1/messes/:messId/market-schedules/:scheduleId/status`
- Body `status=completed|void`
- Completing requires `actualSpent` and `fundSource`.
- Backend uses authenticated `req.messMember._id` as the expense `paidBy`; frontend does not send `actorMessMemberId`.
- Reassignment uses `PATCH /api/v1/messes/:messId/market-schedules/:scheduleId` with `assignedTo`.
- Pending schedule update supports `assignedTo`, `shoppingItems`, and `estimatedBudget`.
- `actualSpent` is submitted only when completing the schedule; the separate spent update endpoint was removed.
- List and my-duties support `page`, `limit`, and `status`.
- Market schedule responses populate `assignedTo` with mess member and nested `user` details.

AI shopping:

- `PATCH /api/v1/messes/:messId/ai-shopping/:listId/status`
- Body `status=approved|rejected`
- Conversion stays separate because it creates a market schedule.
- List supports `page`, `limit`, and `status`.

Complaints:

- `PATCH /api/v1/messes/:messId/complaints/:complaintId/status`
- Body `status=in_progress|resolved|rejected`, optional `resolvedNote`
- List and my complaints support `page`, `limit`, and `status`.

## Admin Mess Management

Admin mess list:

`GET /api/v1/admin/messes?page=1&limit=20&status=active&searchTerm=...`

Includes:

- pagination meta
- manager info
- active `memberCount`

Search matches:

- mess name
- address
- invite code
- manager name/email/phone

Mess status update:

`PATCH /api/v1/admin/messes/:messId/suspend`

Body:

```json
{
  "status": "suspended",
  "suspensionNote": "Payment policy violation."
}
```

Allowed statuses: `active`, `suspended`.

Suspended mess behavior:

- managers/members cannot access mess-scoped routes
- `super_admin` bypasses this check
- activating a mess clears `suspensionNote`, `suspendedAt`, and `suspendedBy`

## Admin User Management

Admin users list:

`GET /api/v1/admin/users?page=1&limit=20&searchTerm=...`

Includes pagination meta.

Search matches:

- full name
- email
- phone
- global role
- status

User status update:

`PATCH /api/v1/admin/users/:userId/status`

Body:

```json
{
  "status": "blocked"
}
```

Allowed statuses: `active`, `blocked`.

Blocked users can still call `GET /api/v1/users/me` but other authenticated routes are blocked.

## Subscription Plan Flow

Plans are DB-managed with auto seed when no plan exists:

- Free: default, free, maxMembers 10
- Pro: paid monthly, maxMembers 50
- Max: paid monthly, maxMembers 100

Admin plan endpoints:

- `GET /api/v1/admin/subscription-plans`
- `POST /api/v1/admin/subscription-plans`
- `PATCH /api/v1/admin/subscription-plans/:subscriptionPlanId`
- `DELETE /api/v1/admin/subscription-plans/:subscriptionPlanId`

Plan rules:

- only one default plan
- default plan cannot be deleted or deactivated
- used plans are deactivated instead of hard-deleted
- used plan code cannot be changed

Feature keys are fixed:

- `meals`
- `expenses`
- `billing`
- `reports`
- `marketSchedule`
- `aiShopping`
- `notices`
- `complaints`
- `prioritySupport`

## Mess Subscription Flow

New mess creation automatically assigns the default Free plan.

Public plans:

`GET /api/v1/subscriptions/plans`

Current subscription:

`GET /api/v1/messes/:messId/subscriptions/current`

Subscribe/upgrade:

`POST /api/v1/messes/:messId/subscriptions/subscribe`

Free body:

```json
{
  "planId": "free"
}
```

Paid body:

```json
{
  "planId": "pro"
}
```

Paid plan returns SSLCommerz `gatewayUrl`; frontend redirects user there.

Cancel:

`POST /api/v1/messes/:messId/subscriptions/cancel`

Cancel falls back to default Free plan.

History:

`GET /api/v1/messes/:messId/subscriptions/history`

History actions:

- `default_assigned`
- `subscribed`
- `canceled`
- `fallback_to_default`
- `payment_failed`

## Admin Subscription List

Endpoint:

`GET /api/v1/admin/subscriptions?page=1&limit=20&status=active&planId=pro&searchTerm=...`

Includes:

- pagination meta
- subscription info
- mess info
- manager info
- plan info

Search matches:

- mess name/address/invite code
- manager name/email/phone
- plan name/code

## Admin Analytics

Endpoint:

`GET /api/v1/admin/analytics`

Includes subscription analytics inside `summary.subscriptions`:

- total subscriptions
- active subscriptions
- paid active and free active counts
- estimated monthly recurring revenue
- status breakdown
- plan breakdown with plan name, price, billing cycle, count, and active count
- subscribed events from the last 7 days
- payment failed events from the last 7 days

## SSLCommerz Integration

Environment variables:

```env
API_BASE_URL=http://localhost:5000
SSLCOMMERZ_STORE_ID=your_sslcommerz_store_id
SSLCOMMERZ_STORE_PASSWORD=your_sslcommerz_store_password
SSLCOMMERZ_IS_SANDBOX=true
SSLCOMMERZ_TRANSACTION_PREFIX=MOS
```

Callbacks:

- `POST /api/v1/subscriptions/sslcommerz/success`
- `POST /api/v1/subscriptions/sslcommerz/fail`
- `POST /api/v1/subscriptions/sslcommerz/cancel`
- `POST /api/v1/subscriptions/sslcommerz/ipn`

IPN URL for SSLCommerz merchant panel:

`{{API_BASE_URL}}/api/v1/subscriptions/sslcommerz/ipn`

Success/IPN validates `val_id` with SSLCommerz and checks:

- status is `VALID` or `VALIDATED`
- `tran_id` matches
- amount matches
- currency matches

Then subscription is activated.

## Postman Notes

Collection file:

`docs/Mess-Manager-OS.json`

Raw JSON bodies must remain valid JSON. Allowed enum values are documented in request descriptions, not comments inside JSON bodies.

Recently cleaned:

- removed misleading Start Trial request
- removed old `paymentToken`/Stripe/mock wording
- fixed invalid commented JSON body in Register request
- added allowed status/role descriptions
- made empty query filters safe for admin list endpoints
- made empty query filters safe for manager request and mess member list endpoints
- payment and expense list endpoints support validated `page`, `limit`, and `status`
- report date filters accept both `start`/`end` and `startDate`/`endDate`

## Menu Plan AI Notes

- `POST /api/v1/messes/:messId/menu-plans` can create manual or AI draft menu plans.
- Manual mode sends `meals` with keys matching `mess.settings.mealCategories`.
- AI mode sends `isAiGenerated: true` and may include `aiPreference`, `aiBudget`, and `avoidRecentDays`.
- AI generation now uses the OpenAI Responses API when `AI_PROVIDER=openai`.
- Required AI env for real generation: `AI_API_KEY`; optional `AI_MODEL` defaults to `gpt-5.4-mini`, `AI_MAX_TOKENS` defaults to `1200`.
- If `AI_PROVIDER=openai` and the API key is missing/placeholder, generation fails instead of silently returning mock data.
- `AI_PROVIDER=mock` keeps the old hardcoded local generator for intentional testing only.
- AI generation uses mess meal categories, preference/budget hints, and recent menu context to reduce repeated meals.
- AI shopping list generation reads the menu plan meals and handles both stored Map data and plain object responses.
