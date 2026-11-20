import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  CreditCard,
  Database,
  FileSpreadsheet,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  AIInsightRecord,
  AuditLogRecord,
  BudgetRecord,
  BusinessProfile,
  CustomerParty,
  DashboardFilters,
  DatasetRecord,
  LedgerAccount,
  NavModuleId,
  RiskRecord,
  SubscriptionRecord,
  TransactionRecord,
  UserProfile,
  UserRole,
} from './types/nexora';
import {
  createBusinessProfile,
  ensureUserProfile,
  seedSampleBusiness,
  subscribeBusinessCollection,
  subscribeBusinesses,
  updateUserActiveBusiness,
} from './services/firestoreService';
import { computeFinancialModel } from './utils/financialEngine';
import { getIndianFYFromDate } from './utils/formatters';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ExecutiveDashboardView } from './views/ExecutiveDashboardView';
import { BusinessProfileView, DataManagementView } from './views/BusinessAndDataViews';
import { FinancialManagementView } from './views/FinancialManagementView';
import { FinancialAnalysisView } from './views/FinancialAnalysisView';
import {
  BusinessAnalyticsView,
  CashFlowAnalysisView,
  ProfitabilityAnalysisView,
  WorkingCapitalView,
} from './views/DeepAnalyticsViews';
import { BudgetForecastingView, RiskManagementView } from './views/PlanningAndRiskViews';
import { AIInsightsView, ReportsView } from './views/ReportsAndAIViews';
import {
  CustomerManagementView,
  SettingsView,
  SubscriptionManagementView,
} from './views/CommercialAndSettingsViews';

const NAV_ITEMS: { id: NavModuleId; label: string; group: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Executive Dashboard', group: 'Core Workspace', icon: LayoutDashboard },
  { id: 'business-profile', label: 'Business Profile', group: 'Core Workspace', icon: Building2 },
  { id: 'data-management', label: 'Data Management', group: 'Core Workspace', icon: Database },
  { id: 'financial-management', label: 'Financial Management', group: 'Core Workspace', icon: Landmark },
  { id: 'financial-analysis', label: 'Financial Analysis', group: 'Financial Intelligence', icon: Calculator },
  { id: 'cash-flow', label: 'Cash Flow Analysis', group: 'Financial Intelligence', icon: Wallet },
  { id: 'profitability', label: 'Profitability Analysis', group: 'Financial Intelligence', icon: PieChart },
  { id: 'working-capital', label: 'Working Capital', group: 'Financial Intelligence', icon: Briefcase },
  { id: 'budget-forecasting', label: 'Budget & Forecasting', group: 'Planning & Risk', icon: TrendingUp },
  { id: 'business-analytics', label: 'Business Analytics', group: 'Planning & Risk', icon: BarChart3 },
  { id: 'risk-management', label: 'Risk Management', group: 'Planning & Risk', icon: ShieldAlert },
  { id: 'reports', label: 'Reports & Statements', group: 'Intelligence & Exports', icon: FileText },
  { id: 'ai-insights', label: 'AI Insights', group: 'Intelligence & Exports', icon: Sparkles },
  { id: 'customers', label: 'Customer Management', group: 'Commercial & Admin', icon: Users },
  { id: 'subscriptions', label: 'Subscription Management', group: 'Commercial & Admin', icon: CreditCard },
  { id: 'settings', label: 'Settings', group: 'Commercial & Admin', icon: Settings },
];

function NexoraWorkspace() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [businessesLoaded, setBusinessesLoaded] = useState(false);
  const [activeBusinessId, setActiveBusinessId] = useState<string>('');
  const [activeModule, setActiveModule] = useState<NavModuleId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Preview role for owners/admins to test RBAC permissions
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  // Business subcollections
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [risks, setRisks] = useState<RiskRecord[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsightRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerParty[]>([]);
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  const [seeding, setSeeding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [filters, setFilters] = useState<DashboardFilters>({
    financialYear: 'All',
    month: 'All',
    quarter: 'All',
    department: 'All',
    category: 'All',
    basis: 'Accrual',
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const prof = await ensureUserProfile(firebaseUser);
          setUserProfile(prof);
          if (prof.activeBusinessId) {
            setActiveBusinessId(prof.activeBusinessId);
          }
        } catch (err) {
          setAuthError(err instanceof Error ? err.message : 'Unable to load user profile.');
        }
      } else {
        setUserProfile(null);
        setBusinesses([]);
        setBusinessesLoaded(false);
        setActiveBusinessId('');
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeBusinesses(user.uid, (list) => {
      setBusinesses(list);
      setBusinessesLoaded(true);
      setActiveBusinessId((prev) => {
        if (prev && list.some((b) => b.id === prev)) return prev;
        return list[0]?.id ?? '';
      });
    });
    return () => unsub();
  }, [user]);

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.id === activeBusinessId) ?? businesses[0] ?? null,
    [businesses, activeBusinessId]
  );

  useEffect(() => {
    if (!activeBusiness) {
      setTransactions([]);
      setAccounts([]);
      setBudgets([]);
      setRisks([]);
      setAiInsights([]);
      setCustomers([]);
      setDatasets([]);
      setSubscriptions([]);
      setAuditLogs([]);
      return;
    }

    const bid = activeBusiness.id;
    const oid = activeBusiness.ownerId;
    const unsubs = [
      subscribeBusinessCollection<TransactionRecord>(bid, 'transactions', oid, setTransactions),
      subscribeBusinessCollection<LedgerAccount>(bid, 'accounts', oid, setAccounts),
      subscribeBusinessCollection<BudgetRecord>(bid, 'budgets', oid, setBudgets),
      subscribeBusinessCollection<RiskRecord>(bid, 'risks', oid, setRisks),
      subscribeBusinessCollection<AIInsightRecord>(bid, 'aiInsights', oid, setAiInsights),
      subscribeBusinessCollection<CustomerParty>(bid, 'customers', oid, setCustomers),
      subscribeBusinessCollection<DatasetRecord>(bid, 'datasets', oid, setDatasets),
      subscribeBusinessCollection<SubscriptionRecord>(bid, 'subscriptions', oid, setSubscriptions),
      subscribeBusinessCollection<AuditLogRecord>(bid, 'auditLogs', oid, setAuditLogs),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [activeBusiness?.id, activeBusiness?.ownerId]);

  const model = useMemo(
    () => computeFinancialModel(transactions, accounts, budgets, risks, customers, filters),
    [transactions, accounts, budgets, risks, customers, filters]
  );

  const departments = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.department).filter(Boolean))).sort(),
    [transactions]
  );
  const categories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category).filter(Boolean))).sort(),
    [transactions]
  );
  const financialYears = useMemo(() => {
    const set = new Set(transactions.map((t) => getIndianFYFromDate(t.date)));
    if (activeBusiness?.financialYear) set.add(activeBusiness.financialYear);
    return Array.from(set).sort();
  }, [transactions, activeBusiness?.financialYear]);

  const actualRole: UserRole = userProfile?.role ?? 'Business Owner';
  const effectiveRole: UserRole = previewRole ?? actualRole;
  const canWrite =
    effectiveRole === 'Administrator' ||
    effectiveRole === 'Business Owner' ||
    effectiveRole === 'Finance Manager';
  const canManageAdmin = effectiveRole === 'Administrator' || effectiveRole === 'Business Owner';

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in cancelled or failed.');
    }
  };

  const handleSelectBusiness = async (id: string) => {
    setActiveBusinessId(id);
    if (user) {
      try {
        await updateUserActiveBusiness(user.uid, id);
      } catch {
        // Non-blocking preference update
      }
    }
  };

  const handleSeedSample = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const id = await seedSampleBusiness(user);
      await handleSelectBusiness(id);
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateCustomBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !onboardingName.trim()) return;
    setSeeding(true);
    try {
      const id = await createBusinessProfile(user, {
        businessName: onboardingName.trim(),
        businessType: 'Private Limited (SME)',
        industry: 'Services & Technology',
        financialYear: 'FY 2026-27',
        defaultCurrency: 'INR',
        city: 'Bengaluru',
        state: 'Karnataka',
        email: user.email || '',
        contactPerson: user.displayName || '',
      });
      await handleSelectBusiness(id);
      setOnboardingName('');
    } finally {
      setSeeding(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-600">
        Initializing Nexora Technologies workspace...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-8">
          <div className="text-lg font-bold tracking-tight text-[#0B1B3B] whitespace-nowrap shrink-0">
            Nexora Technologies
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
            <span>Financial Statements</span>
            <span>Cash Flow & Ratios</span>
            <span>Budget & Risk</span>
            <span>AI Insights & SQL</span>
          </nav>
          <button
            type="button"
            onClick={handleSignIn}
            className="px-4 py-2 text-xs font-medium text-white bg-[#0B1B3B] rounded-md hover:bg-[#132954] whitespace-nowrap shrink-0"
          >
            Sign In with Google
          </button>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <div className="text-xs font-semibold text-blue-700 tracking-wide uppercase">
              AI-Powered Financial & Business Analytics
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight text-balance">
              Transform Data Into Decisions.
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Built for Indian SMEs, startups, accountants, and finance teams. Turn raw Excel, CSV, and daily ledger transactions into Profit & Loss statements, balanced Balance Sheets, Cash Flow runways, 15 financial ratios, and AI-assisted executive recommendations.
            </p>
            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
                {authError}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSignIn}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                Access Workspace with Google
              </button>
              <span className="text-xs text-slate-500">
                INR (₹) · April–March FY · Multi-Business Isolation
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Included Financial Intelligence Modules</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                'Executive KPI Dashboard',
                'Excel / CSV Validation',
                'Accrual vs Cash Ledger',
                'P&L, Balance Sheet & Cash Flow',
                '15 Automated Financial Ratios',
                'Working Capital & Runway',
                'Budget vs Actual & Forecasts',
                '5×5 Risk Register Matrix',
                'AI Insights & SQL Studio',
                'Excel & PDF Management Reports',
              ].map((item) => (
                <div key={item} className="py-2 px-3 bg-slate-50 border border-slate-100 rounded-md text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 flex items-center justify-between">
          <span>Nexora Technologies · Turn Raw Data Into Financial Clarity</span>
          <span>Default Currency: INR (₹) · FY Apr–Mar</span>
        </footer>
      </div>
    );
  }

  if (!businessesLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-600">
        Loading authorized business workspaces...
      </div>
    );
  }

  if (!activeBusiness) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-lg p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Welcome to Nexora Technologies</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Signed in as {user.email} · Initialize your first business workspace
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                <span>Load Indian SME Sample Workspace</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seeds <strong>Aarav Precision Components Pvt. Ltd.</strong> (Bengaluru) with balanced FY 2026–27 accounts, 19 transactions (Paid/Pending/Overdue), budgets, risks, and customer records in Firestore.
              </p>
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedSample}
                className="w-full py-2 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
              >
                {seeding ? 'Provisioning Sample Workspace...' : 'Initialize Sample Workspace'}
              </button>
            </div>

            <form onSubmit={handleCreateCustomBusiness} className="border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Building2 className="w-4 h-4 text-slate-700" />
                <span>Create Blank Business Profile</span>
              </div>
              <p className="text-xs text-slate-600">
                Start fresh and upload your own Excel or CSV financial records.
              </p>
              <input
                required
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                placeholder="Enter Business Name..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md"
              />
              <button
                type="submit"
                disabled={seeding}
                className="w-full py-2 text-xs font-semibold text-white bg-[#0B1B3B] rounded-md hover:bg-[#132954] disabled:opacity-50"
              >
                Create Business
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === activeModule);
  const groups = ['Core Workspace', 'Financial Intelligence', 'Planning & Risk', 'Intelligence & Exports', 'Commercial & Admin'];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0B1B3B] text-slate-200 flex flex-col transition-transform lg:translate-x-0 lg:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white tracking-tight whitespace-nowrap">
              Nexora Technologies
            </div>
            <div className="text-[11px] text-slate-400">Transform Data Into Decisions</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((grp) => (
            <div key={grp}>
              <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-slate-400 tracking-wide">
                {grp}
              </div>
              <div className="space-y-0.5">
                {NAV_ITEMS.filter((item) => item.group === grp).map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveModule(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-blue-700 text-white'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 text-xs">
          <div className="px-2 py-1.5">
            <div className="font-medium text-white truncate">{user.displayName || user.email}</div>
            <div className="text-[11px] text-slate-400 truncate">
              Role: {effectiveRole}
              {previewRole && previewRole !== actualRole ? ' (Preview)' : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="mt-1 w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-md border border-slate-200 text-slate-600"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs text-slate-500 truncate">
              <span className="font-medium text-slate-900">{activeBusiness.businessName}</span>
              <span className="mx-2">/</span>
              <span>{currentNav?.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {businesses.length > 1 && (
              <select
                value={activeBusiness.id}
                onChange={(e) => handleSelectBusiness(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white max-w-[200px]"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.businessName}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setActiveModule('reports')}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#0B1B3B] rounded-md hover:bg-[#132954] whitespace-nowrap shrink-0"
            >
              Export Report
            </button>
          </div>
        </header>

        {!canWrite && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-900">
            Read-only workspace mode ({effectiveRole}): financial edits and dataset uploads are disabled.
          </div>
        )}

        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {activeModule === 'dashboard' && (
            <ExecutiveDashboardView
              business={activeBusiness}
              model={model}
              filters={filters}
              onFiltersChange={setFilters}
              departments={departments}
              categories={categories}
              financialYears={financialYears}
              onNavigate={setActiveModule}
            />
          )}
          {activeModule === 'business-profile' && (
            <BusinessProfileView
              user={user}
              businesses={businesses}
              activeBusiness={activeBusiness}
              canWrite={canWrite}
              onSelectBusiness={handleSelectBusiness}
            />
          )}
          {activeModule === 'data-management' && (
            <DataManagementView
              user={user}
              business={activeBusiness}
              datasets={datasets}
              canWrite={canWrite}
            />
          )}
          {activeModule === 'financial-management' && (
            <FinancialManagementView
              user={user}
              business={activeBusiness}
              transactions={transactions}
              basis={filters.basis}
              onBasisChange={(b) => setFilters({ ...filters, basis: b })}
              canWrite={canWrite}
            />
          )}
          {activeModule === 'financial-analysis' && (
            <FinancialAnalysisView
              user={user}
              business={activeBusiness}
              accounts={accounts}
              model={model}
              canWrite={canWrite}
            />
          )}
          {activeModule === 'cash-flow' && (
            <CashFlowAnalysisView business={activeBusiness} model={model} />
          )}
          {activeModule === 'profitability' && (
            <ProfitabilityAnalysisView business={activeBusiness} model={model} />
          )}
          {activeModule === 'working-capital' && (
            <WorkingCapitalView business={activeBusiness} model={model} />
          )}
          {activeModule === 'budget-forecasting' && (
            <BudgetForecastingView
              user={user}
              business={activeBusiness}
              model={model}
              canWrite={canWrite}
            />
          )}
          {activeModule === 'business-analytics' && (
            <BusinessAnalyticsView business={activeBusiness} model={model} />
          )}
          {activeModule === 'risk-management' && (
            <RiskManagementView
              user={user}
              business={activeBusiness}
              risks={risks}
              canWrite={canWrite}
            />
          )}
          {activeModule === 'reports' && (
            <ReportsView
              business={activeBusiness}
              model={model}
              accounts={accounts}
              risks={risks}
            />
          )}
          {activeModule === 'ai-insights' && (
            <AIInsightsView
              business={activeBusiness}
              model={model}
              savedInsights={aiInsights}
              transactions={transactions}
              canWrite={canWrite}
            />
          )}
          {activeModule === 'customers' && (
            <CustomerManagementView
              user={user}
              business={activeBusiness}
              customers={customers}
              transactions={transactions}
              canWrite={canWrite}
            />
          )}
          {activeModule === 'subscriptions' && (
            <SubscriptionManagementView
              user={user}
              business={activeBusiness}
              subscriptions={subscriptions}
              canManageAdmin={canManageAdmin}
            />
          )}
          {activeModule === 'settings' && (
            <SettingsView
              userEmail={user.email || ''}
              actualRole={actualRole}
              effectiveRole={effectiveRole}
              onPreviewRoleChange={setPreviewRole}
              auditLogs={auditLogs}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NexoraWorkspace />
    </ErrorBoundary>
  );
}
