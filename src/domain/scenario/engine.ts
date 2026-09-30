/**
 * Scenario Engine
 * 
 * Creates and applies scenario adjustments to base-case financial data.
 * 
 * Supported adjustments:
 * - Revenue decline/growth
 * - Expense increase/reduction
 * - Customer payment delays
 * - Interest rate changes
 * - New loan
 * - Loan refinancing
 * - Repayment acceleration
 * - One-time unexpected expense
 * - Payroll changes
 * - Tax changes
 */

import type { Scenario, ScenarioAdjustment, ScenarioAdjustmentType, Cents } from '../types';

export interface ScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  scenarioType: string;
  minimumCashCents: Cents;
  minimumCashDate: string | null;
  totalPressuredPeriods: number;
  totalShortfallCents: Cents;
  maxSafeRepaymentCents: Cents;
  differenceFromBase: {
    minimumCashDelta: Cents;
    pressuredPeriodsDelta: number;
    shortfallDelta: Cents;
  };
}

/**
 * Create a default base scenario.
 */
export function createBaseScenario(organizationId: string): Scenario {
  return {
    id: 'base',
    organizationId,
    name: 'Base Case',
    type: 'BASE',
    description: 'Current financial position with no adjustments',
    adjustments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a mild downside scenario.
 */
export function createMildDownsideScenario(organizationId: string): Scenario {
  return {
    id: 'mild-downside',
    organizationId,
    name: 'Mild Downside',
    type: 'MILD_DOWNSIDE',
    description: '10% revenue decline, 5% expense increase, 5-day payment delay',
    adjustments: [
      {
        id: 'adj-1',
        scenarioId: 'mild-downside',
        type: 'REVENUE_DECLINE',
        value: 0.10,
        isPercentage: true,
        description: '10% revenue decline',
      },
      {
        id: 'adj-2',
        scenarioId: 'mild-downside',
        type: 'EXPENSE_INCREASE',
        value: 0.05,
        isPercentage: true,
        description: '5% expense increase',
      },
      {
        id: 'adj-3',
        scenarioId: 'mild-downside',
        type: 'PAYMENT_DELAY',
        value: 5,
        isPercentage: false,
        description: '5-day customer payment delay',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a severe downside scenario.
 */
export function createSevereDownsideScenario(organizationId: string): Scenario {
  return {
    id: 'severe-downside',
    organizationId,
    name: 'Severe Downside',
    type: 'SEVERE_DOWNSIDE',
    description: '25% revenue decline, 15% expense increase, 15-day payment delay',
    adjustments: [
      {
        id: 'adj-1',
        scenarioId: 'severe-downside',
        type: 'REVENUE_DECLINE',
        value: 0.25,
        isPercentage: true,
        description: '25% revenue decline',
      },
      {
        id: 'adj-2',
        scenarioId: 'severe-downside',
        type: 'EXPENSE_INCREASE',
        value: 0.15,
        isPercentage: true,
        description: '15% expense increase',
      },
      {
        id: 'adj-3',
        scenarioId: 'severe-downside',
        type: 'PAYMENT_DELAY',
        value: 15,
        isPercentage: false,
        description: '15-day customer payment delay',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a custom scenario.
 */
export function createCustomScenario(
  organizationId: string,
  name: string,
  description: string,
  adjustments: Omit<ScenarioAdjustment, 'id' | 'scenarioId'>[],
): Scenario {
  const scenarioId = `custom-${Date.now()}`;
  return {
    id: scenarioId,
    organizationId,
    name,
    type: 'CUSTOM',
    description,
    adjustments: adjustments.map((adj, i) => ({
      ...adj,
      id: `adj-${i}`,
      scenarioId,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Compare multiple scenarios and return a comparison table.
 */
export function compareScenarios(
  results: Map<string, { minimumCashCents: Cents; minimumCashDate: string | null; totalPressuredPeriods: number; totalShortfallCents: Cents; maxSafeRepaymentCents: Cents }>,
  scenarios: Scenario[],
): ScenarioComparison[] {
  const baseResult = results.get('base');
  const comparisons: ScenarioComparison[] = [];

  for (const scenario of scenarios) {
    const result = results.get(scenario.id);
    if (!result) continue;

    const differenceFromBase = baseResult
      ? {
          minimumCashDelta: result.minimumCashCents - baseResult.minimumCashCents,
          pressuredPeriodsDelta: result.totalPressuredPeriods - baseResult.totalPressuredPeriods,
          shortfallDelta: result.totalShortfallCents - baseResult.totalShortfallCents,
        }
      : { minimumCashDelta: 0, pressuredPeriodsDelta: 0, shortfallDelta: 0 };

    comparisons.push({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      scenarioType: scenario.type,
      minimumCashCents: result.minimumCashCents,
      minimumCashDate: result.minimumCashDate,
      totalPressuredPeriods: result.totalPressuredPeriods,
      totalShortfallCents: result.totalShortfallCents,
      maxSafeRepaymentCents: result.maxSafeRepaymentCents,
      differenceFromBase,
    });
  }

  return comparisons;
}
