import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

/** GET /api/employees — قائمة الموظفين */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const employees = await db.employee.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    employees: employees.map((e) => ({
      id: e.id,
      employeeNumber: e.employeeNumber,
      fullName: e.fullName,
      hiredOn: e.hiredOn.toISOString().split("T")[0],
      jobTitle: e.jobTitle,
      isActive: e.isActive,
      createdAt: e.createdAt.toISOString(),
      linkedUser: e.user
        ? {
            id: e.user.id,
            username: e.user.username,
            role: e.user.role,
            isActive: e.user.isActive,
            lastLoginAt: e.user.lastLoginAt?.toISOString() ?? null,
          }
        : null,
    })),
    users: employees.filter((e) => e.user).map((e) => ({
      id: e.user!.id,
      username: e.user!.username,
      role: e.user!.role,
      employeeId: e.user!.employeeId,
      isActive: e.user!.isActive,
      lastLoginAt: e.user!.lastLoginAt?.toISOString() ?? null,
      createdAt: e.user!.createdAt.toISOString(),
    })),
  });
}

/**
 * POST /api/employees — إنشاء حساب موظف
 *
 * الحقول بالترتيب: اسم الموظف ← اسم المستخدم ← الدور ← كلمة مرور الموظف
 * المدير العام فقط يستطيع إنشاء الحسابات.
 *
 * منطق إعادة استخدام اسم المستخدم:
 *   - إذا كان الاسم مستخدمًا من حساب نشط → منع التكرار (username_exists)
 *   - إذا كان الاسم مستخدمًا من حساب محذوف/معطل → إعادة تسمية القديم وإنشاء الجديد
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  if (user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "only_manager_can_manage" }, { status: 403 });
  }

  const body = await req.json();
  const { fullName, username, role, password } = body;

  // التحقق من الحقول المطلوبة
  if (!fullName?.trim() || !username?.trim() || !password || password.length < 4) {
    return NextResponse.json(
      { ok: false, error: "missing_fields_or_short_password" },
      { status: 400 }
    );
  }

  // التحقق من أن اسم المستخدم لا يحتوي على مسافات
  if (username.trim().includes(" ")) {
    return NextResponse.json(
      { ok: false, error: "username_no_spaces" },
      { status: 400 }
    );
  }

  const trimmedUsername = username.trim();

  // التحقق من عدم تكرار اسم المستخدم — فقط للمستخدمين النشطين
  const activeUser = await db.user.findFirst({
    where: { username: { equals: trimmedUsername }, isActive: true },
  });
  if (activeUser) {
    return NextResponse.json(
      { ok: false, error: "username_exists", message: "اسم المستخدم مستخدم حالياً من حساب نشط" },
      { status: 400 }
    );
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // التحقق من وجود مستخدم معطل بنفس اسم المستخدم
      // إذا وُجد، نعيد تسمية اسم المستخدم القديم لتحرير الاسم الأصلي
      // (Prisma @unique constraint يمنع تكرار اسم المستخدم حتى لو كان معطّلاً)
      const inactiveUser = await tx.user.findFirst({
        where: { username: { equals: trimmedUsername }, isActive: false },
      });
      if (inactiveUser) {
        // إعادة تسمية المستخدم المعطّل بإضافة لاحقة فريدة
        const suffix = `_deleted_${Date.now()}`;
        await tx.user.update({
          where: { id: inactiveUser.id },
          data: { username: `${inactiveUser.username}${suffix}` },
        });
      }

      // توليد رقم موظف فريد — البحث عن أعلى رقم موجود وإضافة 1
      // هذا يمنع تكرار الأرقام عند حذف موظفين سابقين
      const allEmployees = await tx.employee.findMany({
        select: { employeeNumber: true },
      });
      let maxSeq = 0;
      for (const emp of allEmployees) {
        const numPart = parseInt(emp.employeeNumber.replace(/\D/g, ""), 10);
        if (!isNaN(numPart) && numPart > maxSeq) maxSeq = numPart;
      }
      const employeeNumber = `EMP-${String(maxSeq + 1).padStart(4, "0")}`;

      const employee = await tx.employee.create({
        data: {
          employeeNumber,
          fullName: fullName.trim(),
          hiredOn: new Date(),
          jobTitle: role === "manager" ? "مدير عام" : role === "accountant" ? "محاسب" : "مسؤول حجوزات",
          isActive: true,
        },
      });

      const newUser = await tx.user.create({
        data: {
          username: trimmedUsername,
          passwordHash: password,
          role,
          employeeId: employee.id,
          isActive: true,
          mustChangePassword: false,
        },
      });

      return { employee, user: newUser };
    });

    await logAudit(user, "إنشاء حساب موظف", "users", `إنشاء حساب للموظف ${result.employee.fullName} (${result.employee.employeeNumber}) بدور: ${role === "manager" ? "مدير عام" : role === "accountant" ? "محاسب" : "مسؤول حجوزات"}`, "user", result.user.id);

    // إرجاع بيانات الموظف المنشأ لتحديث الواجهة محلياً بدون إعادة جلب
    return NextResponse.json({
      ok: true,
      employee: {
        id: result.employee.id,
        employeeNumber: result.employee.employeeNumber,
        fullName: result.employee.fullName,
        hiredOn: result.employee.hiredOn.toISOString().split("T")[0],
        jobTitle: result.employee.jobTitle,
        isActive: result.employee.isActive,
        createdAt: result.employee.createdAt.toISOString(),
        linkedUser: {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
          isActive: result.user.isActive,
          lastLoginAt: null,
        },
      },
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
        employeeId: result.employee.id,
        isActive: result.user.isActive,
        lastLoginAt: null,
        createdAt: result.user.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Create employee error:", err);
    // التحقق من نوع خطأ القيد الفريد
    if (err?.code === "P2002") {
      const targetField = err?.meta?.target?.[0] ?? "unknown";
      if (targetField === "username") {
        return NextResponse.json(
          { ok: false, error: "username_exists", message: "اسم المستخدم موجود مسبقاً" },
          { status: 400 }
        );
      }
      // خطأ في رقم الموظف — إعادة المحاولة ليست ضرورية هنا لأن المنطق أعلاه يجب أن يمنعه
      return NextResponse.json(
        { ok: false, error: "employee_number_conflict", message: "تعارض في رقم الموظف" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "create_failed", message: "فشل إنشاء الحساب" },
      { status: 500 }
    );
  }
}
