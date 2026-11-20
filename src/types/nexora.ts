export type UserRole =
  | 'Administrator'
  | 'Business Owner'
  | 'Finance Manager'
  | 'Business Analyst'
  | 'Read-Only User';

export type NavModuleId =
  | 'dashboard'
  | 'business-profile'
  | 'data-management'
  | 'financial-management'
  | 'financial-analysis'
  | 'cash-flow'
  | 'profitability'
  | 'working-capital'
  | 'budget-forecasting'
  | 'business-analytics'
  | 'risk-management'
  | 'reports'
  | 'ai-insights'
  | 'customers'
  | 'subscriptions'
  | 'settings';

export type AccountingBasis = 'Accrual' | 'Cash';

export interface DashboardFilters {
  financialYear: string;
  month: string;
  quarter: string;
  department: string;
  category: string;
  basis: AccountingBasis;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  activeBusinessId?: string;
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  businessType: string;
  industry: string;
  registrationNumber?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  state?: string;
  city?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  financialYear: string;
  defaultCurrency: 'INR' | 'USD' | 'EUR' | 'GBP';
  logoText?: string;
  ownerId: string;
}

export interface BusinessMember {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: Exclude<UserRole, 'Administrator'>;
  businessId: string;
  ownerId: string;
}

export interface DatasetRecord {
  id: string;
  businessId: string;
  ownerId: string;
  fileName: string;
  dataType: 'Transactions' | 'Sales' | 'Purchases' | 'Expenses' | 'Customers' | 'Inventory';
  rowCount: number;
  validRows: number;
  errorCount: number;
  processingStatus: 'Validated' | 'Imported' | 'Needs Review';
  validationSummary?: string;
  uploadedBy?: string;
  createdAt?: unknown;
}

export interface TransactionRecord {
  id: string;
  businessId: string;
  ownerId: string;
  type: 'Income' | 'Expense';
  date: string;
  partyName: string;
  category: string;
  department: string;
  invoiceNumber?: string;
  productOrService?: string;
  description?: string;
  amount: number;
  gstAmount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  paymentMethod: string;
  createdBy?: string;
}

export type AccountGroup =
  | 'Current Asset'
  | 'Non-Current Asset'
  | 'Current Liability'
  | 'Non-Current Liability'
  | 'Equity'
  | 'COGS'
  | 'Operating Expense'
  | 'Depreciation'
  | 'Interest'
  | 'Tax'
  | 'Investing Cash Flow'
  | 'Financing Cash Flow';

export interface LedgerAccount {
  id: string;
  businessId: string;
  ownerId: string;
  code: string;
  name: string;
  accountGroup: AccountGroup;
  balance: number;
  previousBalance: number;
}

export interface BudgetRecord {
  id: string;
  businessId: string;
  ownerId: string;
  month: string;
  financialYear: string;
  department: string;
  category: string;
  budgetType: 'Revenue' | 'Expense';
  targetAmount: number;
}

export interface RiskRecord {
  id: string;
  businessId: string;
  ownerId: string;
  category:
    | 'Financial Risk'
    | 'Liquidity Risk'
    | 'Operational Risk'
    | 'Credit Risk'
    | 'Market Risk'
    | 'Business Risk';
  description: string;
  probability: number;
  impact: number;
  financialImpact: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  mitigationStrategy?: string;
  responsiblePerson?: string;
  reviewDate?: string;
  status: 'Open' | 'Mitigating' | 'Monitored' | 'Closed';
}

export interface AIInsightRecord {
  id: string;
  businessId: string;
  ownerId: string;
  analyticsType: 'Descriptive' | 'Diagnostic' | 'Predictive' | 'Prescriptive';
  relatedMetric: string;
  observation: string;
  explanation: string;
  suggestedAction: string;
  confidenceLevel: 'High' | 'Moderate' | 'Preliminary';
  source: 'AI-Generated' | 'Rule-Based';
  status: 'New' | 'Reviewed' | 'Actioned';
}

export interface CustomerParty {
  id: string;
  businessId: string;
  ownerId: string;
  partyType: 'Customer' | 'Vendor';
  name: string;
  gstin?: string;
  email?: string;
  phone?: string;
  city?: string;
  paymentTermsDays: number;
}

export interface SubscriptionRecord {
  id: string;
  businessId: string;
  ownerId: string;
  planName: 'Freemium' | 'Premium';
  monthlyPrice: number;
  startDate: string;
  expiryDate: string;
  paymentStatus: 'Free Tier' | 'Pending Gateway' | 'Active Manual' | 'Expired';
  renewalStatus: 'Auto-Renew' | 'Manual' | 'Cancelled';
}

export interface AuditLogRecord {
  id: string;
  businessId: string;
  ownerId: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt?: unknown;
}
