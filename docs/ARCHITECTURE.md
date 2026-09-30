# CashShield Architecture Overview

## System Architecture

CashShield follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Dashboard  │  │  Financing  │  │  Scenarios  │  ...     │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  /api/      │  │  /api/      │  │  /api/      │  ...     │
│  │  dashboard  │  │  financing  │  │  scenarios  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Projection │  │  Scenario   │  │  Alert      │          │
│  │  Service    │  │  Service    │  │  Service    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Schedule   │  │  Projection │  │  Scenario   │          │
│  │  Engine     │  │  Engine     │  │  Engine     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Alert      │  │  Capacity   │  │  Money      │          │
│  │  Engine     │  │  Calculator │  │  Utils      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Persistence Layer                           │
│  ┌─────────────┐  ┌─────────────┐                            │
│  │  Prisma     │  │  Database   │                            │
│  │  Client     │  │  (SQLite/   │                            │
│  │             │  │  PostgreSQL)│                            │
│  └─────────────┘  └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

## Calculation Pipeline

The financial calculation pipeline follows these steps:

1. **Load base financial data** — Fetch cash flows, obligations, and financing accounts
2. **Normalize dates and amounts** — Convert to consistent formats (ISO dates, integer cents)
3. **Generate financing schedules** — Calculate repayment schedules for all active loans
4. **Generate recurring obligations** — Expand recurring obligations into individual payments
5. **Apply scenario adjustments** — Modify cash flows based on scenario parameters
6. **Aggregate cash flows by period** — Sum inflows and outflows for each projection period
7. **Calculate liquidity metrics** — Compute closing cash, liquidity buffer, and shortfall
8. **Generate alerts** — Identify risks and create alert notifications
9. **Return explainable results** — Provide detailed breakdowns and plain-language explanations

## Domain Models

### Financing Account
Represents a loan, credit facility, or other financing instrument. Contains all terms needed to generate a repayment schedule.

### Installment
A single payment in a repayment schedule. Contains the due date, principal, interest, fees, and status.

### Cash Flow Entry
A recurring or one-time cash inflow or outflow. Supports multiple recurrence patterns.

### Business Obligation
A financial obligation such as payroll, taxes, or vendor payments. May be linked to a financing account.

### Projection Period Data
The aggregated cash position for a single projection period, including all inflows, outflows, and liquidity metrics.

### Scenario
A set of adjustments applied to the base case to model different business conditions.

### Alert
A notification about a potential liquidity risk or upcoming obligation.

## Data Flow

```
User Input → API Route → Service Layer → Domain Engine → Database
                                              ↓
                    Response ← API Route ← Service Layer ← Results
```

## Key Design Decisions

1. **Pure domain layer** — Financial calculations are independent of UI and database for testability
2. **Integer cents** — All money values use exact integer arithmetic to avoid floating-point errors
3. **UTC dates** — All dates are handled in UTC to avoid timezone issues
4. **Immutable calculations** — Domain functions return new objects rather than mutating inputs
5. **Explainable results** — All calculations include detailed breakdowns for transparency
