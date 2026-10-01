import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganization, ROLE_PERMISSIONS, checkRole } from '@/lib/api';
import { z } from 'zod';

const createScenarioSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(['MILD_DOWNSIDE', 'SEVERE_DOWNSIDE', 'CUSTOM']),
  description: z.string().max(500).default(''),
  revenueDeclinePercent: z.number().min(0).max(100),
  expenseIncreasePercent: z.number().min(0).max(100),
});

export async function GET() {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;

    const { organizationId } = context;

    const scenarios = await prisma.scenario.findMany({
      where: { organizationId },
      include: { adjustments: true },
    });

    return NextResponse.json({ scenarios });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireOrganization();
    if (context instanceof NextResponse) return context;
    if (!checkRole(context.role, ROLE_PERMISSIONS.CREATE_RECORDS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const parsed = createScenarioSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid scenario', details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, type, description, revenueDeclinePercent, expenseIncreasePercent } = parsed.data;
    const adjustments = [
      ...(revenueDeclinePercent > 0 ? [{ type: 'REVENUE_DECLINE', value: revenueDeclinePercent / 100, isPercentage: true, description: 'Revenue decline' }] : []),
      ...(expenseIncreasePercent > 0 ? [{ type: 'EXPENSE_INCREASE', value: expenseIncreasePercent / 100, isPercentage: true, description: 'Expense increase' }] : []),
    ];
    const scenario = await prisma.scenario.create({
      data: {
        organizationId: context.organizationId, name, type, description,
        adjustments: { create: adjustments },
      },
      include: { adjustments: true },
    });
    return NextResponse.json({ scenario }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
  }
}
