/**
 * CashShield Domain Types
 * 
 * Core type definitions for the financial calculation engine.
 * All money amounts are stored as integer cents to avoid floating-point errors.
 * All dates are ISO 8601 strings (YYYY-MM-DD) in UTC.
 */

// ============================================================================
// Money
// ============================================================================

/** Money amount in integer cents. Never use floating point for money. */
export type Cents = number;

export interface Money {
  cents: Cents;
  currency: string; // ISO 4217 currency code (e.g., "USD", "EUR", "GBP")
}

// ============================================================================
// Dates
// ============================================================================

/** ISO 8601 date string: YYYY-MM-DD */
export type ISODate = string;

// ============================================================================
// Financing
// ============================================================================

export type FinancingType =
  | 'TERM_LOAN'
  | 'REVOLVING_CREDIT'
  | 'EQUIPMENT_FINANCING'
  | 'LEASE'
  | 'MERCHANT_CASH_ADVANCE'
  | 'OTHER';

export type RepaymentMethod =
  | 'AMORTIZING'       // Equal installment (P&I)
  | 'EQUAL_PRINCIPAL'  // Equal principal + declining interest
  | 'INTEREST_ONLY'    // Interest only, principal at maturity
  | 'BULLET';          // Full principal + interest at maturity

export type PaymentFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUAL';

export type InterestType = 'FIXED' | 'VARIABLE';

export type FinancingStatus = 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED' | 'CANCELLED';

export interface FinancingAccount {
  id: string;
  organizationId: string;
  name: string;
  lender: string;
  type: FinancingType;
  originalPrincipalCents: Cents;
  outstandingPrincipalCents: Cents;
  annualInterestRate: number; // e.g., 0.075 for 7.5%
  interestType: InterestType;
  startDate: ISODate;
  maturityDate: ISODate;
  paymentFrequency: PaymentFrequency;
  repaymentMethod: RepaymentMethod;
  paymentAmountCents: Cents; // For amortizing: computed; for others: may be set
  feesCents: Cents; // One-time fees amortized over the loan
  gracePeriodMonths: number;
  status: FinancingStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type InstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';

export interface Installment {
  id: string;
  financingAccountId: string;
  organizationId: string;
  number: number;
  dueDate: ISODate;
  openingPrincipalCents: Cents;
  interestCents: Cents;
  principalRepaymentCents: Cents;
  feesCents: Cents;
  totalPaymentCents: Cents;
  closingPrincipalCents: Cents;
  status: InstallmentStatus;
  paidDate: ISODate | null;
  paidAmountCents: Cents;
  createdAt: string;
}

// ============================================================================
// Cash Flows
// ============================================================================

export type CashFlowCategory =
  | 'REVENUE'
  | 'CUSTOMER_RECEIPTS'
  | 'PAYROLL'
  | 'VENDOR_PAYMENTS'
  | 'RENT'
  | 'UTILITIES'
  | 'INSURANCE'
  | 'TAXES'
  | 'INVENTORY'
  | 'MARKETING'
  | 'ONE_TIME_EXPENSE'
  | 'OTHER_RECURRING';

export type CashFlowType = 'INFLOW' | 'OUTFLOW';

export type RecurrencePattern =
  | 'ONE_TIME'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUAL';

export type CashFlowStatus = 'ACTUAL' | 'PROJECTED';

export interface CashFlowEntry {
  id: string;
  organizationId: string;
  name: string;
  category: CashFlowCategory;
  type: CashFlowType;
  amountCents: Cents;
  recurrence: RecurrencePattern;
  startDate: ISODate;
  endDate: ISODate | null;
  expectedDelayDays: number; // Expected payment delay in days
  status: CashFlowStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Business Obligations
// ============================================================================

export type ObligationType =
  | 'LOAN_INSTALLMENT'
  | 'PAYROLL'
  | 'TAX'
  | 'VENDOR'
  | 'RENT'
  | 'UTILITIES'
  | 'INSURANCE'
  | 'LEASE'
  | 'OTHER';

export type ObligationStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface BusinessObligation {
  id: string;
  organizationId: string;
  name: string;
  type: ObligationType;
  amountCents: Cents;
  dueDate: ISODate;
  recurrence: RecurrencePattern;
  endDate: ISODate | null;
  status: ObligationStatus;
  financingAccountId: string | null; // Link to financing account if applicable
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Schedule (re-exported from schedule engine)
// ============================================================================

export interface ScheduleInstallment {
  id: string;
  financingAccountId: string;
  organizationId: string;
  number: number;
  dueDate: ISODate;
  openingPrincipalCents: Cents;
  interestCents: Cents;
  principalRepaymentCents: Cents;
  feesCents: Cents;
  totalPaymentCents: Cents;
  closingPrincipalCents: Cents;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL';
  paidDate: ISODate | null;
  paidAmountCents: Cents;
  createdAt: string;
}

// ============================================================================
// Projection
// ============================================================================

export type ProjectionPeriod = 'WEEKLY' | 'MONTHLY';

export interface ProjectionPeriodData {
  periodStart: ISODate;
  periodEnd: ISODate;
  openingCashCents: Cents;
  inflowsCents: Cents;
  operatingExpensesCents: Cents;
  payrollCents: Cents;
  taxesCents: Cents;
  vendorPaymentsCents: Cents;
  financingPaymentsCents: Cents;
  otherOutflowsCents: Cents;
  totalOutflowsCents: Cents;
  closingCashCents: Cents;
  minimumReserveCents: Cents;
  liquidityBufferCents: Cents;
  cashShortfallCents: Cents; // Positive when below reserve
  isPressured: boolean;
}

export interface ProjectionResult {
  organizationId: string;
  scenarioId: string;
  periodType: ProjectionPeriod;
  startDate: ISODate;
  endDate: ISODate;
  periods: ProjectionPeriodData[];
  summary: ProjectionSummary;
  generatedAt: string;
}

export interface ProjectionSummary {
  minimumCashCents: Cents;
  minimumCashDate: ISODate | null;
  lowestCashCents: Cents;
  largestShortfallCents: Cents;
  totalPressuredPeriods: number;
  totalDebtServiceCents: Cents;
  debtServiceCoverageRatio: number | null; // null if no inflows
  firstShortageDate: ISODate | null;
}

// ============================================================================
// Scenarios
// ============================================================================

export type ScenarioType = 'BASE' | 'MILD_DOWNSIDE' | 'SEVERE_DOWNSIDE' | 'CUSTOM';

export interface ScenarioAdjustment {
  id: string;
  scenarioId: string;
  type: ScenarioAdjustmentType;
  value: number; // Percentage (0.15 = 15%) or absolute cents
  isPercentage: boolean;
  description: string;
}

export type ScenarioAdjustmentType =
  | 'REVENUE_DECLINE'
  | 'REVENUE_GROWTH'
  | 'EXPENSE_INCREASE'
  | 'EXPENSE_REDUCTION'
  | 'PAYMENT_DELAY'
  | 'INTEREST_RATE_CHANGE'
  | 'NEW_LOAN'
  | 'REFINANCING'
  | 'REPAYMENT_ACCELERATION'
  | 'ONE_TIME_EXPENSE'
  | 'PAYROLL_CHANGE'
  | 'TAX_CHANGE';

export interface Scenario {
  id: string;
  organizationId: string;
  name: string;
  type: ScenarioType;
  description: string;
  adjustments: ScenarioAdjustment[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Alerts
// ============================================================================

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertType =
  | 'REPAYMENT_DUE_7_DAYS'
  | 'LARGE_OBLIGATION_30_DAYS'
  | 'CASH_BELOW_RESERVE'
  | 'PROJECTED_NEGATIVE_CASH'
  | 'BALLOON_PAYMENT_APPROACHING'
  | 'OVERDUE_INSTALLMENT'
  | 'SCENARIO_SHORTFALL';

export interface Alert {
  id: string;
  organizationId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  details: Record<string, unknown>;
  relatedEntityId: string | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

// ============================================================================
// Organization
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  baseCurrency: string; // ISO 4217
  minimumCashReserveCents: Cents;
  defaultProjectionPeriod: ProjectionPeriod;
  fiscalYearStartMonth: number; // 1-12
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Audit
// ============================================================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'GENERATE' | 'IMPORT' | 'EXPORT';

export interface AuditEvent {
  id: string;
  organizationId: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  createdAt: string;
}
