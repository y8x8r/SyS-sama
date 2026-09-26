import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

/** PUT /api/services/[id] — تعديل معاملة + تزامن الدفعة والفاتورة (مدير عام + موظف حجوزات) */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع تعديل معاملات الخدمات
  if (user.role === "accountant") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "403 — غير مصرح للمحاسب بتعديل معاملات الخدمات" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await db.serviceRecord.findUnique({ where: { id }, include: { invoice: true } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const price = body.price ?? existing.price;
  const paid = body.paid ?? existing.paid;
  const currency = body.currency ?? existing.currency;
  const status = body.status ?? existing.status;

  if (paid > price) {
    return NextResponse.json({ ok: false, error: "paid_exceeds_price" }, { status: 400 });
  }

  try {
    // عملية ذرية: تحديث الخدمة + الفاتورة + الدفعة
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.serviceRecord.update({
        where: { id },
        data: {
          price,
          paid,
          remaining: price - paid,
          currency,
          status,
          paymentMethod: body.paymentMethod ?? existing.paymentMethod,
          transferNo: body.transferNo ?? existing.transferNo,
          notes: body.notes ?? existing.notes,
          details: JSON.stringify(body.details ?? JSON.parse(existing.details || "{}")),
        },
      });

      // تحديث الفاتورة المرتبطة
      if (existing.invoice) {
        await tx.invoice.update({
          where: { serviceId: id },
          data: {
            totalAmount: price,
            paidAmount: paid,
            remainingAmount: price - paid,
            currency,
            status: price - paid === 0 ? "paid" : paid > 0 ? "partial" : "issued",
          },
        });

        // تحديث أو إنشاء الدفعة المرتبطة
        const existingPayment = await tx.payment.findFirst({
          where: { serviceId: id },
        });

        if (paid > 0) {
          if (existingPayment) {
            await tx.payment.update({
              where: { id: existingPayment.id },
              data: {
                amount: paid,
                currency,
                method: body.paymentMethod ?? existingPayment.method,
                transferNo: body.transferNo ?? existingPayment.transferNo,
              },
            });
          } else {
            // إنشاء دفعة جديدة إذا لم تكن موجودة
            const seqPayment = await tx.payment.count() + 1;
            const paymentNumber = `PAY-${new Date().getFullYear()}-${String(seqPayment).padStart(5, "0")}`;
            await tx.payment.create({
              data: {
                paymentNumber,
                customerId: existing.customerId,
                customerName: existing.customerName,
                invoiceId: existing.invoice.id,
                invoiceNumber: existing.invoice.invoiceNumber,
                serviceId: id,
                serviceNumber: existing.serviceNumber,
                amount: paid,
                currency,
                method: body.paymentMethod || "cash",
                transferNo: body.transferNo || null,
                status: "approved",
              },
            });
          }
        } else if (existingPayment) {
          // إذا أصبح المبلغ المسلَّم صفراً، نعكس الدفعة
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: { status: "reversed" },
          });
        }
      }

      return updated;
    });

    await logAudit(user, "تعديل معاملة", "services", `تعديل المعاملة: ${existing.serviceNumber}`, "service", id, existing, result);

    return NextResponse.json({
      ok: true,
      service: {
        id: result.id,
        serviceType: result.serviceType,
        serviceNumber: result.serviceNumber,
        customerId: result.customerId,
        customerName: result.customerName,
        status: result.status,
        price: result.price,
        paid: result.paid,
        remaining: result.remaining,
        currency: result.currency,
        paymentMethod: result.paymentMethod,
        transferNo: result.transferNo,
        notes: result.notes,
        details: JSON.parse(result.details || "{}"),
        createdAt: result.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Update service error:", err);
    return NextResponse.json({ ok: false, error: "update_failed", details: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/services/[id] — إلغاء أو حذف المعاملة
 *
 * وضعان:
 *   - الافتراضي (إلغاء): يغيّر الحالة إلى "ملغية" مع سبب إلزامي، يبقى السجل محفوظاً
 *   - hardDelete=true: يحذف السجل فعلياً من النظام مع كل ما يرتبط به
 *
 * الحذف متاح للمدير العام فقط.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع إلغاء أو حذف معاملات الخدمات
  if (user.role === "accountant") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "403 — غير مصرح للمحاسب بإلغاء أو حذف معاملات الخدمات" }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const hardDelete = url.searchParams.get("hardDelete") === "true";

  const existing = await db.serviceRecord.findUnique({ where: { id }, include: { invoice: true } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // الحذف الفعلي — للمدير العام فقط
  if (hardDelete) {
    if (user.role !== "manager") {
      return NextResponse.json({ ok: false, error: "only_manager_can_delete" }, { status: 403 });
    }

    try {
      await db.$transaction(async (tx) => {
        // حذف الدفعات المرتبطة
        await tx.payment.deleteMany({ where: { serviceId: id } });
        // حذف الفاتورة المرتبطة
        await tx.invoice.deleteMany({ where: { serviceId: id } });
        // حذف المعاملة نفسها
        await tx.serviceRecord.delete({ where: { id } });
      });

      await logAudit(user, "حذف معاملة", "services", `حذف المعاملة ${existing.serviceNumber} نهائياً`, "service", id);

      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("Hard delete service error:", err);
      return NextResponse.json({ ok: false, error: "delete_failed", details: String(err) }, { status: 500 });
    }
  }

  // الإلغاء (الافتراضي) — يتطلب سبب
  const body = await req.json().catch(() => ({}));
  const cancelReason = body.cancelReason?.trim();

  if (!cancelReason) {
    return NextResponse.json(
      { ok: false, error: "cancel_reason_required" },
      { status: 400 }
    );
  }

  try {
    await db.$transaction(async (tx) => {
      // إلغاء المعاملة (وليس حذفها)
      await tx.serviceRecord.update({
        where: { id },
        data: {
          status: "cancelled",
          cancelReason,
          cancelledAt: new Date(),
          cancelledBy: user.username,
        },
      });

      // إلغاء الفاتورة المرتبطة
      await tx.invoice.updateMany({
        where: { serviceId: id },
        data: { status: "cancelled" },
      });

      // عكس الدفعات المرتبطة
      await tx.payment.updateMany({
        where: { serviceId: id, status: "approved" },
        data: { status: "reversed" },
      });
    });

    await logAudit(user, "إلغاء معاملة", "services", `إلغاء المعاملة ${existing.serviceNumber} — السبب: ${cancelReason}`, "service", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cancel service error:", err);
    return NextResponse.json({ ok: false, error: "cancel_failed", details: String(err) }, { status: 500 });
  }
}
