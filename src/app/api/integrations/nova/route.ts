import { NextResponse } from 'next/server';
import { requireOrganization } from '@/lib/api';
import { checkNovaConnection } from '@/lib/nova';

export async function GET() {
  const context = await requireOrganization();
  if (context instanceof NextResponse) return context;

  const status = await checkNovaConnection();
  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
