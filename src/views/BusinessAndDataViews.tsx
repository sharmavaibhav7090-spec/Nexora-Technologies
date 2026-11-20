import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { CheckCircle2, FileSpreadsheet, Plus, Upload, AlertCircle, Download } from 'lucide-react';
import { BusinessProfile, DatasetRecord } from '../types/nexora';
import {
  createBusinessProfile,
  importDatasetBatch,
  updateBusinessProfile,
} from '../services/firestoreService';
import { DatasetParseResult, parseAndValidateSpreadsheet } from '../utils/datasetParser';
import { exportSheetToExcel } from '../utils/exportUtils';

export const BusinessProfileView: React.FC<{
  user: User;
  businesses: BusinessProfile[];
  activeBusiness: BusinessProfile;
  canWrite: boolean;
  onSelectBusiness: (id: string) => void;
}> = ({ user, businesses, activeBusiness, canWrite, onSelectBusiness }) => {
  const [editing, setEditing] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<BusinessProfile, 'id' | 'ownerId'>>({
    businessName: activeBusiness.businessName,
    businessType: activeBusiness.businessType,
    industry: activeBusiness.industry,
    registrationNumber: activeBusiness.registrationNumber ?? '',
    gstin: activeBusiness.gstin ?? '',
    pan: activeBusiness.pan ?? '',
    address: activeBusiness.address ?? '',
    state: activeBusiness.state ?? '',
    city: activeBusiness.city ?? '',
    contactPerson: activeBusiness.contactPerson ?? '',
    email: activeBusiness.email ?? '',
    phone: activeBusiness.phone ?? '',
    financialYear: activeBusiness.financialYear,
    defaultCurrency: activeBusiness.defaultCurrency,
    logoText: activeBusiness.logoText ?? '',
  });

  const openEdit = () => {
    setForm({
      businessName: activeBusiness.businessName,
      businessType: activeBusiness.businessType,
      industry: activeBusiness.industry,
      registrationNumber: activeBusiness.registrationNumber ?? '',
      gstin: activeBusiness.gstin ?? '',
      pan: activeBusiness.pan ?? '',
      address: activeBusiness.address ?? '',
      state: activeBusiness.state ?? '',
      city: activeBusiness.city ?? '',
      contactPerson: activeBusiness.contactPerson ?? '',
      email: activeBusiness.email ?? '',
      phone: activeBusiness.phone ?? '',
      financialYear: activeBusiness.financialYear,
      defaultCurrency: activeBusiness.defaultCurrency,
      logoText: activeBusiness.logoText ?? '',
    });
    setCreatingNew(false);
    setEditing(true);
    setFeedback(null);
  };

  const openNew = () => {
    setForm({
      businessName: '',
      businessType: 'Private Limited (SME)',
      industry: 'Technology & SaaS',
      registrationNumber: '',
      gstin: '',
      pan: '',
      address: '',
      state: 'Maharashtra',
      city: 'Mumbai',
      contactPerson: user.displayName || '',
      email: user.email || '',
      phone: '',
      financialYear: 'FY 2026-27',
      defaultCurrency: 'INR',
      logoText: '',
    });
    setEditing(true);
    setCreatingNew(true);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      if (creatingNew) {
        const newId = await createBusinessProfile(user, form);
        onSelectBusiness(newId);
        setFeedback('New business profile created and selected.');
      } else {
        await updateBusinessProfile(activeBusiness.id, activeBusiness.ownerId, user, form);
        setFeedback('Business profile updated.');
      }
      setEditing(false);
      setCreatingNew(false);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to save business profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Business Profiles & Multi-Entity Isolation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Switch between authorized business workspaces or update Indian statutory metadata (GSTIN, PAN, FY).
          </p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openEdit}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Edit Active Profile
            </button>
            <button
              type="button"
              onClick={openNew}
              className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> New Business
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2.5 text-xs text-blue-900">
          {feedback}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {creatingNew ? 'Create New Business Profile' : `Update ${activeBusiness.businessName}`}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Business Name *</span>
              <input
                required
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Business Type *</span>
              <select
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                <option>Private Limited (SME)</option>
                <option>LLP</option>
                <option>Sole Proprietorship</option>
                <option>Partnership Firm</option>
                <option>Startup (DPIIT)</option>
              </select>
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Industry *</span>
              <input
                required
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>

            <label className="text-xs block">
              <span className="font-medium text-slate-700">CIN / Registration No.</span>
              <input
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">GSTIN (Optional)</span>
              <input
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                placeholder="29AABCA4821M1Z5"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">PAN (Optional)</span>
              <input
                value={form.pan}
                onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                placeholder="AABCA4821M"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>

            <label className="text-xs block">
              <span className="font-medium text-slate-700">Financial Year</span>
              <select
                value={form.financialYear}
                onChange={(e) => setForm({ ...form, financialYear: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                <option>FY 2026-27</option>
                <option>FY 2025-26</option>
                <option>FY 2024-25</option>
              </select>
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Default Currency</span>
              <select
                value={form.defaultCurrency}
                onChange={(e) =>
                  setForm({ ...form, defaultCurrency: e.target.value as BusinessProfile['defaultCurrency'] })
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs bg-white"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </label>
            <label className="text-xs block">
              <span className="font-medium text-slate-700">Logo Monogram (2–4 chars)</span>
              <input
                maxLength={6}
                value={form.logoText}
                onChange={(e) => setForm({ ...form, logoText: e.target.value.toUpperCase() })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>

            <label className="text-xs block md:col-span-2">
              <span className="font-medium text-slate-700">Registered Address</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs block">
                <span className="font-medium text-slate-700">City</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
              <label className="text-xs block">
                <span className="font-medium text-slate-700">State</span>
                <input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
                />
              </label>
            </div>

            <label className="text-xs block">
              <span className="font-medium text-slate-700">Contact Person</span>
              <input
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
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
              <span className="font-medium text-slate-700">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-mono"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : creatingNew ? 'Create Business' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
              <div className="w-12 h-12 rounded-lg bg-[#0B1B3B] text-white flex items-center justify-center font-display font-bold text-sm tracking-wide">
                {activeBusiness.logoText || activeBusiness.businessName.slice(0, 3).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{activeBusiness.businessName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeBusiness.businessType} · {activeBusiness.industry} · {activeBusiness.financialYear}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 text-xs">
              <div>
                <dt className="text-slate-500">Registration / CIN</dt>
                <dd className="font-mono text-slate-900 mt-0.5">{activeBusiness.registrationNumber || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">GSTIN</dt>
                <dd className="font-mono text-slate-900 mt-0.5">{activeBusiness.gstin || 'Unregistered / Not provided'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">PAN</dt>
                <dd className="font-mono text-slate-900 mt-0.5">{activeBusiness.pan || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Default Currency & FY</dt>
                <dd className="font-mono text-slate-900 mt-0.5">
                  {activeBusiness.defaultCurrency} · {activeBusiness.financialYear} (Apr–Mar)
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Registered Address</dt>
                <dd className="text-slate-900 mt-0.5">
                  {[activeBusiness.address, activeBusiness.city, activeBusiness.state].filter(Boolean).join(', ') || 'Not provided'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Primary Contact</dt>
                <dd className="text-slate-900 mt-0.5">{activeBusiness.contactPerson || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email & Phone</dt>
                <dd className="text-slate-900 mt-0.5">
                  {activeBusiness.email || '—'} · {activeBusiness.phone || '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Your Authorized Businesses</h3>
            <p className="text-xs text-slate-500 mb-4">Isolated Firestore workspace per business ID</p>
            <div className="space-y-2">
              {businesses.map((biz) => {
                const isSelected = biz.id === activeBusiness.id;
                return (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => onSelectBusiness(biz.id)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 truncate">{biz.businessName}</span>
                      {isSelected && <span className="text-[11px] font-medium text-blue-700">Active</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {biz.city || 'India'} · {biz.defaultCurrency} · {biz.financialYear}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DataManagementView: React.FC<{
  user: User;
  business: BusinessProfile;
  datasets: DatasetRecord[];
  canWrite: boolean;
}> = ({ user, business, datasets, canWrite }) => {
  const [dataType, setDataType] = useState<DatasetRecord['dataType']>('Transactions');
  const [parseResult, setParseResult] = useState<DatasetParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setImportSuccess(null);
    try {
      const result = await parseAndValidateSpreadsheet(file);
      setParseResult(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Unable to parse uploaded file.');
      setParseResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    exportSheetToExcel('Nexora_Import_Template.xlsx', [
      {
        name: 'Transactions',
        rows: [
          {
            Date: '2026-11-15',
            Type: 'Income',
            PartyName: 'Apex Industrial Corp',
            Category: 'Product Sales',
            Department: 'Sales',
            InvoiceNumber: 'INV-2699',
            ProductOrService: 'Precision Shafts',
            Description: 'Sample valid sales entry',
            Amount: 185000,
            GSTAmount: 33300,
            PaymentStatus: 'Paid',
            PaymentMethod: 'NEFT',
          },
          {
            Date: '2026-11-16',
            Type: 'Expense',
            PartyName: 'Metro Logistics',
            Category: 'Logistics & Freight',
            Department: 'Logistics',
            InvoiceNumber: 'PO-1290',
            ProductOrService: 'Precision Shafts',
            Description: 'Sample valid expense entry',
            Amount: 24500,
            GSTAmount: 4410,
            PaymentStatus: 'Pending',
            PaymentMethod: 'RTGS',
          },
        ],
      },
    ]);
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0 || !canWrite) return;
    setImporting(true);
    setParseError(null);
    try {
      const mappedRows = parseResult.validRows
        .map((r) => r.mapped)
        .filter((m): m is NonNullable<typeof m> => Boolean(m));
      await importDatasetBatch(
        business.id,
        business.ownerId,
        user,
        {
          fileName: parseResult.fileName,
          dataType,
          rowCount: parseResult.totalRows,
          validRows: parseResult.validRows.length,
          errorCount: parseResult.invalidRows.length,
          processingStatus: parseResult.invalidRows.length > 0 ? 'Needs Review' : 'Imported',
          validationSummary: parseResult.summaryText,
        },
        mappedRows
      );
      setImportSuccess(
        `Imported ${mappedRows.length} validated records from ${parseResult.fileName} into ${business.businessName}.`
      );
      setParseResult(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to import dataset.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload & Validation Workbench */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Excel & CSV Data Upload & Validation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload `.xlsx`, `.xls`, or `.csv` files. Nexora validates dates, numeric amounts, missing fields, duplicates, and category consistency before committing to Firestore.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Download Sample Excel Template
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 items-end">
          <label className="text-xs block">
            <span className="font-medium text-slate-700">Dataset Classification</span>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value as DatasetRecord['dataType'])}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-xs bg-white"
            >
              <option value="Transactions">Financial Transactions</option>
              <option value="Sales">Sales Records</option>
              <option value="Purchases">Purchase Records</option>
              <option value="Expenses">Expense Records</option>
              <option value="Customers">Customer / Party Ledger</option>
              <option value="Inventory">Inventory Movements</option>
            </select>
          </label>

          <label className="text-xs block md:col-span-2">
            <span className="font-medium text-slate-700">Select Excel (.xlsx/.xls) or CSV File</span>
            <div className="mt-1 flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-medium text-slate-700">
                <Upload className="w-4 h-4 text-blue-700" />
                <span>{canWrite ? 'Choose Spreadsheet to Parse & Validate' : 'Read-Only Role Cannot Upload'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  disabled={!canWrite}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </label>
        </div>

        {parseError && (
          <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {importSuccess && (
          <div className="mt-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        {parseResult && (
          <div className="mt-6 pt-5 border-t border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Validation Preview: {parseResult.fileName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total Rows: {parseResult.totalRows} · Valid: {parseResult.validRows.length} · Flagged:{' '}
                  {parseResult.invalidRows.length} · Duplicates: {parseResult.duplicateCount}
                </p>
              </div>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || parseResult.validRows.length === 0 || !canWrite}
                className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {importing ? 'Importing to Ledger...' : `Import ${parseResult.validRows.length} Validated Rows`}
              </button>
            </div>

            {parseResult.inconsistentCategories.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
                Inconsistent category casing detected: {parseResult.inconsistentCategories.join(', ')}
              </div>
            )}

            {parseResult.invalidRows.length > 0 && (
              <div className="overflow-x-auto border border-red-200 rounded-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-red-50 text-red-900">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row #</th>
                      <th className="px-3 py-2 font-medium">Validation Issues</th>
                      <th className="px-3 py-2 font-medium">Raw Snapshot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {parseResult.invalidRows.slice(0, 10).map((row) => (
                      <tr key={row.rowIndex}>
                        <td className="px-3 py-2 font-mono">{row.rowIndex}</td>
                        <td className="px-3 py-2 text-red-700">{row.issues.join('; ')}</td>
                        <td className="px-3 py-2 text-slate-600 font-mono truncate max-w-md">
                          {JSON.stringify(row.raw)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {parseResult.validRows.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Party</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Department</th>
                      <th className="px-3 py-2 font-medium text-right">Amount</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.validRows.slice(0, 12).map((row) => (
                      <tr key={row.rowIndex}>
                        <td className="px-3 py-2 font-mono">{row.mapped?.date}</td>
                        <td className="px-3 py-2">{row.mapped?.type}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{row.mapped?.partyName}</td>
                        <td className="px-3 py-2">{row.mapped?.category}</td>
                        <td className="px-3 py-2">{row.mapped?.department}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {row.mapped?.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-2">{row.mapped?.paymentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dataset Registry History */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-semibold text-slate-900">Dataset Registry & Upload History</h3>
          </div>
          <span className="text-xs font-mono text-slate-500">{datasets.length} datasets</span>
        </div>

        {datasets.length === 0 ? (
          <p className="text-xs text-slate-500 py-6">
            No spreadsheet datasets uploaded yet for {business.businessName}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-medium">File Name</th>
                  <th className="px-3 py-2.5 font-medium">Data Type</th>
                  <th className="px-3 py-2.5 font-medium text-right">Total Rows</th>
                  <th className="px-3 py-2.5 font-medium text-right">Valid</th>
                  <th className="px-3 py-2.5 font-medium text-right">Flagged</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Validation Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-medium text-slate-900">{ds.fileName}</td>
                    <td className="px-3 py-2.5 text-slate-600">{ds.dataType}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{ds.rowCount}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-emerald-700">{ds.validRows}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-red-700">{ds.errorCount}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{ds.processingStatus}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-md truncate">{ds.validationSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
