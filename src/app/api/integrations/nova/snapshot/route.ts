import { NextResponse } from 'next/server';
import { requireOrganization, checkRole, ROLE_PERMISSIONS } from '@/lib/api';
import { novaListAll, NovaApiError } from '@/lib/nova';
import { buildNovaSnapshot, type NovaSnapshotInput } from '@/domain/nova/snapshot';

export async function GET() {
  const context = await requireOrganization();
  if (context instanceof NextResponse) return context;
  if (!checkRole(context.role, ROLE_PERMISSIONS.MANAGE_SETTINGS)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // A server key reads one team's books. Bind it explicitly if this deployment
  // hosts multiple organizations so no other organization can read that data.
  const boundOrganizationId = process.env.NOVA_ORGANIZATION_ID?.trim();
  if (boundOrganizationId && boundOrganizationId !== context.organizationId) {
    return NextResponse.json({ error: 'Nova is not linked to this organization' }, { status: 403 });
  }
  if (!process.env.NOVA_API_KEY?.trim()) {
    return NextResponse.json({ error: 'NOVA_API_KEY is not configured' }, { status: 503 });
  }
  try {
    // Single-team deployment: any owner/admin may read this team's Nova books.
    // In a multi-tenant deployment set NOVA_ORGANIZATION_ID to bind the key to one organization.
    // Five resources in parallel stays well under Nova's 120 req/min key limit.
    const [invoices, purchaseBills, loanSchedules, payrollRuns, statutoryDues] = await Promise.all([
      novaListAll('invoices'),
      novaListAll('purchase-bills'),
      novaListAll('loan-schedules'),
      novaListAll('payroll-runs'),
      novaListAll('statutory-dues'),
    ]) as [NovaSnapshotInput['invoices'], NovaSnapshotInput['purchaseBills'], NovaSnapshotInput['loanSchedules'], NovaSnapshotInput['payrollRuns'], NovaSnapshotInput['statutoryDues']];
    const input: NovaSnapshotInput = { invoices, purchaseBills, loanSchedules, payrollRuns, statutoryDues };
    return NextResponse.json(buildNovaSnapshot(input), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof NovaApiError) {
      if (error.requestId) console.error('Nova request failed', { code: error.code, requestId: error.requestId });
      return NextResponse.json({ error: error.code === 'missing_key' ? 'NOVA_API_KEY is not configured' : `Nova request failed (${error.code})` }, { status: error.code === 'missing_key' ? 503 : 502 });
    }
    console.error('Nova snapshot failed', error);
    return NextResponse.json({ error: 'Could not build Nova planning snapshot' }, { status: 502 });
  }
}
