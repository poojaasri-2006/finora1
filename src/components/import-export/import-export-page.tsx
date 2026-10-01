'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast-provider';

export function ImportExportPage() {
  const { addToast } = useToast();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'cash-flows');

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setImportResult({
        success: res.ok,
        message: data.message || data.error || 'Import completed',
      });
      if (res.ok) {
        addToast('success', 'Import completed', data.message);
      } else {
        addToast('error', 'Import failed', data.error);
      }
    } catch (error) {
      setImportResult({ success: false, message: 'Import failed' });
      addToast('error', 'Import failed', 'An error occurred during import');
    } finally {
      setImporting(false);
    }
  }

  async function handleExport(type: string) {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?type=${type}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cashshield-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Export completed', `Exported ${type} data`);
    } catch (error) {
      addToast('error', 'Export failed', 'An error occurred during export');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import / Export</h1>
        <p className="text-slate-500 mt-1">Import CSV data or export financial reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Import CSV</h2>
          <p className="text-sm text-slate-500 mb-4">
            Import cash flow entries from a CSV file with name, amount, category, type, recurrence and date columns.
          </p>
          <div className="space-y-4">
            <div>
              <label className="form-label">CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                disabled={importing}
                className="form-input"
              />
            </div>
            {importing && <p className="text-sm text-slate-500">Importing...</p>}
            {importResult && (
              <div className={`p-3 rounded-md ${importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {importResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Export */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Export CSV</h2>
          <p className="text-sm text-slate-500 mb-4">
            Export repayment schedules, cash-flow projections, scenario comparisons, or alert reports.
          </p>
          <div className="space-y-2">
            <button onClick={() => handleExport('schedule')} disabled={exporting} className="btn-secondary w-full justify-start">
              Repayment Schedule
            </button>
            <button onClick={() => handleExport('projection')} disabled={exporting} className="btn-secondary w-full justify-start">
              Cash-Flow Projection
            </button>
            <button onClick={() => handleExport('scenarios')} disabled={exporting} className="btn-secondary w-full justify-start">
              Scenario Comparison
            </button>
            <button onClick={() => handleExport('alerts')} disabled={exporting} className="btn-secondary w-full justify-start">
              Alert Report
            </button>
          </div>
        </div>
      </div>

      {/* Integration status */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Integration Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <p className="font-medium text-slate-900">Bank API</p>
              <p className="text-xs text-slate-500">Direct bank connection for automatic transaction sync</p>
            </div>
            <span className="badge-warning">Not Configured</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <p className="font-medium text-slate-900">Accounting Software</p>
              <p className="text-xs text-slate-500">QuickBooks, Xero, or other accounting system integration</p>
            </div>
            <span className="badge-warning">Not Configured</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-slate-900">CSV Import/Export</p>
              <p className="text-xs text-slate-500">Manual data import and export via CSV files</p>
            </div>
            <span className="badge-safe">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
