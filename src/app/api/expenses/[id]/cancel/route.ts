import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";
import { reverseTransaction } from "@/lib/accounting";

/**
 * POST /api/expenses/[id]/cancel — إلغاء مصروف وعكس الحركة المالية
 *
 * يقوم بـ:
 *   1. تغيير حالة المصروف إلى "cancelled"
 *   2. البحث عن الحركة المالية المرتبطة بالمصروف
 *   3. عكس الحركة (credit) لإرجاع المبلغ إلى الصندوق
 *   4. تحديث رصيد الصندوق
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const cancelReason = body.cancelReason?.trim();

  if (!cancelReason) {
    return NextResponse.json(
      { ok: false, error: "cancel_reason_required" },
      { status: 400 }
    );
  }

  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (expense.status === "cancelled") {
    return NextResponse.json({ ok: false, error: "already_cancelled" }, { status: 400 });
  }

  try {
    // 1. تحديث حالة المصروف
    await db.expense.update({
      where: { id },
      data: { status: "cancelled" },
    });

    // 2. البحث عن الحركة المالية المرتبطة
    const originalTx = await db.transactionLedger.findFirst({
      where: {
        relatedEntityType: "expense",
        relatedEntityId: id,
        direction: "debit",
      },
      orderBy: { createdAt: "desc" },
    });

    let reversalResult: { txNumber: string; newBalance: number } | null = null;
    if (originalTx) {
      // 3. عكس الحركة (إرجاع المبلغ للصندوق)
      reversalResult = await reverseTransaction({
        originalTxNumber: originalTx.txNumber,
        reason: `إلغاء مصروف ${expense.expenseNumber} — ${cancelReason}`,
        actorUsername: user.username,
      });
    }

    await logAudit(
      user,
      "إلغاء مصروف",
      "expenses",
      `إلغاء مصروف ${expense.expenseNumber} — ${cancelReason}${reversalResult ? ` — أُرجع المبلغ للصندوق (رصيد جديد: ${reversalResult.newBalance})` : ""}`,
      "expense",
      id
    );

    return NextResponse.json({
      ok: true,
      reversal: reversalResult ? {
        txNumber: reversalResult.txNumber,
        newBalance: reversalResult.newBalance,
      } : null,
    });
  } catch (err: any) {
    console.error("Cancel expense error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "cancel_failed" },
      { status: 500 }
    );
  }
}
