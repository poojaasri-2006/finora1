/**
 * Database seed file — creates demo data for local development.
 * Run with: npm run db:seed
 * 
 * NOTE: This creates a demo organization with sample data.
 * In production, users should use the "Load demo data" feature instead.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@cashshield.com' },
    update: {},
    create: {
      email: 'demo@cashshield.com',
      name: 'Demo User',
      passwordHash,
      emailVerified: true,
    },
  });

  // Create organization
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: 'Acme Manufacturing Ltd.',
      baseCurrency: 'USD',
      minimumCashReserveCents: 5000000, // $50,000
      defaultProjectionPeriod: 'MONTHLY',
      fiscalYearStartMonth: 1,
      currentCashCents: 7500000, // $75,000
      onboardingCompleted: true,
    },
  });

  // Create membership
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  // Create financing accounts
  const loan1 = await prisma.financingAccount.upsert({
    where: { id: 'demo-loan-1' },
    update: {},
    create: {
      id: 'demo-loan-1',
      organizationId: org.id,
      name: 'Equipment Term Loan',
      lender: 'First National Bank',
      type: 'TERM_LOAN',
      originalPrincipalCents: 20000000, // $200,000
      outstandingPrincipalCents: 15000000, // $150,000
      annualInterestRate: 0.075,
      interestType: 'FIXED',
      startDate: '2024-01-15',
      maturityDate: '2027-01-15',
      paymentFrequency: 'MONTHLY',
      repaymentMethod: 'AMORTIZING',
      paymentAmountCents: 463000, // ~$4,630/month
      feesCents: 200000, // $2,000
      gracePeriodMonths: 0,
      status: 'ACTIVE',
      notes: 'CNC machine purchase',
    },
  });

  const loan2 = await prisma.financingAccount.upsert({
    where: { id: 'demo-loan-2' },
    update: {},
    create: {
      id: 'demo-loan-2',
      organizationId: org.id,
      name: 'Working Capital Line',
      lender: 'Community Credit Union',
      type: 'REVOLVING_CREDIT',
      originalPrincipalCents: 10000000, // $100,000
      outstandingPrincipalCents: 3500000, // $35,000
      annualInterestRate: 0.095,
      interestType: 'VARIABLE',
      startDate: '2023-06-01',
      maturityDate: '2026-06-01',
      paymentFrequency: 'MONTHLY',
      repaymentMethod: 'INTEREST_ONLY',
      paymentAmountCents: 27500, // ~$275/month interest
      feesCents: 0,
      gracePeriodMonths: 0,
      status: 'ACTIVE',
      notes: 'Seasonal working capital',
    },
  });

  // Create cash flow entries
  const cashFlows = [
    { name: 'Product Sales', category: 'REVENUE', type: 'INFLOW', amountCents: 8500000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
    { name: 'Service Revenue', category: 'REVENUE', type: 'INFLOW', amountCents: 2500000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
    { name: 'Payroll', category: 'PAYROLL', type: 'OUTFLOW', amountCents: 4500000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
    { name: 'Raw Materials', category: 'VENDOR_PAYMENTS', type: 'OUTFLOW', amountCents: 3200000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
    { name: 'Facility Rent', category: 'RENT', type: 'OUTFLOW', amountCents: 1200000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
    { name: 'Utilities', category: 'UTILITIES', type: 'OUTFLOW', amountCents: 180000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
    { name: 'Insurance', category: 'INSURANCE', type: 'OUTFLOW', amountCents: 90000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
    { name: 'Quarterly Tax Payment', category: 'TAXES', type: 'OUTFLOW', amountCents: 800000, recurrence: 'QUARTERLY', startDate: '2025-03-15', status: 'PROJECTED' },
    { name: 'Marketing', category: 'MARKETING', type: 'OUTFLOW', amountCents: 150000, recurrence: 'MONTHLY', startDate: '2025-01-01', status: 'PROJECTED' },
  ];

  for (const cf of cashFlows) {
    await prisma.cashFlowEntry.create({
      data: {
        organizationId: org.id,
        name: cf.name,
        category: cf.category,
        type: cf.type,
        amountCents: cf.amountCents,
        recurrence: cf.recurrence,
        startDate: cf.startDate,
        status: cf.status,
      },
    });
  }

  // Create obligations
  const obligations = [
    { name: 'Monthly Payroll', type: 'PAYROLL', amountCents: 4500000, dueDate: '2025-02-01', recurrence: 'MONTHLY' },
    { name: 'Raw Materials Supplier', type: 'VENDOR', amountCents: 3200000, dueDate: '2025-02-05', recurrence: 'MONTHLY' },
    { name: 'Facility Rent', type: 'RENT', amountCents: 1200000, dueDate: '2025-02-01', recurrence: 'MONTHLY' },
    { name: 'Q1 Tax Payment', type: 'TAX', amountCents: 800000, dueDate: '2025-03-15', recurrence: 'QUARTERLY' },
  ];

  for (const ob of obligations) {
    await prisma.businessObligation.create({
      data: {
        organizationId: org.id,
        name: ob.name,
        type: ob.type,
        amountCents: ob.amountCents,
        dueDate: ob.dueDate,
        recurrence: ob.recurrence,
      },
    });
  }

  // Create base scenario
  await prisma.scenario.upsert({
    where: { id: 'base' },
    update: {},
    create: {
      id: 'base',
      organizationId: org.id,
      name: 'Base Case',
      type: 'BASE',
      description: 'Current financial position with no adjustments',
    },
  });

  console.log('Seed complete!');
  console.log(`Organization: ${org.name}`);
  console.log(`Demo user: demo@cashshield.com / demo1234`);
  console.log(`Loans: 2`);
  console.log(`Cash flow entries: ${cashFlows.length}`);
  console.log(`Obligations: ${obligations.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
