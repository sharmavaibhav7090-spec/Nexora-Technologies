import React, { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { Download, Plus, ShieldCheck, UserPlus } from 'lucide-react';
import {
  AuditLogRecord,
  BusinessProfile,
  CustomerParty,
  EmailRegistration,
  LoginLogRecord,
  SubscriptionRecord,
  TransactionRecord,
  UserProfile,
  UserRole,
} from '../types/nexora';
import { addCustomerParty, adminRegisterEmail, saveSubscription } from '../services/firestoreService';
import { formatCurrency } from '../utils/formatters';
import { exportSheetToExcel } from '../utils/exportUtils';

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

function formatTimestamp(ts: unknown): string {
  if (!ts) return 'Just now';
  if (
    typeof ts === 'object' &&
    ts !== null &&
    'toDate' in ts &&
    typeof (ts as { toDate: () => Date }).toDate === 'function'
  ) {
    return (ts as { toDate: () => Date }).toDate().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (ts instanceof Date) {
    return ts.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return String(ts);
}

function toTimestampMillis(ts: unknown): number {
  if (!ts) return 0;
  if (
    typeof ts === 'object' &&
    ts !== null &&
    'toMillis' in ts &&
    typeof (ts as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export const SettingsView: React.FC<{
  user: User;
  userEmail: string;
  actualRole: UserRole;
  effectiveRole: UserRole;
  onPreviewRoleChange: (role: UserRole) => void;
  auditLogs: AuditLogRecord[];
  isPlatformAdmin: boolean;
  registeredUsers: UserProfile[];
  emailRegistrations: EmailRegistration[];
  loginLogs: LoginLogRecord[];
}> = ({
  user,
  userEmail,
  actualRole,
  effectiveRole,
  onPreviewRoleChange,
  auditLogs,
  isPlatformAdmin,
  registeredUsers,
  emailRegistrations,
  loginLogs,
}) => {
  const [tab, setTab] = useState<'directory' | 'rbac' | 'architecture' | 'audit'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newRole, setNewRole] = useState<Exclude<UserRole, 'Administrator'>>('Business Owner');
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [submittingReg, setSubmittingReg] = useState(false);

  const sortedUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...registeredUsers]
      .filter((u) => {
        if (!q) return true;
        return (
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          (u.organizationName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => toTimestampMillis(b.lastLoginAt) - toTimestampMillis(a.lastLoginAt));
  }, [registeredUsers, searchQuery]);

  const sortedRegistrations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...emailRegistrations]
      .filter((r) => {
        if (!q) return true;
        return (
          r.email.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          (r.organizationName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => toTimestampMillis(b.createdAt) - toTimestampMillis(a.createdAt));
  }, [emailRegistrations, searchQuery]);

  const sortedLoginLogs = useMemo(
    () => [...loginLogs].sort((a, b) => toTimestampMillis(b.loginAt) - toTimestampMillis(a.loginAt)),
    [loginLogs]
  );

  const handleAdminRegisterEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPlatformAdmin || !newEmail.trim() || !newFullName.trim()) return;
    setSubmittingReg(true);
    setRegMessage(null);
    setRegError(null);
    try {
      await adminRegisterEmail(user, {
        email: newEmail,
        fullName: newFullName,
        organizationName: newOrg,
        assignedRole: newRole,
      });
      setRegMessage(
        `Registered ${newEmail.trim().toLowerCase()} for Google Sign-In access. Status will automatically activate when they sign in with Google.`
      );
      setNewEmail('');
      setNewFullName('');
      setNewOrg('');
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Unable to register email ID.');
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleExportDirectory = () => {
    exportSheetToExcel('nexora-registered-login-directory.xlsx', [
      {
        name: 'RegisteredUsers',
        rows: sortedUsers.map((u) => ({
          Email: u.email,
          DisplayName: u.displayName,
          Organization: u.organizationName || '',
          Role: u.role,
          AuthProvider: u.authProvider,
          Status: u.registrationStatus,
          RegisteredAt: formatTimestamp(u.registeredAt),
          LastLoginAt: formatTimestamp(u.lastLoginAt),
          LoginCount: u.loginCount,
        })),
      },
      {
        name: 'EmailRegistrations',
        rows: sortedRegistrations.map((r) => ({
          Email: r.email,
          FullName: r.fullName,
          Organization: r.organizationName || '',
          AssignedRole: r.assignedRole,
          Status: r.status,
          RegisteredBy: r.registeredByEmail,
          RegisteredAt: formatTimestamp(r.createdAt),
        })),
      },
      {
        name: 'LoginHistory',
        rows: sortedLoginLogs.map((l) => ({
          Event: l.eventType,
          Email: l.email,
          DisplayName: l.displayName,
          Role: l.role,
          AuthProvider: l.authProvider,
          LoginAt: formatTimestamp(l.loginAt),
        })),
      },
    ]);
  };

  const roles: { role: UserRole; scope: string; writeTx: string; settings: string }[] = [
    { role: 'Administrator', scope: 'All platform businesses & users', writeTx: 'Full CRUD', settings: 'Full Admin' },
    { role: 'Business Owner', scope: 'Owned businesses & statements', writeTx: 'Full CRUD', settings: 'Business & Plan' },
    { role: 'Finance Manager', scope: 'Assigned business ledgers', writeTx: 'Add / Edit / Budget', settings: 'Read-Only' },
    { role: 'Business Analyst', scope: 'Dashboards, Ratios, Analytics', writeTx: 'No financial edits', settings: 'No access' },
    { role: 'Read-Only User', scope: 'Authorized dashboards & reports', writeTx: 'View Only', settings: 'No access' },
  ];

  const schemaTables = [
    'Users (UserID PK, Email, AuthProvider, RegisteredAt, LastLoginAt, LoginCount, Role)',
    'EmailRegistrations (RegID PK, Email, FullName, AssignedRole, Status)',
    'LoginLogs (LogID PK, UID, Email, EventType, AuthProvider, LoginAt)',
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
          <h2 className="text-base font-semibold text-slate-900">Access Control, Registered Users & Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Signed in via Google Account ({userEmail}) · Verified Role: {actualRole}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
          {[
            { id: 'directory', label: `Registered Users & Logins (${registeredUsers.length})` },
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

      {tab === 'directory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Registered Google Users</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {registeredUsers.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active verified profiles</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Email Registrations</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {emailRegistrations.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {emailRegistrations.filter((r) => r.status === 'Pre-Registered').length} pending first login
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Recorded Login Events</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {loginLogs.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Immutable login ledger</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Authentication Policy</div>
              <div className="text-sm font-bold text-blue-700 mt-1.5">Google Account Only</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Verified email_verified & OAuth</div>
            </div>
          </div>

          {!isPlatformAdmin && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
              PII Isolation Active: Showing your registered Google account profile, email registration status, and login history. Full multi-user directory visibility is restricted to the platform Administrator.
            </div>
          )}

          {isPlatformAdmin && (
            <form
              onSubmit={handleAdminRegisterEmail}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-700" />
                    <span>Register Email ID for Site Access</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pre-register an authorized Google / Google Workspace email ID. It is recorded immediately and activates upon their first Google login.
                  </p>
                </div>
              </div>

              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
                  {regError}
                </div>
              )}
              {regMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
                  {regMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <label className="text-xs block">
                  <span className="font-medium text-slate-700">Google Email ID *</span>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@company.in"
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-md"
                  />
                </label>
                <label className="text-xs block">
                  <span className="font-medium text-slate-700">Full Name *</span>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Priya Nair"
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-md"
                  />
                </label>
                <label className="text-xs block">
                  <span className="font-medium text-slate-700">Organization</span>
                  <input
                    type="text"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    placeholder="Optional company"
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-md"
                  />
                </label>
                <label className="text-xs block">
                  <span className="font-medium text-slate-700">Assigned Role</span>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Exclude<UserRole, 'Administrator'>)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
                  >
                    <option value="Business Owner">Business Owner</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="Business Analyst">Business Analyst</option>
                    <option value="Read-Only User">Read-Only User</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {submittingReg ? 'Registering...' : 'Register Email ID'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Registered Login List of Users</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified Google accounts registered on Nexora Technologies with login timestamps and session counts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search email or name..."
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-md w-48"
                />
                <button
                  type="button"
                  onClick={handleExportDirectory}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Export Excel
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Registered Email ID</th>
                    <th className="px-4 py-3 font-medium">User & Organization</th>
                    <th className="px-4 py-3 font-medium">Role · Provider</th>
                    <th className="px-4 py-3 font-medium">Registered At</th>
                    <th className="px-4 py-3 font-medium">Last Login</th>
                    <th className="px-4 py-3 font-medium text-right">Logins</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                        No registered users match the filter.
                      </td>
                    </tr>
                  ) : (
                    sortedUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono text-slate-900">{u.email}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{u.displayName}</div>
                          <div className="text-[11px] text-slate-500">
                            {u.organizationName || 'Individual / SME Workspace'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {u.role} · Google
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-600">
                          {formatTimestamp(u.registeredAt)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                          {formatTimestamp(u.lastLoginAt)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {u.loginCount ?? 1}
                        </td>
                        <td
                          className={`px-4 py-3 font-medium ${
                            u.registrationStatus === 'Registered' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {u.registrationStatus}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">Email ID Registration Registry</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Self-registered and admin-registered email records ({sortedRegistrations.length})
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Email ID</th>
                      <th className="px-4 py-2.5 font-medium">Name · Role</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          No email registrations recorded yet.
                        </td>
                      </tr>
                    ) : (
                      sortedRegistrations.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2.5 font-mono text-slate-900">{r.email}</td>
                          <td className="px-4 py-2.5 text-slate-700">
                            {r.fullName} · {r.assignedRole}
                          </td>
                          <td
                            className={`px-4 py-2.5 font-medium ${
                              r.status === 'Activated' ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {r.status}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">Recent Google Sign-In Activity</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Timestamped registration and Google authentication events ({sortedLoginLogs.length})
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Event</th>
                      <th className="px-4 py-2.5 font-medium">Email ID</th>
                      <th className="px-4 py-2.5 font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedLoginLogs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          No sign-in events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      sortedLoginLogs.slice(0, 25).map((log) => (
                        <tr key={log.id}>
                          <td
                            className={`px-4 py-2.5 font-mono font-medium ${
                              log.eventType === 'REGISTRATION' ? 'text-blue-700' : 'text-slate-800'
                            }`}
                          >
                            {log.eventType}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">
                            {log.email} · {log.role}
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600">
                            {formatTimestamp(log.loginAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

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
              Platform Limitations Addressed: AppSheet cannot natively parse arbitrary `.xlsx`/`.csv` files or host secret AI keys in expressions—Nexora uses client-side SheetJS validation + Express server-side Gemini API proxy (`/api/ai/*`) + Firestore Zero-Trust rules with Google-only Auth.
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
