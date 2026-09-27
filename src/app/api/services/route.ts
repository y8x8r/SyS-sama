import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, nextSeq } from "@/lib/auth";

/** GET /api/services?type=<serviceType> — قائمة خدمات */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const serviceType = searchParams.get("type");
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (serviceType && serviceType !== "all") where.serviceType = serviceType;
  if (status && status !== "all") where.status = status;
  if (q) {
    where.OR = [
      { customerName: { contains: q } },
      { serviceNumber: { contains: q } },
    ];
  }

  const services = await db.serviceRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    services: services.map((s) => ({
      id: s.id,
      serviceType: s.serviceType,
      serviceNumber: s.serviceNumber,
      customerId: s.customerId,
      customerName: s.customerName,
      handledByEmployeeId: s.handledByEmployeeId,
      status: s.status,
      price: s.price,
      paid: s.paid,
      remaining: s.remaining,
      currency: s.currency,
      paymentMethod: s.paymentMethod,
      transferNo: s.transferNo,
      notes: s.notes,
      cancelReason: s.cancelReason,
      cancelledAt: s.cancelledAt?.toISOString() ?? null,
      cancelledBy: s.cancelledBy,
      details: JSON.parse(s.details || "{}"),
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

/**
 * POST /api/services — إنشاء معاملة جديدة
 *
 * عملية ذرية: تنشئ ServiceRecord + Invoice + Payment (إذا كان هناك مبلغ مسلَّم)
 * في معاملة واحدة. إذا فشل أي جزء، تُلغى العملية بالكامل.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع إنشاء معاملات خدمات
  if (user.role === "accountant") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "403 — غير مصرح للمحاسب بإنشاء معاملات الخدمات" }, { status: 403 });
  }

  const body = await req.json();
  const { serviceType, customerId, price, paid, currency, paymentMethod, transferNo, status, notes, details } = body;

  // التحقق من الحقول المطلوبة
  if (!serviceType || !customerId || !price || price <= 0) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 }
    );
  }

  // التحقق من وجود العميل
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return NextResponse.json(
      { ok: false, error: "customer_not_found" },
      { status: 404 }
    );
  }

  const paidAmount = paid || 0;
  if (paidAmount > price) {
    return NextResponse.json(
      { ok: false, error: "paid_exceeds_price" },
      { status: 400 }
    );
  }

  try {
    // عملية ذرية: تنشئ الخدمة + الفاتورة + الدفعة في معاملة واحدة
    const result = await db.$transaction(async (tx) => {
      const seqService = await tx.serviceRecord.count() + 1;
      const serviceNumber = `SRV-${new Date().getFullYear()}-${String(seqService).padStart(5, "0")}`;

      // جلب employeeId المرتبط بالمستخدم الحالي
      const currentUser = await tx.user.findUnique({ where: { id: user.userId }, select: { employeeId: true } });
      const employeeId = currentUser?.employeeId ?? null;

      // 1. إنشاء الخدمة
      const service = await tx.serviceRecord.create({
        data: {
          serviceType,
          serviceNumber,
          customerId: customer.id,
          customerName: customer.fullName,
          handledByEmployeeId: employeeId,
          status: status || "pending",
          price,
          paid: paidAmount,
          remaining: price - paidAmount,
          currency: currency || "SAR",
          paymentMethod: paymentMethod || null,
          transferNo: transferNo || null,
          notes: notes || null,
          details: JSON.stringify(details || {}),
        },
      });

      // 2. إنشاء الفاتورة المرتبطة
      const seqInvoice = await tx.invoice.count() + 1;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seqInvoice).padStart(5, "0")}`;
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: customer.id,
          customerName: customer.fullName,
          serviceId: service.id,
          serviceType: service.serviceType,
          serviceNumber: service.serviceNumber,
          totalAmount: price,
          paidAmount: paidAmount,
          remainingAmount: price - paidAmount,
          currency: service.currency,
          status: price - paidAmount === 0 ? "paid" : paidAmount > 0 ? "partial" : "issued",
        },
      });

      // 3. إنشاء سجل دفعة تلقائياً إذا كان هناك مبلغ مسلَّم
      let payment = null;
      if (paidAmount > 0) {
        const seqPayment = await tx.payment.count() + 1;
        const paymentNumber = `PAY-${new Date().getFullYear()}-${String(seqPayment).padStart(5, "0")}`;
        payment = await tx.payment.create({
          data: {
            paymentNumber,
            customerId: customer.id,
            customerName: customer.fullName,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            serviceId: service.id,
            serviceNumber: service.serviceNumber,
            amount: paidAmount,
            currency: service.currency,
            method: paymentMethod || "cash",
            transferNo: transferNo || null,
            status: "approved",
          },
        });
      }

      // 4. إنشاء إشعار
      await tx.notification.create({
        data: {
          title: "معاملة جديدة",
          body: `تم إنشاء معاملة ${service.serviceNumber} للعميل ${customer.fullName}`,
          type: "success",
          moduleKey: "services",
          relatedEntityId: service.id,
          isRead: false,
        },
      });

      return { service, invoice, payment };
    });

    await logAudit(user, "إنشاء معاملة", "services", `إنشاء معاملة جديدة ${result.service.serviceNumber} للعميل ${customer.fullName}`, "service", result.service.id);

    return NextResponse.json({
      ok: true,
      service: {
        id: result.service.id,
        serviceType: result.service.serviceType,
        serviceNumber: result.service.serviceNumber,
        customerId: result.service.customerId,
        customerName: result.service.customerName,
        status: result.service.status,
        price: result.service.price,
        paid: result.service.paid,
        remaining: result.service.remaining,
        currency: result.service.currency,
        paymentMethod: result.service.paymentMethod,
        transferNo: result.service.transferNo,
        notes: result.service.notes,
        details: JSON.parse(result.service.details || "{}"),
        createdAt: result.service.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Create service error:", err);
    return NextResponse.json(
      { ok: false, error: "create_failed", details: String(err) },
      { status: 500 }
    );
  }
}
