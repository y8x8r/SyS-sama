import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

/** GET /api/invoices/[id] — فاتورة واحدة مع التفاصيل */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      service: true,
      payments: { where: { status: "approved" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      serviceId: invoice.serviceId,
      serviceType: invoice.serviceType,
      serviceNumber: invoice.serviceNumber,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      currency: invoice.currency,
      status: invoice.status,
      issuedAt: invoice.issuedAt.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      service: invoice.service ? {
        id: invoice.service.id,
        serviceNumber: invoice.service.serviceNumber,
        details: JSON.parse(invoice.service.details || "{}"),
        notes: invoice.service.notes,
      } : null,
      payments: invoice.payments.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        amount: p.amount,
        method: p.method,
        receivedAt: p.receivedAt.toISOString(),
      })),
    },
  });
}

/** PUT /api/invoices/[id] — تعديل فاتورة + تزامن الدفعة */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await db.invoice.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const totalAmount = body.totalAmount ?? existing.totalAmount;
  const paidAmount = body.paidAmount ?? existing.paidAmount;
  const status = body.status ?? existing.status;

  try {
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          totalAmount,
          paidAmount,
          remainingAmount: totalAmount - paidAmount,
          status,
        },
      });

      // تحديث الخدمة المرتبطة
      await tx.serviceRecord.update({
        where: { id: existing.serviceId },
        data: {
          price: totalAmount,
          paid: paidAmount,
          remaining: totalAmount - paidAmount,
        },
      });

      // تحديث الدفعة المرتبطة
      const existingPayment = await tx.payment.findFirst({
        where: { invoiceId: id, status: "approved" },
      });

      if (paidAmount > 0) {
        if (existingPayment) {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: { amount: paidAmount },
          });
        } else {
          const seqPayment = await tx.payment.count() + 1;
          const paymentNumber = `PAY-${new Date().getFullYear()}-${String(seqPayment).padStart(5, "0")}`;
          await tx.payment.create({
            data: {
              paymentNumber,
              customerId: existing.customerId,
              customerName: existing.customerName,
              invoiceId: id,
              invoiceNumber: existing.invoiceNumber,
              serviceId: existing.serviceId,
              serviceNumber: existing.serviceNumber,
              amount: paidAmount,
              currency: existing.currency,
              method: "cash",
              status: "approved",
            },
          });
        }
      }

      return updated;
    });

    await logAudit(user, "تعديل فاتورة", "invoices", `تعديل الفاتورة: ${existing.invoiceNumber}`, "invoice", id, existing, result);

    return NextResponse.json({ ok: true, invoice: result });
  } catch (err) {
    console.error("Update invoice error:", err);
    return NextResponse.json({ ok: false, error: "update_failed", details: String(err) }, { status: 500 });
  }
}

/** DELETE /api/invoices/[id] — حذف فاتورة */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { id } = await params;
  const existing = await db.invoice.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await db.invoice.delete({ where: { id } });

  await logAudit(user, "حذف فاتورة", "invoices", `حذف الفاتورة: ${existing.invoiceNumber}`, "invoice", id);

  return NextResponse.json({ ok: true });
}
