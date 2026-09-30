/**
 * Cash-Flow Projection Engine
 * 
 * Aggregates all cash inflows and outflows by period and calculates liquidity metrics.
 * 
 * Pipeline:
 * 1. Load base financial data (cash flows, obligations, financing schedules)
 * 2. Normalize dates and amounts
 * 3. Generate recurring obligations
 * 4. Apply scenario adjustments
 * 5. Aggregate cash flows by period
 * 6. Calculate liquidity metrics
 * 7. Generate alerts
 * 8. Return explainable results
 * 
 * Formulas:
 *   Closing cash = Opening cash + total inflows - total outflows
 *   Liquidity buffer = Closing cash - minimum cash reserve
 *   Cash shortfall = max(0, minimum reserve - closing cash)
 *   Pressured period = liquidity buffer < 0
 */

import type {
  Cents,
  ISODate,
  CashFlowEntry,
  BusinessObligation,
  ProjectionPeriodData,
  ProjectionResult,
  ProjectionSummary,
  ProjectionPeriod,
  Scenario,
  ScheduleInstallment,
} from '../types';
import type { ScheduleEntry } from '../schedule';
import { addMonths, addWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isDateInRange, generatePeriodDates } from '../dates';
import { sumCents } from '../money';

export interface ProjectionParams {
  organizationId: string;
  scenarioId: string;
  periodType: ProjectionPeriod;
  startDate: ISODate;
  endDate: ISODate;
  openingCashCents: Cents;
  minimumReserveCents: Cents;
  cashFlows: CashFlowEntry[];
  obligations: BusinessObligation[];
  financingSchedules: ScheduleEntry[];
  scenario: Scenario | null;
}

/**
 * Generate a full cash-flow projection.
 */
export function generateProjection(params: ProjectionParams): ProjectionResult {
  const {
    organizationId,
    scenarioId,
    periodType,
    startDate,
    endDate,
    openingCashCents,
    minimumReserveCents,
    cashFlows,
    obligations,
    financingSchedules,
    scenario,
  } = params;

  // Generate period boundaries
  const periodStarts = generatePeriodDates(startDate, endDate, periodType);
  const periods: ProjectionPeriodData[] = [];

  let runningCash = openingCashCents;

  for (const periodStart of periodStarts) {
    const periodEnd = periodType === 'WEEKLY'
      ? endOfWeek(periodStart)
      : endOfMonth(periodStart);

    // Clamp period end to projection end date
    const effectivePeriodEnd = periodEnd > endDate ? endDate : periodEnd;

    // Aggregate cash flows for this period
    const inflows = aggregateInflows(cashFlows, periodStart, effectivePeriodEnd, scenario);
    const outflows = aggregateOutflows(cashFlows, periodStart, effectivePeriodEnd, scenario);

    // Aggregate obligations for this period
    const obligationBreakdown = aggregateObligations(obligations, periodStart, effectivePeriodEnd, scenario);

    // Aggregate financing payments for this period
    const financingPayments = aggregateFinancingPayments(financingSchedules, periodStart, effectivePeriodEnd);

    // Calculate totals
    const totalInflows = inflows;
    const totalOutflows = outflows + obligationBreakdown.total + financingPayments;
    const closingCash = runningCash + totalInflows - totalOutflows;
    const liquidityBuffer = closingCash - minimumReserveCents;
    const cashShortfall = liquidityBuffer < 0 ? Math.abs(liquidityBuffer) : 0;
    const isPressured = liquidityBuffer < 0;

    periods.push({
      periodStart,
      periodEnd: effectivePeriodEnd,
      openingCashCents: runningCash,
      inflowsCents: totalInflows,
      operatingExpensesCents: outflows,
      payrollCents: obligationBreakdown.payroll,
      taxesCents: obligationBreakdown.taxes,
      vendorPaymentsCents: obligationBreakdown.vendor,
      financingPaymentsCents: financingPayments,
      otherOutflowsCents: obligationBreakdown.other,
      totalOutflowsCents: totalOutflows,
      closingCashCents: closingCash,
      minimumReserveCents: minimumReserveCents,
      liquidityBufferCents: liquidityBuffer,
      cashShortfallCents: cashShortfall,
      isPressured,
    });

    runningCash = closingCash;
  }

  // Calculate summary
  const summary = calculateSummary(periods, financingSchedules, startDate, endDate);

  return {
    organizationId,
    scenarioId,
    periodType,
    startDate,
    endDate,
    periods,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Aggregate inflows for a period.
 */
function aggregateInflows(
  cashFlows: CashFlowEntry[],
  periodStart: ISODate,
  periodEnd: ISODate,
  scenario: Scenario | null,
): Cents {
  let total = 0;

  for (const cf of cashFlows) {
    if (cf.type !== 'INFLOW') continue;

    const occurrences = getOccurrencesInRange(cf, periodStart, periodEnd);
    for (const date of occurrences) {
      if (isDateInRange(date, periodStart, periodEnd)) {
        let amount = cf.amountCents;

        // Apply scenario adjustments
        if (scenario) {
          amount = applyScenarioAdjustment(amount, scenario, cf.category, 'INFLOW');
        }

        total += amount;
      }
    }
  }

  return total;
}

/**
 * Aggregate operating expense outflows for a period.
 */
function aggregateOutflows(
  cashFlows: CashFlowEntry[],
  periodStart: ISODate,
  periodEnd: ISODate,
  scenario: Scenario | null,
): Cents {
  let total = 0;

  for (const cf of cashFlows) {
    if (cf.type !== 'OUTFLOW') continue;
    // Skip categories handled by obligations
    if (['PAYROLL', 'TAXES', 'VENDOR_PAYMENTS'].includes(cf.category)) continue;

    const occurrences = getOccurrencesInRange(cf, periodStart, periodEnd);
    for (const date of occurrences) {
      if (isDateInRange(date, periodStart, periodEnd)) {
        let amount = cf.amountCents;

        if (scenario) {
          amount = applyScenarioAdjustment(amount, scenario, cf.category, 'OUTFLOW');
        }

        total += amount;
      }
    }
  }

  return total;
}

/**
 * Aggregate obligations by category for a period.
 */
function aggregateObligations(
  obligations: BusinessObligation[],
  periodStart: ISODate,
  periodEnd: ISODate,
  scenario: Scenario | null,
): { total: Cents; payroll: Cents; taxes: Cents; vendor: Cents; other: Cents } {
  let payroll = 0;
  let taxes = 0;
  let vendor = 0;
  let other = 0;

  for (const ob of obligations) {
    if (ob.status === 'CANCELLED' || ob.status === 'PAID') continue;

    const occurrences = getOccurrencesInRange(ob, periodStart, periodEnd);
    for (const date of occurrences) {
      if (isDateInRange(date, periodStart, periodEnd)) {
        let amount = ob.amountCents;

        if (scenario) {
          amount = applyObligationScenarioAdjustment(amount, scenario, ob.type);
        }

        switch (ob.type) {
          case 'PAYROLL':
            payroll += amount;
            break;
          case 'TAX':
            taxes += amount;
            break;
          case 'VENDOR':
            vendor += amount;
            break;
          default:
            other += amount;
            break;
        }
      }
    }
  }

  return { total: payroll + taxes + vendor + other, payroll, taxes, vendor, other };
}

/**
 * Aggregate financing payments for a period.
 */
function aggregateFinancingPayments(
  installments: ScheduleEntry[],
  periodStart: ISODate,
  periodEnd: ISODate,
): Cents {
  let total = 0;

  for (const inst of installments) {
    if (isDateInRange(inst.dueDate, periodStart, periodEnd)) {
      total += inst.totalPaymentCents;
    }
  }

  return total;
}

/**
 * Get all occurrence dates for a recurring entry within a range.
 * Handles both CashFlowEntry (uses startDate) and BusinessObligation (uses dueDate).
 */
function getOccurrencesInRange(
  entry: { startDate?: ISODate; dueDate?: ISODate; endDate: ISODate | null; recurrence: string; expectedDelayDays?: number },
  rangeStart: ISODate,
  rangeEnd: ISODate,
): ISODate[] {
  const dates: ISODate[] = [];
  const anchorDate = entry.startDate ?? entry.dueDate ?? rangeStart;
  const delayDays = entry.expectedDelayDays ?? 0;
  const entryEnd = entry.endDate ?? rangeEnd;

  if (entry.recurrence === 'ONE_TIME') {
    const date = addDays(anchorDate, delayDays);
    if (isDateInRange(date, rangeStart, rangeEnd) && date <= entryEnd) {
      dates.push(date);
    }
    return dates;
  }

  let current = anchorDate;
  const maxDate = entryEnd < rangeEnd ? entryEnd : rangeEnd;

  while (current <= maxDate) {
    const date = addDays(current, delayDays);
    if (isDateInRange(date, rangeStart, rangeEnd)) {
      dates.push(date);
    }

    switch (entry.recurrence) {
      case 'WEEKLY':
        current = addWeeks(current, 1);
        break;
      case 'BIWEEKLY':
        current = addWeeks(current, 2);
        break;
      case 'MONTHLY':
        current = addMonths(current, 1);
        break;
      case 'QUARTERLY':
        current = addMonths(current, 3);
        break;
      case 'ANNUAL':
        current = addMonths(current, 12);
        break;
      default:
        return dates;
    }
  }

  return dates;
}

function addDays(date: ISODate, days: number): ISODate {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Apply scenario adjustments to a cash flow amount.
 */
function applyScenarioAdjustment(
  amount: Cents,
  scenario: Scenario,
  category: string,
  type: 'INFLOW' | 'OUTFLOW',
): Cents {
  let adjusted = amount;

  for (const adj of scenario.adjustments) {
    switch (adj.type) {
      case 'REVENUE_DECLINE':
        if (type === 'INFLOW' && (category === 'REVENUE' || category === 'CUSTOMER_RECEIPTS')) {
          adjusted = Math.round(adjusted * (1 - adj.value));
        }
        break;
      case 'REVENUE_GROWTH':
        if (type === 'INFLOW' && (category === 'REVENUE' || category === 'CUSTOMER_RECEIPTS')) {
          adjusted = Math.round(adjusted * (1 + adj.value));
        }
        break;
      case 'EXPENSE_INCREASE':
        if (type === 'OUTFLOW') {
          adjusted = Math.round(adjusted * (1 + adj.value));
        }
        break;
      case 'EXPENSE_REDUCTION':
        if (type === 'OUTFLOW') {
          adjusted = Math.round(adjusted * (1 - adj.value));
        }
        break;
      case 'PAYMENT_DELAY':
        // Payment delay is handled at the date level, not amount level
        break;
    }
  }

  return adjusted;
}

/**
 * Apply scenario adjustments to an obligation amount.
 */
function applyObligationScenarioAdjustment(
  amount: Cents,
  scenario: Scenario,
  obligationType: string,
): Cents {
  let adjusted = amount;

  for (const adj of scenario.adjustments) {
    switch (adj.type) {
      case 'EXPENSE_INCREASE':
        adjusted = Math.round(adjusted * (1 + adj.value));
        break;
      case 'EXPENSE_REDUCTION':
        adjusted = Math.round(adjusted * (1 - adj.value));
        break;
      case 'PAYROLL_CHANGE':
        if (obligationType === 'PAYROLL') {
          adjusted = Math.round(adjusted * (1 + adj.value));
        }
        break;
      case 'TAX_CHANGE':
        if (obligationType === 'TAX') {
          adjusted = Math.round(adjusted * (1 + adj.value));
        }
        break;
    }
  }

  return adjusted;
}

/**
 * Calculate projection summary metrics.
 */
function calculateSummary(
  periods: ProjectionPeriodData[],
  financingSchedules: ScheduleEntry[],
  startDate: ISODate,
  endDate: ISODate,
): ProjectionSummary {
  if (periods.length === 0) {
    return {
      minimumCashCents: 0,
      minimumCashDate: null,
      lowestCashCents: 0,
      largestShortfallCents: 0,
      totalPressuredPeriods: 0,
      totalDebtServiceCents: 0,
      debtServiceCoverageRatio: null,
      firstShortageDate: null,
    };
  }

  let minimumCash = periods[0].closingCashCents;
  let minimumCashDate = periods[0].periodStart;
  let largestShortfall = 0;
  let totalPressured = 0;
  let firstShortageDate: ISODate | null = null;

  for (const period of periods) {
    if (period.closingCashCents < minimumCash) {
      minimumCash = period.closingCashCents;
      minimumCashDate = period.periodStart;
    }
    if (period.cashShortfallCents > largestShortfall) {
      largestShortfall = period.cashShortfallCents;
    }
    if (period.isPressured) {
      totalPressured++;
      if (!firstShortageDate) {
        firstShortageDate = period.periodStart;
      }
    }
  }

  // Total debt service in the projection period
  const totalDebtService = financingSchedules
    .filter(inst => isDateInRange(inst.dueDate, startDate, endDate))
    .reduce((sum, inst) => sum + inst.totalPaymentCents, 0);

  // Debt service coverage ratio = total inflows / total debt service
  const totalInflows = periods.reduce((sum, p) => sum + p.inflowsCents, 0);
  const debtServiceCoverageRatio = totalDebtService > 0
    ? totalInflows / totalDebtService
    : null;

  return {
    minimumCashCents: minimumCash,
    minimumCashDate,
    lowestCashCents: minimumCash,
    largestShortfallCents: largestShortfall,
    totalPressuredPeriods: totalPressured,
    totalDebtServiceCents: totalDebtService,
    debtServiceCoverageRatio,
    firstShortageDate,
  };
}
