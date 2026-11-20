# Nexora Technologies — Security Specification & Invariants

## 1. Data Invariants
1. **Business Isolation**: Every financial record (`datasets`, `transactions`, `accounts`, `budgets`, `risks`, `aiInsights`, `customers`, `subscriptions`, `auditLogs`) lives under `/businesses/{businessId}` and carries an immutable `businessId` matching the path parameter and `ownerId` matching the parent business's `ownerId`.
2. **Identity Integrity**: Users can only read/write `/users/{userId}` where `userId == request.auth.uid` (unless verified Admin). Users cannot self-assign `Administrator` role on registration unless their verified token email matches the bootstrapped admin (`sharmavaibhav7090@gmail.com`).
3. **Immutable Ownership & Audit Trails**: `ownerId`, `businessId`, and `createdAt` cannot be modified after creation. `auditLogs` are append-only (`update` and `delete` are permanently denied).
4. **Temporal Integrity**: `createdAt` on create and `updatedAt` on update must equal `request.time`.
5. **Query Enforcer**: All `allow list` rules strictly filter against `resource.data.ownerId == request.auth.uid` or verified admin email—never delegating filtering to client code alone and never executing `get()`/`exists()` inside `allow list`.
6. **Verified Accounts Only**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `get(/businesses/biz-1/transactions/tx-1)` with `auth = null`.
2. **Unverified Email Write**: `set(/businesses/biz-1, ...)` with `auth.token.email_verified = false`.
3. **Identity Spoofing on Business Create**: `set(/businesses/biz-1, { ownerId: "victim-uid", ... })` where `auth.uid == "attacker-uid"`.
4. **Role Escalation on User Profile Create**: `set(/users/attacker-uid, { role: "Administrator", ... })` where `auth.token.email != "sharmavaibhav7090@gmail.com"`.
5. **Role Escalation on User Profile Update**: `update(/users/attacker-uid, { role: "Administrator" })`.
6. **Shadow / Ghost Field Injection**: `set(/businesses/biz-1/transactions/tx-1, { ..., isVerified: true })` (rejected by `keys().hasOnly(...)`).
7. **ID Poisoning (Oversized Path ID)**: `set(/businesses/<1500-char-id>, ...)` (rejected by `isValidId`).
8. **Cross-Tenant Transaction Creation**: `set(/businesses/victim-biz/transactions/tx-1, { ownerId: "attacker-uid", ... })` (rejected by Master Gate `get(parent).data.ownerId == request.auth.uid`).
9. **Immutability Bypass on Update**: `update(/businesses/biz-1/transactions/tx-1, { ownerId: "other-uid" })` (rejected by `affectedKeys().hasOnly(...)` & `incoming().ownerId == existing().ownerId`).
10. **PII Blanket Read**: `get(/users/victim-uid)` by another signed-in non-admin user.
11. **Audit Log Tampering**: `update(/businesses/biz-1/auditLogs/log-1, { summary: "redacted" })` or `delete(...)`.
12. **Client-Trust List Scraping**: `list(/businesses/victim-biz/transactions)` without matching `ownerId == auth.uid`.
