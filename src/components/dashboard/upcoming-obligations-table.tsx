import type { BusinessObligation } from '@/domain/types';
import { formatMoney } from '@/domain/money';
import { formatDate } from '@/domain/dates';

interface UpcomingObligationsTableProps {
  obligations: BusinessObligation[];
  currency: string;
}

export function UpcomingObligationsTable({ obligations, currency }: UpcomingObligationsTableProps) {
  if (obligations.length === 0) {
    return <div className="text-slate-500 text-center py-4">No upcoming obligations</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="financial-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Due Date</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {obligations.map((ob) => (
            <tr key={ob.id}>
              <td className="font-medium text-slate-900">{ob.name}</td>
              <td>
                <span className="badge-neutral">{ob.type}</span>
              </td>
              <td className="text-slate-600">{formatDate(ob.dueDate)}</td>
              <td className="text-right font-medium text-slate-900">
                {formatMoney(ob.amountCents, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
