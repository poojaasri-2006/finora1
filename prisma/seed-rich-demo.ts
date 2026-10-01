import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    /* ignore */
  }
}
loadEnv();

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date(iso(new Date()) + 'T00:00:00Z');
const addDays = (n: number) => iso(new Date(today.getTime() + n * DAY));
const addMonths = (n: number) => {
  const d = new Date(today.getTime());
  d.setUTCMonth(d.getUTCMonth() + n);
  return iso(d);
};

const LOANS = [
  { name: 'Equipment Term Loan', lender: 'First National Bank', type: 'TERM_LOAN', originalPrincipalCents: 25000000, outstandingPrincipalCents: 18500000, annualInterestRate: 0.075, paymentFrequency: 'MONTHLY', repaymentMethod: 'AMORTIZING', feesCents: 150000, startDate: addMonths(-4), maturityDate: addMonths(20), notes: 'CNC machine purchase' },
  { name: 'Working Capital Line', lender: 'Community Credit Union', type: 'REVOLVING_CREDIT', originalPrincipalCents: 10000000, outstandingPrincipalCents: 4200000, annualInterestRate: 0.095, paymentFrequency: 'MONTHLY', repaymentMethod: 'INTEREST_ONLY', feesCents: 0, startDate: addMonths(-6), maturityDate: addMonths(12), notes: 'Seasonal working capital' },
  { name: 'Fleet Vehicle Lease', lender: 'GreenFleet Leasing', type: 'LEASE', originalPrincipalCents: 6500000, outstandingPrincipalCents: 5100000, annualInterestRate: 0.0825, paymentFrequency: 'MONTHLY', repaymentMethod: 'EQUAL_PRINCIPAL', feesCents: 50000, startDate: addMonths(-3), maturityDate: addMonths(21), notes: 'Two delivery vans' },
  { name: 'Expansion Bullet Loan', lender: 'Sunrise Capital Partners', type: 'TERM_LOAN', originalPrincipalCents: 30000000, outstandingPrincipalCents: 30000000, annualInterestRate: 0.11, paymentFrequency: 'QUARTERLY', repaymentMethod: 'BULLET', feesCents: 300000, startDate: addMonths(-1), maturityDate: addMonths(18), notes: 'New warehouse fit-out' },
];

const CASH_FLOWS = [
  { name: 'Product Sales', category: 'REVENUE', type: 'INFLOW', amountCents: 9500000, recurrence: 'MONTHLY', startDate: addMonths(-6) },
  { name: 'Service Revenue', category: 'REVENUE', type: 'INFLOW', amountCents: 3250000, recurrence: 'MONTHLY', startDate: addMonths(-6) },
  { name: 'Export Receipts', category: 'CUSTOMER_RECEIPTS', type: 'INFLOW', amountCents: 2100000, recurrence: 'QUARTERLY', startDate: addMonths(-3) },
  { name: 'Interest Income', category: 'OTHER_RECURRING', type: 'INFLOW', amountCents: 45000, recurrence: 'MONTHLY', startDate: addMonths(-6) },
  { name: 'Payroll', category: 'PAYROLL', type: 'OUTFLOW', amountCents: 4800000, recurrence: 'MONTHLY', startDate: addMonths(-6) },
  { name: 'Raw Materials', category: 'VENDOR_PAYMENTS', type: 'OUTFLOW', amountCents: 3400000, recurrence: 'MONTHLY', startDate: addMonths(-6) },
  { name: 'Facility Rent', category: 'RENT', type: 'OUTFLOW', amountCents: 1250000, recurrence: 'MONTHLY', startDate: addMonths(-6) },
  { name: 'Utilities', category: 'UTILITIES', type: 'OUTFLOW', amountCents: 190000, recurrence: 'MONTHLY', startDate: addMonths(-6) },
  { name: 'Business Insurance', category: 'INSURANCE', type: 'OUTFLOW', amountCents: 95000, recurrence: 'MONTHLY', startDate: addMonths(-6) },
  { name: 'Inventory Purchase', category: 'INVENTORY', type: 'OUTFLOW', amountCents: 1600000, recurrence: 'MONTHLY', startDate: addMonths(-4) },
  { name: 'Marketing & Ads', category: 'MARKETING', type: 'OUTFLOW', amountCents: 220000, recurrence: 'MONTHLY', startDate: addMonths(-6) },
  { name: 'Quarterly Tax Payment', category: 'TAXES', type: 'OUTFLOW', amountCents: 900000, recurrence: 'QUARTERLY', startDate: addDays(10) },
];

const OBLIGATIONS = [
  { name: 'Monthly Payroll', type: 'PAYROLL', amountCents: 4800000, dueDate: addDays(4), recurrence: 'MONTHLY' },
  { name: 'Raw Materials Supplier', type: 'VENDOR', amountCents: 3400000, dueDate: addDays(7), recurrence: 'MONTHLY' },
  { name: 'Facility Rent', type: 'RENT', amountCents: 1250000, dueDate: addDays(12), recurrence: 'MONTHLY' },
  { name: 'Quarterly Tax Payment', type: 'TAX', amountCents: 900000, dueDate: addDays(18), recurrence: 'QUARTERLY' },
  { name: 'Business Insurance Premium', type: 'INSURANCE', amountCents: 95000, dueDate: addDays(22), recurrence: 'MONTHLY' },
  { name: 'Utilities Bill', type: 'UTILITIES', amountCents: 190000, dueDate: addDays(25), recurrence: 'MONTHLY' },
  { name: 'Equipment Maintenance', type: 'OTHER', amountCents: 260000, dueDate: addDays(28), recurrence: 'ONE_TIME' },
];

const SCENARIOS = [
  { name: 'Base Case', type: 'BASE', description: 'Current financial position with no adjustments', adjustments: [] as { type: string; value: number; description: string }[] },
  { name: 'Slower sales', type: 'MILD_DOWNSIDE', description: 'Revenue declines by 12% while costs rise by 5%', adjustments: [ { type: 'REVENUE_DECLINE', value: 0.12, description: 'Slower customer receipts' }, { type: 'EXPENSE_INCREASE', value: 0.05, description: 'Higher operating costs' } ] },
  { name: 'Severe downside', type: 'SEVERE_DOWNSIDE', description: 'Revenue declines by 25% while costs rise by 12%', adjustments: [ { type: 'REVENUE_DECLINE', value: 0.25, description: 'Major sales slowdown' }, { type: 'EXPENSE_INCREASE', value: 0.12, description: 'Higher operating costs' } ] },
];

async function seedOrg(orgId: string, orgName: string) {
  const existingLoans = await prisma.financingAccount.findMany({ where: { organizationId: orgId }, select: { name: true } });
  const loanNames = new Set(existingLoans.map((l) => l.name));
  let loansAdded = 0;
  for (const loan of LOANS) {
    if (loanNames.has(loan.name)) continue;
    await prisma.financingAccount.create({
      data: { organizationId: orgId, interestType: 'FIXED', gracePeriodMonths: 0, status: 'ACTIVE', ...loan },
    });
    loansAdded += 1;
  }

  const existingCf = await prisma.cashFlowEntry.findMany({ where: { organizationId: orgId }, select: { name: true } });
  const cfNames = new Set(existingCf.map((c) => c.name));
  let cfAdded = 0;
  for (const cf of CASH_FLOWS) {
    if (cfNames.has(cf.name)) continue;
    await prisma.cashFlowEntry.create({ data: { organizationId: orgId, status: 'PROJECTED', ...cf } });
    cfAdded += 1;
  }

  const existingOb = await prisma.businessObligation.findMany({ where: { organizationId: orgId }, select: { name: true } });
  const obNames = new Set(existingOb.map((o) => o.name));
  let obAdded = 0;
  for (const ob of OBLIGATIONS) {
    if (obNames.has(ob.name)) continue;
    await prisma.businessObligation.create({ data: { organizationId: orgId, status: 'PENDING', ...ob } });
    obAdded += 1;
  }

  const existingSc = await prisma.scenario.findMany({ where: { organizationId: orgId }, select: { name: true } });
  const scNames = new Set(existingSc.map((s) => s.name));
  let scAdded = 0;
  for (const sc of SCENARIOS) {
    if (scNames.has(sc.name)) continue;
    await prisma.scenario.create({
      data: {
        organizationId: orgId,
        name: sc.name,
        type: sc.type,
        description: sc.description,
        ...(sc.adjustments.length ? { adjustments: { create: sc.adjustments.map((a) => ({ ...a, isPercentage: true })) } } : {}),
      },
    });
    scAdded += 1;
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const patch: Record<string, unknown> = {};
  if (org && org.currentCashCents === 0) patch.currentCashCents = 18500000;
  if (org && org.minimumCashReserveCents === 0) patch.minimumCashReserveCents = 10000000;
  if (org && !org.onboardingCompleted) patch.onboardingCompleted = true;
  if (Object.keys(patch).length) await prisma.organization.update({ where: { id: orgId }, data: patch });

  console.log(`  ${orgName}: +${loansAdded} loans, +${cfAdded} cash flows, +${obAdded} obligations, +${scAdded} scenarios`);
}

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log(`Seeding rich demo data for ${orgs.length} organization(s)...`);
  for (const org of orgs) {
    await seedOrg(org.id, org.name);
  }
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
