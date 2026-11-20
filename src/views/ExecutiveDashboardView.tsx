import React from 'react';
import { AlertTriangle, ArrowUpRight, Info } from 'lucide-react';
import {
  BusinessProfile,
  DashboardFilters,
  NavModuleId,
} from '../types/nexora';
import { computeFinancialModel } from '../utils/financialEngine';
import { formatCompactCurrency, formatCurrency, formatPercent, FY_MONTHS } from '../utils/formatters';
import { DualBarChart, HorizontalBarBreakdown, TrendLineChart } from '../components/Charts';

interface Props {
  business: BusinessProfile;
  model: ReturnType<typeof computeFinancialModel>;
  filters: DashboardFilters;
  onFiltersChange: (next: DashboardFilters) => void;
  departments: string[];
  categories: string[];
  financialYears: string[];
  onNavigate: (module: NavModuleId) => void;
}

export const ExecutiveDashboardView: React.FC<Props> = ({
  business,
  model,
  filters,
  onFiltersChange,
  departments,
  categories,
  financialYears,
  onNavigate,
}) => {
  const { kpis, monthlySeries, revenueByCategory, expenseByDepartment, alerts } = model;
  const cur = business.defaultCurrency;

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: formatCompactCurrency(kpis.totalRevenue, cur),
      sub: `${formatCurrency(kpis.totalRevenue, cur)} · ${filters.basis} basis`,
      tone: 'neutral',
    },
    {
      label: 'Total Expenses',
      value: formatCompactCurrency(kpis.totalExpenses, cur),
      sub: `${formatCurrency(kpis.totalExpenses, cur)} · ${filters.basis} basis`,
      tone: 'neutral',
    },
    {
      label: 'Net Profit',
      value: formatCompactCurrency(kpis.netProfit, cur),
      sub: `Operating EBIT ${formatCompactCurrency(kpis.operatingProfit, cur)}`,
      tone: kpis.netProfit >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Profit Margin',
      value: formatPercent(kpis.profitMargin),
      sub: `Gross margin ${formatPercent(kpis.totalRevenue > 0 ? (kpis.grossProfit / kpis.totalRevenue) * 100 : null)}`,
      tone: (kpis.profitMargin ?? 0) >= 10 ? 'positive' : (kpis.profitMargin ?? 0) >= 0 ? 'warning' : 'negative',
    },
    {
      label: 'Cash Balance',
      value: formatCompactCurrency(kpis.cashBalance, cur),
      sub: `Net cash flow ${formatCompactCurrency(kpis.netChangeInCash, cur)}`,
      tone: kpis.cashBalance >= 200000 ? 'positive' : 'warning',
    },
    {
      label: 'Accounts Receivable',
      value: formatCompactCurrency(kpis.accountsReceivable, cur),
      sub: 'Unpaid customer invoices',
      tone: 'neutral',
    },
    {
      label: 'Accounts Payable',
      value: formatCompactCurrency(kpis.accountsPayable, cur),
      sub: 'Pending supplier obligations',
      tone: 'neutral',
    },
    {
      label: 'Total Assets',
      value: formatCompactCurrency(kpis.totalAssets, cur),
      sub: `Current ${formatCompactCurrency(kpis.currentAssets, cur)}`,
      tone: 'neutral',
    },
    {
      label: 'Total Liabilities',
      value: formatCompactCurrency(kpis.totalLiabilities, cur),
      sub: `Equity ${formatCompactCurrency(kpis.totalEquity, cur)}`,
      tone: 'neutral',
    },
    {
      label: 'Working Capital',
      value: formatCompactCurrency(kpis.workingCapital, cur),
      sub: 'Current Assets − Current Liabilities',
      tone: kpis.workingCapital >= 0 ? 'positive' : 'negative',
    },
  ];

  const activeMonths = monthlySeries.filter((m) => m.revenue > 0 || m.expenses > 0 || m.budgetRevenue > 0);
  const chartSeries = activeMonths.length > 0 ? monthlySeries : monthlySeries.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Executive Performance Overview</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {business.businessName} · {business.financialYear} · {business.defaultCurrency} · Dynamically computed from {model.filteredTx.length} transactions
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(['Accrual', 'Cash'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onFiltersChange({ ...filters, basis: b })}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  filters.basis === b
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {b} Basis
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
          <label className="block text-xs">
            <span className="text-slate-500 font-medium">Financial Year</span>
            <select
              value={filters.financialYear}
              onChange={(e) => onFiltersChange({ ...filters, financialYear: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Years</option>
              {financialYears.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs">
            <span className="text-slate-500 font-medium">Quarter</span>
            <select
              value={filters.quarter}
              onChange={(e) => onFiltersChange({ ...filters, quarter: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Quarters</option>
              <option value="Q1">Q1 (Apr–Jun)</option>
              <option value="Q2">Q2 (Jul–Sep)</option>
              <option value="Q3">Q3 (Oct–Dec)</option>
              <option value="Q4">Q4 (Jan–Mar)</option>
            </select>
          </label>

          <label className="block text-xs">
            <span className="text-slate-500 font-medium">Month</span>
            <select
              value={filters.month}
              onChange={(e) => onFiltersChange({ ...filters, month: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Months</option>
              {FY_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs">
            <span className="text-slate-500 font-medium">Department / Unit</span>
            <select
              value={filters.department}
              onChange={(e) => onFiltersChange({ ...filters, department: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs">
            <span className="text-slate-500 font-medium">Category</span>
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* 10 Executive KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const valColor =
            card.tone === 'positive'
              ? 'text-emerald-700'
              : card.tone === 'negative'
              ? 'text-red-700'
              : card.tone === 'warning'
              ? 'text-amber-700'
              : 'text-slate-900';
          return (
            <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500">{card.label}</div>
              <div className={`text-xl font-semibold font-mono tabular-nums mt-1.5 ${valColor}`}>
                {card.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate" title={card.sub}>
                {card.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Monthly Revenue vs Expenses</h3>
              <p className="text-xs text-slate-500">April to March Indian Financial Year</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('financial-management')}
              className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              View Ledger <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <DualBarChart
            data={chartSeries.map((m) => ({
              label: m.month,
              primary: m.revenue,
              secondary: m.expenses,
            }))}
            primaryLabel="Revenue"
            secondaryLabel="Expenses"
            primaryColor="#1d4ed8"
            secondaryColor="#64748b"
            currency={cur}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Monthly Profit & Cash Flow Trends</h3>
              <p className="text-xs text-slate-500">Operating Profit vs Realized Net Cash Flow</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('cash-flow')}
              className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              Cash Analysis <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <TrendLineChart
            data={chartSeries.map((m) => ({
              label: m.month,
              value: m.netProfit,
              secondaryValue: m.netCashFlow,
            }))}
            label="Net Operating Profit"
            secondaryLabel="Net Cash Flow"
            strokeColor="#16a34a"
            secondaryColor="#1d4ed8"
            currency={cur}
          />
        </div>
      </div>

      {/* Category & Department Breakdown + Budget vs Actual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Revenue by Category</h3>
          <p className="text-xs text-slate-500 mb-4">Income distribution across streams</p>
          <HorizontalBarBreakdown items={revenueByCategory} color="#1d4ed8" currency={cur} />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Expense by Department</h3>
          <p className="text-xs text-slate-500 mb-4">Cost allocation across business units</p>
          <HorizontalBarBreakdown items={expenseByDepartment} color="#0f172a" currency={cur} />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Financial Alerts & Signals</h3>
              <p className="text-xs text-slate-500">Automated threshold monitoring</p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">{alerts.length} active</span>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-emerald-700 py-6">
              All monitored financial thresholds and liquidity buffers are nominal.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {alert.severity === 'Info' ? (
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          alert.severity === 'Critical' ? 'text-red-600' : 'text-amber-600'
                        }`}
                      />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{alert.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{alert.detail}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(alert.module as NavModuleId)}
                    className="text-[11px] font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                  >
                    Inspect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Budget vs Actual Quick View */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Budget vs Actual Performance (Monthly Revenue)</h3>
            <p className="text-xs text-slate-500">Target revenue compared against realized figures</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('budget-forecasting')}
            className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            Manage Budgets <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <DualBarChart
          data={chartSeries.map((m) => ({
            label: m.month,
            primary: m.revenue,
            secondary: m.budgetRevenue,
          }))}
          primaryLabel="Actual Revenue"
          secondaryLabel="Budget Target"
          primaryColor="#16a34a"
          secondaryColor="#94a3b8"
          currency={cur}
          height={180}
        />
      </div>
    </div>
  );
};
