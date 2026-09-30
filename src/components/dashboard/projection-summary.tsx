import type { ProjectionResult } from '@/domain/types';
import { formatMoney } from '@/domain/money';
import { formatDate } from '@/domain/dates';

interface ProjectionSummaryProps {
  projection: ProjectionResult;
  currency: string;
}

export function ProjectionSummary({ projection, currency }: ProjectionSummaryProps) {
  const { summary } = projection;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Projection Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-slate-500">Minimum Cash</p>
          <p className="text-lg font-bold text-slate-900">{formatMoney(summary.minimumCashCents, currency)}</p>
          {summary.minimumCashDate && (
            <p className="text-xs text-slate-500">on {formatDate(summary.minimumCashDate)}</p>
          )}
        </div>
        <div>
          <p className="text-sm text-slate-500">Largest Shortfall</p>
          <p className="text-lg font-bold text-critical-600">{formatMoney(summary.largestShortfallCents, currency)}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Total Debt Service</p>
          <p className="text-lg font-bold text-slate-900">{formatMoney(summary.totalDebtServiceCents, currency)}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">DSCR</p>
          <p className="text-lg font-bold text-slate-900">
            {summary.debtServiceCoverageRatio !== null
              ? `${summary.debtServiceCoverageRatio.toFixed(2)}x`
              : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
