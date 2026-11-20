import React, { useState } from 'react';
import { Download, Printer, Sparkles, Terminal } from 'lucide-react';
import {
  AIInsightRecord,
  BusinessProfile,
  LedgerAccount,
  RiskRecord,
  TransactionRecord,
} from '../types/nexora';
import { computeFinancialModel } from '../utils/financialEngine';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { exportSheetToExcel } from '../utils/exportUtils';
import { saveAIInsightsBatch } from '../services/firestoreService';

const REPORT_TYPES = [
  'Profit and Loss Statement',
  'Balance Sheet',
  'Cash Flow Statement',
  'Financial Ratio Report',
  'Monthly Financial Report',
  'Quarterly Business Report',
  'Annual Business Report',
  'Budget vs Actual Report',
  'Profitability Report',
  'Working Capital Report',
  'Risk Analysis Report',
  'Executive Management Summary',
] as const;

type ReportType = (typeof REPORT_TYPES)[number];

export const ReportsView: React.FC<{
  business: BusinessProfile;
  model: ReturnType<typeof computeFinancialModel>;
  accounts: LedgerAccount[];
  risks: RiskRecord[];
}> = ({ business, model, accounts, risks }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('Executive Management Summary');
  const [aiObservations, setAiObservations] = useState<string[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const cur = business.defaultCurrency;
  const { kpis, monthlySeries, ratios, budgetComparison, productProfitability } = model;
  const todayStr = new Date().toISOString().slice(0, 10);

  const buildReportRows = (): Record<string, string | number>[] => {
    switch (selectedReport) {
      case 'Profit and Loss Statement':
      case 'Annual Business Report':
        return [
          { LineItem: 'Revenue from Operations', Amount: kpis.totalRevenue },
          { LineItem: 'Cost of Goods Sold (COGS)', Amount: -kpis.cogs },
          { LineItem: 'Gross Profit', Amount: kpis.grossProfit },
          { LineItem: 'Operating Expenses', Amount: -kpis.operatingExpenses },
          { LineItem: 'EBITDA', Amount: kpis.ebitda },
          { LineItem: 'Depreciation', Amount: -kpis.depreciation },
          { LineItem: 'EBIT', Amount: kpis.operatingProfit },
          { LineItem: 'Interest Expense', Amount: -kpis.interestExpense },
          { LineItem: 'Profit Before Tax', Amount: kpis.pbt },
          { LineItem: 'Tax Expense', Amount: -kpis.taxExpense },
          { LineItem: 'Net Profit After Tax', Amount: kpis.netProfit },
        ];
      case 'Balance Sheet':
        return accounts
          .filter((a) =>
            ['Current Asset', 'Non-Current Asset', 'Current Liability', 'Non-Current Liability', 'Equity'].includes(
              a.accountGroup
            )
          )
          .map((a) => ({
            Code: a.code,
            Account: a.name,
            Group: a.accountGroup,
            CurrentBalance: a.balance,
            PriorBalance: a.previousBalance,
          }));
      case 'Cash Flow Statement':
        return [
          { Section: 'Operating Cash Flow', Amount: kpis.operatingCashFlow },
          { Section: 'Investing Cash Flow', Amount: kpis.investingCashFlow },
          { Section: 'Financing Cash Flow', Amount: kpis.financingCashFlow },
          { Section: 'Net Change in Cash', Amount: kpis.netChangeInCash },
          { Section: 'Opening Cash Balance', Amount: kpis.openingCashBalance },
          { Section: 'Closing Cash Balance', Amount: kpis.closingCashBalance },
        ];
      case 'Financial Ratio Report':
        return ratios.map((r) => ({
          Group: r.group,
          Ratio: r.name,
          Formula: r.formula,
          Value: r.value !== null ? Number(r.value.toFixed(2)) : 'N/A',
          Status: r.status,
          Interpretation: r.interpretation,
        }));
      case 'Monthly Financial Report':
        return monthlySeries.map((m) => ({
          Month: m.month,
          Revenue: m.revenue,
          Expenses: m.expenses,
          NetProfit: m.netProfit,
          CashInflow: m.cashInflow,
          CashOutflow: m.cashOutflow,
        }));
      case 'Quarterly Business Report':
        return [
          { Quarter: 'Q1 (Apr–Jun)', months: ['Apr', 'May', 'Jun'] },
          { Quarter: 'Q2 (Jul–Sep)', months: ['Jul', 'Aug', 'Sep'] },
          { Quarter: 'Q3 (Oct–Dec)', months: ['Oct', 'Nov', 'Dec'] },
          { Quarter: 'Q4 (Jan–Mar)', months: ['Jan', 'Feb', 'Mar'] },
        ].map((q) => {
          const rows = monthlySeries.filter((m) => q.months.includes(m.month));
          const rev = rows.reduce((s, r) => s + r.revenue, 0);
          const exp = rows.reduce((s, r) => s + r.expenses, 0);
          return { Quarter: q.Quarter, Revenue: rev, Expenses: exp, NetSurplus: rev - exp };
        });
      case 'Budget vs Actual Report':
        return budgetComparison.map((b) => ({
          Month: b.month,
          Type: b.budgetType,
          Department: b.department,
          Target: b.targetAmount,
          Actual: b.actualAmount,
          Variance: b.variance,
          Status: b.favorable ? 'Favorable' : 'Unfavorable',
        }));
      case 'Profitability Report':
        return productProfitability.map((p) => ({
          Segment: p.name,
          Revenue: p.revenue,
          DirectCost: p.expense,
          Contribution: p.profit,
          MarginPct: p.margin !== null ? Number(p.margin.toFixed(1)) : 'N/A',
        }));
      case 'Working Capital Report':
        return [
          { Metric: 'Current Assets', Value: kpis.currentAssets },
          { Metric: 'Current Liabilities', Value: kpis.currentLiabilities },
          { Metric: 'Net Working Capital', Value: kpis.workingCapital },
          { Metric: 'Accounts Receivable', Value: kpis.accountsReceivable },
          { Metric: 'Accounts Payable', Value: kpis.accountsPayable },
          { Metric: 'Inventory Value', Value: kpis.inventoryValue },
          { Metric: 'Receivable Days (DSO)', Value: kpis.receivableDays !== null ? Math.round(kpis.receivableDays) : 'N/A' },
          { Metric: 'Payable Days (DPO)', Value: kpis.payableDays !== null ? Math.round(kpis.payableDays) : 'N/A' },
        ];
      case 'Risk Analysis Report':
        return risks.map((r) => ({
          Category: r.category,
          Description: r.description,
          Score: r.riskScore,
          Level: r.riskLevel,
          Exposure: r.financialImpact,
          Status: r.status,
        }));
      default:
        return [
          { Indicator: 'Total Revenue', Value: kpis.totalRevenue },
          { Indicator: 'Total Expenses', Value: kpis.totalExpenses },
          { Indicator: 'Net Profit', Value: kpis.netProfit },
          { Indicator: 'Closing Cash Balance', Value: kpis.closingCashBalance },
          { Indicator: 'Working Capital', Value: kpis.workingCapital },
          { Indicator: 'Accounts Receivable', Value: kpis.accountsReceivable },
          { Indicator: 'Accounts Payable', Value: kpis.accountsPayable },
        ];
    }
  };

  const rows = buildReportRows();
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const handleExportExcel = () => {
    exportSheetToExcel(`${business.businessName.replace(/\s+/g, '_')}_${selectedReport.replace(/\s+/g, '_')}.xlsx`, [
      {
        name: 'Report Summary',
        rows: [
          {
            Business: business.businessName,
            Report: selectedReport,
            FinancialYear: business.financialYear,
            Currency: cur,
            GeneratedDate: todayStr,
          },
        ],
      },
      { name: 'Report Data', rows },
    ]);
  };

  const handleGenerateObservations = async () => {
    setLoadingNotes(true);
    setNotesError(null);
    try {
      const resp = await fetch('/api/ai/report-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportTitle: selectedReport,
          businessName: business.businessName,
          period: business.financialYear,
          summaryData: rows.slice(0, 12),
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || 'Failed to generate AI observations.');
      }
      setAiObservations(json.observations || []);
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'Unable to generate report summary.');
    } finally {
      setLoadingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Management Reports & Statements Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate board-ready statements and export to Excel (.xlsx) or formatted PDF (Print).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedReport}
            onChange={(e) => {
              setSelectedReport(e.target.value as ReportType);
              setAiObservations([]);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-md bg-white font-medium"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleGenerateObservations}
            disabled={loadingNotes}
            className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> {loadingNotes ? 'Drafting...' : 'AI Observations'}
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-medium text-white bg-[#0B1B3B] rounded-md hover:bg-[#132954] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
        </div>
      </div>

      {notesError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-800 no-print">
          {notesError}
        </div>
      )}

      {/* Printable Report Sheet */}
      <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-[#0B1B3B] text-white flex items-center justify-center font-display font-bold text-sm">
              {business.logoText || business.businessName.slice(0, 3).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{business.businessName}</h3>
              <p className="text-xs text-slate-500">
                {business.gstin ? `GSTIN: ${business.gstin} · ` : ''}
                {business.city || 'India'} · Reporting Currency: {cur}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-semibold text-slate-900 text-sm">{selectedReport}</div>
            <div className="text-slate-500 font-mono mt-0.5">
              Period: {business.financialYear} · Generated: {todayStr}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-b border-slate-100 text-xs">
          <div>
            <span className="text-slate-500">Total Revenue</span>
            <div className="font-mono font-semibold text-slate-900 mt-0.5">{formatCurrency(kpis.totalRevenue, cur)}</div>
          </div>
          <div>
            <span className="text-slate-500">Net Profit</span>
            <div className="font-mono font-semibold text-emerald-700 mt-0.5">{formatCurrency(kpis.netProfit, cur)}</div>
          </div>
          <div>
            <span className="text-slate-500">Net Margin</span>
            <div className="font-mono font-semibold text-slate-900 mt-0.5">{formatPercent(kpis.profitMargin)}</div>
          </div>
          <div>
            <span className="text-slate-500">Closing Cash</span>
            <div className="font-mono font-semibold text-blue-800 mt-0.5">{formatCurrency(kpis.closingCashBalance, cur)}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2.5 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => {
                    const val = row[col];
                    const isNum = typeof val === 'number';
                    return (
                      <td
                        key={col}
                        className={`px-3 py-2 ${isNum ? 'font-mono tabular-nums text-slate-900' : 'text-slate-700'}`}
                      >
                        {isNum && !col.toLowerCase().includes('pct') && !col.toLowerCase().includes('score') && !col.toLowerCase().includes('days')
                          ? formatCurrency(val, cur)
                          : String(val ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-900 mb-2">Important Observations</h4>
          {aiObservations.length > 0 ? (
            <div className="space-y-1.5 text-xs text-slate-700">
              <p className="text-[11px] text-slate-500 italic">
                AI-generated executive interpretations based on verified report totals (not audited financial advice):
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {aiObservations.map((obs, i) => (
                  <li key={i}>{obs}</li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              {model.ruleBasedInsights.map((ins, i) => (
                <li key={i}>
                  <span className="font-medium text-slate-800">{ins.relatedMetric}:</span> {ins.observation}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export const AIInsightsView: React.FC<{
  business: BusinessProfile;
  model: ReturnType<typeof computeFinancialModel>;
  savedInsights: AIInsightRecord[];
  transactions: TransactionRecord[];
  canWrite: boolean;
}> = ({ business, model, savedInsights, transactions, canWrite }) => {
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sqlQuestion, setSqlQuestion] = useState('Show total expenses by department sorted highest to lowest');
  const [sqlResult, setSqlResult] = useState<{
    sql: string;
    explanation: string;
    targetTable: string;
    intentFilter?: { type?: string; paymentStatus?: string; groupBy?: string };
  } | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const cur = business.defaultCurrency;

  const handleGenerateAI = async () => {
    setGenerating(true);
    setAiError(null);
    try {
      const snapshot = {
        totalRevenueAccrual: model.kpis.accrualRevenue,
        cashInflowsPaid: model.kpis.cashInflows,
        totalExpensesAccrual: model.kpis.accrualExpenses,
        netProfit: model.kpis.netProfit,
        profitMarginPct: model.kpis.profitMargin,
        closingCashBalance: model.kpis.closingCashBalance,
        accountsReceivable: model.kpis.accountsReceivable,
        accountsPayable: model.kpis.accountsPayable,
        workingCapital: model.kpis.workingCapital,
        topExpenseDepartments: model.expenseByDepartment.slice(0, 4),
        topRevenueCategories: model.revenueByCategory.slice(0, 4),
        highPriorityRisks: model.kpis.highPriorityRiskCount,
      };
      const resp = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: business.businessName,
          currency: cur,
          financialYear: business.financialYear,
          snapshot,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || 'AI generation failed.');
      }
      const items = (json.insights || []) as Array<
        Omit<AIInsightRecord, 'id' | 'businessId' | 'ownerId' | 'source' | 'status'>
      >;
      if (canWrite && items.length > 0) {
        await saveAIInsightsBatch(
          business.id,
          business.ownerId,
          items.map((item) => ({
            analyticsType: item.analyticsType,
            relatedMetric: item.relatedMetric,
            observation: item.observation,
            explanation: item.explanation,
            suggestedAction: item.suggestedAction,
            confidenceLevel: item.confidenceLevel || 'Moderate',
            source: 'AI-Generated',
            status: 'New',
          }))
        );
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate AI insights.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSql = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sqlQuestion.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    try {
      const resp = await fetch('/api/ai/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: sqlQuestion,
          businessName: business.businessName,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || 'SQL generation failed.');
      }
      setSqlResult(json);
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : 'Unable to translate query.');
    } finally {
      setSqlLoading(false);
    }
  };

  // Live preview rows matching SQL intent
  const sqlPreviewRows = (() => {
    if (!sqlResult) return [];
    let list = [...transactions];
    if (sqlResult.intentFilter?.type === 'Income' || sqlResult.intentFilter?.type === 'Expense') {
      list = list.filter((t) => t.type === sqlResult.intentFilter?.type);
    }
    if (sqlResult.intentFilter?.paymentStatus) {
      list = list.filter((t) => t.paymentStatus === sqlResult.intentFilter?.paymentStatus);
    }
    const gb = sqlResult.intentFilter?.groupBy;
    if (gb === 'department' || gb === 'category' || gb === 'partyName') {
      const map = new Map<string, number>();
      list.forEach((t) => {
        const key = t[gb] || 'Other';
        map.set(key, (map.get(key) ?? 0) + t.amount);
      });
      return Array.from(map.entries())
        .map(([group, total]) => ({ Group: group, TotalAmount: total }))
        .sort((a, b) => b.TotalAmount - a.TotalAmount);
    }
    return list.slice(0, 8).map((t) => ({
      Date: t.date,
      Type: t.type,
      Party: t.partyName,
      Department: t.department,
      Amount: t.amount,
      Status: t.paymentStatus,
    }));
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">AI Insights & Natural-Language SQL Studio</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Distinguishes calculated rule-based diagnostics from server-side AI interpretations and recommendations.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateAI}
          disabled={generating}
          className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {generating ? 'Analyzing Ledger...' : 'Generate AI Insights (4 Pillars)'}
        </button>
      </div>

      {aiError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3.5 text-xs text-red-800">
          {aiError}
        </div>
      )}

      {/* AI-Generated Saved Insights */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          AI-Generated Interpretations & Prescriptive Recommendations
        </h3>
        {savedInsights.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6 text-xs text-slate-500">
            No AI insights saved for this business yet. Click “Generate AI Insights (4 Pillars)” above to run Descriptive, Diagnostic, Predictive, and Prescriptive analysis over your live figures.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedInsights.slice(0, 8).map((ins) => (
              <div key={ins.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-800">{ins.analyticsType} Analytics</span>
                  <span className="text-slate-500">
                    {ins.source} · Confidence: {ins.confidenceLevel}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900">{ins.relatedMetric}</div>
                <p className="text-xs text-slate-700">{ins.observation}</p>
                <p className="text-xs text-slate-500">{ins.explanation}</p>
                <div className="pt-2 border-t border-slate-100 text-xs text-emerald-800 font-medium">
                  Suggested Action: {ins.suggestedAction}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deterministic Rule-Based Insights */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Calculated Rule-Based Observations (Deterministic Baseline)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {model.ruleBasedInsights.map((r, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-500">
                {r.analyticsType} · {r.source}
              </div>
              <div className="text-xs font-semibold text-slate-900">{r.relatedMetric}</div>
              <p className="text-xs text-slate-700">{r.observation}</p>
              <p className="text-[11px] text-slate-500">{r.suggestedAction}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Natural Language to SQL Studio */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-700" />
          <h3 className="text-sm font-semibold text-slate-900">Natural-Language SQL Query Generator</h3>
        </div>
        <form onSubmit={handleGenerateSql} className="flex flex-wrap gap-2">
          <input
            value={sqlQuestion}
            onChange={(e) => setSqlQuestion(e.target.value)}
            placeholder="Ask a question about transactions, departments, receivables, or budgets..."
            className="flex-1 min-w-[260px] px-3 py-2 text-xs border border-slate-200 rounded-md"
          />
          <button
            type="submit"
            disabled={sqlLoading}
            className="px-4 py-2 text-xs font-medium text-white bg-[#0B1B3B] rounded-md hover:bg-[#132954] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {sqlLoading ? 'Generating SQL...' : 'Generate SQL'}
          </button>
        </form>

        {sqlError && <div className="text-xs text-red-700">{sqlError}</div>}

        {sqlResult && (
          <div className="space-y-4 pt-2">
            <pre className="p-4 rounded-md bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto">
              {sqlResult.sql}
            </pre>
            <p className="text-xs text-slate-600">{sqlResult.explanation}</p>
            {sqlPreviewRows.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      {Object.keys(sqlPreviewRows[0]).map((k) => (
                        <th key={k} className="px-3 py-2 font-medium">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sqlPreviewRows.map((row, idx) => (
                      <tr key={idx}>
                        {Object.entries(row).map(([k, v]) => (
                          <td key={k} className="px-3 py-2 font-mono tabular-nums">
                            {typeof v === 'number' ? formatCurrency(v, cur) : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
