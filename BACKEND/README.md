# Online Appointment System — Backend API

REST API for the Online Appointment System, built with **Node.js, Express 5, MongoDB (Mongoose) and JWT**.

## Setup

```bash
npm install
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
npm run seed              # creates the admin account + sample services and staff
npm run dev               # starts the API on http://localhost:5000 (auto-restarts on save)
```

| Script | Purpose |
|---|---|
| `npm start` | Start the server (used by Render) |
| `npm run dev` | Start with auto-restart on file changes |
| `npm run seed` | Add admin, sample services and staff (safe to re-run) |
| `npm run seed -- --reset` | Wipe services, staff and appointments, then seed |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | yes | MongoDB Atlas connection string |
| `JWT_SECRET` | yes | Secret used to sign login tokens |
| `JWT_EXPIRES_IN` | no | Token lifetime (default `1d`) |
| `PORT` | no | Port to listen on (default `5000`; Render sets this) |
| `CLIENT_URL` | no | Allowed client-app origin(s), comma-separated (default `http://localhost:5173`) |
| `ADMIN_URL` | no | Allowed admin-panel origin(s) (default `http://localhost:5174`) |
| `ADMIN_JWT_EXPIRES_IN` | no | Admin session lifetime (default `2h`) |
| `ADMIN_2FA` | no | `false` disables the emailed admin sign-in code (local testing only) |
| `APP_TIMEZONE` | no | Timezone for "today"/"past" checks (default `Asia/Manila`) |
| `BREVO_API_KEY` | in production | Brevo API key for sending OTP emails |
| `BREVO_SENDER_EMAIL` | with Brevo | A sender verified in your Brevo account |
| `BREVO_SENDER_NAME`, `APP_NAME` | no | Name shown on emails (default `CliniQuick`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | for seeding | Admin account created by `npm run seed` |

## Project structure

```
server.js            Entry point: connects to MongoDB, starts the server
app.js               Express app: security middleware, routes, error handling
config/              Environment variables and database connection
models/              Mongoose schemas: User, Service, Staff, Appointment, Otp, AuditLog
controllers/         Request handlers (business logic), incl. admin sign-in and audit log
routes/              URL → middleware → controller mapping
validators/rules.js  Input validation rules (express-validator)
middleware/          auth (scoped JWTs, admin guard, password re-confirmation), validation, sanitizing, errors
utils/               Tokens, credentials/lockout, OTP, email, audit, pagination, time-slot helpers
seed/seed.js         Sample data
```

## API endpoints

All responses are JSON. Protected routes need the header `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Access | Body / notes |
|---|---|---|---|
| POST | `/api/auth/register` | Public | `name, email, password, phone?`: creates an **unverified** account and emails a code (no token yet) |
| POST | `/api/auth/verify-email` | Public | `email, otp`: marks the email verified and returns `{ token, user }` |
| POST | `/api/auth/resend-otp` | Public | `email, purpose: verify-email \| reset-password` |
| POST | `/api/auth/login` | Public | `email, password`: unverified accounts get `403 { code: 'EMAIL_NOT_VERIFIED' }` |
| POST | `/api/auth/forgot-password` | Public | `email`: emails a reset code (same response whether or not the account exists) |
| POST | `/api/auth/verify-reset-otp` | Public | `email, otp`: returns a one-time `resetToken` (valid 10 minutes) |
| POST | `/api/auth/reset-password` | Public | `email, resetToken, password` |
| GET | `/api/auth/me` | Logged in | |

#### Email OTP rules
| Rule | Value |
|---|---|
| Code | 6 digits, cryptographically random, stored as an HMAC (never in plain text) |
| Expiry | 10 minutes |
| Resend cooldown | 60 seconds (`429 { code: 'OTP_COOLDOWN', retryAfter }`) |
| Sends per email | 5 per hour (`429 { code: 'OTP_LIMIT', retryAfter }`) |
| Wrong attempts | 5 per code, then the code is invalidated (`OTP_TOO_MANY_ATTEMPTS`) |
| Reuse | Codes and reset tokens are single-use; requesting a new code invalidates the old one |
| Per-IP limits | 10 email-sending requests and 20 code checks per 15 minutes |

Emails are sent through **Brevo's HTTP API** (`utils/email.js`). In development, if `BREVO_API_KEY` is empty, the email (with the code) is printed to the server console instead.

### Users
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/api/users/me` | Logged in | Own profile |
| PUT | `/api/users/me` | Logged in | `name, phone, currentPassword, newPassword` (returns a new `token` when the password changes) |
| POST | `/api/users/me/email` | Logged in | `newEmail, currentPassword`: emails a code to the **new** address |
| POST | `/api/users/me/email/verify` | Logged in | `newEmail, otp`: switches the account to the new email |
| POST | `/api/users/me/email/resend` | Logged in | `newEmail` (same cooldown/limits as other codes) |
| GET | `/api/users` | Admin | `?search=&role=&verified=&page=&limit=` (includes `locked`, `appointmentCount`) |
| PATCH | `/api/users/:id/role` | Admin + password | `role, confirmPassword`; ends that user's sessions; the last admin can't be demoted |
| PATCH | `/api/users/:id/unlock` | Admin | Clears a brute-force lockout |
| DELETE | `/api/users/:id` | Admin + password | `confirmPassword`; also deletes their appointments; the last admin can't be deleted |

### Staff portal
Staff accounts are created only by an admin invite. Every staff query is filtered by the signed-in staff member's own record, so staff never see anyone else's appointments or clients.

| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/api/staff/:id/invite` | Admin | Creates the staff login (if needed) and emails a code valid for 24 hours |
| DELETE | `/api/staff/:id/access` | Admin | Deletes the staff login; all their sessions end immediately |
| POST | `/api/auth/staff/activate` | Public | `email, otp, password` → staff session |
| POST | `/api/auth/staff/resend` | Public | `email` (same response whether or not an invite exists) |
| GET | `/api/staff-portal/me` | Staff | Own staff record (services, hours) |
| GET | `/api/staff-portal/summary` | Staff | Today / next 7 days / to confirm / completed |
| GET | `/api/staff-portal/day?date=` | Staff | That day's appointments (with client contact info) and time off |
| GET | `/api/staff-portal/appointments` | Staff | `?search=&status=&from=&to=&scope=&page=&limit=` (own only) |
| GET | `/api/staff-portal/appointments/:id` | Staff | Own only; others return 404 |
| PATCH | `/api/staff-portal/appointments/:id` | Staff | `status: confirmed \| completed`, `staffNotes` (private) |

### Time off
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/api/time-off` | Staff (own) / Admin | `?staff=&from=&to=&page=&limit=` (upcoming by default) |
| POST | `/api/time-off` | Staff (own) / Admin | `date, allDay, startTime?, endTime?, reason?` (+ `staff` for admins). Rejected if it overlaps booked appointments or existing time off |
| DELETE | `/api/time-off/:id` | Staff (own) / Admin | |
| GET | `/api/staff/:id/unavailable` | Public | Full days off as dates only (no reasons), for the booking calendar |

### Admin panel
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/api/admin/auth/login` | Public | `email, password` → emails a code; returns `{ requiresOtp, challengeToken, emailHint }` |
| POST | `/api/admin/auth/verify` | Public | `challengeToken, otp` → `{ token }` (admin session, 2 hours) |
| POST | `/api/admin/auth/resend` | Public | `challengeToken` |
| GET | `/api/admin/auth/me` | Admin | |
| POST | `/api/admin/auth/logout` | Admin | Recorded in the audit log |
| GET | `/api/admin/audit-logs` | Admin | `?search=&action=<prefix>&success=&page=&limit=` (read-only) |

"Admin" in these tables means an **admin-panel session**: a token from `/api/admin/auth/verify`. An admin who logs into the client app gets a normal client token, with client-level access.

### Services
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/api/services` | Public | `?search=&page=&limit=`; admins may add `includeInactive=true` |
| GET | `/api/services/:id` | Public | |
| POST | `/api/services` | Admin | `name, description, durationMinutes, price, isActive` |
| PUT | `/api/services/:id` | Admin | Any of the fields above |
| DELETE | `/api/services/:id` | Admin | Blocked while pending/confirmed appointments exist |

### Staff
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/api/staff` | Public | `?service=<id>&search=&page=&limit=`; admins may add `includeInactive=true` |
| GET | `/api/staff/:id` | Public | |
| POST | `/api/staff` | Admin | `name, specialization, email, services[], workingDays[] (0=Sun..6=Sat), startTime, endTime, isActive` |
| PUT | `/api/staff/:id` | Admin | Any of the fields above |
| DELETE | `/api/staff/:id` | Admin | Blocked while pending/confirmed appointments exist |

### Appointments
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/api/appointments` | Logged in | Clients get their own; admins get all. `?search=&status=<status>\|active&date=&from=&to=&staff=&service=&scope=upcoming\|past&sort=asc\|desc&page=&limit=` |
| GET | `/api/appointments/available-slots` | Logged in | `?service=&staff=&date=YYYY-MM-DD&exclude=<apptId>` |
| GET | `/api/appointments/stats` | Logged in | Dashboard counts (admins also get totals and a 7-day chart) |
| GET | `/api/appointments/:id` | Owner / Admin | |
| POST | `/api/appointments` | Logged in | `service, staff, date, startTime, notes?` → status `pending` |
| PUT | `/api/appointments/:id` | Owner / Admin | Reschedule, edit notes, or change `status` (clients may only cancel) |
| DELETE | `/api/appointments/:id` | Owner / Admin | |

List endpoints return `{ items: [...], pagination: { page, limit, total, totalPages } }`.
Errors return `{ message, errors?: [{ field, message }] }`.

## Booking rules

- The staff member must offer the service and work on that weekday.
- The appointment must fit inside the staff member's working hours.
- Past dates and times are rejected (checked in `APP_TIMEZONE`), and bookings can be made at most 60 days ahead.
- No overlap with the staff member's other pending/confirmed appointments, or with the client's own.
- Time slots are offered every 30 minutes; each lasts the service's duration.
- When a client reschedules, the appointment goes back to `pending` for the admin to confirm.
- An appointment can only be marked `completed` once it has started.
- Nothing can be booked during a specialist's time off (full or partial day); the reason is never shown to clients.

## Security measures

- Passwords hashed with **bcrypt** (12 rounds); never returned by the API.
- **Email verification by OTP** before an account can log in; **password reset by OTP** (see the rules above).
- **JWT** authentication middleware; the user is re-loaded on each request, so deleted accounts lose access immediately.
- Changing or resetting a password **logs out all other sessions** (each JWT carries a `tokenVersion` that must match the user's).
- "Forgot password" never reveals whether an email is registered (same response, same limits, same error messages).
- **Scoped tokens**: client-app tokens (`user`), staff-portal tokens (`staff`, 12 hours), admin-panel tokens (`admin`, 2 hours) and the 2FA step token (`admin-2fa`, 10 minutes, usable only to finish sign-in). Each API accepts only the scopes it is meant for (e.g. only `user` sessions can book; only `staff` sessions reach the staff portal), and roles are re-checked in the database on every request.
- **Three roles, strictly separated**: clients see only their own appointments; staff only theirs (by staff record); admins everything, but only from the admin panel. Private staff notes are never sent to clients.
- **Admin two-factor sign-in**: password + a code emailed to the admin. Client accounts can't sign in to the admin panel, and they get the same error as a wrong password.
- **Account lockout**: 5 wrong passwords lock the account for 15 minutes; admins can unlock early. Unknown emails take the same time as real ones (no timing leaks).
- **Step-up confirmation**: changing a role or deleting a user requires re-entering the admin's password.
- **Safety rails**: admins can't change their own role or delete themselves; the last admin can't be removed; role changes end that user's sessions.
- **Audit log**: admin sign-ins (including failures), wrong confirmation passwords and every admin change are recorded with IP and browser. Entries are read-only.
- **Stronger admin passwords**: 12+ characters with upper/lowercase, a number and a symbol.
- **Ownership checks**: clients only ever see or change their own appointments (others return 404).
- **Input validation** on every endpoint, including list filters (express-validator).
- **NoSQL injection protection**: `$`-keys are stripped from request bodies, and fields are validated as strings/IDs.
- **Mass-assignment protection**: services and staff accept only whitelisted fields.
- **helmet** security headers, **CORS** limited to the client and admin URLs, 10 kB JSON body limit, `Cache-Control: no-store` on API responses.
- **Rate limiting** per IP on login/register, code checks and admin sign-in (5 failures per 15 minutes).
- Staff email addresses are only returned to the admin panel.
- Search input is escaped before being used in regular expressions.
- Internal error details are hidden in production.
