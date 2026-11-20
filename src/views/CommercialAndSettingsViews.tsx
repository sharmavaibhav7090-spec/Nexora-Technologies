import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Plus, ShieldCheck } from 'lucide-react';
import {
  AuditLogRecord,
  BusinessProfile,
  CustomerParty,
  SubscriptionRecord,
  TransactionRecord,
  UserRole,
} from '../types/nexora';
import { addCustomerParty, saveSubscription } from '../services/firestoreService';
import { formatCurrency } from '../utils/formatters';

export const CustomerManagementView: React.FC<{
  user: User;
  business: BusinessProfile;
  customers: CustomerParty[];
  transactions: TransactionRecord[];
  canWrite: boolean;
}> = ({ user, business, customers, transactions, canWrite }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<CustomerParty, 'id' | 'businessId' | 'ownerId'>>({
    partyType: 'Customer',
    name: '',
    gstin: '',
    email: '',
    phone: '',
    city: '',
    paymentTermsDays: 30,
  });

  const cur = business.defaultCurrency;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !form.name.trim()) return;
    await addCustomerParty(business.id, business.ownerId, user, form);
    setShowForm(false);
    setForm({ partyType: 'Customer', name: '', gstin: '', email: '', phone: '', city: '', paymentTermsDays: 30 });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Customer & Vendor Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track GSTINs, credit terms, total billed volume, and open receivables/payables per counterparty.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Counterparty
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Type</span>
            <select
              value={form.partyType}
              onChange={(e) => setForm({ ...form, partyType: e.target.value as 'Customer' | 'Vendor' })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs bg-white"
            >
              <option value="Customer">Customer</option>
              <option value="Vendor">Vendor</option>
            </select>
          </label>
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Party Name *</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
            />
          </label>
          <label className="text-xs block">
            <span className="font-medium text-slate-700">GSTIN</span>
            <input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
            />
          </label>
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
            />
          </label>
          <label className="text-xs block">
            <span className="font-medium text-slate-700">City</span>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
            />
          </label>
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Payment Terms (Days)</span>
            <input
              type="number"
              min={0}
              max={365}
              value={form.paymentTermsDays}
              onChange={(e) => setForm({ ...form, paymentTermsDays: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
            />
          </label>
          <div className="sm:col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs border rounded-md">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md">
              Save Party
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Party Name & GSTIN</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">City · Contact</th>
                <th className="px-4 py-3 font-medium text-right">Credit Terms</th>
                <th className="px-4 py-3 font-medium text-right">Total Volume</th>
                <th className="px-4 py-3 font-medium text-right">Open Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => {
                const partyTx = transactions.filter((t) => t.partyName.toLowerCase() === c.name.toLowerCase());
                const totalVol = partyTx.reduce((s, t) => s + t.amount, 0);
                const openBal = partyTx
                  .filter((t) => t.paymentStatus !== 'Paid')
                  .reduce((s, t) => s + t.amount, 0);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{c.gstin || 'No GSTIN'}</div>
                    </td>
                    <td className="px-4 py-3">{c.partyType}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.city || '—'} · {c.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{c.paymentTermsDays} days</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(totalVol, cur)}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular-nums font-medium ${
                        openBal > 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {formatCurrency(openBal, cur)}
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

export const SubscriptionManagementView: React.FC<{
  user: User;
  business: BusinessProfile;
  subscriptions: SubscriptionRecord[];
  canManageAdmin: boolean;
}> = ({ user, business, subscriptions, canManageAdmin }) => {
  const currentSub = subscriptions[0];
  const [premiumPrice, setPremiumPrice] = useState<number>(currentSub?.monthlyPrice || 1999);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handleSelectPlan = async (planName: 'Freemium' | 'Premium') => {
    if (!canManageAdmin) return;
    const price = planName === 'Freemium' ? 0 : premiumPrice;
    await saveSubscription(
      business.id,
      business.ownerId,
      user,
      {
        planName,
        monthlyPrice: price,
        startDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        paymentStatus: planName === 'Freemium' ? 'Free Tier' : 'Pending Gateway',
        renewalStatus: 'Manual',
      },
      currentSub?.id
    );
    setStatusNotice(
      planName === 'Premium'
        ? `Recorded ${planName} subscription request (₹${price.toLocaleString('en-IN')}/month). Automated card/UPI billing requires connecting a separate payment gateway (e.g. Razorpay/Stripe).`
        : 'Switched workspace record to Freemium plan.'
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Subscription & SaaS Commercial Model</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active workspace plan for {business.businessName}. Proposed ₹1,999/month pricing is configurable below.
          </p>
        </div>
        <label className="text-xs flex items-center gap-2">
          <span className="text-slate-600 font-medium">Configurable Premium Price (₹/mo):</span>
          <input
            type="number"
            min={0}
            value={premiumPrice}
            onChange={(e) => setPremiumPrice(Number(e.target.value))}
            className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-md font-mono text-xs"
          />
        </label>
      </div>

      {statusNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3.5 text-xs text-amber-900">
          {statusNotice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">For Early-Stage Founders & Students</div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">Freemium</h3>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-2">₹0 / month</div>
          </div>
          <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-4">
            <li>1 active business profile</li>
            <li>Up to 3 spreadsheet dataset uploads per month</li>
            <li>Core Executive Dashboard & Income/Expense ledger</li>
            <li>Standard P&L and Monthly Financial Summary</li>
          </ul>
          <button
            type="button"
            disabled={!canManageAdmin}
            onClick={() => handleSelectPlan('Freemium')}
            className="w-full py-2 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            {currentSub?.planName === 'Freemium' ? 'Current Active Plan' : 'Record Freemium Plan'}
          </button>
        </div>

        <div className="bg-white border border-blue-600 rounded-lg p-6 space-y-4">
          <div>
            <div className="text-xs font-semibold text-blue-700">For Scaling Indian SMEs & Finance Teams</div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">Premium Analytics</h3>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
              ₹{premiumPrice.toLocaleString('en-IN')} / month
            </div>
          </div>
          <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-4">
            <li>Multi-business isolation & role-based team controls</li>
            <li>Full 3-Statement Suite + 15 Financial Ratios</li>
            <li>Budget vs Actual, Cash Runway, Break-Even & Risk Matrix</li>
            <li>AI Insights (4 Pillars), Natural-Language SQL & Excel/PDF Reports</li>
          </ul>
          <button
            type="button"
            disabled={!canManageAdmin}
            onClick={() => handleSelectPlan('Premium')}
            className="w-full py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
          >
            {currentSub?.planName === 'Premium' ? 'Current Active Plan' : 'Select Premium Plan'}
          </button>
        </div>
      </div>

      {currentSub && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Active Subscription Record</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
            <div>
              <dt className="text-slate-500">Plan Name</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{currentSub.planName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Monthly Amount</dt>
              <dd className="font-mono mt-0.5">₹{currentSub.monthlyPrice.toLocaleString('en-IN')}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Start → Expiry</dt>
              <dd className="font-mono mt-0.5">
                {currentSub.startDate} → {currentSub.expiryDate}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Payment Status</dt>
              <dd className="font-semibold text-amber-700 mt-0.5">{currentSub.paymentStatus}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Renewal Mode</dt>
              <dd className="mt-0.5">{currentSub.renewalStatus}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};

export const SettingsView: React.FC<{
  userEmail: string;
  actualRole: UserRole;
  effectiveRole: UserRole;
  onPreviewRoleChange: (role: UserRole) => void;
  auditLogs: AuditLogRecord[];
}> = ({ userEmail, actualRole, effectiveRole, onPreviewRoleChange, auditLogs }) => {
  const [tab, setTab] = useState<'rbac' | 'architecture' | 'audit'>('rbac');

  const roles: { role: UserRole; scope: string; writeTx: string; settings: string }[] = [
    { role: 'Administrator', scope: 'All platform businesses & users', writeTx: 'Full CRUD', settings: 'Full Admin' },
    { role: 'Business Owner', scope: 'Owned businesses & statements', writeTx: 'Full CRUD', settings: 'Business & Plan' },
    { role: 'Finance Manager', scope: 'Assigned business ledgers', writeTx: 'Add / Edit / Budget', settings: 'Read-Only' },
    { role: 'Business Analyst', scope: 'Dashboards, Ratios, Analytics', writeTx: 'No financial edits', settings: 'No access' },
    { role: 'Read-Only User', scope: 'Authorized dashboards & reports', writeTx: 'View Only', settings: 'No access' },
  ];

  const schemaTables = [
    'Users (UserID PK, Email, Role, ActiveBusinessID)',
    'Businesses (BusinessID PK, OwnerID, GSTIN, PAN, FY, Currency)',
    'BusinessUserAccess (AccessID PK, BusinessID FK, UserID FK, Role)',
    'Datasets (DatasetID PK, BusinessID FK, FileName, Status, ValidationSummary)',
    'Transactions (TransactionID PK, BusinessID FK, Type, Date, Party, Amount, GST, Status)',
    'Accounts (AccountID PK, BusinessID FK, Code, AccountGroup, Balance)',
    'JournalEntries & JournalEntryLines (EntryID PK, AccountID FK, Debit, Credit)',
    'Customers & Vendors (PartyID PK, BusinessID FK, GSTIN, CreditTermsDays)',
    'ProductsServices (ItemID PK, BusinessID FK, UnitPrice, DirectCost)',
    'Budgets (BudgetID PK, BusinessID FK, Month, Department, TargetAmount)',
    'CashFlowRecords, FinancialPeriods, FinancialRatios, Forecasts',
    'Risks (RiskID PK, BusinessID FK, Category, Probability, Impact, Score)',
    'AIInsights (InsightID PK, BusinessID FK, AnalyticsType, Source, Confidence)',
    'Reports, Subscriptions, Payments, AuditLogs (Immutable)',
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Access Control, Architecture & Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Signed in as {userEmail} · Firestore Verified Role: {actualRole}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
          {[
            { id: 'rbac', label: 'Role Matrix & Preview' },
            { id: 'architecture', label: '22-Table & AppSheet Spec' },
            { id: 'audit', label: `Audit Logs (${auditLogs.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs whitespace-nowrap shrink-0 ${
                tab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'rbac' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">Role Permission Preview (UI Testing):</span>{' '}
                <span className="text-slate-600">
                  Simulate how Nexora restricts write buttons for Analysts or Read-Only users while Firestore rules enforce server-side isolation.
                </span>
              </div>
            </div>
            <select
              value={effectiveRole}
              onChange={(e) => onPreviewRoleChange(e.target.value as UserRole)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white font-medium"
            >
              {roles.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.role}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Data Isolation Scope</th>
                  <th className="px-4 py-3 font-medium">Financial Write Access</th>
                  <th className="px-4 py-3 font-medium">Admin & Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((r) => (
                  <tr key={r.role} className={effectiveRole === r.role ? 'bg-blue-50/40' : ''}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.role}</td>
                    <td className="px-4 py-3 text-slate-600">{r.scope}</td>
                    <td className="px-4 py-3 text-slate-800">{r.writeTx}</td>
                    <td className="px-4 py-3 text-slate-600">{r.settings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'architecture' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">22-Table Relational Architecture</h3>
            <ul className="space-y-1.5 text-xs text-slate-700 font-mono">
              {schemaTables.map((s) => (
                <li key={s} className="py-1 border-b border-slate-100">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs text-slate-700">
            <h3 className="text-sm font-semibold text-slate-900">AppSheet Security & Formula Parity</h3>
            <div className="p-3 bg-slate-50 rounded-md font-mono text-[11px] space-y-1">
              <div>Security Filter: IN([BusinessID], SELECT(BusinessUserAccess[BusinessID], [UserEmail] = USEREMAIL()))</div>
              <div>Risk Score: [Probability] * [Impact]</div>
              <div>Working Capital: [CurrentAssets] - [CurrentLiabilities]</div>
              <div>Safe Current Ratio: IF([CurrentLiabilities] = 0, NUMBER(""), [CurrentAssets] / [CurrentLiabilities])</div>
            </div>
            <p>
              Platform Limitations Addressed: AppSheet cannot natively parse arbitrary `.xlsx`/`.csv` files or host secret AI keys in expressions—Nexora uses client-side SheetJS validation + Express server-side Gemini API proxy (`/api/ai/*`) + Firestore Zero-Trust rules.
            </p>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Entity</th>
                <th className="px-4 py-2.5 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No audit entries recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 30).map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{log.action}</td>
                    <td className="px-4 py-2.5 text-slate-600">{log.actorEmail}</td>
                    <td className="px-4 py-2.5 text-slate-600">{log.entityType}</td>
                    <td className="px-4 py-2.5 text-slate-700">{log.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
