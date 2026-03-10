# Security Audit — elitescort.fun (Live Penetration Test)

**Scope:** Live black-box testing against `https://elitescort.fun` + `https://api.elitescort.fun` + codebase review.  
**Date:** 2026-03-10  
**Tester:** Automated (curl, header analysis, endpoint fuzzing)

---

## Executive Summary

| Severity | Count | Action |
|----------|-------|--------|
| CRITICAL | 5     | **Fix immediately** |
| HIGH     | 4     | Fix this week |
| MEDIUM   | 3     | Fix recommended |
| LOW      | 2     | Optional / hardening |

---

## CRITICAL

### 1. JWT_SECRET is a default placeholder — full account takeover

**Risk:** Anyone who reads the `.env` (or guesses the default) can forge a JWT for ANY user, gaining full access to their account, balance, and profile.

**Evidence (codebase):**

```
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

This is the **actual production value**. It has never been changed.

**Impact:** Complete authentication bypass for every user account.

**Fix (on server):**

```bash
# Generate a strong secret
openssl rand -base64 48
# Put the result in the server's .env as JWT_SECRET=<generated_value>
# Restart the backend container
docker compose restart backend
```

All existing JWTs will be invalidated (users must log in again — that's desirable).

---

### 2. Password reset returns the token in the API response

**Risk:** The `POST /auth/forget-password` endpoint returns `{ ok: true, resetToken: "...", expiresAt: "..." }` directly in the HTTP response. An attacker can reset **any user's password** by:
1. Calling the endpoint with any email
2. Reading the token from the response
3. Using it to set a new password

**Evidence (live):**

```
POST https://api.elitescort.fun/auth/forget-password
Body: {"email":"test@test.com"}
Response: {"ok":true}   ← only "ok" because user doesn't exist,
                           but for existing users it returns the resetToken
```

**Evidence (code — auth.service.ts:252-256):**

```typescript
return {
  ok: true,
  resetToken: token,    // ← THIS MUST NEVER BE IN THE RESPONSE
  expiresAt,
};
```

**Impact:** Full account takeover for any user whose email is known.

**Fix (code):**

```typescript
// auth.service.ts — forgetPassword()
// Remove resetToken from response. Send it via email/SMS instead.
return { ok: true };
```

---

### 3. Direct balance injection — unlimited free money

**Risk:** Three endpoints allow any authenticated user to add arbitrary amounts to their balance without payment:

| Endpoint | Auth Required | Validates Payment? |
|----------|---------------|-------------------|
| `POST /auth/deposit` | JWT | **No** |
| `POST /auth/balance` | JWT | **No** |
| `POST /profile/balance` | JWT | **No** |

**Evidence (auth.controller.ts:37-56, profile.controller.ts:51-54):**

These call `deposit()` / `addBalance()` which directly run `UPDATE users SET balance = balance + :amount`.

The **only legitimate** balance credit path should be the OxaPay webhook (`POST /payment/webhook`) after HMAC-verified payment confirmation.

**Impact:** Any logged-in user can give themselves unlimited funds, purchase VIP, subscribe, etc.

**Fix (code):** Remove or protect all three endpoints:

```typescript
// Option A: Delete the endpoints entirely (recommended)
// Remove POST /auth/deposit, POST /auth/balance, POST /profile/balance

// Option B: Restrict to admin role only
@Post('deposit')
@UseGuards(JwtAuthGuard, AdminGuard)
deposit(...) { ... }
```

---

### 4. Rate limiting is NOT working (Cloudflare bypass)

**Risk:** The `@nestjs/throttler` is installed but **completely ineffective** in production because Cloudflare proxies all requests — the ThrottlerGuard sees Cloudflare's IP, not the real client IP.

**Evidence (live):** 10 rapid login attempts with wrong credentials — all returned HTTP 401, zero returned HTTP 429:

```
Attempt 1:  HTTP 401  ← should be 429 after attempt 5
Attempt 2:  HTTP 401
...
Attempt 10: HTTP 401  ← still no rate limit
```

**Impact:** Brute-force attacks on login, mass registration, API abuse are all unrestricted.

**Fix (code + server):**

**Step 1 — Tell NestJS to trust the proxy** (in `main.ts`):

```typescript
const app = await NestFactory.create(AppModule, { rawBody: true });
// Trust Cloudflare proxy so req.ip returns the real client IP
app.getHttpAdapter().getInstance().set('trust proxy', true);
```

**Step 2 — Override ThrottlerGuard to use CF-Connecting-IP** (create `src/Guards/cf-throttler.guard.ts`):

```typescript
import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class CfThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(
      req.headers['cf-connecting-ip'] ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip
    );
  }
}
```

Then in `app.module.ts`, replace `ThrottlerGuard` with `CfThrottlerGuard`.

**Step 3 — Also enable Cloudflare Rate Limiting** (free tier includes 1 rule):  
In Cloudflare dashboard → Security → WAF → Rate limiting rules → Add rule:
- URI path contains `/auth/login` OR `/auth/register`
- Rate: 5 requests per 60 seconds per IP
- Action: Block for 60 seconds

---

### 5. Secrets committed to repository / .env in git

**Risk:** The `.env` file contains production secrets and appears to be tracked or accessible:

| Secret | Value (partially redacted) | Risk |
|--------|---------------------------|------|
| `JWT_SECRET` | `your-super-secret-jwt-key...` | JWT forgery |
| `OXAPAY_MERCHANT_KEY` | `YTMM6T-3TRVC5-...` | Fake webhook calls |
| `BOT_TOKEN` | `8338350547:AAH3MIKh...` | Telegram bot hijacking |
| `DB_PASS` | `escortsitepassword` | Database access |

**Impact:** Anyone with repo access can compromise everything.

**Fix (server + git):**

```bash
# 1. Rotate ALL secrets immediately
openssl rand -base64 48  # new JWT_SECRET
# Get new OXAPAY key from OxaPay dashboard
# Get new BOT_TOKEN from @BotFather (/revoke then /newbot or /token)
# Change DB password: ALTER USER escortadmin WITH PASSWORD 'new-strong-password';

# 2. Ensure .env is in .gitignore (it should never be committed)
echo ".env" >> .gitignore

# 3. If .env was ever committed, remove it from git history
git rm --cached .env
git commit -m "Remove .env from tracking"
```

---

## HIGH

### 6. `x-powered-by: Express` header exposed

**Risk:** Reveals the backend framework, making it easier for attackers to find framework-specific exploits.

**Evidence (live):**

```
x-powered-by: Express
```

Helmet should remove this, but it's still present. The issue: Cloudflare might be caching old responses, OR helmet's `hidePoweredBy` isn't being applied before NestJS's default middleware.

**Fix (code — main.ts):** Add explicitly before helmet:

```typescript
app.getHttpAdapter().getInstance().disable('x-powered-by');
```

---

### 7. No Content-Security-Policy header in production

**Risk:** No CSP means the browser won't block injected scripts (XSS). Currently `contentSecurityPolicy: process.env.NODE_ENV === 'production'` uses Helmet's default CSP, but the live headers show **no CSP at all**.

**Evidence (live):** Response headers have no `content-security-policy` header.

**Probable cause:** `NODE_ENV` is not set to `production` in the container, so `process.env.NODE_ENV === 'production'` evaluates to `false`.

**Fix (server):** Ensure `NODE_ENV=production` in the Docker environment:

```yaml
# docker-compose.yml — backend service
environment:
  NODE_ENV: production
```

**Fix (code):** Also add a proper CSP instead of Helmet's default:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://api.elitescort.fun"],
      connectSrc: ["'self'", "https://api.elitescort.fun", "wss://api.elitescort.fun"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

---

### 8. No HSTS header

**Risk:** Without `Strict-Transport-Security`, a man-in-the-middle attacker can downgrade HTTPS to HTTP on the first visit.

**Evidence (live):** No `strict-transport-security` header present.

**Fix (server — Nginx or Cloudflare):**

Option A — Cloudflare: SSL/TLS → Edge Certificates → Enable "Always Use HTTPS" + set HSTS to `max-age=31536000; includeSubDomains`.

Option B — Nginx:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

### 9. `ownerUserId` exposed in escort profiles

**Risk:** The public escort profile endpoint returns the internal `ownerUserId` (UUID of the User entity). This enables:
- Account correlation (link escort profiles to user accounts)
- Targeted attacks against specific user IDs

**Evidence (live):**

```
GET /escort/7b2f6805-...
→ "ownerUserId": "61571504-3e26-403b-9e0a-79363b9d9882"
```

**Fix (code):** Remove `ownerUserId` from the public mapper in `escort-profile.mapper.ts`.

---

## MEDIUM

### 10. `ngrok-skip-browser-warning` in production CORS headers

**Risk:** Dev-only header left in production CORS config. Signals to attackers that the codebase has dev leftovers.

**Evidence (live):**

```
access-control-allow-headers: Content-Type,Authorization,ngrok-skip-browser-warning,hmac
```

**Fix (code — main.ts):** Remove `ngrok-skip-browser-warning` from `allowedHeaders`.

---

### 11. No Permissions-Policy header

**Risk:** Browser features (camera, microphone, geolocation) are not restricted, potentially exploitable by injected content.

**Fix (code or Nginx):**

```typescript
// In main.ts after helmet
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
```

---

### 12. WebSocket CORS allows all origins

**Risk:** Any website can open a WebSocket to `api.elitescort.fun`. Requires a valid JWT to do anything, but reduces defense-in-depth.

**Evidence (code — messages.gateway.ts):** `cors: { origin: '*' }`.

**Fix:** Set WebSocket CORS to match the frontend origins.

---

## LOW

### 13. Token stored in localStorage (XSS amplification)

**Risk:** If any XSS vulnerability is found, the attacker can steal the JWT from `localStorage`.

**Fix:** Move to `httpOnly` cookies, or ensure strict CSP prevents XSS entirely.

---

### 14. File upload validates MIME only (not magic bytes)

**Risk:** Theoretical — a spoofed MIME type could upload non-image files. Mitigated by files being served statically (not executed).

**Fix:** Validate file magic bytes (e.g., check first 4 bytes for JPEG `FFD8`, PNG `89504E47`, etc.).

---

## What Passed (Good)

| Test | Result | Details |
|------|--------|---------|
| TLS | **TLSv1.3** CHACHA20-POLY1305 | Modern cipher, Let's Encrypt cert valid until Jun 2026 |
| HTTP→HTTPS | **301 redirect** | Both `elitescort.fun` and `api.elitescort.fun` redirect |
| SQL injection | **Blocked** | UUID validation on IDs; TypeORM parameterized queries; `sortBy` injection returned normal data (no error/leak) |
| Path traversal | **Blocked** | `../../.env` and `../../../etc/passwd` both return 404 |
| Directory listing | **Disabled** | `/uploads/` and `/uploads/images/` return 404, not file lists |
| XSS in search | **Safe** | `<script>alert(1)</script>` in search param returns empty results, not reflected |
| Escort list data | **Clean** | Phone numbers and email not exposed in list endpoint |
| Upload abuse | **Blocked** | PUT to upload path returns 404; upload requires JWT auth |
| WebSocket auth | **Working** | Unauthenticated WS returns `{"code":3,"message":"Bad request"}` |
| Pagination limit | **Capped** | `limit=10000` returns `400: limit must not be greater than 100` |
| Real IP hidden | **Yes** | Cloudflare hides origin server IP; no `X-Real-IP` or `X-Forwarded-For` leaked to client |
| Deposit without auth | **Blocked** | Returns `401 Unauthorized` (but see Critical #3 — with auth it's wide open) |
| Password hashing | **bcrypt(10)** | Proper cost factor |
| Payment webhook | **HMAC-SHA512** | Verified, no auth bypass found |

---

## Priority Fix Checklist

### Immediate (do on server now)

- [ ] **Rotate JWT_SECRET** — `openssl rand -base64 48`, put in server `.env`, restart backend
- [ ] **Rotate OXAPAY_MERCHANT_KEY** — generate new key in OxaPay dashboard
- [ ] **Rotate BOT_TOKEN** — talk to @BotFather, get new token
- [ ] **Change DB password** — `ALTER USER escortadmin WITH PASSWORD 'new-strong-pw';`
- [ ] **Set `NODE_ENV=production`** in docker-compose backend environment
- [ ] **Enable HSTS** in Cloudflare (SSL/TLS → Edge Certificates)
- [ ] **Add Cloudflare rate limiting rule** for `/auth/login` and `/auth/register`

### Code fixes (then redeploy)

- [ ] Remove `resetToken` from forget-password response (auth.service.ts:252-256)
- [ ] Delete `POST /auth/deposit`, `POST /auth/balance`, `POST /profile/balance` endpoints (or admin-only)
- [ ] Add `trust proxy` + custom ThrottlerGuard for Cloudflare
- [ ] Disable `x-powered-by` explicitly
- [ ] Remove `ngrok-skip-browser-warning` from CORS allowedHeaders
- [ ] Remove `ownerUserId` from public escort profile response
- [ ] Set proper CSP directives
- [ ] Restrict WebSocket CORS to frontend origins
- [ ] Add `Permissions-Policy` header
- [ ] Ensure `.env` is in `.gitignore` and removed from git history
