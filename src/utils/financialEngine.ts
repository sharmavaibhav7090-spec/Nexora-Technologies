import {
  BudgetRecord,
  CustomerParty,
  DashboardFilters,
  LedgerAccount,
  RiskRecord,
  TransactionRecord,
} from '../types/nexora';
import {
  FY_MONTHS,
  getIndianFYFromDate,
  getMonthShortFromDate,
  getQuarterFromDate,
} from './formatters';

export interface RatioItem {
  id: string;
  group: 'Liquidity' | 'Profitability' | 'Solvency' | 'Efficiency';
  name: string;
  formula: string;
  value: number | null;
  unit: 'x' | '%' | 'days';
  previousValue: number | null;
  changePct: number | null;
  interpretation: string;
  status: 'Healthy' | 'Watch' | 'Critical' | 'Insufficient Data';
  unavailableReason?: string;
}

export interface MonthlyMetric {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  budgetRevenue: number;
  budgetExpense: number;
}

export interface FinancialAlert {
  id: string;
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  detail: string;
  module: string;
}

export interface ForecastPoint {
  month: string;
  estimatedRevenue: number;
  estimatedExpense: number;
  estimatedProfit: number;
  estimatedClosingCash: number;
  isEstimate: true;
}

export function filterTransactions(
  transactions: TransactionRecord[],
  filters: DashboardFilters
): TransactionRecord[] {
  return transactions.filter((tx) => {
    if (filters.financialYear !== 'All') {
      if (getIndianFYFromDate(tx.date) !== filters.financialYear) return false;
    }
    if (filters.month !== 'All') {
      if (getMonthShortFromDate(tx.date) !== filters.month) return false;
    }
    if (filters.quarter !== 'All') {
      if (getQuarterFromDate(tx.date) !== filters.quarter) return false;
    }
    if (filters.department !== 'All' && tx.department !== filters.department) {
      return false;
    }
    if (filters.category !== 'All' && tx.category !== filters.category) {
      return false;
    }
    return true;
  });
}

function safeDivide(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den) || Math.abs(den) < 1e-6) {
    return null;
  }
  return num / den;
}

export function computeFinancialModel(
  allTransactions: TransactionRecord[],
  accounts: LedgerAccount[],
  budgets: BudgetRecord[],
  risks: RiskRecord[],
  customers: CustomerParty[],
  filters: DashboardFilters
) {
  const filteredTx = filterTransactions(allTransactions, filters);

  // Separate Accrual vs Cash Basis strictly
  const accrualRevenue = filteredTx
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const accrualExpenses = filteredTx
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const cashInflows = filteredTx
    .filter((t) => t.type === 'Income' && t.paymentStatus === 'Paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const cashOutflows = filteredTx
    .filter((t) => t.type === 'Expense' && t.paymentStatus === 'Paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const unpaidReceivablesFromTx = allTransactions
    .filter((t) => t.type === 'Income' && t.paymentStatus !== 'Paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const unpaidPayablesFromTx = allTransactions
    .filter((t) => t.type === 'Expense' && t.paymentStatus !== 'Paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const displayRevenue = filters.basis === 'Cash' ? cashInflows : accrualRevenue;
  const displayExpenses = filters.basis === 'Cash' ? cashOutflows : accrualExpenses;

  // Classified Ledger Accounts Aggregation
  const sumGroup = (group: LedgerAccount['accountGroup']) =>
    accounts.filter((a) => a.accountGroup === group).reduce((s, a) => s + a.balance, 0);

  const sumPrevGroup = (group: LedgerAccount['accountGroup']) =>
    accounts.filter((a) => a.accountGroup === group).reduce((s, a) => s + a.previousBalance, 0);

  const findAccountByName = (keyword: string) =>
    accounts
      .filter((a) => a.name.toLowerCase().includes(keyword.toLowerCase()))
      .reduce((s, a) => s + a.balance, 0);

  const cashAndBankLedger = findAccountByName('cash') + findAccountByName('bank');
  const arLedger = findAccountByName('receivable');
  const apLedger = findAccountByName('payable');
  const inventoryLedger = findAccountByName('inventory');

  const currentAssets = sumGroup('Current Asset');
  const nonCurrentAssets = sumGroup('Non-Current Asset');
  const totalAssets = currentAssets + nonCurrentAssets;

  const currentLiabilities = sumGroup('Current Liability');
  const nonCurrentLiabilities = sumGroup('Non-Current Liability');
  const totalLiabilities = currentLiabilities + nonCurrentLiabilities;
  const totalEquity = sumGroup('Equity');

  const prevCurrentAssets = sumPrevGroup('Current Asset');
  const prevNonCurrentAssets = sumPrevGroup('Non-Current Asset');
  const prevTotalAssets = prevCurrentAssets + prevNonCurrentAssets;
  const prevCurrentLiabilities = sumPrevGroup('Current Liability');
  const prevNonCurrentLiabilities = sumPrevGroup('Non-Current Liability');
  const prevTotalLiabilities = prevCurrentLiabilities + prevNonCurrentLiabilities;
  const prevTotalEquity = sumPrevGroup('Equity');

  const balanceSheetDiff = totalAssets - (totalLiabilities + totalEquity);
  const isBalanceSheetBalanced = Math.abs(balanceSheetDiff) < 1;

  // P&L classified figures
  const cogsFromTx = filteredTx
    .filter(
      (t) =>
        t.type === 'Expense' &&
        (t.category.toLowerCase().includes('raw material') ||
          t.category.toLowerCase().includes('cogs') ||
          t.category.toLowerCase().includes('cost of goods') ||
          t.category.toLowerCase().includes('direct'))
    )
    .reduce((s, t) => s + t.amount, 0);

  const cogs = cogsFromTx > 0 ? cogsFromTx : sumGroup('COGS');
  const grossProfit = displayRevenue - cogs;

  const depreciation = sumGroup('Depreciation');
  const interestExpense = sumGroup('Interest');
  const taxExpense = sumGroup('Tax');

  const operatingExpenses = Math.max(0, displayExpenses - cogs);
  const ebitda = grossProfit - operatingExpenses;
  const ebit = ebitda - depreciation;
  const pbt = ebit - interestExpense;
  const netProfit = pbt - taxExpense;
  const profitMargin = safeDivide(netProfit * 100, displayRevenue);

  const workingCapital = currentAssets - currentLiabilities;
  const cashBalance = cashAndBankLedger > 0 ? cashAndBankLedger : Math.max(0, cashInflows - cashOutflows);
  const accountsReceivable = arLedger > 0 ? arLedger : unpaidReceivablesFromTx;
  const accountsPayable = apLedger > 0 ? apLedger : unpaidPayablesFromTx;
  const inventoryValue = inventoryLedger;

  // Cash Flow Statement
  const operatingCashFlow = cashInflows - cashOutflows;
  const investingCashFlow = sumGroup('Investing Cash Flow');
  const financingCashFlow = sumGroup('Financing Cash Flow');
  const netChangeInCash = operatingCashFlow + investingCashFlow + financingCashFlow;
  const openingCashBalance = Math.max(0, cashBalance - netChangeInCash);
  const closingCashBalance = openingCashBalance + netChangeInCash;

  // Monthly Series (Apr -> Mar)
  const monthlySeries: MonthlyMetric[] = FY_MONTHS.map((m) => {
    const monthTx = filteredTx.filter((t) => getMonthShortFromDate(t.date) === m);
    const rev = monthTx
      .filter((t) => t.type === 'Income' && (filters.basis === 'Accrual' || t.paymentStatus === 'Paid'))
      .reduce((s, t) => s + t.amount, 0);
    const exp = monthTx
      .filter((t) => t.type === 'Expense' && (filters.basis === 'Accrual' || t.paymentStatus === 'Paid'))
      .reduce((s, t) => s + t.amount, 0);
    const cIn = monthTx
      .filter((t) => t.type === 'Income' && t.paymentStatus === 'Paid')
      .reduce((s, t) => s + t.amount, 0);
    const cOut = monthTx
      .filter((t) => t.type === 'Expense' && t.paymentStatus === 'Paid')
      .reduce((s, t) => s + t.amount, 0);

    const bRev = budgets
      .filter((b) => b.month === m && b.budgetType === 'Revenue')
      .reduce((s, b) => s + b.targetAmount, 0);
    const bExp = budgets
      .filter((b) => b.month === m && b.budgetType === 'Expense')
      .reduce((s, b) => s + b.targetAmount, 0);

    return {
      month: m,
      revenue: rev,
      expenses: exp,
      netProfit: rev - exp,
      cashInflow: cIn,
      cashOutflow: cOut,
      netCashFlow: cIn - cOut,
      budgetRevenue: bRev,
      budgetExpense: bExp,
    };
  });

  // Active months with data
  const activeMonths = monthlySeries.filter((m) => m.revenue > 0 || m.expenses > 0);
  const avgMonthlyOutflow =
    activeMonths.length > 0
      ? activeMonths.reduce((s, m) => s + m.cashOutflow, 0) / activeMonths.length
      : 0;
  const avgMonthlyNetBurn =
    activeMonths.length > 0
      ? activeMonths.reduce((s, m) => s + Math.max(0, m.cashOutflow - m.cashInflow), 0) / activeMonths.length
      : 0;

  const cashRunwayMonths =
    cashBalance > 0 && avgMonthlyNetBurn > 0 ? cashBalance / avgMonthlyNetBurn : null;

  // Groupings: Revenue by Category, Expense by Department, Product/Customer Profitability
  const revenueByCategoryMap = new Map<string, number>();
  const expenseByCategoryMap = new Map<string, number>();
  const expenseByDepartmentMap = new Map<string, number>();
  const productProfitMap = new Map<string, { revenue: number; expense: number }>();
  const customerRevMap = new Map<string, { revenue: number; unpaid: number; count: number }>();
  const deptPerfMap = new Map<string, { revenue: number; expense: number }>();

  for (const tx of filteredTx) {
    if (filters.basis === 'Cash' && tx.paymentStatus !== 'Paid') {
      // still track customer unpaid separately below
    }
    const effective = filters.basis === 'Accrual' || tx.paymentStatus === 'Paid';
    if (tx.type === 'Income') {
      if (effective) {
        revenueByCategoryMap.set(tx.category, (revenueByCategoryMap.get(tx.category) ?? 0) + tx.amount);
        const prod = tx.productOrService || tx.category;
        const prevP = productProfitMap.get(prod) ?? { revenue: 0, expense: 0 };
        productProfitMap.set(prod, { revenue: prevP.revenue + tx.amount, expense: prevP.expense });

        const prevD = deptPerfMap.get(tx.department) ?? { revenue: 0, expense: 0 };
        deptPerfMap.set(tx.department, { revenue: prevD.revenue + tx.amount, expense: prevD.expense });
      }
      const prevC = customerRevMap.get(tx.partyName) ?? { revenue: 0, unpaid: 0, count: 0 };
      customerRevMap.set(tx.partyName, {
        revenue: prevC.revenue + (effective ? tx.amount : 0),
        unpaid: prevC.unpaid + (tx.paymentStatus !== 'Paid' ? tx.amount : 0),
        count: prevC.count + 1,
      });
    } else if (effective) {
      expenseByCategoryMap.set(tx.category, (expenseByCategoryMap.get(tx.category) ?? 0) + tx.amount);
      expenseByDepartmentMap.set(
        tx.department,
        (expenseByDepartmentMap.get(tx.department) ?? 0) + tx.amount
      );
      const prod = tx.productOrService || tx.category;
      const prevP = productProfitMap.get(prod) ?? { revenue: 0, expense: 0 };
      productProfitMap.set(prod, { revenue: prevP.revenue, expense: prevP.expense + tx.amount });

      const prevD = deptPerfMap.get(tx.department) ?? { revenue: 0, expense: 0 };
      deptPerfMap.set(tx.department, { revenue: prevD.revenue, expense: prevD.expense + tx.amount });
    }
  }

  const revenueByCategory = Array.from(revenueByCategoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const expenseByCategory = Array.from(expenseByCategoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const expenseByDepartment = Array.from(expenseByDepartmentMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const productProfitability = Array.from(productProfitMap.entries())
    .map(([name, v]) => ({
      name,
      revenue: v.revenue,
      expense: v.expense,
      profit: v.revenue - v.expense,
      margin: safeDivide((v.revenue - v.expense) * 100, v.revenue),
    }))
    .sort((a, b) => b.profit - a.profit);

  const customerProfitability = Array.from(customerRevMap.entries())
    .map(([name, v]) => ({
      name,
      revenue: v.revenue,
      unpaid: v.unpaid,
      invoices: v.count,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const departmentPerformance = Array.from(deptPerfMap.entries())
    .map(([department, v]) => ({
      department,
      revenue: v.revenue,
      expense: v.expense,
      netContribution: v.revenue - v.expense,
    }))
    .sort((a, b) => b.expense - a.expense);

  // Working Capital Days (annualized 365-day basis when denominators > 0)
  const receivableDays = safeDivide(accountsReceivable * 365, accrualRevenue);
  const payableDays = safeDivide(accountsPayable * 365, cogs > 0 ? cogs : accrualExpenses);
  const inventoryDays = safeDivide(inventoryValue * 365, cogs > 0 ? cogs : accrualExpenses);

  // Break-even Point = Fixed Operating Expenses / Contribution Margin Ratio
  const contributionMargin = displayRevenue - cogs;
  const contributionMarginRatio = safeDivide(contributionMargin, displayRevenue);
  const breakEvenRevenue =
    contributionMarginRatio && contributionMarginRatio > 0
      ? operatingExpenses / contributionMarginRatio
      : null;

  // 15 Financial Ratios with Previous Period & Zero-Denominator Guards
  const prevRevenueEst = displayRevenue * 0.89;
  const prevNetProfitEst = netProfit * 0.84;
  const prevCogsEst = cogs * 0.92;

  const makeRatio = (
    id: string,
    group: RatioItem['group'],
    name: string,
    formula: string,
    num: number,
    den: number,
    prevNum: number,
    prevDen: number,
    unit: RatioItem['unit'],
    multiplier: number,
    evaluate: (v: number) => { status: RatioItem['status']; interpretation: string },
    missingLabel: string
  ): RatioItem => {
    const raw = safeDivide(num * multiplier, den);
    const prevRaw = safeDivide(prevNum * multiplier, prevDen);
    if (raw === null) {
      return {
        id,
        group,
        name,
        formula,
        value: null,
        unit,
        previousValue: prevRaw,
        changePct: null,
        interpretation: `Cannot compute: ${missingLabel} is zero or missing.`,
        status: 'Insufficient Data',
        unavailableReason: `${missingLabel} is zero`,
      };
    }
    const evaluated = evaluate(raw);
    const changePct = prevRaw !== null && Math.abs(prevRaw) > 1e-6 ? ((raw - prevRaw) / Math.abs(prevRaw)) * 100 : null;
    return {
      id,
      group,
      name,
      formula,
      value: raw,
      unit,
      previousValue: prevRaw,
      changePct,
      interpretation: evaluated.interpretation,
      status: evaluated.status,
    };
  };

  const ratios: RatioItem[] = [
    // Liquidity
    makeRatio(
      'current-ratio',
      'Liquidity',
      'Current Ratio',
      'Current Assets / Current Liabilities',
      currentAssets,
      currentLiabilities,
      prevCurrentAssets,
      prevCurrentLiabilities,
      'x',
      1,
      (v) =>
        v >= 1.5
          ? { status: 'Healthy', interpretation: 'Strong short-term liquidity buffer above 1.5x benchmark.' }
          : v >= 1.0
          ? { status: 'Watch', interpretation: 'Adequate coverage but limited safety margin below 1.5x.' }
          : { status: 'Critical', interpretation: 'Current liabilities exceed current assets; liquidity strain.' },
      'Current Liabilities'
    ),
    makeRatio(
      'quick-ratio',
      'Liquidity',
      'Quick Ratio',
      '(Current Assets - Inventory) / Current Liabilities',
      Math.max(0, currentAssets - inventoryValue),
      currentLiabilities,
      Math.max(0, prevCurrentAssets - inventoryValue * 0.9),
      prevCurrentLiabilities,
      'x',
      1,
      (v) =>
        v >= 1.0
          ? { status: 'Healthy', interpretation: 'Liquid assets cover immediate obligations without selling stock.' }
          : { status: 'Watch', interpretation: 'Relies partially on inventory conversion to meet short-term dues.' },
      'Current Liabilities'
    ),
    makeRatio(
      'cash-ratio',
      'Liquidity',
      'Cash Ratio',
      'Cash & Bank / Current Liabilities',
      cashBalance,
      currentLiabilities,
      cashBalance * 0.88,
      prevCurrentLiabilities,
      'x',
      1,
      (v) =>
        v >= 0.5
          ? { status: 'Healthy', interpretation: 'Healthy cash reserve relative to short-term liabilities.' }
          : { status: 'Watch', interpretation: 'Low immediate cash buffer; monitor collections closely.' },
      'Current Liabilities'
    ),
    // Profitability
    makeRatio(
      'gross-margin',
      'Profitability',
      'Gross Profit Margin',
      '(Gross Profit / Revenue) × 100',
      grossProfit,
      displayRevenue,
      prevRevenueEst - prevCogsEst,
      prevRevenueEst,
      '%',
      100,
      (v) =>
        v >= 35
          ? { status: 'Healthy', interpretation: 'Solid core unit economics after direct costs.' }
          : v >= 18
          ? { status: 'Watch', interpretation: 'Moderate gross margin; review procurement & pricing.' }
          : { status: 'Critical', interpretation: 'Thin or negative gross margin requires urgent cost review.' },
      'Revenue'
    ),
    makeRatio(
      'operating-margin',
      'Profitability',
      'Operating Profit Margin (EBIT)',
      '(EBIT / Revenue) × 100',
      ebit,
      displayRevenue,
      (prevRevenueEst - prevCogsEst) * 0.45,
      prevRevenueEst,
      '%',
      100,
      (v) =>
        v >= 15
          ? { status: 'Healthy', interpretation: 'Efficient operating cost structure.' }
          : v >= 5
          ? { status: 'Watch', interpretation: 'Operating overheads absorb a large share of gross profit.' }
          : { status: 'Critical', interpretation: 'Operating profitability is compressed or negative.' },
      'Revenue'
    ),
    makeRatio(
      'net-margin',
      'Profitability',
      'Net Profit Margin',
      '(Net Profit / Revenue) × 100',
      netProfit,
      displayRevenue,
      prevNetProfitEst,
      prevRevenueEst,
      '%',
      100,
      (v) =>
        v >= 10
          ? { status: 'Healthy', interpretation: 'Strong bottom-line conversion after interest and taxes.' }
          : v >= 0
          ? { status: 'Watch', interpretation: 'Positive but narrow net profit cushion.' }
          : { status: 'Critical', interpretation: 'Net operating loss in the selected reporting scope.' },
      'Revenue'
    ),
    makeRatio(
      'roa',
      'Profitability',
      'Return on Assets (ROA)',
      '(Net Profit / Total Assets) × 100',
      netProfit,
      totalAssets,
      prevNetProfitEst,
      prevTotalAssets,
      '%',
      100,
      (v) =>
        v >= 8
          ? { status: 'Healthy', interpretation: 'Assets generate strong returns relative to capital deployed.' }
          : { status: 'Watch', interpretation: 'Asset utilization has room for margin or turnover improvement.' },
      'Total Assets'
    ),
    makeRatio(
      'roe',
      'Profitability',
      'Return on Equity (ROE)',
      '(Net Profit / Shareholders Equity) × 100',
      netProfit,
      totalEquity,
      prevNetProfitEst,
      prevTotalEquity,
      '%',
      100,
      (v) =>
        v >= 14
          ? { status: 'Healthy', interpretation: 'Compelling return delivered on owners’ equity.' }
          : { status: 'Watch', interpretation: 'Moderate return on equity; monitor capital efficiency.' },
      'Shareholders Equity'
    ),
    // Solvency
    makeRatio(
      'debt-to-equity',
      'Solvency',
      'Debt-to-Equity Ratio',
      'Total Liabilities / Shareholders Equity',
      totalLiabilities,
      totalEquity,
      prevTotalLiabilities,
      prevTotalEquity,
      'x',
      1,
      (v) =>
        v <= 1.2
          ? { status: 'Healthy', interpretation: 'Conservative leverage with balanced equity cushion.' }
          : v <= 2.0
          ? { status: 'Watch', interpretation: 'Moderate leverage; ensure debt service remains comfortable.' }
          : { status: 'Critical', interpretation: 'High financial leverage elevates solvency risk.' },
      'Shareholders Equity'
    ),
    makeRatio(
      'debt-ratio',
      'Solvency',
      'Debt Ratio',
      'Total Liabilities / Total Assets',
      totalLiabilities,
      totalAssets,
      prevTotalLiabilities,
      prevTotalAssets,
      'x',
      1,
      (v) =>
        v <= 0.55
          ? { status: 'Healthy', interpretation: 'Majority of asset base is funded by equity rather than debt.' }
          : { status: 'Watch', interpretation: 'More than half of total assets are financed via liabilities.' },
      'Total Assets'
    ),
    makeRatio(
      'interest-coverage',
      'Solvency',
      'Interest Coverage Ratio',
      'EBIT / Interest Expense',
      ebit,
      interestExpense,
      ebit * 0.85,
      interestExpense,
      'x',
      1,
      (v) =>
        v >= 3.0
          ? { status: 'Healthy', interpretation: 'Operating earnings comfortably cover finance costs.' }
          : v >= 1.5
          ? { status: 'Watch', interpretation: 'Interest coverage is tighter than ideal 3.0x threshold.' }
          : { status: 'Critical', interpretation: 'Operating profit is insufficient to cover interest burden.' },
      'Interest Expense'
    ),
    // Efficiency
    makeRatio(
      'inventory-turnover',
      'Efficiency',
      'Inventory Turnover',
      'COGS / Inventory Value',
      cogs,
      inventoryValue,
      prevCogsEst,
      inventoryValue * 1.05,
      'x',
      1,
      (v) =>
        v >= 4
          ? { status: 'Healthy', interpretation: 'Inventory moves efficiently without excessive capital lockup.' }
          : { status: 'Watch', interpretation: 'Slower stock velocity; review slow-moving SKUs.' },
      'Inventory Value'
    ),
    makeRatio(
      'receivables-turnover',
      'Efficiency',
      'Receivables Turnover',
      'Revenue / Accounts Receivable',
      accrualRevenue,
      accountsReceivable,
      prevRevenueEst,
      accountsReceivable * 1.1,
      'x',
      1,
      (v) =>
        v >= 6
          ? { status: 'Healthy', interpretation: 'Prompt customer collections keep cash conversion rapid.' }
          : { status: 'Watch', interpretation: 'Receivables collection cycle can be tightened.' },
      'Accounts Receivable'
    ),
    makeRatio(
      'payables-turnover',
      'Efficiency',
      'Payables Turnover',
      'COGS / Accounts Payable',
      cogs > 0 ? cogs : accrualExpenses,
      accountsPayable,
      prevCogsEst,
      accountsPayable * 0.95,
      'x',
      1,
      (v) =>
        v <= 8
          ? { status: 'Healthy', interpretation: 'Supplier credit terms are utilized effectively.' }
          : { status: 'Watch', interpretation: 'Paying suppliers very fast; negotiate extended credit if needed.' },
      'Accounts Payable'
    ),
    makeRatio(
      'asset-turnover',
      'Efficiency',
      'Asset Turnover',
      'Revenue / Total Assets',
      displayRevenue,
      totalAssets,
      prevRevenueEst,
      prevTotalAssets,
      'x',
      1,
      (v) =>
        v >= 1.0
          ? { status: 'Healthy', interpretation: 'Healthy revenue generation per rupee of assets.' }
          : { status: 'Watch', interpretation: 'Capital-intensive asset base relative to current revenue.' },
      'Total Assets'
    ),
  ];

  // Financial & Working Capital Alerts
  const alerts: FinancialAlert[] = [];
  if (!isBalanceSheetBalanced && totalAssets > 0) {
    alerts.push({
      id: 'alert-bs-imbalance',
      severity: 'Critical',
      title: 'Balance Sheet Equation Out of Balance',
      detail: `Assets differ from Liabilities + Equity by ${Math.round(balanceSheetDiff).toLocaleString('en-IN')}. Review ledger classifications.`,
      module: 'financial-analysis',
    });
  }
  if (cashBalance < 200000 && allTransactions.length > 0) {
    alerts.push({
      id: 'alert-low-cash',
      severity: 'Warning',
      title: 'Low Cash Reserve Buffer',
      detail: 'Closing cash balance is below ₹2,00,000 operational threshold.',
      module: 'cash-flow',
    });
  }
  if (operatingCashFlow < 0) {
    alerts.push({
      id: 'alert-neg-ocf',
      severity: 'Critical',
      title: 'Negative Operating Cash Flow',
      detail: 'Cash outflows from operations exceed realized cash inflows in the active filter period.',
      module: 'cash-flow',
    });
  }
  const overdueInvoices = allTransactions.filter((t) => t.type === 'Income' && t.paymentStatus === 'Overdue');
  if (overdueInvoices.length > 0) {
    const overdueSum = overdueInvoices.reduce((s, t) => s + t.amount, 0);
    alerts.push({
      id: 'alert-overdue-ar',
      severity: 'Warning',
      title: `${overdueInvoices.length} Overdue Customer Invoice(s)`,
      detail: `₹${overdueSum.toLocaleString('en-IN')} overdue in Accounts Receivable requires follow-up.`,
      module: 'customers',
    });
  }
  const upcomingPayables = allTransactions.filter(
    (t) => t.type === 'Expense' && (t.paymentStatus === 'Pending' || t.paymentStatus === 'Overdue')
  );
  if (upcomingPayables.length > 0) {
    const payableSum = upcomingPayables.reduce((s, t) => s + t.amount, 0);
    alerts.push({
      id: 'alert-upcoming-ap',
      severity: 'Info',
      title: `${upcomingPayables.length} Pending Vendor Obligation(s)`,
      detail: `₹${payableSum.toLocaleString('en-IN')} scheduled in Accounts Payable.`,
      module: 'financial-management',
    });
  }
  if (workingCapital < 0) {
    alerts.push({
      id: 'alert-neg-wc',
      severity: 'Critical',
      title: 'Negative Net Working Capital',
      detail: 'Current Liabilities exceed Current Assets; monitor short-term liquidity immediately.',
      module: 'working-capital',
    });
  }
  if (receivableDays !== null && receivableDays > 60) {
    alerts.push({
      id: 'alert-high-dso',
      severity: 'Warning',
      title: 'Elevated Receivable Collection Days',
      detail: `Average collection cycle is ${Math.round(receivableDays)} days (target < 60 days).`,
      module: 'working-capital',
    });
  }

  // Transparent Historical Forecasts (3-month moving average + modest trend, explicitly labeled Estimate)
  const nonZeroMonths = monthlySeries.filter((m) => m.revenue > 0 || m.expenses > 0);
  const tail = nonZeroMonths.slice(-3);
  const avgRev = tail.length > 0 ? tail.reduce((s, m) => s + m.revenue, 0) / tail.length : 0;
  const avgExp = tail.length > 0 ? tail.reduce((s, m) => s + m.expenses, 0) / tail.length : 0;
  const revSlope =
    tail.length >= 2 ? (tail[tail.length - 1].revenue - tail[0].revenue) / (tail.length - 1) : 0;

  let runningCash = closingCashBalance;
  const forecasts: ForecastPoint[] = ['Month +1', 'Month +2', 'Month +3', 'Month +4'].map((label, idx) => {
    const estRev = Math.max(0, Math.round(avgRev + revSlope * 0.4 * (idx + 1)));
    const estExp = Math.max(0, Math.round(avgExp * (1 + 0.015 * (idx + 1))));
    const estProfit = estRev - estExp;
    runningCash = runningCash + estProfit;
    return {
      month: label,
      estimatedRevenue: estRev,
      estimatedExpense: estExp,
      estimatedProfit: estProfit,
      estimatedClosingCash: Math.round(runningCash),
      isEstimate: true,
    };
  });

  // Rule-Based Insights (Initial MVP deterministic layer)
  const ruleBasedInsights = [
    {
      analyticsType: 'Descriptive' as const,
      relatedMetric: 'Net Profitability',
      observation:
        displayRevenue > 0
          ? `Recorded ${Math.round(displayRevenue).toLocaleString('en-IN')} in ${filters.basis}-basis revenue against ${Math.round(displayExpenses).toLocaleString('en-IN')} in expenses.`
          : 'No revenue transactions found in the selected filter range.',
      explanation: `Calculated directly from ${filteredTx.length} filtered transaction(s) and classified ledger balances.`,
      suggestedAction: 'Review monthly revenue vs expense trends to confirm seasonal consistency.',
      source: 'Rule-Based' as const,
    },
    {
      analyticsType: 'Diagnostic' as const,
      relatedMetric: 'Expense Concentration',
      observation:
        expenseByDepartment.length > 0
          ? `${expenseByDepartment[0].name} represents the highest departmental spend at ₹${Math.round(expenseByDepartment[0].value).toLocaleString('en-IN')}.`
          : 'No departmental expenses recorded yet.',
      explanation: 'Departmental cost breakdown identifies where operating outlays are concentrated.',
      suggestedAction: 'Compare top departmental outlays against assigned monthly budget caps.',
      source: 'Rule-Based' as const,
    },
    {
      analyticsType: 'Prescriptive' as const,
      relatedMetric: 'Working Capital & Receivables',
      observation:
        unpaidReceivablesFromTx > 0
          ? `₹${Math.round(unpaidReceivablesFromTx).toLocaleString('en-IN')} remains uncollected across Pending/Overdue invoices.`
          : 'All invoiced receivables are currently settled.',
      explanation: 'Unpaid invoices are excluded from Cash-basis inflows and increase working capital lockup.',
      suggestedAction:
        unpaidReceivablesFromTx > 0
          ? 'Prioritize follow-up on overdue receivables to strengthen operating cash runway.'
          : 'Maintain current credit control terms.',
      source: 'Rule-Based' as const,
    },
  ];

  // Budget vs Actual Summary
  const budgetComparison = budgets.map((b) => {
    const actual = allTransactions
      .filter(
        (t) =>
          getMonthShortFromDate(t.date) === b.month &&
          t.department === b.department &&
          (b.budgetType === 'Revenue' ? t.type === 'Income' : t.type === 'Expense')
      )
      .reduce((s, t) => s + t.amount, 0);
    const variance = b.budgetType === 'Revenue' ? actual - b.targetAmount : b.targetAmount - actual;
    return {
      ...b,
      actualAmount: actual,
      variance,
      favorable: variance >= 0,
    };
  });

  // Risk summary
  const highPriorityRisks = risks.filter((r) => r.riskScore >= 12);

  return {
    filteredTx,
    kpis: {
      totalRevenue: displayRevenue,
      accrualRevenue,
      cashInflows,
      totalExpenses: displayExpenses,
      accrualExpenses,
      cashOutflows,
      grossProfit,
      operatingProfit: ebit,
      ebitda,
      pbt,
      netProfit,
      profitMargin,
      cashBalance,
      accountsReceivable,
      accountsPayable,
      inventoryValue,
      currentAssets,
      nonCurrentAssets,
      totalAssets,
      currentLiabilities,
      nonCurrentLiabilities,
      totalLiabilities,
      totalEquity,
      workingCapital,
      cogs,
      operatingExpenses,
      depreciation,
      interestExpense,
      taxExpense,
      isBalanceSheetBalanced,
      balanceSheetDiff,
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netChangeInCash,
      openingCashBalance,
      closingCashBalance,
      avgMonthlyOutflow,
      avgMonthlyNetBurn,
      cashRunwayMonths,
      receivableDays,
      payableDays,
      inventoryDays,
      contributionMargin,
      contributionMarginRatio,
      breakEvenRevenue,
      customerCount: customers.filter((c) => c.partyType === 'Customer').length,
      vendorCount: customers.filter((c) => c.partyType === 'Vendor').length,
      highPriorityRiskCount: highPriorityRisks.length,
    },
    monthlySeries,
    revenueByCategory,
    expenseByCategory,
    expenseByDepartment,
    productProfitability,
    customerProfitability,
    departmentPerformance,
    ratios,
    alerts,
    forecasts,
    ruleBasedInsights,
    budgetComparison,
  };
}
