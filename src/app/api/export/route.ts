import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ExcelJS from "exceljs";

/**
 * GET /api/export?type=customers|services|invoices|payments|expenses&period=weekly|monthly|overall&serviceType=<type>&format=excel|pdf
 *
 * معلمات الفلترة الاختيارية (تُطبَّق على البيانات المُصدَّرة):
 *   q         — نص البحث
 *   method    — طريقة الدفع (cash|transfer|wallet) للمدفوعات
 *   status    — حالة السجل
 *   serviceType — نوع الخدمة
 *
 * - Excel: CSV مع BOM لدعم العربية (يفتح في Excel بشكل منظم)
 * - PDF: نص منسق للطباعة (RTL)
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "customers";
  const period = searchParams.get("period") ?? "overall";
  const serviceType = searchParams.get("serviceType");
  const format = searchParams.get("format") ?? "excel";
  const q = searchParams.get("q") ?? "";
  const methodFilter = searchParams.get("method") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";

  // معلمات التاريخ المخصص
  const customFrom = searchParams.get("fromDate");
  const customTo = searchParams.get("toDate");

  // حساب الفترة الزمنية
  const now = new Date();
  let from = new Date(now);
  if (customFrom) {
    from = new Date(customFrom);
  } else if (period === "weekly") from.setDate(now.getDate() - 7);
  else if (period === "monthly") from.setMonth(now.getMonth() - 1);
  else if (period === "yearly") from.setFullYear(now.getFullYear() - 1);
  else if (period === "daily") from.setDate(now.getDate() - 1);
  else from.setFullYear(2020); // overall

  let toDate = new Date(now);
  if (customTo) {
    toDate = new Date(customTo);
    toDate.setHours(23, 59, 59, 999); // نهاية اليوم
  }

  // جلب البيانات حسب النوع
  let records: any[] = [];
  let headers: string[] = [];
  let title = "";

  if (type === "customers") {
    headers = ["اسم العميل", "رقم العميل", "رقم الهاتف", "رقم الجواز", "رقم الهوية", "تاريخ الانضمام", "كيف عرف عنّا", "الحالة"];
    const customers = await db.customer.findMany({
      where: { createdAt: { gte: from, lte: toDate } },
      orderBy: { createdAt: "desc" },
    });
    records = customers.map((c) => [
      c.fullName,
      c.customerNumber,
      c.phoneNumber,
      c.passportNumber ?? "",
      c.nationalId ?? "",
      c.joinedOn.toISOString().split("T")[0],
      c.referralSource ?? "",
      c.isActive ? "نشط" : "غير نشط",
    ]);
    title = "قائمة العملاء";
  } else if (type === "services") {
    headers = ["اسم العميل", "رقم المعاملة", "نوع الخدمة", "السعر", "المدفوع", "المتبقي", "العملة", "الحالة", "التاريخ"];
    const services = await db.serviceRecord.findMany({
      where: {
        createdAt: { gte: from, lte: toDate },
        ...(serviceType && serviceType !== "all" ? { serviceType } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    records = services.map((s) => [
      s.customerName,
      s.serviceNumber,
      s.serviceType,
      String(s.price),
      String(s.paid),
      String(s.remaining),
      s.currency,
      s.status,
      s.createdAt.toISOString().split("T")[0],
    ]);
    title = serviceType ? `قائمة ${serviceType}` : "قائمة الخدمات";
  } else if (type === "invoices") {
    headers = ["رقم الفاتورة", "اسم العميل", "الإجمالي", "المدفوع", "المتبقي", "العملة", "الحالة", "التاريخ"];
    const invoices = await db.invoice.findMany({
      where: { issuedAt: { gte: from, lte: toDate } },
      orderBy: { issuedAt: "desc" },
    });
    records = invoices.map((i) => [
      i.invoiceNumber,
      i.customerName,
      String(i.totalAmount),
      String(i.paidAmount),
      String(i.remainingAmount),
      i.currency,
      i.status,
      i.issuedAt.toISOString().split("T")[0],
    ]);
    title = "قائمة الفواتير";
  } else if (type === "payments") {
    headers = ["رقم السند", "اسم العميل", "رقم الفاتورة", "المبلغ", "العملة", "طريقة الدفع", "الحالة", "التاريخ"];
    const where: any = { receivedAt: { gte: from, lte: toDate } };
    if (methodFilter !== "all") where.method = methodFilter;
    if (statusFilter !== "all") where.status = statusFilter;
    let payments = await db.payment.findMany({
      where,
      orderBy: { receivedAt: "desc" },
    });
    if (q) {
      payments = payments.filter(
        (p) =>
          p.paymentNumber.toLowerCase().includes(q.toLowerCase()) ||
          p.customerName.toLowerCase().includes(q.toLowerCase()) ||
          (p.invoiceNumber ?? "").toLowerCase().includes(q.toLowerCase())
      );
    }
    const methodLabel = (m: string) => (m === "cash" ? "نقداً" : m === "transfer" ? "حوالة" : "محفظة");
    const statusLabel = (s: string) => (s === "approved" ? "معتمدة" : s === "reversed" ? "معكوسة" : "قيد المعالجة");
    records = payments.map((p) => [
      p.paymentNumber,
      p.customerName,
      p.invoiceNumber ?? "",
      String(p.amount),
      p.currency,
      methodLabel(p.method),
      statusLabel(p.status),
      p.receivedAt.toISOString().split("T")[0],
    ]);
    title = "قائمة المدفوعات";
  } else if (type === "expenses") {
    headers = ["رقم المصروف", "غرض الصرف", "المبلغ", "العملة", "طريقة الدفع", "الحالة", "تاريخ الصرف"];
    const where: any = { paidAt: { gte: from, lte: toDate } };
    if (statusFilter !== "all") where.status = statusFilter;
    let expenses = await db.expense.findMany({
      where,
      orderBy: { paidAt: "desc" },
    });
    if (q) {
      expenses = expenses.filter(
        (e) =>
          e.expenseNumber.toLowerCase().includes(q.toLowerCase()) ||
          e.category.toLowerCase().includes(q.toLowerCase()) ||
          e.description.toLowerCase().includes(q.toLowerCase())
      );
    }
    const statusLabel = (s: string) => (s === "approved" ? "معتمد" : s === "cancelled" ? "ملغى" : "قيد المعالجة");
    records = expenses.map((e) => [
      e.expenseNumber,
      e.category,
      String(e.amount),
      e.currency,
      e.method === "cash" ? "نقداً" : e.method === "transfer" ? "حوالة" : "محفظة",
      statusLabel(e.status),
      e.paidAt.toISOString().split("T")[0],
    ]);
    title = "قائمة المصروفات";
  }

  if (format === "pdf") {
    // توليد PDF بصيغة HTML قابل للطباعة (RTL)
    const periodLabel = period === "weekly" ? "تقرير أسبوعي" : period === "monthly" ? "تقرير شهري" : period === "yearly" ? "تقرير سنوي" : period === "daily" ? "تقرير يومي" : period === "custom" ? "تقرير مخصص" : "تقرير شامل";
    const dateRange = `من ${from.toISOString().split("T")[0]} إلى ${toDate.toISOString().split("T")[0]}`;

    // ترميز اسم الملف لتجنب أحرف غير ASCII في Content-Disposition (يحدث HTTP 500)
    const safeFilename = `report_${type}_${period}.html`;
    const encodedFilename = encodeURIComponent(safeFilename);

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${title} — ${periodLabel}</title>
<style>
  body { font-family: 'Cairo', Arial, sans-serif; padding: 40px; color: #1F2937; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #7C3AED; padding-bottom: 20px; }
  .office-name { font-size: 32px; font-weight: bold; color: #7C3AED; margin-bottom: 5px; }
  .report-title { font-size: 18px; font-weight: 600; }
  .period { font-size: 14px; color: #64748B; margin-top: 5px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #F3E8FF; color: #6D28D9; padding: 12px 8px; text-align: right; font-size: 13px; font-weight: 600; border: 1px solid #E2E8F0; }
  td { padding: 10px 8px; text-align: right; font-size: 12px; border: 1px solid #E2E8F0; }
  tr:nth-child(even) { background: #F8F9FC; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 15px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="office-name">سما اليمن للسفريات والسياحة</div>
    <div class="report-title">${title} — ${periodLabel}</div>
    <div class="period">${dateRange}</div>
  </div>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${records.length === 0 ? `<tr><td colspan="${headers.length}" style="text-align:center;padding:30px;">لا توجد بيانات في هذه الفترة</td></tr>` : records.map((r) => `<tr>${r.map((c) => `<td>${String(c).replace(/</g, "&lt;")}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>
  <div class="footer">جميع الحقوق محفوظة لدى Sky Link 2026</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  }

  // Excel — XLSX حقيقي يدعمه Excel و Google Sheets و LibreOffice
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title, {
    views: [{ rightToLeft: true }], // دعم RTL
  });

  // إضافة صف العناوين
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: "FF6D28D9" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3E8FF" },
    };
    cell.alignment = { horizontal: "right", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // إضافة صفوف البيانات
  for (const record of records) {
    const row = worksheet.addRow(record);
    row.eachCell((cell) => {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  }

  // ضبط عرض الأعمدة تلقائياً
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    if (column.eachCell) {
      column.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 10;
        if (len > maxLength) maxLength = len;
      });
      column.width = Math.min(maxLength + 4, 50);
    }
  });

  // تحويل إلى Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const safeXlsxName = `report_${type}_${period}.xlsx`;
  const encodedXlsxName = encodeURIComponent(safeXlsxName);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodedXlsxName}"; filename*=UTF-8''${encodedXlsxName}`,
    },
  });
}
