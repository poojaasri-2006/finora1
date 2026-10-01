# Finora — SME Loan Repayment & Cash-Flow Planning System

Finora helps small and medium businesses see exactly when their loan repayments and other
obligations will create a cash shortage — **before** it happens. It combines real financing
schedules with projected business cash flows, stress-tests them under different scenarios,
and warns the owner early.

> Built for the Aczen Finathon — *SME Loan Repayment & Cash-Flow Planning System*.

## The problem

A business with several loans must juggle repayment schedules alongside payroll, vendor
payments, taxes, and rent. A loan that looks affordable on its own can still cause a cash
shortage when combined with everything else. Traditional tools show balances, not the
moment of pressure.

Finora answers one question clearly: **“Will my repayments push me below my safe cash floor, and when?”**

## The 10 features (all implemented)

1. **Loan / financing account management** — term loans, revolving credit, equipment finance, leases, merchant cash advances.
2. **Principal & interest schedules** — exact amortizing, equal-principal, interest-only, and bullet schedules with fees and grace periods.
3. **Repayment calendar** — click any day to see that day’s obligations and loan installments; add, mark paid/undo, delete.
4. **Business cash-flow projection** — inflow/outflow projection with closing cash, reserve floor, and pressured periods.
5. **Other financial obligations** — payroll, taxes, vendor, rent, utilities, insurance, and more.
6. **Repayment-to-cash-flow analysis** — pressure detection plus Debt-Service Coverage Ratio (DSCR).
7. **Liquidity stress scenarios** — live what-if sliders (revenue ↓, expenses ↑, a new loan) that recompute instantly.
8. **Upcoming obligation alerts** — due-within-7-days, large-obligation, below-reserve, negative-cash, balloon, overdue.
9. **Repayment schedule comparison** — compares amortizing vs equal-principal vs interest-only vs bullet for the same loan.
10. **Financial exposure dashboard** — outstanding debt, pending obligations, 90-day repayments, total exposure and category breakdown.

**Extra:** safe-borrowing capacity, printable/PDF + Excel reports, activity/audit log, team & roles, Nova (Aczen) integration.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS + a custom design system |
| Charts | Recharts |
| Animation | Framer Motion |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Custom sessions (UUID tokens), bcrypt password hashing |
| Validation | Zod |
| Testing | Vitest |
| Hosting | Vercel + managed PostgreSQL |

## Quick start

```bash
npm install                 # installs deps + generates Prisma client (postinstall)
cp .env.example .env.local  # set DATABASE_URL + NOVA_API_KEY
npx prisma db push          # create tables
npm run dev                 # http://localhost:3000
```

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `NOVA_API_KEY` | Aczen Nova API key, server-side only (optional) |
| `NOVA_ORGANIZATION_ID` | Bind the Nova key to one organization in multi-tenant deployments |

### Scripts

```bash
npm run dev         # development
npm run build       # production build
npm run start       # run the production build
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # Vitest
npm run db:push     # apply Prisma schema to the database
npm run db:studio   # Prisma Studio
```

## Project structure

```
src/
├── app/                 # Next.js routes (pages + /api route handlers)
│   ├── api/             # financing, cash-flows, obligations, scenarios, alerts, exports, team, nova
│   ├── financing/       # loan list + detail (amortization + method comparison)
│   ├── cash-flows/ obligations/ scenarios/ alerts/ calendar/
│   ├── dashboard (/), report/, activity/, team/, settings/, nova/, import-export/
│   └── icon.svg         # favicon
├── components/          # UI: layout shell, dashboard, module pages, auth
├── domain/              # pure calculation engines (no framework code)
│   ├── schedule/        # amortizing / equal-principal / interest-only / bullet
│   ├── projection/      # cash-flow projection + liquidity metrics
│   ├── scenario/        # scenario adjustments
│   ├── alerts/          # alert engine
│   ├── capacity/        # safe-borrowing capacity
│   └── nova/            # Nova snapshot builder
└── lib/                 # prisma client, auth, api helpers, nova client, roles
```

## How it works (the short version)

1. You enter **loans**, **cash flows** (revenue/expenses) and **obligations**.
2. Finora generates the exact **repayment schedule** for each loan.
3. A **projection engine** rolls cash forward period by period: closing cash, buffer vs the
   reserve floor, and shortfall.
4. Any period where the buffer goes negative is flagged as **pressured**, and **alerts** are raised.
5. **Scenarios** re-run the projection with revenue/expense/loan changes to test resilience.

## Deployment

Deployed on **Vercel**. Set `DATABASE_URL` (managed Postgres, e.g. Neon) and `NOVA_API_KEY`
in the project’s environment variables, then `npx prisma db push` against that database.

## Notes

- Money is stored as **integer cents** to avoid floating-point errors.
- Every record belongs to an **organization**; all API queries are scoped to the signed-in user’s org.
- Actions are written to an **audit log**.

*Planning estimates only. Not financial advice.*
