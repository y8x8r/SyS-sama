import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/invoices — قائمة الفواتير */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;

  const invoices = await db.invoice.findMany({
    where,
    orderBy: { issuedAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    invoices: invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      customerId: i.customerId,
      customerName: i.customerName,
      serviceId: i.serviceId,
      serviceType: i.serviceType,
      serviceNumber: i.serviceNumber,
      totalAmount: i.totalAmount,
      paidAmount: i.paidAmount,
      remainingAmount: i.remainingAmount,
      currency: i.currency,
      status: i.status,
      issuedAt: i.issuedAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  });
}
