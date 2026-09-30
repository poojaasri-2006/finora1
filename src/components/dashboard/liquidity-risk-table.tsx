import type { ProjectionResult } from '@/domain/types';
import { formatMoney } from '@/domain/money';
import { formatDate } from '@/domain/dates';

interface LiquidityRiskTableProps {
  projection: ProjectionResult;
  currency: string;
}

export function LiquidityRiskTable({ projection, currency }: LiquidityRiskTableProps) {
  const pressuredPeriods = projection.periods.filter((p) => p.isPressured);

  if (pressuredPeriods.length === 0) {
    return (
      <div className="text-center py-4">
        <span className="badge-safe">✓ All periods are above minimum reserve</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="financial-table">
        <thead>
          <tr>
            <th>Period</th>
            <th className="text-right">Closing Cash</th>
            <th className="text-right">Shortfall</th>
            <th className="text-right">Buffer</th>
          </tr>
        </thead>
        <tbody>
          {pressuredPeriods.map((p) => (
            <tr key={p.periodStart}>
              <td className="font-medium text-slate-900">{formatDate(p.periodStart)}</td>
              <td className="text-right text-critical-600 font-medium">
                {formatMoney(p.closingCashCents, currency)}
              </td>
              <td className="text-right text-critical-600 font-medium">
                {formatMoney(p.cashShortfallCents, currency)}
              </td>
              <td className="text-right text-critical-600">
                {formatMoney(p.liquidityBufferCents, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
