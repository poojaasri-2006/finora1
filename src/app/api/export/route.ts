import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSchedule } from '@/domain/schedule';
import { generateProjection } from '@/domain/projection/engine';
import { addMonths, todayISO } from '@/domain/dates';
import { requireOrganization } from '@/lib/api';
import { GET as getDashboard } from '../dashboard/route';

export async function GET(request: Request) {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'projection';

    const org = await prisma.organization.findFirst({ where: { id: context.organizationId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let csv = '';

    if (type === 'schedule') {
      const accounts = await prisma.financingAccount.findMany({
        where: { organizationId: org.id, status: 'ACTIVE' },
      });

      csv = 'Account,Installment,Due Date,Opening Principal,Interest,Principal Repayment,Fees,Total Payment,Closing Principal\n';
      for (const account of accounts) {
        const schedule = generateSchedule({
          principalCents: account.outstandingPrincipalCents,
          annualRate: account.annualInterestRate,
          startDate: account.startDate,
          maturityDate: account.maturityDate,
          frequency: account.paymentFrequency as any,
          repaymentMethod: account.repaymentMethod as any,
          feesCents: account.feesCents,
          gracePeriodMonths: account.gracePeriodMonths,
        });
        for (const inst of schedule) {
          csv += `${account.name},${inst.number},${inst.dueDate},${inst.openingPrincipalCents},${inst.interestCents},${inst.principalRepaymentCents},${inst.feesCents},${inst.totalPaymentCents},${inst.closingPrincipalCents}\n`;
        }
      }
    } else if (type === 'projection') {
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
          frequency: account.paymentFrequency as any,
          repaymentMethod: account.repaymentMethod as any,
          feesCents: account.feesCents,
          gracePeriodMonths: account.gracePeriodMonths,
        });
        allInstallments.push(...schedule);
      }

      const startDate = todayISO();
      const endDate = addMonths(startDate, 12);

      const projection = generateProjection({
        organizationId: org.id,
        scenarioId: 'base',
        periodType: org.defaultProjectionPeriod as any,
        startDate,
        endDate,
        openingCashCents: org.currentCashCents,
        minimumReserveCents: org.minimumCashReserveCents,
        cashFlows: cashFlows as any,
        obligations: obligations as any,
        financingSchedules: allInstallments,
        scenario: null,
      });

      csv = 'Period Start,Period End,Opening Cash,Inflows,Outflows,Financing Payments,Closing Cash,Minimum Reserve,Liquidity Buffer,Shortfall,Pressured\n';
      for (const p of projection.periods) {
        csv += `${p.periodStart},${p.periodEnd},${p.openingCashCents},${p.inflowsCents},${p.totalOutflowsCents},${p.financingPaymentsCents},${p.closingCashCents},${p.minimumReserveCents},${p.liquidityBufferCents},${p.cashShortfallCents},${p.isPressured}\n`;
      }
    } else if (type === 'scenarios') {
      const scenarios = await prisma.scenario.findMany({
        where: { organizationId: org.id },
        include: { adjustments: true },
      });
      csv = 'Scenario,Type,Description,Adjustment,Value\n';
      for (const scenario of scenarios) {
        if (scenario.adjustments.length === 0) {
          csv += `"${scenario.name}","${scenario.type}","${scenario.description}",,\n`;
        }
        for (const adjustment of scenario.adjustments) {
          csv += `"${scenario.name}","${scenario.type}","${scenario.description}","${adjustment.type}",${adjustment.value}\n`;
        }
      }
    } else if (type === 'alerts') {
      const dashboardResponse = await getDashboard();
      if (!dashboardResponse.ok) return dashboardResponse;
      const dashboardData = await dashboardResponse.json();
      const alerts = dashboardData.alerts as { createdAt: string; severity: string; type: string; title: string; message: string }[];

      csv = 'Date,Severity,Type,Title,Message\n';
      for (const alert of alerts) {
        const date = new Date(alert.createdAt).toISOString().slice(0, 10);
        csv += `${date},${alert.severity},${alert.type},"${alert.title}","${alert.message}"\n`;
      }
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="cashshield-${type}-${todayISO()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
