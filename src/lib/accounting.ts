/**
 * طبقة الخدمات المحاسبية المركزية — Accounting Service Layer
 *
 * المسؤولة عن:
 *   - خصم المصروفات من الصناديق
 *   - إضافة التحصيلات (المدفوعات) إلى الصناديق
 *   - تسجيل كل حركة مالية في سجل العمليات (TransactionLedger)
 *   - تحديث أرصدة الصناديق ذرياً
 *
 * كل الدوال هنا تنفذ داخل db.$transaction لضمان الذرية.
 * إذا فشل أي جزء، تُلغى العملية بالكامل.
 */

import { db } from "./db";

export interface CashBoxRef {
  id: string;
  code: string;
  name: string;
  currency: string;
  balance: number;
}

/** الحصول على الصندوق الافتراضي للعملة المحددة */
export async function getDefaultCashBox(currency: string): Promise<CashBoxRef | null> {
  // محاولة إيجاد صندوق نقدي بنفس العملة
  let box = await db.cashBox.findFirst({
    where: { currency, kind: "cash", isActive: true },
  });
  if (!box) {
    // إنشاء صناديق افتراضية إذا لم تكن موجودة
    box = await db.cashBox.create({
      data: {
        code: `CASH_${currency}`,
        name: `الصندوق النقدي (${currency})`,
        kind: "cash",
        currency,
        balance: 0,
        isActive: true,
      },
    });
  }
  return {
    id: box.id,
    code: box.code,
    name: box.name,
    currency: box.currency,
    balance: box.balance,
  };
}

/** الحصول على جميع الصناديق */
export async function listCashBoxes(): Promise<CashBoxRef[]> {
  const boxes = await db.cashBox.findMany({
    where: { isActive: true },
    orderBy: [{ currency: "asc" }, { kind: "asc" }],
  });
  return boxes.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    currency: b.currency,
    balance: b.balance,
  }));
}

/**
 * خصم مبلغ من صندوق — يُستخدم عند تسجيل مصروف.
 * ينشئ سجل debit في TransactionLedger ويخصم من رصيد الصندوق.
 */
export async function debitCashBox(params: {
  cashBoxId: string;
  amount: number;
  currency: string;
  reason: string;
  moduleKey: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actorUsername: string;
}): Promise<{ txNumber: string; newBalance: number }> {
  const { cashBoxId, amount, currency, reason, moduleKey, relatedEntityType, relatedEntityId, actorUsername } = params;

  if (amount <= 0) {
    throw new Error("debit_amount_must_be_positive");
  }

  const seq = (await db.transactionLedger.count()) + 1;
  const txNumber = `TX-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;

  // تنفيذ ذري: تحديث الرصيد + إنشاء سجل الحركة
  const updated = await db.$transaction(async (tx) => {
    const box = await tx.cashBox.findUnique({ where: { id: cashBoxId } });
    if (!box) throw new Error("cashbox_not_found");
    if (box.currency !== currency) {
      throw new Error(`currency_mismatch:cashbox_${box.currency}_expense_${currency}`);
    }

    const newBalance = box.balance - amount;
    const updatedBox = await tx.cashBox.update({
      where: { id: cashBoxId },
      data: { balance: newBalance },
    });

    const ledger = await tx.transactionLedger.create({
      data: {
        txNumber,
        cashBoxId,
        cashBoxCode: box.code,
        direction: "debit",
        amount,
        currency,
        reason,
        moduleKey,
        relatedEntityType,
        relatedEntityId,
        actorUsername,
      },
    });

    return { txNumber: ledger.txNumber, newBalance: updatedBox.balance };
  });

  return updated;
}

/**
 * إضافة مبلغ إلى صندوق — يُستخدم عند تحصيل دفعة.
 * ينشئ سجل credit في TransactionLedger ويضيف إلى رصيد الصندوق.
 */
export async function creditCashBox(params: {
  cashBoxId: string;
  amount: number;
  currency: string;
  reason: string;
  moduleKey: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actorUsername: string;
}): Promise<{ txNumber: string; newBalance: number }> {
  const { cashBoxId, amount, currency, reason, moduleKey, relatedEntityType, relatedEntityId, actorUsername } = params;

  if (amount <= 0) {
    throw new Error("credit_amount_must_be_positive");
  }

  const seq = (await db.transactionLedger.count()) + 1;
  const txNumber = `TX-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;

  const updated = await db.$transaction(async (tx) => {
    const box = await tx.cashBox.findUnique({ where: { id: cashBoxId } });
    if (!box) throw new Error("cashbox_not_found");
    if (box.currency !== currency) {
      throw new Error(`currency_mismatch:cashbox_${box.currency}_payment_${currency}`);
    }

    const newBalance = box.balance + amount;
    const updatedBox = await tx.cashBox.update({
      where: { id: cashBoxId },
      data: { balance: newBalance },
    });

    const ledger = await tx.transactionLedger.create({
      data: {
        txNumber,
        cashBoxId,
        cashBoxCode: box.code,
        direction: "credit",
        amount,
        currency,
        reason,
        moduleKey,
        relatedEntityType,
        relatedEntityId,
        actorUsername,
      },
    });

    return { txNumber: ledger.txNumber, newBalance: updatedBox.balance };
  });

  return updated;
}

/**
 * عكس حركة مالية سابقة — يُستخدم عند إلغاء مصروف أو دفعة.
 * إذا كانت الحركة الأصلية debit (خصم)، ننشئ credit (إضافة) ليعود المبلغ.
 */
export async function reverseTransaction(params: {
  originalTxNumber: string;
  reason: string;
  actorUsername: string;
}): Promise<{ txNumber: string; newBalance: number } | null> {
  const { originalTxNumber, reason, actorUsername } = params;

  const original = await db.transactionLedger.findUnique({
    where: { txNumber: originalTxNumber },
  });
  if (!original) return null;

  const reverseDirection = original.direction === "debit" ? "credit" : "debit";
  const seq = (await db.transactionLedger.count()) + 1;
  const txNumber = `TX-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;

  const result = await db.$transaction(async (tx) => {
    const box = await tx.cashBox.findUnique({ where: { id: original.cashBoxId } });
    if (!box) throw new Error("cashbox_not_found");

    const delta = reverseDirection === "debit" ? -original.amount : original.amount;
    const newBalance = box.balance + delta;

    const updatedBox = await tx.cashBox.update({
      where: { id: box.id },
      data: { balance: newBalance },
    });

    const ledger = await tx.transactionLedger.create({
      data: {
        txNumber,
        cashBoxId: box.id,
        cashBoxCode: box.code,
        direction: reverseDirection,
        amount: original.amount,
        currency: original.currency,
        reason: `عكس حركة ${original.txNumber} — ${reason}`,
        moduleKey: original.moduleKey,
        relatedEntityType: "reversal",
        relatedEntityId: original.id,
        actorUsername,
      },
    });

    return { txNumber: ledger.txNumber, newBalance: updatedBox.balance };
  });

  return result;
}

/** قائمة سجل العمليات المالية */
export type LedgerEntry = {
  id: string;
  txNumber: string;
  cashBoxId: string;
  cashBoxCode: string;
  direction: string;
  amount: number;
  currency: string;
  reason: string;
  moduleKey: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actorUsername: string;
  createdAt: string;
};

export async function listTransactions(limit: number = 100): Promise<LedgerEntry[]> {
  const txs = await db.transactionLedger.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return txs.map((t) => ({
    id: t.id,
    txNumber: t.txNumber,
    cashBoxId: t.cashBoxId,
    cashBoxCode: t.cashBoxCode,
    direction: t.direction,
    amount: t.amount,
    currency: t.currency,
    reason: t.reason,
    moduleKey: t.moduleKey,
    relatedEntityType: t.relatedEntityType,
    relatedEntityId: t.relatedEntityId,
    actorUsername: t.actorUsername,
    createdAt: t.createdAt.toISOString(),
  }));
}
