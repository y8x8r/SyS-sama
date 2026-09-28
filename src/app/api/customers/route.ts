import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, genNumber, nextSeq, checkModuleAccess } from "@/lib/auth";

/** GET /api/customers — قائمة العملاء مع بحث وتقسيم (Pagination) */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب: قراءة فقط للعملاء المرتبطين بالفواتير — مسموح
  // لكن لا يستطيع إنشاء/تعديل/حذف عملاء

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  
  // إعدادات التقسيم (Pagination)
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const skip = (page - 1) * limit;

  // توحيد شرط البحث لاستخدامه في جلب البيانات والعد
  const whereCondition = q
    ? {
        OR: [
          { fullName: { contains: q } },
          { customerNumber: { contains: q } },
          { phoneNumber: { contains: q } },
          { passportNumber: { contains: q } },
        ],
      }
    : undefined;

  // جلب العملاء مع تطبيق التقسيم (take & skip)
  const customers = await db.customer.findMany({
    where: whereCondition,
    take: limit,
    skip: skip,
    orderBy: { createdAt: "desc" },
  });

  // حساب إجمالي العملاء (المطابقين للبحث) لمعرفة هل يوجد دفعات متبقية
  const totalCount = await db.customer.count({ where: whereCondition });
  const hasMore = skip + customers.length < totalCount;

  return NextResponse.json({
    ok: true,
    hasMore,
    totalCount,
    customers: customers.map((c) => ({
      id: c.id,
      customerNumber: c.customerNumber,
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      passportNumber: c.passportNumber,
      nationalId: c.nationalId,
      cardNumber: c.cardNumber,
      joinedOn: c.joinedOn.toISOString().split("T")[0],
      referralSource: c.referralSource,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

/** POST /api/customers — إضافة عميل جديد (مدير عام + موظف حجوزات فقط) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع إنشاء عملاء
  const accessCheck = checkModuleAccess(user, "customers");
  if (accessCheck && user.role === "accountant") return accessCheck;

  const body = await req.json();
  const { fullName, phoneNumber, passportNumber, nationalId, cardNumber, referralSource } = body;

  if (!fullName?.trim() || !phoneNumber?.trim()) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 }
    );
  }

  const seq = await nextSeq("customers");
  const customerNumber = `CUST-${String(seq).padStart(5, "0")}`;

  const customer = await db.customer.create({
    data: {
      customerNumber,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      passportNumber: passportNumber || null,
      nationalId: nationalId || null,
      cardNumber: cardNumber || null,
      joinedOn: new Date(),
      referralSource: referralSource || null,
      isActive: true,
    },
  });

  await logAudit(user, "إضافة عميل", "customers", `إضافة عميل جديد: ${customer.fullName} (${customer.customerNumber})`, "customer", customer.id);

  return NextResponse.json({
    ok: true,
    customer: {
      id: customer.id,
      customerNumber: customer.customerNumber,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      passportNumber: customer.passportNumber,
      nationalId: customer.nationalId,
      cardNumber: customer.cardNumber,
      joinedOn: customer.joinedOn.toISOString().split("T")[0],
      referralSource: customer.referralSource,
      isActive: customer.isActive,
      createdAt: customer.createdAt.toISOString(),
    },
  });
}