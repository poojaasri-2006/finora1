import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSchedule } from '@/domain/schedule';
import { generateProjection } from '@/domain/projection/engine';
import { addMonths, todayISO } from '@/domain/dates';
import { requireOrganization } from '@/lib/api';

function cell(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;
    const org = await prisma.organization.findFirst({ where: { id: context.organizationId } });
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const [cashFlows, obligations, financingAccounts] = await Promise.all([
      prisma.cashFlowEntry.findMany({ where: { organizationId: org.id } }),
      prisma.businessObligation.findMany({ where: { organizationId: org.id } }),
      prisma.financingAccount.findMany({ where: { organizationId: org.id } }),
    ]);

    const allInstallments = [];
    for (const account of financingAccounts) {
      if (account.status !== 'ACTIVE') continue;
      const schedule = generateSchedule({
        principalCents: account.outstandingPrincipalCents,
        annualRate: account.annualInterestRate,
        startDate: account.startDate,
        maturityDate: account.maturityDate,
        frequency: account.paymentFrequency as never,
        repaymentMethod: account.repaymentMethod as never,
        feesCents: account.feesCents,
        gracePeriodMonths: account.gracePeriodMonths,
      });
      allInstallments.push(...schedule.map((entry) => ({ ...entry, account: account.name })));
    }

    const startDate = todayISO();
    const endDate = addMonths(startDate, 12);
    const projection = generateProjection({
      organizationId: org.id,
      scenarioId: 'base',
      periodType: org.defaultProjectionPeriod as never,
      startDate,
      endDate,
      openingCashCents: org.currentCashCents,
      minimumReserveCents: org.minimumCashReserveCents,
      cashFlows: cashFlows as never,
      obligations: obligations as never,
      financingSchedules: allInstallments as never,
      scenario: null,
    });

    const money = (cents: number) => (cents / 100).toFixed(2);

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" /></head>
<body>
<h2>${cell(org.name)} — CashShield report</h2>
<p>Generated ${cell(new Date().toISOString().slice(0, 10))} · Currency ${cell(org.baseCurrency)}</p>

<h3>Summary</h3>
<table border="1">
<tr><th>Opening cash</th><td>${money(org.currentCashCents)}</td><th>Minimum reserve</th><td>${money(org.minimumCashReserveCents)}</td></tr>
<tr><th>Minimum projected cash</th><td>${money(projection.summary.minimumCashCents)}</td><th>Pressured periods</th><td>${projection.summary.totalPressuredPeriods}</td></tr>
<tr><th>Largest shortfall</th><td>${money(projection.summary.largestShortfallCents)}</td><th>Debt service coverage</th><td>${projection.summary.debtServiceCoverageRatio == null ? 'n/a' : projection.summary.debtServiceCoverageRatio.toFixed(2)}</td></tr>
</table>

<h3>Cash-flow projection</h3>
<table border="1">
<tr><th>Period start</th><th>Period end</th><th>Opening</th><th>Inflows</th><th>Outflows</th><th>Financing</th><th>Closing</th><th>Reserve</th><th>Buffer</th><th>Shortfall</th></tr>
${projection.periods.map((p) => `<tr><td>${p.periodStart}</td><td>${p.periodEnd}</td><td>${money(p.openingCashCents)}</td><td>${money(p.inflowsCents)}</td><td>${money(p.totalOutflowsCents)}</td><td>${money(p.financingPaymentsCents)}</td><td>${money(p.closingCashCents)}</td><td>${money(p.minimumReserveCents)}</td><td>${money(p.liquidityBufferCents)}</td><td>${money(p.cashShortfallCents)}</td></tr>`).join('')}
</table>

<h3>Repayment schedule</h3>
<table border="1">
<tr><th>Account</th><th>#</th><th>Due date</th><th>Opening</th><th>Interest</th><th>Principal</th><th>Payment</th><th>Closing</th></tr>
${allInstallments.map((i) => `<tr><td>${cell(i.account)}</td><td>${i.number}</td><td>${i.dueDate}</td><td>${money(i.openingPrincipalCents)}</td><td>${money(i.interestCents)}</td><td>${money(i.principalRepaymentCents)}</td><td>${money(i.totalPaymentCents)}</td><td>${money(i.closingPrincipalCents)}</td></tr>`).join('')}
</table>

<h3>Obligations</h3>
<table border="1">
<tr><th>Name</th><th>Type</th><th>Due date</th><th>Amount</th><th>Status</th></tr>
${obligations.map((o) => `<tr><td>${cell(o.name)}</td><td>${cell(o.type)}</td><td>${o.dueDate}</td><td>${money(o.amountCents)}</td><td>${cell(o.status)}</td></tr>`).join('')}
</table>

<p>Planning estimates based on recorded data. Not financial advice.</p>
</body></html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="cashshield-report-${todayISO()}.xls"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: 'Excel export failed' }, { status: 500 });
  }
}
