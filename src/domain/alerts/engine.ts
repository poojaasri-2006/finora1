/**
 * Alert Engine
 * 
 * Generates alerts based on financial data and projections.
 * 
 * Alert types:
 * - Repayment due within 7 days
 * - Large obligation due within 30 days
 * - Cash falling below reserve
 * - Projected negative cash
 * - Balloon payment approaching
 * - Overdue installment
 * - Scenario producing material shortfall
 * 
 * Severity levels: INFO, WARNING, CRITICAL
 */

import type {
  Alert,
  AlertType,
  AlertSeverity,
  ISODate,
  Cents,
  BusinessObligation,
  ProjectionResult,
  Scenario,
} from '../types';
import type { ScheduleEntry } from '../schedule';
import { daysBetween, todayISO, addDays } from '../dates';
import { formatMoney } from '../money';

export interface AlertContext {
  organizationId: string;
  minimumReserveCents: Cents;
  currency: string;
  obligations: BusinessObligation[];
  installments: ScheduleEntry[];
  projection: ProjectionResult | null;
  scenarios: Scenario[];
  scenarioProjections: Map<string, ProjectionResult>;
}

/**
 * Generate all alerts for an organization.
 */
export function generateAlerts(context: AlertContext): Alert[] {
  const alerts: Alert[] = [];
  const today = todayISO();

  // Repayment due within 7 days
  alerts.push(...generateRepaymentDueAlerts(context, today));

  // Large obligation due within 30 days
  alerts.push(...generateLargeObligationAlerts(context, today));

  // Cash falling below reserve
  alerts.push(...generateCashBelowReserveAlerts(context, today));

  // Projected negative cash
  alerts.push(...generateProjectedNegativeCashAlerts(context, today));

  // Balloon payment approaching
  alerts.push(...generateBalloonPaymentAlerts(context, today));

  // Overdue installment
  alerts.push(...generateOverdueInstallmentAlerts(context, today));

  // Scenario shortfall
  alerts.push(...generateScenarioShortfallAlerts(context, today));

  return alerts;
}

/**
 * Alert: Repayment due within 7 days.
 */
function generateRepaymentDueAlerts(context: AlertContext, today: ISODate): Alert[] {
  const alerts: Alert[] = [];
  const sevenDaysFromNow = addDays(today, 7);

  for (const inst of context.installments) {
    // Schedule entries are always pending (no status field)
    if (inst.dueDate >= today && inst.dueDate <= sevenDaysFromNow) {
      const daysUntil = daysBetween(today, inst.dueDate);
      const instId = `${inst.financingAccountId ?? 'schedule'}-${inst.number}-${inst.dueDate}`;
      alerts.push({
        id: `alert-repay-${instId}`,
        organizationId: context.organizationId,
        type: 'REPAYMENT_DUE_7_DAYS',
        severity: daysUntil <= 3 ? 'WARNING' : 'INFO',
        title: `Repayment due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
        message: `Installment #${inst.number} of ${formatMoney(inst.totalPaymentCents, context.currency)} is due on ${inst.dueDate}.`,
        details: {
          installmentId: instId,
          dueDate: inst.dueDate,
          amountCents: inst.totalPaymentCents,
          daysUntilDue: daysUntil,
        },
        relatedEntityId: instId,
        isRead: false,
        isDismissed: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

/**
 * Alert: Large obligation due within 30 days.
 */
function generateLargeObligationAlerts(context: AlertContext, today: ISODate): Alert[] {
  const alerts: Alert[] = [];
  const thirtyDaysFromNow = addDays(today, 30);

  // Define "large" as 20% of minimum reserve or more
  const largeThreshold = Math.round(context.minimumReserveCents * 0.2);

  for (const ob of context.obligations) {
    if (ob.status === 'PAID' || ob.status === 'CANCELLED') continue;
    if (ob.dueDate >= today && ob.dueDate <= thirtyDaysFromNow) {
      if (ob.amountCents >= largeThreshold) {
        const daysUntil = daysBetween(today, ob.dueDate);
        alerts.push({
          id: `alert-large-${ob.id}`,
          organizationId: context.organizationId,
          type: 'LARGE_OBLIGATION_30_DAYS',
          severity: 'WARNING',
          title: `Large ${ob.type.toLowerCase()} payment due in ${daysUntil} days`,
          message: `${ob.name}: ${formatMoney(ob.amountCents, context.currency)} due on ${ob.dueDate}.`,
          details: {
            obligationId: ob.id,
            dueDate: ob.dueDate,
            amountCents: ob.amountCents,
            daysUntilDue: daysUntil,
            obligationType: ob.type,
          },
          relatedEntityId: ob.id,
          isRead: false,
          isDismissed: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

/**
 * Alert: Cash falling below reserve.
 */
function generateCashBelowReserveAlerts(context: AlertContext, today: ISODate): Alert[] {
  const alerts: Alert[] = [];

  if (!context.projection) return alerts;

  for (const period of context.projection.periods) {
    if (period.isPressured) {
      alerts.push({
        id: `alert-reserve-${period.periodStart}`,
        organizationId: context.organizationId,
        type: 'CASH_BELOW_RESERVE',
        severity: 'CRITICAL',
        title: `Cash projected to fall below reserve`,
        message: `Cash is projected to fall ${formatMoney(period.cashShortfallCents, context.currency)} below your reserve on ${period.periodStart}.`,
        details: {
          periodStart: period.periodStart,
          closingCashCents: period.closingCashCents,
          minimumReserveCents: context.minimumReserveCents,
          shortfallCents: period.cashShortfallCents,
        },
        relatedEntityId: null,
        isRead: false,
        isDismissed: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

/**
 * Alert: Projected negative cash.
 */
function generateProjectedNegativeCashAlerts(context: AlertContext, today: ISODate): Alert[] {
  const alerts: Alert[] = [];

  if (!context.projection) return alerts;

  for (const period of context.projection.periods) {
    if (period.closingCashCents < 0) {
      alerts.push({
        id: `alert-negative-${period.periodStart}`,
        organizationId: context.organizationId,
        type: 'PROJECTED_NEGATIVE_CASH',
        severity: 'CRITICAL',
        title: `Negative cash projected`,
        message: `Cash is projected to be negative (${formatMoney(period.closingCashCents, context.currency)}) on ${period.periodStart}.`,
        details: {
          periodStart: period.periodStart,
          closingCashCents: period.closingCashCents,
        },
        relatedEntityId: null,
        isRead: false,
        isDismissed: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

/**
 * Alert: Balloon payment approaching.
 */
function generateBalloonPaymentAlerts(context: AlertContext, today: ISODate): Alert[] {
  const alerts: Alert[] = [];
  const sixtyDaysFromNow = addDays(today, 60);

  for (const inst of context.installments) {
    // Balloon payments are large final installments
    if (inst.principalRepaymentCents > inst.interestCents * 3) {
      if (inst.dueDate >= today && inst.dueDate <= sixtyDaysFromNow) {
        const daysUntil = daysBetween(today, inst.dueDate);
        const instId = `${inst.financingAccountId ?? 'schedule'}-${inst.number}-${inst.dueDate}`;
        alerts.push({
          id: `alert-balloon-${instId}`,
          organizationId: context.organizationId,
          type: 'BALLOON_PAYMENT_APPROACHING',
          severity: 'WARNING',
          title: `Balloon payment approaching`,
          message: `A balloon payment of ${formatMoney(inst.totalPaymentCents, context.currency)} is due on ${inst.dueDate} (${daysUntil} days).`,
          details: {
            installmentId: instId,
            dueDate: inst.dueDate,
            amountCents: inst.totalPaymentCents,
            daysUntilDue: daysUntil,
          },
          relatedEntityId: instId,
          isRead: false,
          isDismissed: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

/**
 * Alert: Overdue installment.
 */
function generateOverdueInstallmentAlerts(context: AlertContext, today: ISODate): Alert[] {
  const alerts: Alert[] = [];

  for (const inst of context.installments) {
    if (inst.dueDate < today) {
      const daysOverdue = daysBetween(inst.dueDate, today);
      const instId = `${inst.financingAccountId ?? 'schedule'}-${inst.number}-${inst.dueDate}`;
      alerts.push({
        id: `alert-overdue-${instId}`,
        organizationId: context.organizationId,
        type: 'OVERDUE_INSTALLMENT',
        severity: 'CRITICAL',
        title: `Overdue installment`,
        message: `Installment #${inst.number} of ${formatMoney(inst.totalPaymentCents, context.currency)} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.`,
        details: {
          installmentId: instId,
          dueDate: inst.dueDate,
          amountCents: inst.totalPaymentCents,
          daysOverdue,
        },
        relatedEntityId: instId,
        isRead: false,
        isDismissed: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

/**
 * Alert: Scenario producing material shortfall.
 */
function generateScenarioShortfallAlerts(context: AlertContext, today: ISODate): Alert[] {
  const alerts: Alert[] = [];

  for (const [scenarioId, projection] of context.scenarioProjections) {
    if (scenarioId === 'base') continue;

    const scenario = context.scenarios.find(s => s.id === scenarioId);
    if (!scenario) continue;

    if (projection.summary.totalPressuredPeriods > 0) {
      alerts.push({
        id: `alert-scenario-${scenarioId}`,
        organizationId: context.organizationId,
        type: 'SCENARIO_SHORTFALL',
        severity: projection.summary.largestShortfallCents > context.minimumReserveCents ? 'CRITICAL' : 'WARNING',
        title: `Scenario "${scenario.name}" shows material shortfall`,
        message: `Under "${scenario.name}", cash is projected to fall below reserve in ${projection.summary.totalPressuredPeriods} period${projection.summary.totalPressuredPeriods !== 1 ? 's' : ''}, with a maximum shortfall of ${formatMoney(projection.summary.largestShortfallCents, context.currency)}.`,
        details: {
          scenarioId,
          scenarioName: scenario.name,
          totalPressuredPeriods: projection.summary.totalPressuredPeriods,
          largestShortfallCents: projection.summary.largestShortfallCents,
          firstShortageDate: projection.summary.firstShortageDate,
        },
        relatedEntityId: scenarioId,
        isRead: false,
        isDismissed: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}
