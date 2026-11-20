import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AIInsightRecord,
  AuditLogRecord,
  BudgetRecord,
  BusinessProfile,
  CustomerParty,
  DatasetRecord,
  LedgerAccount,
  RiskRecord,
  SubscriptionRecord,
  TransactionRecord,
  UserProfile,
  UserRole,
} from '../types/nexora';
import { getIndianSMESampleBundle } from '../utils/seedData';

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      return data;
    }
    const isAdminUser = user.email === 'sharmavaibhav7090@gmail.com';
    const role: UserRole = isAdminUser ? 'Administrator' : 'Business Owner';
    const payload = {
      uid: user.uid,
      email: (user.email || 'user@nexora.in').slice(0, 254),
      displayName: (user.displayName || user.email?.split('@')[0] || 'Nexora User').slice(0, 120),
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    return {
      uid: payload.uid,
      email: payload.email,
      displayName: payload.displayName,
      role,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserActiveBusiness(uid: string, activeBusinessId: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      activeBusinessId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeBusinesses(
  uid: string,
  onData: (businesses: BusinessProfile[]) => void
): () => void {
  const path = 'businesses';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: BusinessProfile[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BusinessProfile, 'id'>),
      }));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeBusinessCollection<T extends { id: string }>(
  businessId: string,
  subcollection: string,
  ownerId: string,
  onData: (items: T[]) => void
): () => void {
  const path = `businesses/${businessId}/${subcollection}`;
  const q = query(collection(db, 'businesses', businessId, subcollection), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<T, 'id'>),
      })) as T[];
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function logAuditEvent(
  businessId: string,
  ownerId: string,
  user: User,
  action: string,
  entityType: string,
  entityId: string,
  summary: string
): Promise<void> {
  const id = makeId('log');
  const path = `businesses/${businessId}/auditLogs/${id}`;
  try {
    await setDoc(doc(db, 'businesses', businessId, 'auditLogs', id), {
      businessId,
      ownerId,
      actorUid: user.uid,
      actorEmail: (user.email || 'unknown@nexora.in').slice(0, 254),
      action: action.slice(0, 80),
      entityType: entityType.slice(0, 64),
      entityId: entityId.slice(0, 128),
      summary: summary.slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createBusinessProfile(
  user: User,
  data: Omit<BusinessProfile, 'id' | 'ownerId'>
): Promise<string> {
  const id = makeId('biz');
  const path = `businesses/${id}`;
  try {
    await setDoc(doc(db, 'businesses', id), {
      businessName: data.businessName.slice(0, 160),
      businessType: data.businessType.slice(0, 80),
      industry: data.industry.slice(0, 80),
      registrationNumber: (data.registrationNumber ?? '').slice(0, 64),
      gstin: (data.gstin ?? '').slice(0, 20),
      pan: (data.pan ?? '').slice(0, 16),
      address: (data.address ?? '').slice(0, 300),
      state: (data.state ?? '').slice(0, 80),
      city: (data.city ?? '').slice(0, 80),
      contactPerson: (data.contactPerson ?? '').slice(0, 120),
      email: (data.email ?? '').slice(0, 254),
      phone: (data.phone ?? '').slice(0, 32),
      financialYear: data.financialYear.slice(0, 24),
      defaultCurrency: data.defaultCurrency,
      logoText: (data.logoText ?? data.businessName.slice(0, 3).toUpperCase()).slice(0, 16),
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAuditEvent(id, user.uid, user, 'CREATE_BUSINESS', 'Business', id, `Created business ${data.businessName}`);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBusinessProfile(
  businessId: string,
  ownerId: string,
  user: User,
  data: Partial<Omit<BusinessProfile, 'id' | 'ownerId'>>
): Promise<void> {
  const path = `businesses/${businessId}`;
  try {
    await updateDoc(doc(db, 'businesses', businessId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    await logAuditEvent(businessId, ownerId, user, 'UPDATE_BUSINESS', 'Business', businessId, 'Updated business profile settings');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function seedSampleBusiness(user: User): Promise<string> {
  const bundle = getIndianSMESampleBundle();
  const businessId = makeId('biz');
  const path = `businesses/${businessId}`;

  try {
    // 1. Create parent business first so Master Gate exists() succeeds for subcollection writes
    await setDoc(doc(db, 'businesses', businessId), {
      ...bundle.business,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const batch = writeBatch(db);

    for (const acc of bundle.accounts) {
      const id = makeId('acc');
      batch.set(doc(db, 'businesses', businessId, 'accounts', id), {
        ...acc,
        businessId,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const tx of bundle.transactions) {
      const id = makeId('tx');
      batch.set(doc(db, 'businesses', businessId, 'transactions', id), {
        ...tx,
        businessId,
        ownerId: user.uid,
        createdBy: user.email || 'user@nexora.in',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const b of bundle.budgets) {
      const id = makeId('bdg');
      batch.set(doc(db, 'businesses', businessId, 'budgets', id), {
        ...b,
        businessId,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const r of bundle.risks) {
      const id = makeId('rsk');
      batch.set(doc(db, 'businesses', businessId, 'risks', id), {
        ...r,
        businessId,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const c of bundle.customers) {
      const id = makeId('pty');
      batch.set(doc(db, 'businesses', businessId, 'customers', id), {
        ...c,
        businessId,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const d of bundle.datasets) {
      const id = makeId('dst');
      batch.set(doc(db, 'businesses', businessId, 'datasets', id), {
        ...d,
        businessId,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const subId = makeId('sub');
    batch.set(doc(db, 'businesses', businessId, 'subscriptions', subId), {
      ...bundle.subscription,
      businessId,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logId = makeId('log');
    batch.set(doc(db, 'businesses', businessId, 'auditLogs', logId), {
      businessId,
      ownerId: user.uid,
      actorUid: user.uid,
      actorEmail: (user.email || 'user@nexora.in').slice(0, 254),
      action: 'SEED_SAMPLE_SME',
      entityType: 'Business',
      entityId: businessId,
      summary: `Initialized Indian SME sample workspace: ${bundle.business.businessName}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return businessId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addTransaction(
  businessId: string,
  ownerId: string,
  user: User,
  tx: Omit<TransactionRecord, 'id' | 'businessId' | 'ownerId' | 'createdBy'>
): Promise<string> {
  const id = makeId('tx');
  const path = `businesses/${businessId}/transactions/${id}`;
  try {
    await setDoc(doc(db, 'businesses', businessId, 'transactions', id), {
      businessId,
      ownerId,
      type: tx.type,
      date: tx.date.slice(0, 32),
      partyName: tx.partyName.slice(0, 160),
      category: tx.category.slice(0, 80),
      department: tx.department.slice(0, 80),
      invoiceNumber: (tx.invoiceNumber ?? '').slice(0, 64),
      productOrService: (tx.productOrService ?? tx.category).slice(0, 120),
      description: (tx.description ?? '').slice(0, 500),
      amount: Number(tx.amount),
      gstAmount: Number(tx.gstAmount || 0),
      paymentStatus: tx.paymentStatus,
      paymentMethod: tx.paymentMethod.slice(0, 60),
      createdBy: (user.email || 'user@nexora.in').slice(0, 254),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAuditEvent(
      businessId,
      ownerId,
      user,
      `ADD_${tx.type.toUpperCase()}`,
      'Transaction',
      id,
      `${tx.type} ₹${tx.amount} — ${tx.partyName} (${tx.paymentStatus})`
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTransaction(
  businessId: string,
  ownerId: string,
  user: User,
  id: string,
  updates: Partial<Omit<TransactionRecord, 'id' | 'businessId' | 'ownerId' | 'createdBy'>>
): Promise<void> {
  const path = `businesses/${businessId}/transactions/${id}`;
  try {
    await updateDoc(doc(db, 'businesses', businessId, 'transactions', id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    await logAuditEvent(businessId, ownerId, user, 'UPDATE_TRANSACTION', 'Transaction', id, `Updated transaction ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTransaction(
  businessId: string,
  ownerId: string,
  user: User,
  id: string
): Promise<void> {
  const path = `businesses/${businessId}/transactions/${id}`;
  try {
    await deleteDoc(doc(db, 'businesses', businessId, 'transactions', id));
    await logAuditEvent(businessId, ownerId, user, 'DELETE_TRANSACTION', 'Transaction', id, `Deleted transaction ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function importDatasetBatch(
  businessId: string,
  ownerId: string,
  user: User,
  datasetMeta: Omit<DatasetRecord, 'id' | 'businessId' | 'ownerId' | 'createdAt'>,
  rows: Omit<TransactionRecord, 'id' | 'businessId' | 'ownerId' | 'createdBy'>[]
): Promise<void> {
  const dsId = makeId('dst');
  const path = `businesses/${businessId}/datasets/${dsId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'businesses', businessId, 'datasets', dsId), {
      businessId,
      ownerId,
      fileName: datasetMeta.fileName.slice(0, 200),
      dataType: datasetMeta.dataType,
      rowCount: datasetMeta.rowCount,
      validRows: datasetMeta.validRows,
      errorCount: datasetMeta.errorCount,
      processingStatus: datasetMeta.processingStatus,
      validationSummary: (datasetMeta.validationSummary ?? '').slice(0, 1000),
      uploadedBy: (user.email || 'user@nexora.in').slice(0, 254),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const tx of rows.slice(0, 250)) {
      const txId = makeId('tx');
      batch.set(doc(db, 'businesses', businessId, 'transactions', txId), {
        businessId,
        ownerId,
        type: tx.type,
        date: tx.date.slice(0, 32),
        partyName: tx.partyName.slice(0, 160),
        category: tx.category.slice(0, 80),
        department: tx.department.slice(0, 80),
        invoiceNumber: (tx.invoiceNumber ?? '').slice(0, 64),
        productOrService: (tx.productOrService ?? tx.category).slice(0, 120),
        description: (tx.description ?? '').slice(0, 500),
        amount: Number(tx.amount),
        gstAmount: Number(tx.gstAmount || 0),
        paymentStatus: tx.paymentStatus,
        paymentMethod: tx.paymentMethod.slice(0, 60),
        createdBy: (user.email || 'user@nexora.in').slice(0, 254),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    await logAuditEvent(
      businessId,
      ownerId,
      user,
      'IMPORT_DATASET',
      'Dataset',
      dsId,
      `Imported ${rows.length} rows from ${datasetMeta.fileName}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveLedgerAccount(
  businessId: string,
  ownerId: string,
  user: User,
  account: Omit<LedgerAccount, 'id' | 'businessId' | 'ownerId'>,
  existingId?: string
): Promise<void> {
  const id = existingId || makeId('acc');
  const path = `businesses/${businessId}/accounts/${id}`;
  try {
    if (existingId) {
      await updateDoc(doc(db, 'businesses', businessId, 'accounts', existingId), {
        code: account.code.slice(0, 24),
        name: account.name.slice(0, 120),
        accountGroup: account.accountGroup,
        balance: Number(account.balance),
        previousBalance: Number(account.previousBalance),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'businesses', businessId, 'accounts', id), {
        businessId,
        ownerId,
        code: account.code.slice(0, 24),
        name: account.name.slice(0, 120),
        accountGroup: account.accountGroup,
        balance: Number(account.balance),
        previousBalance: Number(account.previousBalance),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await logAuditEvent(businessId, ownerId, user, existingId ? 'UPDATE_ACCOUNT' : 'CREATE_ACCOUNT', 'Account', id, `${account.code} ${account.name}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addBudget(
  businessId: string,
  ownerId: string,
  user: User,
  budget: Omit<BudgetRecord, 'id' | 'businessId' | 'ownerId'>
): Promise<void> {
  const id = makeId('bdg');
  const path = `businesses/${businessId}/budgets/${id}`;
  try {
    await setDoc(doc(db, 'businesses', businessId, 'budgets', id), {
      businessId,
      ownerId,
      month: budget.month.slice(0, 20),
      financialYear: budget.financialYear.slice(0, 24),
      department: budget.department.slice(0, 80),
      category: budget.category.slice(0, 80),
      budgetType: budget.budgetType,
      targetAmount: Number(budget.targetAmount),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAuditEvent(businessId, ownerId, user, 'CREATE_BUDGET', 'Budget', id, `${budget.month} ${budget.department} ${budget.budgetType} target ₹${budget.targetAmount}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteBudget(businessId: string, id: string): Promise<void> {
  const path = `businesses/${businessId}/budgets/${id}`;
  try {
    await deleteDoc(doc(db, 'businesses', businessId, 'budgets', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addRisk(
  businessId: string,
  ownerId: string,
  user: User,
  risk: Omit<RiskRecord, 'id' | 'businessId' | 'ownerId'>
): Promise<void> {
  const id = makeId('rsk');
  const path = `businesses/${businessId}/risks/${id}`;
  try {
    await setDoc(doc(db, 'businesses', businessId, 'risks', id), {
      businessId,
      ownerId,
      category: risk.category,
      description: risk.description.slice(0, 600),
      probability: Math.round(risk.probability),
      impact: Math.round(risk.impact),
      financialImpact: Number(risk.financialImpact),
      riskScore: Math.round(risk.riskScore),
      riskLevel: risk.riskLevel,
      mitigationStrategy: (risk.mitigationStrategy ?? '').slice(0, 600),
      responsiblePerson: (risk.responsiblePerson ?? '').slice(0, 120),
      reviewDate: (risk.reviewDate ?? '').slice(0, 32),
      status: risk.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAuditEvent(businessId, ownerId, user, 'CREATE_RISK', 'Risk', id, `${risk.category} (${risk.riskLevel}, score ${risk.riskScore})`);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateRiskStatus(
  businessId: string,
  id: string,
  status: RiskRecord['status']
): Promise<void> {
  const path = `businesses/${businessId}/risks/${id}`;
  try {
    await updateDoc(doc(db, 'businesses', businessId, 'risks', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveAIInsightsBatch(
  businessId: string,
  ownerId: string,
  insights: Omit<AIInsightRecord, 'id' | 'businessId' | 'ownerId'>[]
): Promise<void> {
  const path = `businesses/${businessId}/aiInsights`;
  try {
    const batch = writeBatch(db);
    for (const item of insights) {
      const id = makeId('ins');
      batch.set(doc(db, 'businesses', businessId, 'aiInsights', id), {
        businessId,
        ownerId,
        analyticsType: item.analyticsType,
        relatedMetric: item.relatedMetric.slice(0, 120),
        observation: item.observation.slice(0, 800),
        explanation: item.explanation.slice(0, 1200),
        suggestedAction: item.suggestedAction.slice(0, 800),
        confidenceLevel: item.confidenceLevel,
        source: item.source,
        status: item.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addCustomerParty(
  businessId: string,
  ownerId: string,
  user: User,
  party: Omit<CustomerParty, 'id' | 'businessId' | 'ownerId'>
): Promise<void> {
  const id = makeId('pty');
  const path = `businesses/${businessId}/customers/${id}`;
  try {
    await setDoc(doc(db, 'businesses', businessId, 'customers', id), {
      businessId,
      ownerId,
      partyType: party.partyType,
      name: party.name.slice(0, 160),
      gstin: (party.gstin ?? '').slice(0, 20),
      email: (party.email ?? '').slice(0, 254),
      phone: (party.phone ?? '').slice(0, 32),
      city: (party.city ?? '').slice(0, 80),
      paymentTermsDays: Math.round(party.paymentTermsDays),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAuditEvent(businessId, ownerId, user, 'CREATE_PARTY', party.partyType, id, `Added ${party.partyType}: ${party.name}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveSubscription(
  businessId: string,
  ownerId: string,
  user: User,
  sub: Omit<SubscriptionRecord, 'id' | 'businessId' | 'ownerId'>,
  existingId?: string
): Promise<void> {
  const id = existingId || makeId('sub');
  const path = `businesses/${businessId}/subscriptions/${id}`;
  try {
    if (existingId) {
      await updateDoc(doc(db, 'businesses', businessId, 'subscriptions', existingId), {
        planName: sub.planName,
        monthlyPrice: Number(sub.monthlyPrice),
        startDate: sub.startDate.slice(0, 32),
        expiryDate: sub.expiryDate.slice(0, 32),
        paymentStatus: sub.paymentStatus,
        renewalStatus: sub.renewalStatus,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'businesses', businessId, 'subscriptions', id), {
        businessId,
        ownerId,
        planName: sub.planName,
        monthlyPrice: Number(sub.monthlyPrice),
        startDate: sub.startDate.slice(0, 32),
        expiryDate: sub.expiryDate.slice(0, 32),
        paymentStatus: sub.paymentStatus,
        renewalStatus: sub.renewalStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await logAuditEvent(businessId, ownerId, user, 'UPDATE_SUBSCRIPTION', 'Subscription', id, `Plan ${sub.planName} (₹${sub.monthlyPrice}/mo) — ${sub.paymentStatus}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export type { AuditLogRecord };
