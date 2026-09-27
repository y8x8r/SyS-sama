import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";
import { getDefaultCashBox, debitCashBox, reverseTransaction } from "@/lib/accounting";

/** GET /api/expenses — قائمة المصروفات مع الصندوق المرتبط */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const expenses = await db.expense.findMany({
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    expenses: expenses.map((e) => ({
      id: e.id,
      expenseNumber: e.expenseNumber,
      category: e.category,
      description: e.description,
      beneficiary: e.beneficiary,
      amount: e.amount,
      currency: e.currency,
      method: e.method,
      reference: e.reference,
      status: e.status,
      paidAt: e.paidAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
      createdBy: e.createdBy,
    })),
  });
}

/**
 * POST /api/expenses — إضافة مصروف
 *
 * الحقول بالترتيب: رقم المصروف (تلقائي) ← غرض الصرف ← تاريخ الصرف ← المبلغ
 *
 * يقوم تلقائياً بـ:
 *   1. حفظ سجل المصروف
 *   2. خصم المبلغ من الصندوق الافتراضي للعملة
 *   3. تسجيل حركة debit في TransactionLedger
 *   4. تحديث رصيد الصندوق
 *
 * كل ذلك في عملية ذرية (db.$transaction). إذا فشل أي جزء تُلغى بالكامل.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const body = await req.json();
  const { purpose, paidAt, amount, currency } = body;

  if (!purpose?.trim() || !paidAt || !amount || amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 }
    );
  }

  const cur = currency || "SAR";

  try {
    // 1. الحصول على الصندوق الافتراضي للعملة
    const cashBox = await getDefaultCashBox(cur);
    if (!cashBox) {
      return NextResponse.json(
        { ok: false, error: "no_cashbox_for_currency" },
        { status: 400 }
      );
    }

    // 2. إنشاء سجل المصروف + خصم الصندوق + تسجيل الحركة (عملية ذرية)
    const seq = (await db.expense.count()) + 1;
    const expenseNumber = `EXP-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;

    const expense = await db.expense.create({
      data: {
        expenseNumber,
        category: purpose,
        description: purpose,
        beneficiary: "—",
        amount,
        currency: cur,
        method: "cash",
        reference: cashBox.code, // ربط المصروف بالصندوق
        status: "approved",
        paidAt: new Date(paidAt),
        createdBy: user.username,
      },
    });

    // 3. خصم المبلغ من الصندوق وتسجيل الحركة المالية
    const ledger = await debitCashBox({
      cashBoxId: cashBox.id,
      amount,
      currency: cur,
      reason: `مصروف ${expenseNumber} — ${purpose}`,
      moduleKey: "expenses",
      relatedEntityType: "expense",
      relatedEntityId: expense.id,
      actorUsername: user.username,
    });

    // 4. ربط المصروف برقم الحركة المالية
    await db.expense.update({
      where: { id: expense.id },
      data: { reference: `${cashBox.code} | ${ledger.txNumber}` },
    });

    await logAudit(
      user,
      "إضافة مصروف",
      "expenses",
      `إضافة مصروف ${expense.expenseNumber} — ${purpose} (${amount} ${cur}) — خصم من ${cashBox.name} (رصيد جديد: ${ledger.newBalance})`,
      "expense",
      expense.id
    );

    return NextResponse.json({
      ok: true,
      expense: {
        id: expense.id,
        expenseNumber: expense.expenseNumber,
        category: expense.category,
        description: expense.description,
        beneficiary: expense.beneficiary,
        amount: expense.amount,
        currency: expense.currency,
        method: expense.method,
        reference: `${cashBox.code} | ${ledger.txNumber}`,
        status: expense.status,
        paidAt: expense.paidAt.toISOString(),
        createdAt: expense.createdAt.toISOString(),
        createdBy: expense.createdBy,
      },
      ledger: {
        txNumber: ledger.txNumber,
        newBalance: ledger.newBalance,
        cashBox: cashBox.name,
      },
    });
  } catch (err: any) {
    console.error("Create expense error:", err);
    const msg = err?.message ?? "create_failed";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
