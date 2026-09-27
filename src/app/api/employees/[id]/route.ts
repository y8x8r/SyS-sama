import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

/**
 * PUT /api/employees/[id] — تعديل بيانات الموظف (المدير العام فقط)
 *
 * يسمح بتعديل: الاسم، اسم المستخدم، كلمة المرور فقط.
 * لا يسمح بتعديل الصلاحيات أو الأدوار.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  if (user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "only_manager_can_edit" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { fullName, username, password } = body;

  // البحث عن الموظف
  const employee = await db.employee.findUnique({ where: { id } });
  if (!employee) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // البحث عن المستخدم المرتبط
  const linkedUser = await db.user.findFirst({ where: { employeeId: id } });

  try {
    await db.$transaction(async (tx) => {
      // 1. تعديل اسم الموظف
      if (fullName?.trim()) {
        await tx.employee.update({
          where: { id },
          data: { fullName: fullName.trim() },
        });
      }

      // 2. تعديل بيانات المستخدم المرتبط
      if (linkedUser) {
        const updateData: any = {};

        // تعديل اسم المستخدم — مع التحقق من عدم تكراره (للمستخدمين النشطين فقط)
        if (username?.trim() && username.trim() !== linkedUser.username) {
          const existing = await tx.user.findFirst({
            where: { username: { equals: username.trim() }, isActive: true, id: { not: linkedUser.id } },
          });
          if (existing) {
            throw new Error("username_exists");
          }
          // التحقق من وجود مستخدم معطلون بنفس اسم المستخدم
          // ( Prisma @unique constraint يمنع التكرار حتى لو كان معطّلاً)
          const inactiveUser = await tx.user.findFirst({
            where: { username: { equals: username.trim() }, isActive: false, id: { not: linkedUser.id } },
          });
          if (inactiveUser) {
            const suffix = `_deleted_${Date.now()}`;
            await tx.user.update({
              where: { id: inactiveUser.id },
              data: { username: `${inactiveUser.username}${suffix}` },
            });
          }
          updateData.username = username.trim();
        }

        // تعديل كلمة المرور
        if (password && password.length >= 4) {
          updateData.passwordHash = password;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.user.update({
            where: { id: linkedUser.id },
            data: updateData,
          });
        }
      }
    });

    await logAudit(user, "تعديل موظف", "users", `تعديل بيانات الموظف: ${employee.fullName} (${employee.employeeNumber})`, "employee", id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "username_exists") {
      return NextResponse.json({ ok: false, error: "username_exists" }, { status: 400 });
    }
    console.error("Update employee error:", err);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/employees/[id] — حذف موظف نهائياً مع إلغاء جميع صلاحياته
 *
 * يقوم بـ:
 *   1. حذف صلاحيات المستخدم (user_permissions)
 *   2. تعطيل حساب المستخدم المرتبط (users.isActive = false)
 *   3. حذف الموظف من جدول employees
 *
 * المدير العام فقط يستطيع الحذف.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  if (user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "only_manager_can_delete" }, { status: 403 });
  }

  const { id } = await params;

  const employee = await db.employee.findUnique({ where: { id } });
  if (!employee) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. البحث عن المستخدم المرتبط
      const linkedUser = await tx.user.findFirst({ where: { employeeId: id } });

      if (linkedUser) {
        // 2. حذف جميع صلاحيات المستخدم
        await tx.userPermission.deleteMany({ where: { userId: linkedUser.id } });
        // 3. تعطيل حساب المستخدم
        await tx.user.update({
          where: { id: linkedUser.id },
          data: { isActive: false, employeeId: null },
        });
      }

      // 4. حذف الموظف
      await tx.employee.delete({ where: { id } });
    });

    await logAudit(user, "حذف موظف", "users", `حذف الموظف: ${employee.fullName} (${employee.employeeNumber}) مع إلغاء جميع صلاحياته`, "employee", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete employee error:", err);
    return NextResponse.json({ ok: false, error: "delete_failed", details: String(err) }, { status: 500 });
  }
}
