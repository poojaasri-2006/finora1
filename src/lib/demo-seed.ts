import { prisma } from '@/lib/db';
import { addDays, addMonths, todayISO } from '@/domain/dates';

/**
 * Seed a rich, coherent demo dataset for an organization (idempotent — only adds missing items).
 * Used by the "Load demo data" action and on new sign-ups so the workspace is never empty.
 */
export async function seedOrganizationDemoData(organizationId: string): Promise<void> {
  const today = todayISO();

  const loans = [
    { name: 'Equipment Term Loan', lender: 'First National Bank', type: 'TERM_LOAN', originalPrincipalCents: 25000000, outstandingPrincipalCents: 18500000, annualInterestRate: 0.075, interestType: 'FIXED', startDate: addMonths(today, -4), maturityDate: addMonths(today, 20), paymentFrequency: 'MONTHLY', repaymentMethod: 'AMORTIZING', paymentAmountCents: 463000, feesCents: 150000, gracePeriodMonths: 0, notes: 'CNC machine purchase' },
    { name: 'Working Capital Line', lender: 'Community Credit Union', type: 'REVOLVING_CREDIT', originalPrincipalCents: 10000000, outstandingPrincipalCents: 4200000, annualInterestRate: 0.095, interestType: 'VARIABLE', startDate: addMonths(today, -6), maturityDate: addMonths(today, 12), paymentFrequency: 'MONTHLY', repaymentMethod: 'INTEREST_ONLY', paymentAmountCents: 27500, feesCents: 0, gracePeriodMonths: 0, notes: 'Seasonal working capital' },
    { name: 'Fleet Vehicle Lease', lender: 'GreenFleet Leasing', type: 'LEASE', originalPrincipalCents: 6500000, outstandingPrincipalCents: 5100000, annualInterestRate: 0.0825, interestType: 'FIXED', startDate: addMonths(today, -3), maturityDate: addMonths(today, 21), paymentFrequency: 'MONTHLY', repaymentMethod: 'EQUAL_PRINCIPAL', paymentAmountCents: 0, feesCents: 50000, gracePeriodMonths: 0, notes: 'Two delivery vans' },
    { name: 'Expansion Bullet Loan', lender: 'Sunrise Capital Partners', type: 'TERM_LOAN', originalPrincipalCents: 30000000, outstandingPrincipalCents: 30000000, annualInterestRate: 0.11, interestType: 'FIXED', startDate: addMonths(today, -1), maturityDate: addMonths(today, 18), paymentFrequency: 'QUARTERLY', repaymentMethod: 'BULLET', paymentAmountCents: 0, feesCents: 300000, gracePeriodMonths: 0, notes: 'New warehouse fit-out' },
  ];
  const loanNames = new Set((await prisma.financingAccount.findMany({ where: { organizationId }, select: { name: true } })).map((l) => l.name));
  for (const loan of loans) {
    if (!loanNames.has(loan.name)) await prisma.financingAccount.create({ data: { ...loan, organizationId, status: 'ACTIVE' } });
  }

  const cashFlows = [
    { name: 'Product Sales', category: 'REVENUE', type: 'INFLOW', amountCents: 9500000, recurrence: 'MONTHLY', startDate: addMonths(today, -6) },
    { name: 'Service Revenue', category: 'REVENUE', type: 'INFLOW', amountCents: 3250000, recurrence: 'MONTHLY', startDate: addMonths(today, -6) },
    { name: 'Export Receipts', category: 'CUSTOMER_RECEIPTS', type: 'INFLOW', amountCents: 2100000, recurrence: 'QUARTERLY', startDate: addMonths(today, -3) },
    { name: 'Interest Income', category: 'OTHER_RECURRING', type: 'INFLOW', amountCents: 45000, recurrence: 'MONTHLY', startDate: addMonths(today, -6) },
    { name: 'Payroll', category: 'PAYROLL', type: 'OUTFLOW', amountCents: 4800000, recurrence: 'MONTHLY', startDate: addMonths(today, -6) },
    { name: 'Raw Materials', category: 'VENDOR_PAYMENTS', type: 'OUTFLOW', amountCents: 3400000, recurrence: 'MONTHLY', startDate: addMonths(today, -6) },
    { name: 'Facility Rent', category: 'RENT', type: 'OUTFLOW', amountCents: 1250000, recurrence: 'MONTHLY', startDate: addMonths(today, -6) },
    { name: 'Utilities', category: 'UTILITIES', type: 'OUTFLOW', amountCents: 190000, recurrence: 'MONTHLY', startDate: addMonths(today, -6) },
    { name: 'Business Insurance', category: 'INSURANCE', type: 'OUTFLOW', amountCents: 95000, recurrence: 'MONTHLY', startDate: addMonths(today, -6) },
    { name: 'Inventory Purchase', category: 'INVENTORY', type: 'OUTFLOW', amountCents: 1600000, recurrence: 'MONTHLY', startDate: addMonths(today, -4) },
    { name: 'Marketing & Ads', category: 'MARKETING', type: 'OUTFLOW', amountCents: 220000, recurrence: 'MONTHLY', startDate: addMonths(today, -6) },
    { name: 'Quarterly Tax Payment', category: 'TAXES', type: 'OUTFLOW', amountCents: 900000, recurrence: 'QUARTERLY', startDate: addDays(today, 10) },
  ];
  const cfNames = new Set((await prisma.cashFlowEntry.findMany({ where: { organizationId }, select: { name: true } })).map((c) => c.name));
  for (const cf of cashFlows) {
    if (!cfNames.has(cf.name)) await prisma.cashFlowEntry.create({ data: { ...cf, organizationId, status: 'PROJECTED' } });
  }

  const obligations = [
    { name: 'Monthly Payroll', type: 'PAYROLL', amountCents: 4800000, dueDate: addDays(today, 4) },
    { name: 'Raw Materials Supplier', type: 'VENDOR', amountCents: 3400000, dueDate: addDays(today, 7) },
    { name: 'Facility Rent', type: 'RENT', amountCents: 1250000, dueDate: addDays(today, 12) },
    { name: 'Quarterly Tax Payment', type: 'TAX', amountCents: 900000, dueDate: addDays(today, 18) },
    { name: 'Business Insurance Premium', type: 'INSURANCE', amountCents: 95000, dueDate: addDays(today, 22) },
    { name: 'Utilities Bill', type: 'UTILITIES', amountCents: 190000, dueDate: addDays(today, 25) },
    { name: 'Equipment Maintenance', type: 'OTHER', amountCents: 260000, dueDate: addDays(today, 28) },
  ];
  const obNames = new Set((await prisma.businessObligation.findMany({ where: { organizationId }, select: { name: true } })).map((o) => o.name));
  for (const ob of obligations) {
    if (!obNames.has(ob.name)) await prisma.businessObligation.create({ data: { ...ob, organizationId, recurrence: 'MONTHLY', status: 'PENDING' } });
  }

  const scNames = new Set((await prisma.scenario.findMany({ where: { organizationId }, select: { name: true } })).map((s) => s.name));
  if (!scNames.has('Base Case')) {
    await prisma.scenario.create({ data: { organizationId, name: 'Base Case', type: 'BASE', description: 'Current financial position with no adjustments' } });
  }
  if (!scNames.has('Slower sales')) {
    await prisma.scenario.create({
      data: { organizationId, name: 'Slower sales', type: 'MILD_DOWNSIDE', description: 'Revenue declines by 12% while costs rise by 5%', adjustments: { create: [{ type: 'REVENUE_DECLINE', value: 0.12, isPercentage: true, description: 'Slower customer receipts' }, { type: 'EXPENSE_INCREASE', value: 0.05, isPercentage: true, description: 'Higher operating costs' }] } },
    });
  }
  if (!scNames.has('Severe downside')) {
    await prisma.scenario.create({
      data: { organizationId, name: 'Severe downside', type: 'SEVERE_DOWNSIDE', description: 'Revenue declines by 25% while costs rise by 12%', adjustments: { create: [{ type: 'REVENUE_DECLINE', value: 0.25, isPercentage: true, description: 'Major sales slowdown' }, { type: 'EXPENSE_INCREASE', value: 0.12, isPercentage: true, description: 'Higher operating costs' }] } },
    });
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const patch: Record<string, unknown> = { onboardingCompleted: true };
  if (org && org.currentCashCents === 0) patch.currentCashCents = 18500000;
  if (org && org.minimumCashReserveCents === 0) patch.minimumCashReserveCents = 10000000;
  await prisma.organization.update({ where: { id: organizationId }, data: patch });
}
