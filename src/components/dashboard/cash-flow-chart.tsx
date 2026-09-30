'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ProjectionResult } from '@/domain/types';
import { formatMoneyCompact } from '@/domain/money';
import { formatMonthYear } from '@/domain/dates';

interface CashFlowChartProps {
  projection: ProjectionResult;
  currency: string;
}

export function CashFlowChart({ projection, currency }: CashFlowChartProps) {
  const data = projection.periods.map((p) => ({
    period: formatMonthYear(p.periodStart),
    closingCash: p.closingCashCents / 100,
    inflows: p.inflowsCents / 100,
    outflows: p.totalOutflowsCents / 100,
    financingPayments: p.financingPaymentsCents / 100,
    minimumReserve: p.minimumReserveCents / 100,
    isPressured: p.isPressured,
  }));

  if (data.length === 0) {
    return <div className="text-slate-500 text-center py-8">No projection data available</div>;
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12 }}
            stroke="#64748b"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#64748b"
            tickFormatter={(value) => formatMoneyCompact(Math.round(value * 100), currency)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatMoneyCompact(Math.round(value * 100), currency),
              name,
            ]}
            labelStyle={{ color: '#0f172a' }}
          />
          <Legend />
          <ReferenceLine
            y={(projection.periods[0]?.minimumReserveCents ?? 0) / 100}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: 'Min Reserve', position: 'right', fill: '#ef4444', fontSize: 12 }}
          />
          <Bar dataKey="inflows" name="Inflows" fill="#22c55e" opacity={0.7} />
          <Bar dataKey="outflows" name="Outflows" fill="#f59e0b" opacity={0.7} />
          <Bar dataKey="financingPayments" name="Financing" fill="#ef4444" opacity={0.7} />
          <Line
            type="monotone"
            dataKey="closingCash"
            name="Closing Cash"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
