# Two-Factor Authentication (2FA) Implementation Plan

*Saved for future implementation. Ask the AI to implement this when ready.*

---

## Overview

Add TOTP-based 2FA (e.g. Google Authenticator, Authy) so users can protect their accounts. Users opt in to enable 2FA in their settings. When enabled, login requires email + password + 6-digit code.

---

## Phase 1: Database & Backend Foundation

### 1.1 Database Schema

**User model changes (`prisma/schema.prisma`):**

| Column            | Type     | Description                                            |
|-------------------|----------|--------------------------------------------------------|
| `twoFactorSecret` | String?  | TOTP secret (base32), null when 2FA is not enabled    |
| `twoFactorEnabled`| Boolean  | Default false, true when 2FA is active                 |

- Migration required
- `twoFactorSecret` only used when `twoFactorEnabled` is true

### 1.2 New Dependencies

- **Backend:** `speakeasy` (TOTP), `qrcode` (QR codes)

### 1.3 Auth Flow

**Current login:** POST `/auth/login` with email + password → JWT

**New login (when 2FA enabled):**
1. POST `/auth/login` with email + password → if 2FA enabled: return `{ requires2FA: true, tempToken }`
2. POST `/auth/verify-2fa` with `tempToken` + `code` → JWT

**Temp token:** 5 min expiry, one-time use, signed with JWT_SECRET.

---

## Phase 2: Backend API

### 2.1 Auth Routes

| Method | Endpoint          | Purpose                                           |
|--------|-------------------|---------------------------------------------------|
| POST   | `/auth/login`     | If 2FA enabled, return `requires2FA` + `tempToken`|
| POST   | `/auth/verify-2fa`| Exchange `tempToken` + `code` for JWT             |

### 2.2 2FA Management Routes (Authenticated)

| Method | Endpoint                 | Purpose                                   |
|--------|--------------------------|-------------------------------------------|
| POST   | `/auth/2fa/setup`        | Generate secret, return QR                |
| POST   | `/auth/2fa/verify-setup`  | Verify code, enable 2FA                   |
| POST   | `/auth/2fa/disable`      | Disable 2FA (require password or code)    |
| GET    | `/auth/2fa/status`       | Return whether 2FA is enabled             |

---

## Phase 3: Frontend

- **Login page:** After password success, if `requires2FA`, show 6-digit code input; submit to `/auth/verify-2fa`.
- **2FA settings:** Add Security/Account page with enable (QR scan + verify) and disable flows.
- **Nav:** Add "Security" or "Account" link from user menu.

---

## Phase 4: Security

- Temp token: 5–10 min expiry, one use
- Rate limit 2FA attempts
- Optional: recovery codes
- HTTPS required in production

---

## Phase 5: Implementation Order

1. Add `twoFactorSecret`, `twoFactorEnabled` to User (migration)
2. Install `speakeasy`, `qrcode`
3. Update `/auth/login` to return `requires2FA` when needed
4. Add temp token generation
5. Implement `POST /auth/verify-2fa`
6. Implement `POST /auth/2fa/setup`
7. Implement `POST /auth/2fa/verify-setup`
8. Implement `POST /auth/2fa/disable`
9. Implement `GET /auth/2fa/status`
10. Update login page UI
11. Add 2FA settings page
12. Add Security link to nav

---

## Effort Estimate

- Backend: 2–3 hours
- Frontend: 1–2 hours
- Testing: ~1 hour
- **Total: ~5 hours** (can be done in stages: core first, then settings UI, then polish)

---

## Deployment

Deploy as usual: push to GitHub. Railway runs `prisma migrate deploy` on start. No new env vars needed (reuse JWT_SECRET for temp token). Fully backwards compatible.
