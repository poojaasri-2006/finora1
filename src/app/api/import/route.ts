import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseMoneyToCents } from '@/domain/money';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have a header row and at least one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      try {
        if (type === 'cash-flows') {
          const amountCents = parseMoneyToCents(row['amount'] || row['value'] || '');
          if (amountCents === null) {
            errors.push(`Row ${i + 1}: Invalid amount`);
            continue;
          }

          await prisma.cashFlowEntry.create({
            data: {
              organizationId: 'demo-org',
              name: row['name'] || row['description'] || 'Imported Entry',
              category: (row['category'] || 'OTHER_RECURRING').toUpperCase(),
              type: (row['type'] || 'OUTFLOW').toUpperCase() as any,
              amountCents,
              recurrence: (row['recurrence'] || 'ONE_TIME').toUpperCase() as any,
              startDate: row['date'] || row['start_date'] || new Date().toISOString().slice(0, 10),
              status: 'ACTUAL',
            },
          });
          successCount++;
        }
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Create audit event
    await prisma.auditEvent.create({
      data: {
        organizationId: 'demo-org',
        action: 'IMPORT',
        entityType: 'CashFlowEntry',
        entityId: 'batch',
        changes: JSON.stringify({ count: successCount, errors: errors.length }),
      },
    });

    return NextResponse.json({
      message: `Imported ${successCount} rows with ${errors.length} errors`,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
