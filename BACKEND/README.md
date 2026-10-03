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
| `CLIENT_URL` | no | Allowed frontend origin(s), comma-separated (default `http://localhost:5173`) |
| `APP_TIMEZONE` | no | Timezone for "today"/"past" checks (default `Asia/Manila`) |
| `BREVO_API_KEY` | in production | Brevo API key for sending OTP emails |
| `BREVO_SENDER_EMAIL` | with Brevo | A sender verified in your Brevo account |
| `BREVO_SENDER_NAME`, `APP_NAME` | no | Name shown on emails (default `BookEase`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | for seeding | Admin account created by `npm run seed` |

## Project structure

```
server.js            Entry point: connects to MongoDB, starts the server
app.js               Express app: security middleware, routes, error handling
config/              Environment variables and database connection
models/              Mongoose schemas: User, Service, Staff, Appointment
controllers/         Request handlers (business logic)
routes/              URL → middleware → controller mapping
validators/rules.js  Input validation rules (express-validator)
middleware/          auth (JWT + roles), validation, body sanitizing, errors
utils/               Pagination/search helpers, time-slot helpers, ApiError
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
| PUT | `/api/users/me` | Logged in | `name, email, phone, currentPassword, newPassword` |
| GET | `/api/users` | Admin | `?search=&role=&page=&limit=` |
| PATCH | `/api/users/:id/role` | Admin | `role: client \| admin` |
| DELETE | `/api/users/:id` | Admin | Also deletes their appointments |

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
| GET | `/api/appointments` | Logged in | Clients get their own; admins get all. `?search=&status=&date=&scope=upcoming\|past&sort=asc\|desc&page=&limit=` |
| GET | `/api/appointments/available-slots` | Logged in | `?service=&staff=&date=YYYY-MM-DD&exclude=<apptId>` |
| GET | `/api/appointments/stats` | Logged in | Dashboard counts (admins also get client/service/staff totals) |
| GET | `/api/appointments/:id` | Owner / Admin | |
| POST | `/api/appointments` | Logged in | `service, staff, date, startTime, notes?` → status `pending` |
| PUT | `/api/appointments/:id` | Owner / Admin | Reschedule, edit notes, or change `status` (clients may only cancel) |
| DELETE | `/api/appointments/:id` | Owner / Admin | |

List endpoints return `{ items: [...], pagination: { page, limit, total, totalPages } }`.
Errors return `{ message, errors?: [{ field, message }] }`.

## Booking rules

- The staff member must offer the service and work on that weekday.
- The appointment must fit inside the staff member's working hours.
- Past dates and times are rejected (checked in `APP_TIMEZONE`).
- No overlap with the staff member's other pending/confirmed appointments, or with the client's own.
- Time slots are offered every 30 minutes; each lasts the service's duration.
- When a client reschedules, the appointment goes back to `pending` for the admin to confirm.

## Security measures

- Passwords hashed with **bcrypt** (12 rounds); never returned by the API.
- **Email verification by OTP** before an account can log in; **password reset by OTP** (see the rules above).
- **JWT** authentication middleware; the user is re-loaded on each request, so deleted accounts lose access immediately.
- Changing or resetting a password **logs out all other sessions** (each JWT carries a `tokenVersion` that must match the user's).
- "Forgot password" never reveals whether an email is registered (same response, same limits, same error messages).
- **Role-based access** (`authorize('admin')`) and ownership checks on appointments.
- **Input validation** on every write endpoint (express-validator).
- **NoSQL injection protection**: `$`-keys are stripped from request bodies, and fields are validated as strings/IDs.
- **helmet** security headers, **CORS** limited to the frontend URL, 10 kB JSON body limit.
- **Rate limiting** on login/register (10 failed attempts per 15 minutes per IP).
- Search input is escaped before being used in regular expressions.
- Internal error details are hidden in production.
