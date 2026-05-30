# Scope rules
- Never add features not explicitly requested
- Never introduce new dependencies without asking
- Never refactor files not related to the current task
- If you're unsure whether something is in scope, ask first

# This file
- Never modify CLAUDE.md without explicit user instruction
- Never add, remove, or reword any rule or requirement here without being asked

# Tests
- Run `npm test` in both `server/` and `client/` before every commit
- Do not commit if any test fails

# Feature requirements

## Roles
- Three roles: **admin**, **instructor**, **student**
- Default role on registration is **student**
- Role is stored in the JWT and enforced server-side on every protected route

## Authentication
- `POST /api/v1/auth/register` — create an account with name, email, password (min 8 chars), optional language (`en` or `fr`), optional role
- `POST /api/v1/auth/login` — returns a JWT token and user object
- Passwords are hashed with bcrypt
- JWT is required in the `Authorization: Bearer <token>` header for all protected routes
- On 401 response, the client clears localStorage and redirects to `/login`

## Classes
- `GET /api/v1/classes` — public; returns upcoming classes (startTime ≥ now) by default; `?view=past` returns past classes ordered newest first
- `GET /api/v1/classes/:id` — public, returns a single class with bookings
- `POST /api/v1/classes` — admin or instructor only; fields: title, description (optional), instructorId, startTime, endTime, capacity, price, location, isRecurring (optional boolean), recurrenceRule (optional string, e.g. `"MO,WE,FR"`), recurrenceEndDate (optional ISO datetime — date only on the client, stored as `T00:00:00Z`), parentClassId (optional)
- `PUT /api/v1/classes/:id` — admin or instructor only; any subset of the above fields
- `DELETE /api/v1/classes/:id` — admin only
- `PATCH /api/v1/classes/:id/cancel` — admin only; sets class status to `cancelled`
- Class status is one of: `upcoming`, `full`, `cancelled`
- Status is automatically set to `full` when confirmed bookings reach capacity, and back to `upcoming` when a spot opens

## Bookings
- `POST /api/v1/bookings` — authenticated; body: `{ classId }`
  - Admin role is blocked (403) — admins use the admin panel to book on behalf of users
  - Cannot book a class whose startTime is in the past (409)
  - If confirmed bookings < capacity → booking is `confirmed`
  - If confirmed bookings ≥ capacity → booking is `waitlisted`
  - Cannot book a cancelled class
  - Cannot book the same class twice (if already confirmed or waitlisted)
  - A booking confirmation email is sent on confirmed booking (non-fatal if it fails)
  - Payment status defaults to `pending`, payment amount is set to the class price
- `GET /api/v1/bookings/my` — authenticated; returns all bookings for the current user, ordered newest first, with class and instructor details
- `DELETE /api/v1/bookings/:id` — authenticated; cancels a booking
  - Only the booking owner can cancel
  - Cancellation is blocked within the configurable cancellation window (default 24h before class start)
  - If the cancelled booking was `confirmed` and there is a waitlisted user, the first waitlisted user (oldest by `bookedAt`) is automatically promoted to `confirmed` and sent a promotion email
  - A cancellation confirmation email is sent (non-fatal if it fails)
  - On cancellation window error, the client shows a red error banner with the server's message

## Admin
All admin routes require admin role.

- `GET /api/v1/admin/stats` — returns `{ totalBookings, totalRevenue, classCount }` (counts confirmed bookings, sums paid payment amounts)
- `GET /api/v1/admin/users` — returns all users with name, email, role, language, createdAt, and booking count
- `GET /api/v1/admin/classes/:classId/bookings` — returns all bookings for a class with user and class details
- `PATCH /api/v1/admin/bookings/:id/payment` — updates `paymentStatus` and `paymentRef` on a booking
- `PATCH /api/v1/admin/bookings/:id/promote` — manually promotes a waitlisted booking to `confirmed`
- `POST /api/v1/admin/bookings` — body: `{ userId, classId }`; books a class on behalf of any user; admin cannot book for themselves (403)
- `GET /api/v1/admin/users/:userId/bookings` — returns all bookings for a specific user with class and instructor details
- `GET /api/v1/admin/settings` — returns all app settings
- `PUT /api/v1/admin/settings` — updates a single setting by `{ key, value }`; currently supported key: `cancellationWindowHours`
- `PATCH /api/v1/admin/users/:userId/role` — updates a user's role; body: `{ role: "admin" | "instructor" | "student" }`
- `GET /api/v1/admin/logs` — returns in-memory log entries (up to 200, newest first); each entry has `id`, `timestamp`, `type` (`"email"` or `"error"`), `message`, `details`
- `GET /api/v1/admin/locations` — returns all locations ordered by name
- `POST /api/v1/admin/locations` — creates a new location; body: `{ name }`; name must be non-empty and unique
- `DELETE /api/v1/admin/locations/:id` — deletes a location

## Settings
- `cancellationWindowHours` — number of hours before class start that cancellation is allowed
- Falls back to `CANCELLATION_WINDOW_HOURS` env var, then to `"24"` if not set
- Stored in the `AppSettings` table in the database
- Configurable from the admin dashboard UI

## Locations
- Stored in the `Location` table (`id`, `name` unique, `createdAt`)
- Managed exclusively through the admin Settings tab (add / remove)
- The class creation/edit form uses a dropdown populated from this list

## Emails (AWS SES)
- **Booking confirmation** — sent when a student's booking is `confirmed`
- **Cancellation confirmation** — sent when a student cancels a booking
- **Waitlist promotion** — sent when a student is automatically promoted from the waitlist
- **24-hour reminder** — sent by a cron job that runs every hour; targets confirmed bookings for classes starting in the next 24–25 hours (1-hour window to avoid duplicates); a `Notification` record is written after each successful send
- All email failures are caught and logged as non-fatal; they do not fail the request

## Frontend pages

**Home (`/`)** — landing page

**Classes (`/classes`)**
- Toggle between Upcoming and Past Classes views
- Upcoming view: card or calendar layout (toggle between the two); authenticated non-admin users see Book / Join Waitlist / Cancel Booking button per class
- Admin users see the class list but no booking buttons (they book via the admin panel)
- Past Classes view: list only; no booking buttons shown
- Each class card shows: title, instructor, date/time, location, price, capacity/spots left, status badge
- Unauthenticated users see the class list but cannot book

**My Bookings (`/bookings`)**
- Lists the current user's bookings with class details, booking status badge, payment status badge
- Cancel button shown for non-cancelled bookings
- Red error banner shown if cancellation is blocked (e.g. within the cancellation window)

**Admin (`/admin`)**
- Sidebar navigation with five tabs: **Stats**, **Classes**, **Users**, **Settings**, **Logs**
- **Stats tab**: dashboard cards — total confirmed bookings, total paid revenue, total classes
- **Classes tab**: table of all classes (title, date, capacity used, status) with Edit, Cancel, and Delete buttons
  - Cancel button hidden for already-cancelled classes; shows a confirmation dialog
  - Inline create/edit form with instructor selector (populated from admin/instructor users):
    - Start time: date picker + 30-minute time select + custom `<input type="time">` for free entry
    - Duration in minutes (endTime computed as startTime + duration before submitting)
    - Location: dropdown populated from the admin-managed locations list
    - Recurring checkbox; when checked shows day-of-week pills and an optional end date (date only, stored as `T00:00:00Z`)
    - API errors displayed in a red banner above the form
- **Users tab**: table of all users (name, email, role, booking count)
  - Role selector + "Change Role" button per user to promote/demote (admin/instructor/student)
  - "Manage Bookings" expands inline per user (hidden for admin users)
    - Expanded row: all their bookings (class, date, status, payment)
    - Admin can book a class on behalf of the user (class selector + submit)
    - Admin can update payment status per booking (pending/paid/refunded)
- **Settings tab**: configurable cancellation window (hours) with save confirmation; location management — add new locations (name input + Add button) and remove existing ones; locations are stored in the database and populate the class creation form dropdown
- **Logs tab**: table of in-memory log entries (email sends and server errors); Refresh button; auto-fetches on tab activation
  - Type filter pills (All / Email / Error) with per-type count badges; active pill is colour-coded
  - Each row shows: timestamp, type badge, message; Details button appears only when a `details` field exists
  - Clicking Details expands a preformatted details panel inline below the row; clicking Hide collapses it

**Login (`/login`)** — email + password; redirects to home on success

**Register (`/register`)** — name, email, password; redirects to home on success

## Internationalisation
- Supported languages: English (`en`) and French (`fr`)
- Language toggle in the navbar
- User's preferred language is stored on their account
- All UI strings are driven by translation files (`en.json`, `fr.json`)

## Infrastructure
- Backend: Express 5 + TypeScript, listens on `PORT` env var (default 8080), binds to `0.0.0.0`
- Database: PostgreSQL via Prisma v5 ORM
- `GET /health` endpoint returns `{ status: "ok", timestamp }` — used by Elastic Beanstalk health checks
- PM2 ecosystem file for production process management
- `.ebextensions/` config for Elastic Beanstalk (Node version, `prisma migrate deploy` on deploy)
- Frontend: React + TypeScript + Tailwind, built to static files for S3/CloudFront
- Swagger UI available at `/api/docs` in non-production environments

## Tests
- **Server** (Jest + Supertest, all mocked — no real DB needed):
  - Integration: auth routes, classes routes (including recurrenceEndDate, PATCH cancel — admin 200 / student+instructor 403), bookings routes, admin routes (including PATCH user role — admin 200 / invalid role 400 / non-admin 403; GET/POST/DELETE locations — auth and validation)
  - Unit: authService, bookingService (including class-full and waitlist promotion), sesEmailService, settingsService
- **Client** (Vitest + React Testing Library):
  - Components: ClassCard, BookingButton, AdminClassForm (validation, duration→endTime, recurrenceEndDate visibility, location dropdown options), CalendarView, LanguageToggle, PaymentBadge, AdminLogs (filter pills, Details expand/collapse, no Details button when details absent)
  - Hooks: useAuth, useClasses, useBooking
- **E2E** (Cypress, runs against Vite dev server with `cy.intercept()` mocks):
  - `auth.cy.ts` — login, register, protected route redirects
  - `classes.cy.ts` — class list, book, waitlist, past/upcoming toggle
  - `admin.cy.ts` — class creation with ISO datetime format assertion, duration→endTime computation, error banner, edit pre-fill
  - Run: `cd client && npm run cy:open` (interactive) or `npm run cy:run` (headless)
