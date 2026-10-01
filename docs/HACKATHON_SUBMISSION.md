# Finora — Hackathon Submission

**Challenge:** Aczen Finathon — *SME Loan Repayment & Cash-Flow Planning System*
**Product:** Finora
**Live app:** https://finora1-beige.vercel.app
**Repository:** https://github.com/poojaasri-2006/finora1

---

## 1. The problem (in plain words)

A small business often has **several loans at once**, plus payroll, supplier bills, rent,
taxes and day-to-day expenses. Each loan looks affordable on its own. But when all the
repayments land in the same weeks as payroll and taxes, the business can run out of cash.

Most tools show you **balances** (what you owe). They don’t show the **moment of pressure** —
the specific week where repayments push your bank balance below the safety level you need.

**Finora answers one question clearly:**
> “Will my repayments put me below my safe cash floor — and exactly when?”

---

## 2. What we built (one line)

A web app where an SME enters its loans, cash flows and obligations, and Finora projects its
cash month-by-month, flags the pressured periods, tests “what-if” scenarios, and warns the
owner early — for every one of the 10 required modules.

---

## 3. How Finora solves the problem (step by step)

1. **Capture the money picture**
   - **Loans / financing**: term loan, revolving credit, equipment finance, lease, merchant cash advance.
   - **Cash flows**: revenue, customer receipts, payroll, rent, utilities, marketing, taxes, etc.
   - **Obligations**: payroll, tax, vendor, rent, insurance and other one-off/recurring bills.
   - **Settings**: your current cash balance and the **minimum cash reserve** you must keep.

2. **Generate exact repayment schedules**
   For every loan, Finora builds the schedule using the chosen method:
   - **Amortizing** (equal instalment), **Equal principal**, **Interest-only**, **Bullet**.
   - Includes interest, principal, fees and grace periods; the last instalment absorbs rounding so the balance ends at exactly zero.

3. **Project cash forward**
   For each week/month Finora computes:
   ```
   Closing cash = Opening cash + Inflows − Outflows
   Liquidity buffer = Closing cash − Minimum reserve
   Cash shortfall  = max(0, Minimum reserve − Closing cash)
   A period is "pressured" when the buffer < 0.
   ```

4. **Find the danger**
   - The **lowest projected cash** and the **first shortage date**.
   - The **total debt-service** and **Debt-Service Coverage Ratio (DSCR)**.
   - Every **pressured period** is listed with its shortfall amount.

5. **Warn early (alerts)**
   Alerts fire for: repayment due in 7 days, large obligation in 30 days, cash below reserve,
   projected negative cash, approaching balloon payment, overdue instalment, and scenario shortfall.

6. **Stress-test (scenarios)**
   The **Scenario Studio** lets the owner drag sliders — revenue decline, expense increase,
   and a brand-new loan (amount/rate/term) — and the projection, pressure points and charts
   update **instantly**.

7. **Plan the next move**
   - **Safe borrowing capacity**: how much extra monthly repayment the business can safely take on.
   - **Repayment schedule comparison**: the same loan under all four repayment methods, side by side.
   - **Financial exposure dashboard**: outstanding debt + pending obligations + 90-day repayments + category breakdown.

---

## 4. Our approach (why we built it this way)

- **Calculations first, UI second.** All finance logic lives in a pure `domain/` layer
  (schedules, projection, scenarios, alerts, capacity) with **no framework code**. This makes
  it testable, reusable on the server for APIs, and even usable in the browser for instant
  what-if recalculation — the same engine powers the API and the live Scenario Studio.
- **Money as integer cents.** No floating-point rounding bugs in loans or projections.
- **Explainable, not a black box.** Every number comes from a transparent formula the SME can follow.
- **Multi-tenant from day one.** Every record is scoped to an organization.
- **One design system.** A single responsive shell (rail navigation) wraps every page, on
  desktop and mobile, so the product feels like one app — not a dozen screens.

---

## 5. Tech stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Server components, API routes in one codebase |
| UI | **React 19 + TypeScript** | Type-safe, component-based |
| Styling | **Tailwind CSS** + custom design system | Fast, consistent, responsive |
| Charts | **Recharts** | Cash projection & amortization visuals |
| Animation | **Framer Motion** | Page transitions & micro-interactions |
| Database | **PostgreSQL** | Reliable relational storage |
| ORM | **Prisma** | Typed schema & queries |
| Auth | Custom **UUID sessions + bcrypt** | Simple, secure, DB-backed |
| Validation | **Zod** | Validate every request |
| Testing | **Vitest** | Unit + integration tests on the engines |
| Hosting | **Vercel** + managed Postgres | Zero-config deploy |
| Integration | **Aczen Nova API** | Real SME books (invoices, bills, loan schedules, payroll, statutory dues) |

---

## 6. Architecture

```
Browser (Next.js App Router — responsive UI)
        │  fetch() JSON
        ▼
API route handlers  (src/app/api/*)  ── auth + Zod validation
        │
        ├──► Domain engines (pure TypeScript, no framework)
        │      schedule/ · projection/ · scenario/ · alerts/ · capacity/ · nova/
        │
        └──► Prisma ORM ──► PostgreSQL
```

The **same domain engines** run on the server (for APIs) and in the browser (for the
Scenario Studio’s instant recalculation) — one source of truth for all math.

---

## 7. Data model (14 tables)

`User`, `Organization`, `OrganizationMembership`, `Session`, `PasswordResetToken`,
`FinancingAccount`, `Installment`, `CashFlowEntry`, `BusinessObligation`, `Scenario`,
`ScenarioAdjustment`, `Alert`, `AuditEvent`, `ImportedFile`.

Every business table carries an `organizationId`, and all queries are scoped to the signed-in
user’s organization.

---

## 8. The 10 challenge features — where to find them

| # | Feature | Where |
|---|---|---|
| 1 | Loan/financing account management | `/financing` (create, view, edit, delete) |
| 2 | Principal & interest schedules | `/financing/<id>` — full amortization table + chart |
| 3 | Repayment calendar | `/calendar` — click a day, add, mark paid/undo |
| 4 | Business cash-flow projection | Dashboard chart + `/scenarios` chart |
| 5 | Other financial obligations | `/obligations` (create, edit, delete) |
| 6 | Repayment-to-cash-flow analysis | Dashboard gauges (DSCR) + pressured periods |
| 7 | Liquidity stress scenarios | `/scenarios` — live sliders + saved scenarios |
| 8 | Upcoming obligation alerts | `/alerts` — filter, dismiss, jump to module |
| 9 | Repayment schedule comparison | `/financing/<id>` — methods compared |
| 10 | Financial exposure dashboard | Dashboard — exposure panel |

---

## 9. Advanced features (beyond the brief)

- **Live what-if engine** — sliders recalculate the whole projection client-side, instantly.
- **Safe borrowing capacity** — max safe monthly repayment and affordable loan amount.
- **Reports** — printed/PDF board report and an **Excel** export.
- **Activity/audit log** — every create/update/delete tracked.
- **Team & roles** — Owner / Admin / Finance-manager / Viewer, with roles enforced in the UI and API.
- **Command palette (⌘K)** — search modules and actions.
- **Dark mode**, **mobile-responsive**, **Nova (Aczen) integration**.

---

## 10. Security & correctness

- Passwords hashed with **bcrypt**; sessions are DB-backed UUID tokens in httpOnly cookies.
- **Organization-level isolation** on every query.
- **Zod** validates all input; safe error messages.
- **Integer-cent** arithmetic; final instalment reconciles rounding to exactly zero.
- Actions recorded in the **audit log**.

---

## 11. Build & run

```bash
npm install
# set DATABASE_URL (PostgreSQL) and NOVA_API_KEY in .env.local
npx prisma db push
npm run dev        # or: npm run build && npm run start
```

Deployed on **Vercel**; set `DATABASE_URL` (managed Postgres) and `NOVA_API_KEY` in the
project environment, then push the schema with `npx prisma db push`.

---

## 12. Demo script (2 minutes)

1. Log in → **Dashboard** shows cash available, next-30-day dues, cash floor, alerts, the
   projection chart with the reserve floor, and the **financial exposure** panel.
2. Open **Financing** → click a loan → see the **amortization schedule**, the
   **principal-vs-interest chart**, and the **repayment-method comparison**.
3. Open **Scenarios** → drag *revenue decline* to 25% → watch the projection and pressure
   points change **live**.
4. Open **Calendar** → click a day → see its obligations/installments, mark one **paid** (and undo).
5. Open **Alerts** → see early warnings → dismiss.
6. **⌘K** to jump anywhere; toggle **dark mode**; show the **Report** page (print/PDF).

---

## 13. Result

Finora turns raw loan and cash data into a clear, forward-looking answer: *when* the business
is at risk and *what to do about it* — through transparent math, early alerts, and instant
scenario testing. All 10 required modules are implemented, working, and responsive on desktop
and mobile.

*Planning estimates only. Not financial advice.*
