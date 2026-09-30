# CashShield — SME Liquidity Command Center

CashShield is a production-quality SaaS application that helps SMEs identify future cash shortages before they happen. It combines business cash flows with loans, leases, credit lines, payroll, taxes, suppliers, and operating expenses to provide repayment-capacity analysis and early warning of liquidity pressure.

## Features

- **Authentication** — Login, signup, logout, forgot/reset password with session management
- **Multi-user support** — Organization-level data isolation with role-based access control
- **Financing Account Management** — Track term loans, revolving credit, equipment financing, leases, merchant cash advances, and other obligations
- **Repayment Schedule Engine** — Supports amortizing, equal-principal, interest-only, and bullet repayment methods with exact decimal arithmetic
- **Cash-Flow Projection** — Weekly or monthly projections with full liquidity metrics
- **Scenario Analysis** — Compare base case with mild/severe downside scenarios
- **Alerts** — Early warning for repayments, liquidity risks, and scenario shortfalls
- **Maximum Safe Borrowing Capacity** — Transparent calculation with user-defined assumptions
- **CSV Import/Export** — Import cash transactions, revenue, expenses, loans, and obligations
- **Repayment Calendar** — Visual timeline of all obligations and financing payments
- **Demo Data** — Explicitly load sample data to explore the application

## Tech Stack

- **Framework:** Next.js 15 (App Router) with TypeScript
- **Database:** SQLite (local dev) / PostgreSQL (production) via Prisma ORM
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Validation:** Zod
- **Testing:** Vitest
- **Auth:** Custom JWT-based sessions with bcrypt password hashing

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Seed demo data (optional)
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Account

After seeding, you can log in with:
- **Email:** demo@cashshield.com
- **Password:** demo1234

Or create a new account at [http://localhost:3000/signup](http://localhost:3000/signup).

## Environment Variables

See [.env.example](.env.example) for all configuration options.

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` |
| `JWT_SECRET` | Secret for session tokens (change in production!) | `cashshield-dev-secret-change-in-production` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `CashShield` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |

## Database

### SQLite (Default for Development)

No configuration needed. The database file is created at `prisma/dev.db`.

### PostgreSQL (Production)

1. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/cashshield?schema=public"
   ```

2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Run migrations:
   ```bash
   npm run db:push
   ```

### Docker (Optional)

```bash
docker-compose up -d
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Project Structure

```
cashshield/
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   ├── financing/        # Financing accounts page
│   │   ├── cash-flows/     # Cash flows page
│   │   ├── obligations/    # Obligations page
│   │   ├── scenarios/      # Scenario analysis page
│   │   ├── alerts/         # Alerts page
│   │   ├── calendar/       # Repayment calendar page
│   │   ├── import-export/  # Import/export page
│   │   ├── settings/       # Settings page
│   │   ├── login/          # Login page
│   │   ├── signup/         # Signup page
│   │   ├── forgot-password/ # Forgot password page
│   │   └── reset-password/ # Reset password page
│   ├── components/         # React components
│   │   ├── auth/           # Auth components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── financing/        # Financing components
│   │   ├── cash-flows/     # Cash flow components
│   │   ├── obligations/    # Obligation components
│   │   ├── scenarios/      # Scenario components
│   │   ├── alerts/         # Alert components
│   │   ├── calendar/       # Calendar components
│   │   ├── import-export/  # Import/export components
│   │   ├── settings/       # Settings components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # UI components
│   ├── domain/             # Pure financial calculations
│   │   ├── types.ts        # Domain types
│   │   ├── money.ts        # Money utilities
│   │   ├── dates.ts        # Date utilities
│   │   ├── schedule/       # Repayment schedule engine
│   │   ├── projection/     # Cash-flow projection engine
│   │   ├── scenario/       # Scenario engine
│   │   ├── alerts/         # Alert engine
│   │   └── capacity/       # Safe borrowing capacity
│   ├── lib/                # Shared utilities
│   │   ├── db.ts           # Database client
│   │   ├── auth.ts         # Auth utilities
│   │   ├── api.ts          # API route helpers
│   │   └── fetch.ts        # Reliable fetch helper
│   └── middleware.ts       # Route protection
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── docs/                   # Documentation
├── .env.example            # Environment template
├── docker-compose.yml      # Docker configuration
├── Dockerfile              # Production build
└── README.md
```

## Authentication

CashShield uses a custom authentication system with:

- **Password hashing:** bcrypt with 12 rounds
- **Session tokens:** UUID-based tokens stored in the database
- **Cookie security:** httpOnly, secure (in production), sameSite=lax
- **Session duration:** 30 days
- **Password reset:** Token-based with 1-hour expiry (development mode returns token directly)

### Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full access — manage users, settings, and all financial records |
| **Admin** | Full access — manage users, settings, and all financial records |
| **Finance Manager** | Create and edit financial records |
| **Viewer** | View dashboards and reports only |

## Financial Calculations

### Amortizing Loan Payment

```
Payment = P × r × (1 + r)^n / ((1 + r)^n - 1)
```

Where:
- P = principal
- r = periodic interest rate (annual rate / periods per year)
- n = number of payments

### Rounding Rules

- All money values are stored as integer cents
- Interest is rounded to the nearest cent using `Math.round()`
- The final installment absorbs any residual rounding difference
- Closing principal of the final installment is always exactly 0

### Liquidity Metrics

```
Closing cash = Opening cash + total inflows - total outflows
Liquidity buffer = Closing cash - minimum cash reserve
Cash shortfall = max(0, minimum reserve - closing cash)
Pressured period = liquidity buffer < 0
```

## ECONNRESET Fix

The ECONNRESET error was caused by a bug in the middleware that tried to verify session tokens as JWTs. Session tokens are UUIDs stored in the database, not JWTs. The fix removes the JWT verification from the middleware and relies on the `getSession()` function in API routes for actual session validation.

See `src/middleware.ts` and `src/lib/auth.ts` for details.

## Known Limitations

1. **No email delivery** — Password reset tokens are returned directly in development mode
2. **No bank integrations** — CSV import/export is the functional fallback
3. **Simple interest for bullet loans** — Not compound
4. **No early repayment modeling** — Schedules are fixed at generation time
5. **Single currency** — No multi-currency support
6. **No user management UI** — Roles are enforced but user management interface is not yet implemented

## Security

- Organization-level data isolation
- Input validation with Zod
- Audit logging for financial changes
- No secrets committed to the repository
- Safe error messages
- bcrypt password hashing
- httpOnly session cookies

## License

MIT
