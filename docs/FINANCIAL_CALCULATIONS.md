# Financial Calculation Assumptions and Rounding Rules

## Overview

This document describes the financial calculation methods used in CashShield, including formulas, assumptions, and rounding rules.

## Money Representation

All monetary values are stored and computed as **integer cents** to avoid floating-point errors. For example, $1,234.56 is stored as `123456` cents.

### Rounding Rules

- **Standard rounding:** `Math.round()` — rounds to the nearest integer
- **Interest calculation:** `Math.round(openingPrincipal × periodicRate)`
- **Final installment:** Absorbs any residual rounding difference to ensure closing principal = 0

## Repayment Schedule Methods

### 1. Amortizing (Equal Installment)

Each payment is the same amount throughout the loan term.

**Formula:**
```
Payment = P × r × (1 + r)^n / ((1 + r)^n - 1)
```

Where:
- `P` = principal amount (cents)
- `r` = periodic interest rate (annual rate / periods per year)
- `n` = number of payments

**Example:**
- Principal: $12,000 (1,200,000 cents)
- Annual rate: 12% (0.12)
- Term: 12 months
- Periodic rate: 0.12 / 12 = 0.01
- Payment: 1,200,000 × 0.01 × (1.01)^12 / ((1.01)^12 - 1) ≈ $1,066.19

### 2. Equal Principal

Each payment repays an equal amount of principal. Interest declines over time.

**Formula:**
```
Principal repayment = P / n
Interest = Opening principal × periodic rate
Total payment = Principal repayment + Interest + Fees
```

**Example:**
- Principal: $12,000 (1,200,000 cents)
- Annual rate: 12% (0.12)
- Term: 12 months
- Principal repayment: 1,200,000 / 12 = $100 per month
- First month interest: 1,200,000 × 0.01 = $120
- First month total: $100 + $120 = $220

### 3. Interest-Only

Each payment covers only the interest. The full principal is repaid at maturity.

**Formula:**
```
Interest payment = P × periodic rate
Final payment = P + final interest + fees
```

**Example:**
- Principal: $12,000 (1,200,000 cents)
- Annual rate: 12% (0.12)
- Term: 12 months
- Monthly interest: 1,200,000 × 0.01 = $120
- Final payment: $12,000 + $120 = $12,120

### 4. Bullet

A single payment at maturity that includes all principal + all interest + fees.

**Formula:**
```
Interest = P × annual rate × (days in term / 365)
Total payment = P + Interest + Fees
```

**Example:**
- Principal: $12,000 (1,200,000 cents)
- Annual rate: 12% (0.12)
- Term: 1 year (365 days)
- Interest: 1,200,000 × 0.12 × 365/365 = $1,440
- Total payment: $12,000 + $1,440 = $13,440

## Cash-Flow Projection

### Period Calculation

For each projection period:

```
Closing cash = Opening cash + total inflows - total outflows
Liquidity buffer = Closing cash - minimum cash reserve
Cash shortfall = max(0, minimum reserve - closing cash)
Pressured period = liquidity buffer < 0
```

### Debt Service Coverage Ratio (DSCR)

```
DSCR = Total inflows / Total debt service
```

A DSCR below 1.0 means the organization cannot cover its debt payments from inflows.

## Date Handling

### Month-End Dates

When adding months to a date, the result is clamped to the last day of the target month:
- Jan 31 + 1 month = Feb 28 (or 29 in leap year)
- Jan 31 + 2 months = Mar 31

### Leap Years

Leap years are handled correctly:
- A year is a leap year if divisible by 4, except if divisible by 100, unless also divisible by 400
- February has 29 days in leap years

### Timezone

All dates are handled in UTC to avoid timezone-related issues.

## Scenario Adjustments

Scenarios modify the base case by applying percentage-based or absolute adjustments:

| Adjustment Type | Description |
|----------------|-------------|
| Revenue decline | Reduces inflows by percentage |
| Revenue growth | Increases inflows by percentage |
| Expense increase | Increases outflows by percentage |
| Expense reduction | Reduces outflows by percentage |
| Payment delay | Shifts payment dates by days |
| Payroll change | Adjusts payroll obligations |
| Tax change | Adjusts tax obligations |

## Maximum Safe Borrowing Capacity

The maximum safe borrowing capacity is calculated as:

```
Available for debt service = Stressed inflows - Outflows - Minimum reserve buffer
Max safe monthly repayment = Available for debt service / Required coverage ratio
Max affordable loan amount = Max safe monthly repayment × [1 - (1 + r)^-n] / r
```

Where:
- `r` = monthly interest rate for new loan
- `n` = loan term in months

## Known Limitations

1. **Simple interest for bullet loans** — Bullet loans use simple interest (not compound)
2. **No early repayment** — The engine does not model early repayment or prepayment
3. **No variable rate modeling** — Variable rate loans use the current rate for all periods
4. **No currency conversion** — All calculations assume a single currency
5. **No tax implications** — The engine does not model tax implications of financing decisions
