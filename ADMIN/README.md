# CliniQuick Admin Panel

Admin frontend for the Online Appointment System (React + Vite + MUI). It is a separate app from the client site, so no admin code ships to regular users.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5174 (the backend must be running)
```

Optional `.env` (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend URL |
| `VITE_IDLE_TIMEOUT_MINUTES` | `15` | Sign out after this long without activity |

## Pages

| Page | What it does |
|---|---|
| Sign in | Password, then a 6-digit code emailed to the admin |
| Dashboard | Stats, next-7-days chart, one-click confirm/cancel queue, today's schedule |
| Appointments | Filter by status/specialist/date/search; confirm, complete, reschedule, cancel, delete |
| Services | Add/edit/delete, switch bookable on/off |
| Staff | Add/edit/delete, services offered, working days and hours, staff-portal invites (invite / resend / revoke), time off |
| Users | Search/filter, unlock locked accounts, grant/remove admin, delete (password required) |
| Audit log | Read-only history of admin sign-ins and changes |
| My account | Session details, change password (stricter admin rules) |

## Security

- **Two-factor sign-in** (password + emailed code). The step-1 token is kept in memory only.
- **Short sessions**: the token expires after 2 hours and is stored in `sessionStorage`, so it's gone when the tab closes and isn't shared with other tabs or the client app.
- **Idle sign-out** after 15 minutes, with a 60-second warning.
- **Instant sign-out** on any 401 from the API (expired, revoked or admin rights removed).
- **Password re-confirmation** for role changes and account deletion.
- **Hardened hosting** (`vercel.json`): Content-Security-Policy, `X-Frame-Options: DENY`, HSTS, no referrer, `noindex` (also in `robots.txt` and a meta tag), no source maps.

Route guards here only control what the UI shows. The real protection is the API, which rejects every admin request without a valid admin-panel token.

## Deploy (Vercel)

- Root Directory: `ADMIN`
- Environment variable: `VITE_API_URL=https://<your-backend>.onrender.com/api`
- Then add the admin URL to the backend's `ADMIN_URL` on Render.
