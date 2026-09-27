import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/payments — قائمة المدفوعات */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const payments = await db.payment.findMany({
    orderBy: { receivedAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    payments: payments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      customerId: p.customerId,
      customerName: p.customerName,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoiceNumber,
      serviceId: p.serviceId,
      serviceNumber: p.serviceNumber,
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      transferNo: p.transferNo,
      status: p.status,
      receivedAt: p.receivedAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
