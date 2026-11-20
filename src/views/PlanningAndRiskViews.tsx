import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Plus, Trash2 } from 'lucide-react';
import { BudgetRecord, BusinessProfile, RiskRecord } from '../types/nexora';
import { addBudget, addRisk, deleteBudget, updateRiskStatus } from '../services/firestoreService';
import { computeFinancialModel } from '../utils/financialEngine';
import { formatCurrency, FY_MONTHS } from '../utils/formatters';
import { DualBarChart, TrendLineChart } from '../components/Charts';

export const BudgetForecastingView: React.FC<{
  user: User;
  business: BusinessProfile;
  model: ReturnType<typeof computeFinancialModel>;
  canWrite: boolean;
}> = ({ user, business, model, canWrite }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<BudgetRecord, 'id' | 'businessId' | 'ownerId'>>({
    month: 'Nov',
    financialYear: business.financialYear,
    department: 'Sales',
    category: 'Product Sales',
    budgetType: 'Revenue',
    targetAmount: 850000,
  });

  const cur = business.defaultCurrency;
  const { budgetComparison, forecasts } = model;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || form.targetAmount <= 0) return;
    await addBudget(business.id, business.ownerId, user, form);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Budget Management & Historical Forecasting</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track monthly & departmental targets vs actual performance. Projections use transparent historical averages.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Budget Target
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Month</span>
            <select
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
            >
              {FY_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Type</span>
            <select
              value={form.budgetType}
              onChange={(e) => setForm({ ...form, budgetType: e.target.value as 'Revenue' | 'Expense' })}
              className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
            >
              <option value="Revenue">Revenue Target</option>
              <option value="Expense">Expense Limit</option>
            </select>
          </label>
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Department</span>
            <input
              required
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs"
            />
          </label>
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Category</span>
            <input
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs"
            />
          </label>
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Target ({cur})</span>
            <input
              type="number"
              required
              min={1}
              value={form.targetAmount}
              onChange={(e) => setForm({ ...form, targetAmount: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-mono"
            />
          </label>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 h-[34px]"
          >
            Save Target
          </button>
        </form>
      )}

      {/* Budget vs Actual Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Budget vs Actual Variance Analysis</h3>
          <span className="text-xs text-slate-500 font-mono">{budgetComparison.length} budgets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 font-medium">Month · FY</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Department · Category</th>
                <th className="px-4 py-2.5 font-medium text-right">Budget Target</th>
                <th className="px-4 py-2.5 font-medium text-right">Actual</th>
                <th className="px-4 py-2.5 font-medium text-right">Variance</th>
                {canWrite && <th className="px-4 py-2.5 font-medium text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetComparison.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-mono">
                    {b.month} · {b.financialYear}
                  </td>
                  <td className="px-4 py-2.5">{b.budgetType}</td>
                  <td className="px-4 py-2.5">
                    {b.department} · <span className="text-slate-500">{b.category}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {formatCurrency(b.targetAmount, cur)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {formatCurrency(b.actualAmount, cur)}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono tabular-nums font-semibold ${
                      b.favorable ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {b.variance >= 0 ? '+' : ''}
                    {formatCurrency(b.variance, cur)} ({b.favorable ? 'Favorable' : 'Unfavorable'})
                  </td>
                  {canWrite && (
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => deleteBudget(business.id, b.id)}
                        className="p-1 text-slate-400 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transparent Historical Forecast */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              4-Month Financial Forecast (Estimated Projection)
            </h3>
            <p className="text-xs text-amber-800 mt-0.5">
              Disclaimer: Forecasts are statistical estimates derived from your trailing 3-month moving average and linear revenue slope—not guaranteed future results.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DualBarChart
            data={forecasts.map((f) => ({
              label: f.month,
              primary: f.estimatedRevenue,
              secondary: f.estimatedExpense,
            }))}
            primaryLabel="Est. Revenue"
            secondaryLabel="Est. Expense"
            primaryColor="#1d4ed8"
            secondaryColor="#64748b"
            currency={cur}
            height={190}
          />
          <TrendLineChart
            data={forecasts.map((f) => ({
              label: f.month,
              value: f.estimatedClosingCash,
              secondaryValue: f.estimatedProfit,
            }))}
            label="Est. Closing Cash"
            secondaryLabel="Est. Monthly Profit"
            strokeColor="#16a34a"
            secondaryColor="#1d4ed8"
            currency={cur}
            height={190}
          />
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 font-medium">Horizon (Estimate)</th>
              <th className="px-3 py-2 font-medium text-right">Est. Revenue</th>
              <th className="px-3 py-2 font-medium text-right">Est. Expenses</th>
              <th className="px-3 py-2 font-medium text-right">Est. Profit</th>
              <th className="px-3 py-2 font-medium text-right">Est. Closing Cash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {forecasts.map((f) => (
              <tr key={f.month}>
                <td className="px-3 py-2 font-mono">{f.month} (Est.)</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(f.estimatedRevenue, cur)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(f.estimatedExpense, cur)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-medium text-emerald-700">
                  {formatCurrency(f.estimatedProfit, cur)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-blue-800">
                  {formatCurrency(f.estimatedClosingCash, cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const RiskManagementView: React.FC<{
  user: User;
  business: BusinessProfile;
  risks: RiskRecord[];
  canWrite: boolean;
}> = ({ user, business, risks, canWrite }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: 'Financial Risk' as RiskRecord['category'],
    description: '',
    probability: 3,
    impact: 4,
    financialImpact: 250000,
    mitigationStrategy: '',
    responsiblePerson: '',
    reviewDate: new Date().toISOString().slice(0, 10),
  });

  const cur = business.defaultCurrency;

  const computeRiskLevel = (score: number): RiskRecord['riskLevel'] => {
    if (score >= 16) return 'Critical';
    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !form.description.trim()) return;
    const score = form.probability * form.impact;
    await addRisk(business.id, business.ownerId, user, {
      ...form,
      riskScore: score,
      riskLevel: computeRiskLevel(score),
      status: 'Open',
    });
    setShowForm(false);
    setForm({
      category: 'Financial Risk',
      description: '',
      probability: 3,
      impact: 4,
      financialImpact: 250000,
      mitigationStrategy: '',
      responsiblePerson: '',
      reviewDate: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Enterprise Risk Register & 5×5 Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent scoring rule: Risk Score = Probability (1–5) × Impact (1–5). Scores ≥ 16 Critical, 10–15 High, 5–9 Medium, 1–4 Low.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Log Risk
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Risk Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as RiskRecord['category'] })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                <option>Financial Risk</option>
                <option>Liquidity Risk</option>
                <option>Operational Risk</option>
                <option>Credit Risk</option>
                <option>Market Risk</option>
                <option>Business Risk</option>
              </select>
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Probability (1–5)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Impact (1–5)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={form.impact}
                onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="text-xs block sm:col-span-2">
              <span className="font-medium text-slate-700">Risk Description *</span>
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Est. Financial Impact ({cur})</span>
              <input
                type="number"
                min={0}
                value={form.financialImpact}
                onChange={(e) => setForm({ ...form, financialImpact: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="text-xs block sm:col-span-2">
              <span className="font-medium text-slate-700">Mitigation Strategy</span>
              <input
                value={form.mitigationStrategy}
                onChange={(e) => setForm({ ...form, mitigationStrategy: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Responsible Owner</span>
              <input
                value={form.responsiblePerson}
                onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs text-slate-600 border border-slate-200 rounded-md"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md">
              Save Risk Entry
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 5x5 Matrix */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">5×5 Risk Heat Matrix</h3>
          <p className="text-xs text-slate-500 mb-4">Rows: Probability (5→1) · Cols: Impact (1→5)</p>
          <div className="grid grid-cols-5 gap-1.5">
            {[5, 4, 3, 2, 1].map((prob) =>
              [1, 2, 3, 4, 5].map((imp) => {
                const score = prob * imp;
                const count = risks.filter((r) => r.probability === prob && r.impact === imp).length;
                const cellColor =
                  score >= 16
                    ? 'bg-red-100 border-red-300 text-red-900'
                    : score >= 10
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : score >= 5
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600';
                return (
                  <div
                    key={`${prob}-${imp}`}
                    className={`h-12 rounded-sm border flex flex-col items-center justify-center text-[11px] font-mono ${cellColor}`}
                    title={`P${prob} × I${imp} = ${score}`}
                  >
                    <span className="font-semibold">{score}</span>
                    {count > 0 && <span className="text-[10px]">({count})</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Register Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 font-medium">Category & Description</th>
                <th className="px-4 py-2.5 font-medium text-right">Score</th>
                <th className="px-4 py-2.5 font-medium text-right">Exposure</th>
                <th className="px-4 py-2.5 font-medium">Level</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {risks.map((r) => {
                const lvlColor =
                  r.riskLevel === 'Critical'
                    ? 'text-red-700 font-semibold'
                    : r.riskLevel === 'High'
                    ? 'text-amber-700 font-semibold'
                    : 'text-slate-700';
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.category}</div>
                      <div className="text-slate-600 mt-0.5">{r.description}</div>
                      {r.mitigationStrategy && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Mitigation: {r.mitigationStrategy} ({r.responsiblePerson || 'Unassigned'})
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.riskScore} ({r.probability}×{r.impact})
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {formatCurrency(r.financialImpact, cur)}
                    </td>
                    <td className={`px-4 py-3 ${lvlColor}`}>{r.riskLevel}</td>
                    <td className="px-4 py-3">
                      {canWrite ? (
                        <select
                          value={r.status}
                          onChange={(e) =>
                            updateRiskStatus(business.id, r.id, e.target.value as RiskRecord['status'])
                          }
                          className="border border-slate-200 rounded-xs px-2 py-1 text-xs bg-white"
                        >
                          <option value="Open">Open</option>
                          <option value="Mitigating">Mitigating</option>
                          <option value="Monitored">Monitored</option>
                          <option value="Closed">Closed</option>
                        </select>
                      ) : (
                        <span>{r.status}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
