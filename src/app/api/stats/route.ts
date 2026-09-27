import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/stats — مؤشرات لوحة التحكم
 *
 * مؤشرات مالية صحيحة:
 * - الإيرادات المحصلة اليوم: مجموع الدفعات المعتمدة في تاريخ اليوم فقط، بكل عملة على حدة
 * - المصروفات اليوم: مجموع المصروفات المعتمدة في تاريخ اليوم فقط، بكل عملة على حدة
 * - الفواتير غير المسددة: الفواتير ذات مبلغ متبقٍ > 0
 * - لا تجمع عملات مختلفة في رقم واحد — عرض منفصل لكل عملة
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. المعاملات النشطة (pending + processing)
  const activeTransactions = await db.serviceRecord.count({
    where: {
      status: { in: ["pending", "processing"] },
    },
  });

  // 2. الإيرادات المحصلة اليوم — مفصولة حسب العملة
  const todayPayments = await db.payment.findMany({
    where: {
      status: "approved",
      receivedAt: { gte: today, lt: tomorrow },
    },
    select: { amount: true, currency: true },
  });

  const todayRevenueByCurrency: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
  for (const p of todayPayments) {
    todayRevenueByCurrency[p.currency] = (todayRevenueByCurrency[p.currency] || 0) + p.amount;
  }

  // 3. المصروفات اليوم — مفصولة حسب العملة
  const todayExpensesRecords = await db.expense.findMany({
    where: {
      status: "approved",
      paidAt: { gte: today, lt: tomorrow },
    },
    select: { amount: true, currency: true },
  });

  const todayExpensesByCurrency: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
  for (const e of todayExpensesRecords) {
    todayExpensesByCurrency[e.currency] = (todayExpensesByCurrency[e.currency] || 0) + e.amount;
  }

  // 4. الفواتير غير المسددة (remaining > 0)
  const unpaidInvoices = await db.invoice.count({
    where: {
      remainingAmount: { gt: 0 },
      status: { in: ["issued", "partial"] },
    },
  });

  // 5. حالة المعاملات
  const statusCounts = {
    pending: await db.serviceRecord.count({ where: { status: "pending" } }),
    processing: await db.serviceRecord.count({ where: { status: "processing" } }),
    completed: await db.serviceRecord.count({ where: { status: "completed" } }),
    cancelled: await db.serviceRecord.count({ where: { status: "cancelled" } }),
  };

  // 6. إجمالي العملاء والخدمات
  const totalCustomers = await db.customer.count();
  const totalServices = await db.serviceRecord.count();
  const totalInvoices = await db.invoice.count();

  // 7. توزيع الخدمات (للمخطط الحلقي)
  const serviceDistribution = await db.serviceRecord.groupBy({
    by: ["serviceType"],
    _count: true,
    orderBy: { _count: { serviceType: "desc" } },
    take: 5,
  });

  // 8. آخر العملاء
  const recentCustomers = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // 9. آخر المعاملات لكل عميل
  const customerLastServices = await Promise.all(
    recentCustomers.map(async (c) => {
      const lastService = await db.serviceRecord.findFirst({
        where: { customerId: c.id },
        orderBy: { createdAt: "desc" },
      });
      return { customer: c, lastService };
    })
  );

  // 10. بيانات المخطط المالي (آخر 7 أيام) — مفصولة حسب العملة
  const chartData: Array<{ day: string; sar_revenue: number; sar_expenses: number; usd_revenue: number; usd_expenses: number; yer_revenue: number; yer_expenses: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d);
    const dayEnd = new Date(d);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayPayments = await db.payment.findMany({
      where: { status: "approved", receivedAt: { gte: dayStart, lt: dayEnd } },
      select: { amount: true, currency: true },
    });
    const dayExpenses = await db.expense.findMany({
      where: { status: "approved", paidAt: { gte: dayStart, lt: dayEnd } },
      select: { amount: true, currency: true },
    });

    const rev: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
    const exp: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
    for (const p of dayPayments) rev[p.currency] = (rev[p.currency] || 0) + p.amount;
    for (const e of dayExpenses) exp[e.currency] = (exp[e.currency] || 0) + e.amount;

    chartData.push({
      day: `${d.getDate()}/${d.getMonth() + 1}`,
      sar_revenue: rev.SAR,
      sar_expenses: exp.SAR,
      usd_revenue: rev.USD,
      usd_expenses: exp.USD,
      yer_revenue: rev.YER,
      yer_expenses: exp.YER,
    });
  }

  return NextResponse.json({
    ok: true,
    stats: {
      activeTransactions,
      todayRevenueByCurrency,
      todayExpensesByCurrency,
      unpaidInvoices,
      statusCounts,
      totalCustomers,
      totalServices,
      totalInvoices,
      serviceDistribution: serviceDistribution.map((s) => ({
        serviceType: s.serviceType,
        count: s._count.serviceType,
      })),
      recentCustomers: customerLastServices.map(({ customer, lastService }) => ({
        id: customer.id,
        customerNumber: customer.customerNumber,
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        lastServiceType: lastService?.serviceType ?? null,
        lastServiceNumber: lastService?.serviceNumber ?? null,
      })),
      chartData,
    },
  });
}
