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
- `GET /api/v1/classes` — public, returns all classes
- `GET /api/v1/classes/:id` — public, returns a single class with bookings
- `POST /api/v1/classes` — admin or instructor only; fields: title, description (optional), instructorId, startTime, endTime, capacity, price, location, isRecurring (optional), recurrenceRule (optional), parentClassId (optional)
- `PUT /api/v1/classes/:id` — admin or instructor only; any subset of the above fields
- `DELETE /api/v1/classes/:id` — admin only
- Class status is one of: `upcoming`, `full`, `cancelled`
- Status is automatically set to `full` when confirmed bookings reach capacity, and back to `upcoming` when a spot opens

## Bookings
- `POST /api/v1/bookings` — authenticated; body: `{ classId }`
  - Admin role is blocked (403) — admins use the admin panel to book on behalf of users
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

## Settings
- `cancellationWindowHours` — number of hours before class start that cancellation is allowed
- Falls back to `CANCELLATION_WINDOW_HOURS` env var, then to `"24"` if not set
- Stored in the `AppSettings` table in the database
- Configurable from the admin dashboard UI

## Emails (AWS SES)
- **Booking confirmation** — sent when a student's booking is `confirmed`
- **Cancellation confirmation** — sent when a student cancels a booking
- **Waitlist promotion** — sent when a student is automatically promoted from the waitlist
- **24-hour reminder** — sent by a cron job that runs every hour; targets confirmed bookings for classes starting in the next 24–25 hours (1-hour window to avoid duplicates); a `Notification` record is written after each successful send
- All email failures are caught and logged as non-fatal; they do not fail the request

## Frontend pages

**Home (`/`)** — landing page

**Classes (`/classes`)**
- Lists all classes in card or calendar view (toggle between the two)
- Each class card shows: title, instructor, date/time, location, price, capacity/spots left, status badge
- Authenticated users see a Book / Join Waitlist / Cancel Booking button per class
- Unauthenticated users see the class list but cannot book

**My Bookings (`/bookings`)**
- Lists the current user's bookings with class details, booking status badge, payment status badge
- Cancel button shown for non-cancelled bookings
- Red error banner shown if cancellation is blocked (e.g. within the cancellation window)

**Admin (`/admin`)**
- Dashboard stats: total confirmed bookings, total paid revenue, total classes
- Settings section: configurable cancellation window (hours) with save confirmation
- Users table: name, email, role, booking count; "Manage Bookings" expands inline per user
  - Expanded user row shows all their bookings (class, date, status, payment)
  - Admin can book a class on behalf of the user (class selector + submit)
  - Admin can update payment status per booking (pending/paid/refunded)
  - Admins themselves do not have a "Manage Bookings" button
- Classes table: title, date, capacity used, status; Edit and Delete buttons
- Inline create/edit form for classes (with instructor selector populated from admin/instructor users)

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
  - Integration: auth routes, classes routes, bookings routes
  - Unit: authService, bookingService, sesEmailService, settingsService
- **Client** (Vitest + React Testing Library):
  - Components: ClassCard, BookingButton, AdminClassForm, CalendarView, LanguageToggle, PaymentBadge
  - Hooks: useAuth, useClasses, useBooking
