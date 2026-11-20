import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Plus, Search, Trash2, Edit3 } from 'lucide-react';
import { AccountingBasis, BusinessProfile, TransactionRecord } from '../types/nexora';
import { addTransaction, deleteTransaction, updateTransaction } from '../services/firestoreService';
import { formatCurrency } from '../utils/formatters';

export const FinancialManagementView: React.FC<{
  user: User;
  business: BusinessProfile;
  transactions: TransactionRecord[];
  basis: AccountingBasis;
  onBasisChange: (b: AccountingBasis) => void;
  canWrite: boolean;
}> = ({ user, business, transactions, basis, onBasisChange, canWrite }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | TransactionRecord['paymentStatus']>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<TransactionRecord, 'id' | 'businessId' | 'ownerId' | 'createdBy'>>({
    type: 'Income',
    date: new Date().toISOString().slice(0, 10),
    partyName: '',
    category: 'Product Sales',
    department: 'Sales',
    invoiceNumber: '',
    productOrService: '',
    description: '',
    amount: 0,
    gstAmount: 0,
    paymentStatus: 'Paid',
    paymentMethod: 'NEFT',
  });

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => (typeFilter === 'All' ? true : t.type === typeFilter))
      .filter((t) => (statusFilter === 'All' ? true : t.paymentStatus === statusFilter))
      .filter((t) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          t.partyName.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q) ||
          (t.invoiceNumber ?? '').toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, typeFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const accrualInc = transactions.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const cashInc = transactions
      .filter((t) => t.type === 'Income' && t.paymentStatus === 'Paid')
      .reduce((s, t) => s + t.amount, 0);
    const accrualExp = transactions.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const cashExp = transactions
      .filter((t) => t.type === 'Expense' && t.paymentStatus === 'Paid')
      .reduce((s, t) => s + t.amount, 0);

    const income = basis === 'Cash' ? cashInc : accrualInc;
    const expenses = basis === 'Cash' ? cashExp : accrualExp;
    const cogs = transactions
      .filter(
        (t) =>
          t.type === 'Expense' &&
          (basis === 'Accrual' || t.paymentStatus === 'Paid') &&
          t.category.toLowerCase().includes('raw material')
      )
      .reduce((s, t) => s + t.amount, 0);
    const grossProfit = income - cogs;
    const netProfit = income - expenses;
    const unpaidInvoices = accrualInc - cashInc;

    return { income, expenses, grossProfit, netProfit, unpaidInvoices };
  }, [transactions, basis]);

  const openNew = (defaultType: 'Income' | 'Expense') => {
    setEditingId(null);
    setForm({
      type: defaultType,
      date: new Date().toISOString().slice(0, 10),
      partyName: '',
      category: defaultType === 'Income' ? 'Product Sales' : 'Operating Expense',
      department: defaultType === 'Income' ? 'Sales' : 'Operations',
      invoiceNumber: '',
      productOrService: '',
      description: '',
      amount: 0,
      gstAmount: 0,
      paymentStatus: 'Paid',
      paymentMethod: 'NEFT',
    });
    setShowForm(true);
    setErrorMsg(null);
  };

  const openEdit = (tx: TransactionRecord) => {
    setEditingId(tx.id);
    setForm({
      type: tx.type,
      date: tx.date,
      partyName: tx.partyName,
      category: tx.category,
      department: tx.department,
      invoiceNumber: tx.invoiceNumber ?? '',
      productOrService: tx.productOrService ?? '',
      description: tx.description ?? '',
      amount: tx.amount,
      gstAmount: tx.gstAmount,
      paymentStatus: tx.paymentStatus,
      paymentMethod: tx.paymentMethod,
    });
    setShowForm(true);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    if (form.amount <= 0 || !form.partyName.trim()) {
      setErrorMsg('Please enter a valid party name and positive amount.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      if (editingId) {
        await updateTransaction(business.id, business.ownerId, user, editingId, form);
      } else {
        await addTransaction(business.id, business.ownerId, user, form);
      }
      setShowForm(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canWrite) return;
    try {
      await deleteTransaction(business.id, business.ownerId, user, id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete transaction.');
    }
  };

  const cur = business.defaultCurrency;

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Total Income ({basis})</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {formatCurrency(summary.income, cur)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Total Expenses ({basis})</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {formatCurrency(summary.expenses, cur)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Gross Profit</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {formatCurrency(summary.grossProfit, cur)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Operating / Net Profit</div>
          <div
            className={`text-lg font-semibold font-mono tabular-nums mt-1 ${
              summary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(summary.netProfit, cur)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Unpaid Receivables</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-amber-700 mt-1">
            {formatCurrency(summary.unpaidInvoices, cur)}
          </div>
          <div className="text-[11px] text-slate-400">Excluded from Cash basis</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search party, invoice, category..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-60 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(['All', 'Income', 'Expense'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 text-xs font-medium rounded-xs ${
                  typeFilter === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
          >
            <option value="All">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Partial">Partial</option>
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(['Accrual', 'Cash'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onBasisChange(b)}
                className={`px-2.5 py-1 text-xs font-medium rounded-xs ${
                  basis === b ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openNew('Income')}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Record Income
            </button>
            <button
              type="button"
              onClick={() => openNew('Expense')}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#0B1B3B] rounded-md hover:bg-[#132954] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Record Expense
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-2.5 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingId ? 'Edit Financial Transaction' : `New ${form.type} Entry`}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-500">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Entry Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'Income' | 'Expense' })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Transaction Date *</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">
                {form.type === 'Income' ? 'Customer Name *' : 'Vendor Name *'}
              </span>
              <input
                required
                value={form.partyName}
                onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Invoice / Reference No.</span>
              <input
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>

            <label className="text-xs block">
              <span className="font-medium text-slate-700">Category *</span>
              <input
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g., Product Sales, Raw Materials (COGS)"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Department *</span>
              <input
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Product / Service Line</span>
              <input
                value={form.productOrService}
                onChange={(e) => setForm({ ...form, productOrService: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Amount ({cur}) *</span>
              <input
                type="number"
                required
                min={1}
                step="any"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>

            <label className="text-xs block">
              <span className="font-medium text-slate-700">GST Amount ({cur})</span>
              <input
                type="number"
                min={0}
                step="any"
                value={form.gstAmount}
                onChange={(e) => setForm({ ...form, gstAmount: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Payment Status</span>
              <select
                value={form.paymentStatus}
                onChange={(e) =>
                  setForm({ ...form, paymentStatus: e.target.value as TransactionRecord['paymentStatus'] })
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Partial">Partial</option>
              </select>
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Payment Method</span>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                <option>NEFT</option>
                <option>RTGS</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
                <option>Corporate Card</option>
                <option>Cash</option>
                <option>Wire Transfer</option>
              </select>
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Description</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      )}

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Party & Invoice</th>
                <th className="px-4 py-3 font-medium">Category · Dept</th>
                <th className="px-4 py-3 font-medium">Status · Mode</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-right">GST</th>
                {canWrite && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="px-4 py-8 text-center text-slate-500">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const statusColor =
                    tx.paymentStatus === 'Paid'
                      ? 'text-emerald-700'
                      : tx.paymentStatus === 'Overdue'
                      ? 'text-red-700'
                      : 'text-amber-700';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td
                        className={`px-4 py-2.5 font-medium ${
                          tx.type === 'Income' ? 'text-emerald-700' : 'text-slate-700'
                        }`}
                      >
                        {tx.type}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{tx.partyName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {tx.invoiceNumber || '—'} {tx.description ? `· ${tx.description}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {tx.category} · {tx.department}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`font-medium ${statusColor}`}>{tx.paymentStatus}</span>
                        <span className="text-slate-400"> · {tx.paymentMethod}</span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono tabular-nums font-medium ${
                          tx.type === 'Income' ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'Income' ? '+' : '-'}
                        {formatCurrency(tx.amount, cur)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500">
                        {formatCurrency(tx.gstAmount, cur)}
                      </td>
                      {canWrite && (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(tx)}
                            className="p-1.5 text-slate-500 hover:text-blue-700"
                            title="Edit transaction"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-slate-500 hover:text-red-700"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
