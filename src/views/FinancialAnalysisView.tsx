import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { AccountGroup, BusinessProfile, LedgerAccount } from '../types/nexora';
import { computeFinancialModel, RatioItem } from '../utils/financialEngine';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { saveLedgerAccount } from '../services/firestoreService';

export const FinancialAnalysisView: React.FC<{
  user: User;
  business: BusinessProfile;
  accounts: LedgerAccount[];
  model: ReturnType<typeof computeFinancialModel>;
  canWrite: boolean;
}> = ({ user, business, accounts, model, canWrite }) => {
  const [activeTab, setActiveTab] = useState<'pnl' | 'balance-sheet' | 'cash-flow' | 'ratios' | 'ledger'>('pnl');
  const [pnlPeriod, setPnlPeriod] = useState<'Annual' | 'Quarterly' | 'Monthly'>('Annual');
  const [ratioGroup, setRatioGroup] = useState<'All' | RatioItem['group']>('All');
  const [showAccForm, setShowAccForm] = useState(false);
  const [accForm, setAccForm] = useState<Omit<LedgerAccount, 'id' | 'businessId' | 'ownerId'>>({
    code: '',
    name: '',
    accountGroup: 'Current Asset',
    balance: 0,
    previousBalance: 0,
  });

  const cur = business.defaultCurrency;
  const { kpis, monthlySeries, ratios } = model;

  const quarterlyRows = [
    { q: 'Q1 (Apr–Jun)', months: ['Apr', 'May', 'Jun'] },
    { q: 'Q2 (Jul–Sep)', months: ['Jul', 'Aug', 'Sep'] },
    { q: 'Q3 (Oct–Dec)', months: ['Oct', 'Nov', 'Dec'] },
    { q: 'Q4 (Jan–Mar)', months: ['Jan', 'Feb', 'Mar'] },
  ].map((item) => {
    const sub = monthlySeries.filter((m) => item.months.includes(m.month));
    const rev = sub.reduce((s, m) => s + m.revenue, 0);
    const exp = sub.reduce((s, m) => s + m.expenses, 0);
    return { period: item.q, revenue: rev, expenses: exp, netProfit: rev - exp };
  });

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !accForm.code.trim() || !accForm.name.trim()) return;
    await saveLedgerAccount(business.id, business.ownerId, user, accForm);
    setShowAccForm(false);
    setAccForm({ code: '', name: '', accountGroup: 'Current Asset', balance: 0, previousBalance: 0 });
  };

  const groups: LedgerAccount['accountGroup'][] = [
    'Current Asset',
    'Non-Current Asset',
    'Current Liability',
    'Non-Current Liability',
    'Equity',
    'COGS',
    'Operating Expense',
    'Depreciation',
    'Interest',
    'Tax',
    'Investing Cash Flow',
    'Financing Cash Flow',
  ];

  const renderBsSection = (title: string, group: AccountGroup, total: number) => {
    const rows = accounts.filter((a) => a.accountGroup === group);
    return (
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide pt-2">{title}</div>
        {rows.map((a) => (
          <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
            <span className="text-slate-600">
              <span className="font-mono text-slate-400 mr-2">{a.code}</span>
              {a.name}
            </span>
            <span className="font-mono tabular-nums text-slate-900">{formatCurrency(a.balance, cur)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-900 pt-1">
          <span>Total {title}</span>
          <span className="font-mono tabular-nums">{formatCurrency(total, cur)}</span>
        </div>
      </div>
    );
  };

  const filteredRatios = ratioGroup === 'All' ? ratios : ratios.filter((r) => r.group === ratioGroup);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Financial Statements & Ratio Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured statements derived from classified ledger accounts and validated transactions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
          {[
            { id: 'pnl', label: 'Profit & Loss' },
            { id: 'balance-sheet', label: 'Balance Sheet' },
            { id: 'cash-flow', label: 'Cash Flow Statement' },
            { id: 'ratios', label: '15 Financial Ratios' },
            { id: 'ledger', label: 'Classified Accounts' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs whitespace-nowrap shrink-0 ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pnl' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Statement of Profit & Loss</h3>
              <p className="text-xs text-slate-500">
                {business.businessName} · {business.financialYear}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {(['Annual', 'Quarterly', 'Monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPnlPeriod(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-xs ${
                    pnlPeriod === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {pnlPeriod === 'Annual' && (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Line Item</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount ({cur})</th>
                  <th className="px-4 py-2.5 text-right font-medium">% of Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: 'Revenue from Operations', val: kpis.totalRevenue, bold: true },
                  { label: 'Less: Cost of Goods Sold (COGS)', val: -kpis.cogs },
                  { label: 'Gross Profit', val: kpis.grossProfit, bold: true },
                  { label: 'Less: Operating Expenses (SG&A, Payroll, Admin)', val: -kpis.operatingExpenses },
                  { label: 'EBITDA (Earnings Before Interest, Tax, Dep & Amort)', val: kpis.ebitda, bold: true },
                  { label: 'Less: Depreciation & Amortization', val: -kpis.depreciation },
                  { label: 'EBIT (Operating Profit)', val: kpis.operatingProfit, bold: true },
                  { label: 'Less: Interest & Finance Costs', val: -kpis.interestExpense },
                  { label: 'Profit Before Tax (PBT)', val: kpis.pbt, bold: true },
                  { label: 'Less: Tax Expense Provision', val: -kpis.taxExpense },
                  { label: 'Net Profit After Tax', val: kpis.netProfit, bold: true, highlight: true },
                ].map((row) => (
                  <tr key={row.label} className={row.highlight ? 'bg-slate-50' : ''}>
                    <td className={`px-4 py-2.5 ${row.bold ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {row.label}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                        row.bold ? 'font-semibold' : ''
                      } ${row.highlight ? (row.val >= 0 ? 'text-emerald-700' : 'text-red-700') : 'text-slate-900'}`}
                    >
                      {formatCurrency(row.val, cur)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500">
                      {kpis.totalRevenue > 0 ? formatPercent((row.val / kpis.totalRevenue) * 100) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pnlPeriod === 'Quarterly' && (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Quarter</th>
                  <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                  <th className="px-4 py-2.5 text-right font-medium">Operating & Direct Expenses</th>
                  <th className="px-4 py-2.5 text-right font-medium">Operating Surplus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quarterlyRows.map((q) => (
                  <tr key={q.period}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{q.period}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCurrency(q.revenue, cur)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCurrency(q.expenses, cur)}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono tabular-nums font-medium ${
                        q.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {formatCurrency(q.netProfit, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pnlPeriod === 'Monthly' && (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Month</th>
                  <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                  <th className="px-4 py-2.5 text-right font-medium">Expenses</th>
                  <th className="px-4 py-2.5 text-right font-medium">Net Monthly Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlySeries.map((m) => (
                  <tr key={m.month}>
                    <td className="px-4 py-2 font-mono text-slate-800">{m.month}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(m.revenue, cur)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCurrency(m.expenses, cur)}</td>
                    <td
                      className={`px-4 py-2 text-right font-mono tabular-nums font-medium ${
                        m.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {formatCurrency(m.netProfit, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'balance-sheet' && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-lg border flex items-center justify-between gap-4 ${
              kpis.isBalanceSheetBalanced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs">
              {kpis.isBalanceSheetBalanced ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              )}
              <div>
                <span className="font-semibold">
                  Accounting Equation Check (Assets = Liabilities + Equity):
                </span>{' '}
                {kpis.isBalanceSheetBalanced
                  ? `Balanced — Assets (${formatCurrency(kpis.totalAssets, cur)}) equal Liabilities + Equity (${formatCurrency(
                      kpis.totalLiabilities + kpis.totalEquity,
                      cur
                    )}).`
                  : `Out of Balance by ${formatCurrency(kpis.balanceSheetDiff, cur)}. Update classified ledger accounts to reconcile.`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold text-slate-900">Assets</h3>
                <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                  {formatCurrency(kpis.totalAssets, cur)}
                </span>
              </div>
              {renderBsSection('Current Assets', 'Current Asset', kpis.currentAssets)}
              {renderBsSection('Non-Current Assets', 'Non-Current Asset', kpis.nonCurrentAssets)}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>Total Assets</span>
                <span className="font-mono tabular-nums">{formatCurrency(kpis.totalAssets, cur)}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold text-slate-900">Liabilities & Shareholders’ Equity</h3>
                <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                  {formatCurrency(kpis.totalLiabilities + kpis.totalEquity, cur)}
                </span>
              </div>
              {renderBsSection('Current Liabilities', 'Current Liability', kpis.currentLiabilities)}
              {renderBsSection('Non-Current Liabilities', 'Non-Current Liability', kpis.nonCurrentLiabilities)}
              {renderBsSection("Shareholders' Equity", 'Equity', kpis.totalEquity)}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>Total Liabilities + Equity</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(kpis.totalLiabilities + kpis.totalEquity, cur)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cash-flow' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">Cash Flow Statement</h3>
            <p className="text-xs text-slate-500">
              Only realized Paid inflows and outflows are counted in Operating Cash Flow.
            </p>
          </div>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 text-slate-600">Cash Inflows from Realized Customer Receipts</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-emerald-700">
                  {formatCurrency(kpis.cashInflows, cur)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 text-slate-600">Cash Outflows for Paid Operating & Supplier Expenses</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-red-700">
                  -{formatCurrency(kpis.cashOutflows, cur)}
                </td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="py-2.5 px-2 text-slate-900">A. Cash Flow from Operating Activities</td>
                <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-900">
                  {formatCurrency(kpis.operatingCashFlow, cur)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 text-slate-600">B. Cash Flow from Investing Activities (Capex / Equipment)</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-slate-900">
                  {formatCurrency(kpis.investingCashFlow, cur)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 text-slate-600">C. Cash Flow from Financing Activities (Loans / Equity)</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-slate-900">
                  {formatCurrency(kpis.financingCashFlow, cur)}
                </td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="py-2.5 px-2 text-slate-900">Net Change in Cash (A + B + C)</td>
                <td
                  className={`py-2.5 px-2 text-right font-mono tabular-nums ${
                    kpis.netChangeInCash >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatCurrency(kpis.netChangeInCash, cur)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 text-slate-600">Opening Cash Balance</td>
                <td className="py-2.5 text-right font-mono tabular-nums">
                  {formatCurrency(kpis.openingCashBalance, cur)}
                </td>
              </tr>
              <tr className="font-semibold text-sm">
                <td className="py-3 text-slate-900">Closing Cash Balance</td>
                <td className="py-3 text-right font-mono tabular-nums text-blue-800">
                  {formatCurrency(kpis.closingCashBalance, cur)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ratios' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Liquidity', 'Profitability', 'Solvency', 'Efficiency'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setRatioGroup(g)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                  ratioGroup === g
                    ? 'bg-[#0B1B3B] text-white border-[#0B1B3B]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Category · Ratio</th>
                    <th className="px-4 py-3 font-medium">Formula</th>
                    <th className="px-4 py-3 font-medium text-right">Current</th>
                    <th className="px-4 py-3 font-medium text-right">Prior Period</th>
                    <th className="px-4 py-3 font-medium text-right">Change</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRatios.map((r) => {
                    const fmtVal = (v: number | null) =>
                      v === null ? 'N/A' : r.unit === '%' ? `${v.toFixed(1)}%` : `${v.toFixed(2)}x`;
                    const statusCls =
                      r.status === 'Healthy'
                        ? 'text-emerald-700'
                        : r.status === 'Critical'
                        ? 'text-red-700'
                        : r.status === 'Watch'
                        ? 'text-amber-700'
                        : 'text-slate-500';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{r.name}</div>
                          <div className="text-[11px] text-slate-500">{r.group}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{r.formula}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {fmtVal(r.value)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                          {fmtVal(r.previousValue)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                          {r.changePct === null ? '—' : `${r.changePct >= 0 ? '+' : ''}${r.changePct.toFixed(1)}%`}
                        </td>
                        <td className={`px-4 py-3 font-semibold ${statusCls}`}>{r.status}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs">{r.interpretation}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Classified Chart of Accounts</h3>
              <p className="text-xs text-slate-500">
                Basis for Balance Sheet, Depreciation, Interest, Tax, Investing & Financing Cash Flows.
              </p>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowAccForm(!showAccForm)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Ledger Account
              </button>
            )}
          </div>

          {showAccForm && (
            <form onSubmit={handleCreateAccount} className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-md border border-slate-200">
              <input
                required
                placeholder="Code (e.g. 1050)"
                value={accForm.code}
                onChange={(e) => setAccForm({ ...accForm, code: e.target.value })}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white font-mono"
              />
              <input
                required
                placeholder="Account Name"
                value={accForm.name}
                onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
              />
              <select
                value={accForm.accountGroup}
                onChange={(e) => setAccForm({ ...accForm, accountGroup: e.target.value as AccountGroup })}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <input
                type="number"
                required
                placeholder="Balance"
                value={accForm.balance}
                onChange={(e) => setAccForm({ ...accForm, balance: Number(e.target.value) })}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md"
              >
                Save Account
              </button>
            </form>
          )}

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Account Name</th>
                <th className="px-3 py-2 font-medium">Classification</th>
                <th className="px-3 py-2 font-medium text-right">Current Balance</th>
                <th className="px-3 py-2 font-medium text-right">Previous Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="px-3 py-2 font-mono text-slate-500">{acc.code}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{acc.name}</td>
                  <td className="px-3 py-2 text-slate-600">{acc.accountGroup}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(acc.balance, cur)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-500">
                    {formatCurrency(acc.previousBalance, cur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
