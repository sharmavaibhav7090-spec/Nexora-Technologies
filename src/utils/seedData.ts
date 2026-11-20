import {
  BudgetRecord,
  BusinessProfile,
  CustomerParty,
  DatasetRecord,
  LedgerAccount,
  RiskRecord,
  SubscriptionRecord,
  TransactionRecord,
} from '../types/nexora';

export interface SampleBundle {
  business: Omit<BusinessProfile, 'id' | 'ownerId'>;
  accounts: Omit<LedgerAccount, 'id' | 'businessId' | 'ownerId'>[];
  transactions: Omit<TransactionRecord, 'id' | 'businessId' | 'ownerId' | 'createdBy'>[];
  budgets: Omit<BudgetRecord, 'id' | 'businessId' | 'ownerId'>[];
  risks: Omit<RiskRecord, 'id' | 'businessId' | 'ownerId'>[];
  customers: Omit<CustomerParty, 'id' | 'businessId' | 'ownerId'>[];
  datasets: Omit<DatasetRecord, 'id' | 'businessId' | 'ownerId' | 'createdAt'>[];
  subscription: Omit<SubscriptionRecord, 'id' | 'businessId' | 'ownerId'>;
}

export function getIndianSMESampleBundle(): SampleBundle {
  return {
    business: {
      businessName: 'Aarav Precision Components Pvt. Ltd.',
      businessType: 'Private Limited (SME)',
      industry: 'Industrial Manufacturing & B2B Supply',
      registrationNumber: 'U29100KA2021PTC148920',
      gstin: '29AABCA4821M1Z5',
      pan: 'AABCA4821M',
      address: 'Plot 44, Peenya Industrial Area Phase II',
      state: 'Karnataka',
      city: 'Bengaluru',
      contactPerson: 'Aarav Kulkarni',
      email: 'finance@aaravprecision.in',
      phone: '+91 98450 77210',
      financialYear: 'FY 2026-27',
      defaultCurrency: 'INR',
      logoText: 'APC',
    },
    accounts: [
      { code: '1010', name: 'Cash & HDFC Current Account', accountGroup: 'Current Asset', balance: 1485000, previousBalance: 1120000 },
      { code: '1100', name: 'Accounts Receivable (Debtors)', accountGroup: 'Current Asset', balance: 960000, previousBalance: 740000 },
      { code: '1200', name: 'Raw Material & Finished Inventory', accountGroup: 'Current Asset', balance: 715000, previousBalance: 680000 },
      { code: '1500', name: 'CNC Machinery & Plant Equipment', accountGroup: 'Non-Current Asset', balance: 3420000, previousBalance: 3250000 },
      { code: '2010', name: 'Accounts Payable (Creditors)', accountGroup: 'Current Liability', balance: 620000, previousBalance: 540000 },
      { code: '2050', name: 'GST & Statutory Payables', accountGroup: 'Current Liability', balance: 210000, previousBalance: 185000 },
      { code: '2200', name: 'SIDBI Term Loan (Non-Current)', accountGroup: 'Non-Current Liability', balance: 1450000, previousBalance: 1650000 },
      { code: '3010', name: 'Share Capital & Retained Earnings', accountGroup: 'Equity', balance: 4300000, previousBalance: 3415000 },
      { code: '5010', name: 'Direct Raw Material Consumption', accountGroup: 'COGS', balance: 1980000, previousBalance: 1750000 },
      { code: '6100', name: 'Plant Depreciation', accountGroup: 'Depreciation', balance: 185000, previousBalance: 170000 },
      { code: '6200', name: 'Term Loan Interest Expense', accountGroup: 'Interest', balance: 142000, previousBalance: 158000 },
      { code: '6300', name: 'Corporate Income Tax Provision', accountGroup: 'Tax', balance: 245000, previousBalance: 190000 },
      { code: '7010', name: 'Capex — CNC Calibration Tooling', accountGroup: 'Investing Cash Flow', balance: -260000, previousBalance: -180000 },
      { code: '7020', name: 'Term Loan Principal Repayment', accountGroup: 'Financing Cash Flow', balance: -200000, previousBalance: -200000 },
    ],
    transactions: [
      { type: 'Income', date: '2026-04-12', partyName: 'Bharat Forge OEM Division', category: 'Product Sales', department: 'Sales', invoiceNumber: 'INV-2601', productOrService: 'Precision Shafts', description: 'Batch delivery 1,200 units', amount: 640000, gstAmount: 115200, paymentStatus: 'Paid', paymentMethod: 'NEFT' },
      { type: 'Expense', date: '2026-04-18', partyName: 'Jindal Alloy Steels Ltd.', category: 'Raw Materials (COGS)', department: 'Production', invoiceNumber: 'PO-1102', productOrService: 'Precision Shafts', description: 'EN-19 alloy steel rods', amount: 310000, gstAmount: 55800, paymentStatus: 'Paid', paymentMethod: 'RTGS' },
      { type: 'Expense', date: '2026-04-28', partyName: 'Peenya Payroll & Staff', category: 'Salaries & Wages', department: 'Operations', invoiceNumber: 'PAY-APR', productOrService: 'Plant Operations', description: 'April payroll disbursement', amount: 245000, gstAmount: 0, paymentStatus: 'Paid', paymentMethod: 'Bank Transfer' },

      { type: 'Income', date: '2026-05-10', partyName: 'Tata AutoComp Systems', category: 'Product Sales', department: 'Sales', invoiceNumber: 'INV-2602', productOrService: 'Hydraulic Valves', description: 'Monthly supply contract Q1', amount: 720000, gstAmount: 129600, paymentStatus: 'Paid', paymentMethod: 'RTGS' },
      { type: 'Expense', date: '2026-05-16', partyName: 'Jindal Alloy Steels Ltd.', category: 'Raw Materials (COGS)', department: 'Production', invoiceNumber: 'PO-1108', productOrService: 'Hydraulic Valves', description: 'Forged brass billets', amount: 295000, gstAmount: 53100, paymentStatus: 'Paid', paymentMethod: 'NEFT' },
      { type: 'Expense', date: '2026-05-29', partyName: 'Bengaluru Power & Utilities', category: 'Power & Utilities', department: 'Production', invoiceNumber: 'BES-0526', productOrService: 'Plant Operations', description: 'Industrial HT tariff', amount: 92000, gstAmount: 0, paymentStatus: 'Paid', paymentMethod: 'UPI' },

      { type: 'Income', date: '2026-06-14', partyName: 'Kirloskar Pneumatic Co.', category: 'Engineering Services', department: 'Engineering', invoiceNumber: 'INV-2603', productOrService: 'Custom CNC Tooling', description: 'Custom tooling & QA certification', amount: 580000, gstAmount: 104400, paymentStatus: 'Paid', paymentMethod: 'RTGS' },
      { type: 'Expense', date: '2026-06-22', partyName: 'Peenya Payroll & Staff', category: 'Salaries & Wages', department: 'Operations', invoiceNumber: 'PAY-JUN', productOrService: 'Plant Operations', description: 'June payroll & PF contribution', amount: 260000, gstAmount: 0, paymentStatus: 'Paid', paymentMethod: 'Bank Transfer' },

      { type: 'Income', date: '2026-07-09', partyName: 'Bharat Forge OEM Division', category: 'Product Sales', department: 'Sales', invoiceNumber: 'INV-2604', productOrService: 'Precision Shafts', description: 'Q2 scheduled dispatch', amount: 810000, gstAmount: 145800, paymentStatus: 'Paid', paymentMethod: 'RTGS' },
      { type: 'Expense', date: '2026-07-15', partyName: 'Kaveri Logistics Pvt. Ltd.', category: 'Logistics & Freight', department: 'Logistics', invoiceNumber: 'FRT-412', productOrService: 'Precision Shafts', description: 'Interstate freight Pune/Chennai', amount: 84000, gstAmount: 15120, paymentStatus: 'Paid', paymentMethod: 'NEFT' },
      { type: 'Expense', date: '2026-07-20', partyName: 'Surya CNC Consumables', category: 'Raw Materials (COGS)', department: 'Production', invoiceNumber: 'PO-1121', productOrService: 'Precision Shafts', description: 'Carbide inserts & coolant', amount: 340000, gstAmount: 61200, paymentStatus: 'Paid', paymentMethod: 'NEFT' },

      { type: 'Income', date: '2026-08-11', partyName: 'Mahindra Industrial Mobility', category: 'Product Sales', department: 'Sales', invoiceNumber: 'INV-2605', productOrService: 'Hydraulic Valves', description: 'EV drivetrain bracket order', amount: 890000, gstAmount: 160200, paymentStatus: 'Paid', paymentMethod: 'RTGS' },
      { type: 'Expense', date: '2026-08-19', partyName: 'Digital Growth Partners', category: 'Sales & Marketing', department: 'Marketing', invoiceNumber: 'MKT-882', productOrService: 'B2B Trade Expo', description: 'IMTEX exhibition & lead campaign', amount: 138000, gstAmount: 24840, paymentStatus: 'Paid', paymentMethod: 'Corporate Card' },
      { type: 'Expense', date: '2026-08-26', partyName: 'Jindal Alloy Steels Ltd.', category: 'Raw Materials (COGS)', department: 'Production', invoiceNumber: 'PO-1135', productOrService: 'Hydraulic Valves', description: 'High-tensile steel stock', amount: 385000, gstAmount: 69300, paymentStatus: 'Paid', paymentMethod: 'RTGS' },

      { type: 'Income', date: '2026-09-15', partyName: 'Deccan Precision Exports', category: 'Export Revenue', department: 'Sales', invoiceNumber: 'INV-2606', productOrService: 'Custom CNC Tooling', description: 'Export lot — zero-rated LUT', amount: 940000, gstAmount: 0, paymentStatus: 'Overdue', paymentMethod: 'Wire Transfer' },
      { type: 'Expense', date: '2026-09-24', partyName: 'Peenya Payroll & Staff', category: 'Salaries & Wages', department: 'Operations', invoiceNumber: 'PAY-SEP', productOrService: 'Plant Operations', description: 'September payroll & bonus accrual', amount: 285000, gstAmount: 0, paymentStatus: 'Paid', paymentMethod: 'Bank Transfer' },

      { type: 'Income', date: '2026-10-14', partyName: 'Tata AutoComp Systems', category: 'Product Sales', department: 'Sales', invoiceNumber: 'INV-2607', productOrService: 'Precision Shafts', description: 'Festive quarter batch 1', amount: 975000, gstAmount: 175500, paymentStatus: 'Paid', paymentMethod: 'RTGS' },
      { type: 'Expense', date: '2026-10-21', partyName: 'Surya CNC Consumables', category: 'Raw Materials (COGS)', department: 'Production', invoiceNumber: 'PO-1154', productOrService: 'Precision Shafts', description: 'Tooling & raw alloy replenishment', amount: 410000, gstAmount: 73800, paymentStatus: 'Pending', paymentMethod: 'NEFT' },
      { type: 'Income', date: '2026-11-08', partyName: 'Kirloskar Pneumatic Co.', category: 'Engineering Services', department: 'Engineering', invoiceNumber: 'INV-2608', productOrService: 'Custom CNC Tooling', description: 'Automation fixture retrofit', amount: 620000, gstAmount: 111600, paymentStatus: 'Pending', paymentMethod: 'NEFT' },
    ],
    budgets: [
      { month: 'Apr', financialYear: 'FY 2026-27', department: 'Sales', category: 'Product Sales', budgetType: 'Revenue', targetAmount: 600000 },
      { month: 'May', financialYear: 'FY 2026-27', department: 'Sales', category: 'Product Sales', budgetType: 'Revenue', targetAmount: 700000 },
      { month: 'Jun', financialYear: 'FY 2026-27', department: 'Engineering', category: 'Engineering Services', budgetType: 'Revenue', targetAmount: 550000 },
      { month: 'Jul', financialYear: 'FY 2026-27', department: 'Sales', category: 'Product Sales', budgetType: 'Revenue', targetAmount: 780000 },
      { month: 'Aug', financialYear: 'FY 2026-27', department: 'Sales', category: 'Product Sales', budgetType: 'Revenue', targetAmount: 850000 },
      { month: 'Sep', financialYear: 'FY 2026-27', department: 'Sales', category: 'Export Revenue', budgetType: 'Revenue', targetAmount: 900000 },
      { month: 'Oct', financialYear: 'FY 2026-27', department: 'Sales', category: 'Product Sales', budgetType: 'Revenue', targetAmount: 950000 },
      { month: 'Apr', financialYear: 'FY 2026-27', department: 'Production', category: 'Raw Materials (COGS)', budgetType: 'Expense', targetAmount: 300000 },
      { month: 'Jul', financialYear: 'FY 2026-27', department: 'Production', category: 'Raw Materials (COGS)', budgetType: 'Expense', targetAmount: 320000 },
      { month: 'Aug', financialYear: 'FY 2026-27', department: 'Marketing', category: 'Sales & Marketing', budgetType: 'Expense', targetAmount: 100000 },
      { month: 'Oct', financialYear: 'FY 2026-27', department: 'Production', category: 'Raw Materials (COGS)', budgetType: 'Expense', targetAmount: 390000 },
    ],
    risks: [
      {
        category: 'Credit Risk',
        description: 'Overdue export receivable (₹9.40 L) from Deccan Precision Exports exceeding 45-day credit terms.',
        probability: 4,
        impact: 4,
        financialImpact: 940000,
        riskScore: 16,
        riskLevel: 'Critical',
        mitigationStrategy: 'Issue formal collection notice, pause next export dispatch, and require 50% LC advance.',
        responsiblePerson: 'Aarav Kulkarni',
        reviewDate: '2026-11-30',
        status: 'Open',
      },
      {
        category: 'Market Risk',
        description: 'Alloy steel raw material price volatility impacting gross margins on fixed-price OEM contracts.',
        probability: 4,
        impact: 3,
        financialImpact: 450000,
        riskScore: 12,
        riskLevel: 'High',
        mitigationStrategy: 'Lock 60-day forward supply pricing with Jindal Alloy Steels and include escalation clauses.',
        responsiblePerson: 'Meera Nair',
        reviewDate: '2026-12-15',
        status: 'Mitigating',
      },
      {
        category: 'Operational Risk',
        description: 'Single-shift CNC spindle bottleneck during Q3 festive peak dispatch.',
        probability: 3,
        impact: 3,
        financialImpact: 280000,
        riskScore: 9,
        riskLevel: 'Medium',
        mitigationStrategy: 'Schedule preventive maintenance and cross-train 2 backup CNC operators.',
        responsiblePerson: 'Rohan Deshmukh',
        reviewDate: '2026-12-05',
        status: 'Monitored',
      },
      {
        category: 'Liquidity Risk',
        description: 'Working capital lockup if both Pending Q3 invoices slip beyond 60 days.',
        probability: 2,
        impact: 4,
        financialImpact: 620000,
        riskScore: 8,
        riskLevel: 'Medium',
        mitigationStrategy: 'Maintain ₹10 L revolving overdraft facility unused as contingency buffer.',
        responsiblePerson: 'Aarav Kulkarni',
        reviewDate: '2026-12-20',
        status: 'Monitored',
      },
    ],
    customers: [
      { partyType: 'Customer', name: 'Bharat Forge OEM Division', gstin: '27AAACB1294P1Z2', email: 'ap@bharatforge-oem.in', phone: '+91 20 6704 2000', city: 'Pune', paymentTermsDays: 30 },
      { partyType: 'Customer', name: 'Tata AutoComp Systems', gstin: '27AAACT3910D1Z8', email: 'vendorpay@tataautocomp.com', phone: '+91 20 6608 5000', city: 'Pune', paymentTermsDays: 30 },
      { partyType: 'Customer', name: 'Kirloskar Pneumatic Co.', gstin: '27AAACK4421F1Z1', email: 'accounts@kirloskarpneumatic.com', phone: '+91 20 2672 7000', city: 'Pune', paymentTermsDays: 45 },
      { partyType: 'Customer', name: 'Mahindra Industrial Mobility', gstin: '27AAACM3025E1Z4', email: 'finance@mahindraindustrial.in', phone: '+91 22 2490 1441', city: 'Mumbai', paymentTermsDays: 30 },
      { partyType: 'Customer', name: 'Deccan Precision Exports', gstin: '29AABCD8812K1Z9', email: 'treasury@deccanexports.in', phone: '+91 80 4120 8821', city: 'Bengaluru', paymentTermsDays: 45 },
      { partyType: 'Vendor', name: 'Jindal Alloy Steels Ltd.', gstin: '29AAACJ7710H1Z6', email: 'billing@jindalalloys.in', phone: '+91 80 2839 1120', city: 'Ballari', paymentTermsDays: 30 },
      { partyType: 'Vendor', name: 'Surya CNC Consumables', gstin: '29AABCS5120J1Z3', email: 'sales@suryacnc.in', phone: '+91 80 2837 4410', city: 'Bengaluru', paymentTermsDays: 30 },
      { partyType: 'Vendor', name: 'Kaveri Logistics Pvt. Ltd.', gstin: '29AAACK9021L1Z7', email: 'accounts@kaverilogistics.in', phone: '+91 80 2331 9910', city: 'Bengaluru', paymentTermsDays: 15 },
    ],
    datasets: [
      {
        fileName: 'APC_FY26_27_Tally_Ledger_Export.xlsx',
        dataType: 'Transactions',
        rowCount: 19,
        validRows: 19,
        errorCount: 0,
        processingStatus: 'Imported',
        validationSummary: 'All 19 rows passed date, numeric INR amount, GST, and duplicate validation checks.',
        uploadedBy: 'finance@aaravprecision.in',
      },
    ],
    subscription: {
      planName: 'Premium',
      monthlyPrice: 1999,
      startDate: '2026-04-01',
      expiryDate: '2027-03-31',
      paymentStatus: 'Active Manual',
      renewalStatus: 'Auto-Renew',
    },
  };
}
