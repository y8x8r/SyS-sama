import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { serviceConfigs } from "@/components/services/service-configs";
import { tr } from "@/lib/translations";

/**
 * GET /api/print/invoice?id=<invoiceId>
 *
 * يُرجع HTML قابل للطباعة لفاتورة واحدة بتنسيق A4 احترافي.
 * - يدعم RTL والعربية
 * - اسم المكتب وشعار بخط كبير
 * - يعرض: بيانات العميل ورقم هاتفه، الخدمة والبنود، الكمية، السعر، الإجمالي، طريقة الدفع، الحالة، الملاحظات
 * - منع ظهور رابط الموقع أو واجهة لوحة التحكم
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return errorPage("لم يتم تحديد فاتورة", "لم يتم توفير معرف الفاتورة للطباعة.");
  }

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      service: true,
      payments: { where: { status: "approved" } },
    },
  });

  if (!invoice) {
    return errorPage("الفاتورة غير موجودة", "تعذر إنشاء نسخة الطباعة — الفاتورة المطلوبة غير موجودة أو تم حذفها.");
  }

  // التحقق من اكتمال البيانات الأساسية
  if (!invoice.invoiceNumber || !invoice.customerId || invoice.totalAmount === undefined) {
    return errorPage("بيانات الفاتورة غير مكتملة", "تعذر إنشاء نسخة الطباعة — بيانات الفاتورة غير مكتملة.");
  }

  // جلب بيانات العميل
  const customer = await db.customer.findUnique({ where: { id: invoice.customerId } });

  // إعداد تفاصيل الخدمة
  const cfg = serviceConfigs[invoice.serviceType as keyof typeof serviceConfigs];
  const serviceDetails = invoice.service ? JSON.parse(invoice.service.details || "{}") : {};
  const serviceNotes = invoice.service?.notes ?? "";

  // ترجمة تسميات تفاصيل الخدمة
  const detailRows: Array<{ label: string; value: string }> = [];
  if (cfg) {
    for (const f of cfg.fields) {
      const v = serviceDetails[f.name];
      if (v === undefined || v === null || v === "") continue;
      // إخفاء اسم الوكيل/المندوب ورقمه عند الطباعة
      if (f.name === "agentName" || f.name === "agentNumber") continue;
      let display: string = String(v);
      if (f.type === "select" && f.options) {
        const opt = f.options.find((o) => o.value === v);
        if (opt) display = tr("ar", opt.labelKey);
      }
      detailRows.push({ label: tr("ar", f.labelKey), value: display });
    }
  }

  const statusLabelAr = (s: string) =>
    s === "paid" ? "مدفوعة" : s === "partial" ? "جزئية" : s === "issued" ? "صادرة" : s === "cancelled" ? "ملغاة" : "مسودة";

  const currencySymbol = (c: string) => (c === "SAR" ? "ر.س" : c === "YER" ? "ر.ي" : "$");

  const paymentMethodLabel = (m: string | null) => {
    if (!m) return "—";
    if (m === "cash") return "نقداً";
    if (m === "transfer") return "حوالة";
    if (m === "wallet") return "محفظة";
    return m;
  };

  const serviceTypeLabel = (t: string) => {
    const labels: Record<string, string> = {
      hajj_program: "حج — برامج",
      hajj_regular: "حج — عادي",
      umrah_program: "عمرة — برامج",
      umrah_regular: "عمرة — عادية",
      passport_attendance: "جوازات — بحضور",
      passport_without: "جوازات — بدون حضور",
      flight_ticket: "تذاكر الطيران",
      intl_bus: "نقل دولي — باصات",
      intl_car: "نقل دولي — سيارات",
      local_bus: "نقل محلي — باصات",
      local_car: "نقل محلي — سيارات",
      visa_medical: "تأشيرة علاجية",
      visa_tourist: "تأشيرة سياحية",
      visa_work: "تأشيرة عمل",
      visa_visit: "تأشيرة زيارة",
      shipping: "الشحن",
      customs: "التخليص الجمركي",
      security_approval: "موافقات أمنية",
      medical_report: "تقارير طبية",
      travel_insurance: "تأمينات السفر",
      hotel_booking: "الحجوزات الفندقية",
    };
    return labels[t] ?? t;
  };

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>فاتورة ${invoice.invoiceNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
    color: #1F2937;
    background: #FFFFFF;
    padding: 0;
  }
  .invoice-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 20mm 18mm;
  }
  /* رأس الفاتورة */
  .invoice-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #7C3AED;
    padding-bottom: 20px;
    margin-bottom: 25px;
  }
  .company-info {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .company-logo {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .company-logo svg {
    width: 32px;
    height: 32px;
    fill: white;
  }
  .company-name {
    font-size: 24px;
    font-weight: 700;
    color: #7C3AED;
    line-height: 1.3;
  }
  .company-sub {
    font-size: 13px;
    color: #64748B;
    margin-top: 2px;
  }
  .invoice-meta {
    text-align: left;
  }
  .invoice-title {
    font-size: 18px;
    font-weight: 700;
    color: #1F2937;
    margin-bottom: 8px;
  }
  .invoice-number {
    font-size: 14px;
    color: #64748B;
  }
  .invoice-number strong {
    color: #1F2937;
    font-size: 16px;
  }
  .invoice-date {
    font-size: 12px;
    color: #94A3B8;
    margin-top: 4px;
  }
  /* بيانات العميل */
  .customer-section {
    background: #F8F9FC;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 25px;
  }
  .customer-label {
    font-size: 12px;
    color: #64748B;
    margin-bottom: 6px;
    font-weight: 600;
  }
  .customer-name {
    font-size: 17px;
    font-weight: 700;
    color: #1F2937;
    margin-bottom: 4px;
  }
  .customer-phone {
    font-size: 14px;
    color: #64748B;
  }
  /* تفاصيل الخدمة */
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #6D28D9;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #E2E8F0;
  }
  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
    margin-bottom: 25px;
  }
  .detail-item {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 4px 0;
    border-bottom: 1px dotted #E2E8F0;
  }
  .detail-label {
    color: #64748B;
  }
  .detail-value {
    font-weight: 600;
    color: #1F2937;
  }
  /* جدول المبالغ */
  .amounts-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  .amounts-table th {
    background: #F3E8FF;
    color: #6D28D9;
    padding: 10px 16px;
    text-align: right;
    font-size: 13px;
    font-weight: 700;
    border: 1px solid #E2E8F0;
  }
  .amounts-table td {
    padding: 10px 16px;
    text-align: right;
    font-size: 14px;
    border: 1px solid #E2E8F0;
  }
  .amount-total {
    font-weight: 700;
    font-size: 16px;
    background: #F8F9FC;
  }
  .amount-paid { color: #10B981; font-weight: 700; }
  .amount-remaining { color: #F97316; font-weight: 700; }
  .status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
  }
  .status-paid { background: #ECFDF5; color: #10B981; }
  .status-partial { background: #FEF9C3; color: #EAB308; }
  .status-issued { background: #EFF6FF; color: #3B82F6; }
  .status-cancelled { background: #FEF2F2; color: #EF4444; }
  /* معلومات الدفع */
  .payment-info {
    display: flex;
    gap: 30px;
    margin-bottom: 20px;
    font-size: 13px;
  }
  .payment-info-item {
    flex: 1;
  }
  .payment-info-label {
    color: #64748B;
    margin-bottom: 4px;
  }
  .payment-info-value {
    font-weight: 600;
    color: #1F2937;
  }
  /* ملاحظات */
  .notes-box {
    background: #FEF9C3;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 30px;
    font-size: 13px;
    color: #92400E;
  }
  .notes-label {
    font-weight: 700;
    margin-bottom: 4px;
  }
  /* تذييل */
  .invoice-footer {
    border-top: 2px solid #7C3AED;
    padding-top: 15px;
    margin-top: 40px;
    text-align: center;
  }
  .footer-text {
    font-size: 12px;
    color: #94A3B8;
  }
  .footer-copyright {
    font-size: 11px;
    color: #CBD5E1;
    margin-top: 4px;
  }
  /* منع ظهور عناصر المتصفح */
  @media print {
    body { padding: 0; margin: 0; background: white; }
    .invoice-page { width: 100%; min-height: auto; padding: 15mm 12mm; margin: 0; }
    .print-button { display: none !important; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 10mm; }
  }
  /* زر الطباعة */
  .print-button {
    position: fixed;
    top: 20px;
    left: 20px;
    background: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    z-index: 9999;
    font-family: 'Cairo', Arial, sans-serif;
  }
  .print-button:hover { opacity: 0.9; }
</style>
</head>
<body>
  <!-- زر الطباعة — يختفي عند الطباعة -->
  <button class="print-button no-print" onclick="window.print()">
    🖨️ طباعة / حفظ PDF
  </button>
  <div class="invoice-page">
    <!-- رأس الفاتورة -->
    <div class="invoice-header">
      <div class="company-info">
        <div class="company-logo">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
        <div>
          <div class="company-name">سما اليمن للسفريات والسياحة</div>
          <div class="company-sub">نظام إدارة السفر والسياحة</div>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">فاتورة رسمية</div>
        <div class="invoice-number">رقم الفاتورة: <strong>${invoice.invoiceNumber}</strong></div>
        <div class="invoice-date">تاريخ الإصدار: ${new Date(invoice.issuedAt).toLocaleDateString("en-GB")}</div>
      </div>
    </div>

    <!-- بيانات العميل -->
    <div class="customer-section">
      <div class="customer-label">بيانات العميل</div>
      <div class="customer-name">${invoice.customerName}</div>
      ${customer ? `<div class="customer-phone">رقم العميل: ${customer.customerNumber} | الهاتف: ${customer.phoneNumber}</div>` : ""}
    </div>

    <!-- تفاصيل الخدمة -->
    ${detailRows.length > 0 ? `
    <div class="section-title">تفاصيل الخدمة — ${serviceTypeLabel(invoice.serviceType)}</div>
    <div class="details-grid">
      ${detailRows.map((r) => `<div class="detail-item"><span class="detail-label">${r.label}</span><span class="detail-value">${r.value}</span></div>`).join("")}
    </div>
    ` : `<div class="section-title">نوع الخدمة: ${serviceTypeLabel(invoice.serviceType)}</div>`}

    <!-- معلومات الدفع -->
    <div class="payment-info">
      <div class="payment-info-item">
        <div class="payment-info-label">طريقة الدفع</div>
        <div class="payment-info-value">${paymentMethodLabel(invoice.service?.paymentMethod ?? null)}</div>
      </div>
      <div class="payment-info-item">
        <div class="payment-info-label">العملة</div>
        <div class="payment-info-value">${currencySymbol(invoice.currency)} (${invoice.currency})</div>
      </div>
      <div class="payment-info-item">
        <div class="payment-info-label">رقم الخدمة</div>
        <div class="payment-info-value">${invoice.serviceNumber}</div>
      </div>
    </div>

    <!-- جدول المبالغ -->
    <table class="amounts-table">
      <thead>
        <tr>
          <th>البند</th>
          <th>القيمة</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>الإجمالي</td>
          <td class="amount-total">${invoice.totalAmount.toLocaleString("en-US")} ${currencySymbol(invoice.currency)}</td>
        </tr>
        <tr>
          <td>المدفوع</td>
          <td class="amount-paid">${invoice.paidAmount.toLocaleString("en-US")} ${currencySymbol(invoice.currency)}</td>
        </tr>
        <tr>
          <td>المتبقي</td>
          <td class="amount-remaining">${invoice.remainingAmount.toLocaleString("en-US")} ${currencySymbol(invoice.currency)}</td>
        </tr>
        <tr>
          <td>الحالة</td>
          <td><span class="status-badge status-${invoice.status}">${statusLabelAr(invoice.status)}</span></td>
        </tr>
      </tbody>
    </table>

    ${serviceNotes ? `<div class="notes-box"><div class="notes-label">ملاحظات:</div>${serviceNotes}</div>` : ""}

    <!-- تذييل -->
    <div class="invoice-footer">
      <div class="footer-text">شكراً لتعاملكم معنا — سما اليمن للسفريات والسياحة</div>
      <div class="footer-copyright">جميع الحقوق محفوظة لدى Sky Link 2026</div>
    </div>
  </div>
  <script>
    // فتح مربع الطباعة الرسمي تلقائياً بعد تحميل الصفحة
    // يسمح للمستخدم باختيار «حفظ كملف PDF» وتحديد موقع الحفظ
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function errorPage(title: string, message: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: 'Cairo', Arial, sans-serif; padding: 60px; text-align: center; color: #1F2937; }
  .alert { max-width: 500px; margin: 0 auto; padding: 30px; border: 2px solid #EF4444; border-radius: 12px; background: #FEF2F2; }
  .icon { font-size: 48px; color: #EF4444; margin-bottom: 16px; }
  h1 { color: #EF4444; margin-bottom: 8px; }
  p { color: #64748B; }
</style>
</head>
<body>
  <div class="alert">
    <div class="icon">⚠</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p style="font-size: 11px; color: #94A3B8; margin-top: 20px;">جميع الحقوق محفوظة لدى Sky Link 2026</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
