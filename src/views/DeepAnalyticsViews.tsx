import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { BusinessProfile } from '../types/nexora';
import { computeFinancialModel } from '../utils/financialEngine';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../utils/formatters';
import { DualBarChart, HorizontalBarBreakdown, TrendLineChart } from '../components/Charts';

export const CashFlowAnalysisView: React.FC<{
  business: BusinessProfile;
  model: ReturnType<typeof computeFinancialModel>;
}> = ({ business, model }) => {
  const { kpis, monthlySeries, alerts } = model;
  const cur = business.defaultCurrency;
  const cfAlerts = alerts.filter((a) => a.module === 'cash-flow' || a.module === 'customers');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900">Cash Flow, Burn Rate & Runway Analysis</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Realized cash inflows/outflows (excludes unpaid invoices) · {business.businessName}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Cash Inflows (Paid)</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {formatCurrency(kpis.cashInflows, cur)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Cash Outflows (Paid)</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {formatCurrency(kpis.cashOutflows, cur)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Operating Cash Flow</div>
          <div
            className={`text-lg font-semibold font-mono tabular-nums mt-1 ${
              kpis.operatingCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(kpis.operatingCashFlow, cur)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Cash Runway</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {kpis.cashRunwayMonths !== null
              ? `${kpis.cashRunwayMonths.toFixed(1)} months`
              : kpis.operatingCashFlow >= 0 && kpis.cashBalance > 0
              ? 'Cash-Flow Positive'
              : 'Insufficient Data'}
          </div>
          <div className="text-[11px] text-slate-400">
            Avg monthly net burn: {formatCurrency(kpis.avgMonthlyNetBurn, cur)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Monthly Cash Inflows vs Outflows</h3>
          <p className="text-xs text-slate-500 mb-4">Realized bank and cash movements across FY months</p>
          <DualBarChart
            data={monthlySeries.map((m) => ({
              label: m.month,
              primary: m.cashInflow,
              secondary: m.cashOutflow,
            }))}
            primaryLabel="Cash Inflow"
            secondaryLabel="Cash Outflow"
            primaryColor="#16a34a"
            secondaryColor="#dc2626"
            currency={cur}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Cash Position Bridge</h3>
          <dl className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">Opening Cash Balance</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(kpis.openingCashBalance, cur)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Operating Cash Flow</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(kpis.operatingCashFlow, cur)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Investing Cash Flow</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(kpis.investingCashFlow, cur)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Financing Cash Flow</dt>
              <dd className="font-mono tabular-nums">{formatCurrency(kpis.financingCashFlow, cur)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold text-slate-900">
              <dt>Closing Cash Balance</dt>
              <dd className="font-mono tabular-nums text-blue-800">{formatCurrency(kpis.closingCashBalance, cur)}</dd>
            </div>
          </dl>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-800 mb-2">Liquidity Warnings</h4>
            {cfAlerts.length === 0 ? (
              <p className="text-xs text-emerald-700">No acute liquidity warnings detected.</p>
            ) : (
              <div className="space-y-2">
                {cfAlerts.map((a) => (
                  <div key={a.id} className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> {a.title}
                    </div>
                    <p className="mt-0.5 text-[11px]">{a.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfitabilityAnalysisView: React.FC<{
  business: BusinessProfile;
  model: ReturnType<typeof computeFinancialModel>;
}> = ({ business, model }) => {
  const { kpis, productProfitability, customerProfitability, departmentPerformance, monthlySeries } = model;
  const cur = business.defaultCurrency;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900">Profitability & Break-Even Analysis</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Segment-wise margin breakdown by product/service, customer, and department.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Gross Profit Margin</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {formatPercent(kpis.totalRevenue > 0 ? (kpis.grossProfit / kpis.totalRevenue) * 100 : null)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Net Profit Margin</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {formatPercent(kpis.profitMargin)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Contribution Margin</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {formatCurrency(kpis.contributionMargin, cur)}
          </div>
          <div className="text-[11px] text-slate-400">
            Ratio: {formatPercent(kpis.contributionMarginRatio !== null ? kpis.contributionMarginRatio * 100 : null)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Break-Even Revenue Point</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-blue-800 mt-1">
            {kpis.breakEvenRevenue !== null ? formatCompactCurrency(kpis.breakEvenRevenue, cur) : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">Fixed OpEx / Contribution Ratio</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Product / Service Profitability</h3>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 font-medium">Product / Service</th>
                <th className="px-3 py-2 font-medium text-right">Revenue</th>
                <th className="px-3 py-2 font-medium text-right">Direct/Cost</th>
                <th className="px-3 py-2 font-medium text-right">Net Contribution</th>
                <th className="px-3 py-2 font-medium text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productProfitability.map((p) => (
                <tr key={p.name}>
                  <td className="px-3 py-2 font-medium text-slate-900">{p.name}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(p.revenue, cur)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(p.expense, cur)}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono tabular-nums font-medium ${
                      p.profit >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {formatCurrency(p.profit, cur)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(p.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Department-Wise Cost & Contribution</h3>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium text-right">Attributed Revenue</th>
                <th className="px-3 py-2 font-medium text-right">Department Expense</th>
                <th className="px-3 py-2 font-medium text-right">Net Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departmentPerformance.map((d) => (
                <tr key={d.department}>
                  <td className="px-3 py-2 font-medium text-slate-900">{d.department}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(d.revenue, cur)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(d.expense, cur)}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono tabular-nums font-medium ${
                      d.netContribution >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {formatCurrency(d.netContribution, cur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Customer-Wise Revenue Concentration</h3>
          <HorizontalBarBreakdown
            items={customerProfitability.map((c) => ({ name: c.name, value: c.revenue }))}
            color="#16a34a"
            currency={cur}
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Monthly Profit Trajectory</h3>
          <TrendLineChart
            data={monthlySeries.map((m) => ({ label: m.month, value: m.netProfit }))}
            label="Monthly Net Surplus"
            strokeColor="#16a34a"
            currency={cur}
          />
        </div>
      </div>
    </div>
  );
};

export const WorkingCapitalView: React.FC<{
  business: BusinessProfile;
  model: ReturnType<typeof computeFinancialModel>;
}> = ({ business, model }) => {
  const { kpis } = model;
  const cur = business.defaultCurrency;

  const warnings: string[] = [];
  if (kpis.workingCapital < 0) warnings.push('Negative Net Working Capital: Current Liabilities exceed Current Assets.');
  if (kpis.receivableDays !== null && kpis.receivableDays > 60)
    warnings.push(`Elevated Receivable Days (${Math.round(kpis.receivableDays)} days) — tighten collections.`);
  if (kpis.inventoryDays !== null && kpis.inventoryDays > 90)
    warnings.push(`Slow Inventory Movement (${Math.round(kpis.inventoryDays)} holding days).`);
  if (kpis.currentLiabilities > kpis.currentAssets * 0.8)
    warnings.push('Short-term liabilities represent over 80% of Current Assets.');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900">Working Capital & Cash Conversion Cycle</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Working Capital = Current Assets − Current Liabilities ({formatCurrency(kpis.currentAssets, cur)} −{' '}
          {formatCurrency(kpis.currentLiabilities, cur)})
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Net Working Capital</div>
          <div
            className={`text-lg font-semibold font-mono tabular-nums mt-1 ${
              kpis.workingCapital >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(kpis.workingCapital, cur)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Receivable Days (DSO)</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {kpis.receivableDays !== null ? `${Math.round(kpis.receivableDays)} days` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">AR: {formatCurrency(kpis.accountsReceivable, cur)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Payable Days (DPO)</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {kpis.payableDays !== null ? `${Math.round(kpis.payableDays)} days` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">AP: {formatCurrency(kpis.accountsPayable, cur)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Inventory Holding Days (DIO)</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {kpis.inventoryDays !== null ? `${Math.round(kpis.inventoryDays)} days` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">Stock: {formatCurrency(kpis.inventoryValue, cur)}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Working Capital Risk Diagnostics</h3>
        {warnings.length === 0 ? (
          <p className="text-xs text-emerald-700">
            Working capital structure, receivable collection days, and inventory turnover are within healthy SME operating ranges.
          </p>
        ) : (
          <ul className="space-y-2 text-xs text-amber-900">
            {warnings.map((w) => (
              <li key={w} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const BusinessAnalyticsView: React.FC<{
  business: BusinessProfile;
  model: ReturnType<typeof computeFinancialModel>;
}> = ({ business, model }) => {
  const { monthlySeries, revenueByCategory, expenseByCategory, customerProfitability } = model;
  const cur = business.defaultCurrency;

  const active = monthlySeries.filter((m) => m.revenue > 0);
  const lastRev = active.length > 0 ? active[active.length - 1].revenue : 0;
  const prevRev = active.length > 1 ? active[active.length - 2].revenue : 0;
  const momGrowth = prevRev > 0 ? ((lastRev - prevRev) / prevRev) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Business Performance & Growth Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sales velocity, category mix, customer concentration, and period-over-period comparisons.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Latest Month-over-Month Revenue Growth</div>
          <div
            className={`text-lg font-semibold font-mono tabular-nums ${
              (momGrowth ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {momGrowth === null ? 'N/A' : `${momGrowth >= 0 ? '+' : ''}${momGrowth.toFixed(1)}%`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Sales & Expense Trends (Apr–Mar)</h3>
          <TrendLineChart
            data={monthlySeries.map((m) => ({
              label: m.month,
              value: m.revenue,
              secondaryValue: m.expenses,
            }))}
            label="Revenue"
            secondaryLabel="Expenses"
            strokeColor="#1d4ed8"
            secondaryColor="#64748b"
            currency={cur}
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Expense Category Mix</h3>
          <HorizontalBarBreakdown items={expenseByCategory} color="#0f172a" currency={cur} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Revenue Stream Mix</h3>
          <HorizontalBarBreakdown items={revenueByCategory} color="#1d4ed8" currency={cur} />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Top Customer Accounts</h3>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium text-right">Invoices</th>
                <th className="px-3 py-2 font-medium text-right">Realized Revenue</th>
                <th className="px-3 py-2 font-medium text-right">Unpaid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerProfitability.slice(0, 6).map((c) => (
                <tr key={c.name}>
                  <td className="px-3 py-2 font-medium text-slate-900">{c.name}</td>
                  <td className="px-3 py-2 text-right font-mono">{c.invoices}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(c.revenue, cur)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-700">
                    {formatCurrency(c.unpaid, cur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
