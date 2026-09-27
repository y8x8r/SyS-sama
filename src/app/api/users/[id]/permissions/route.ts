import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

/**
 * GET /api/users/[id]/permissions
 *
 * يجلب صلاحيات مستخدم محدد. المدير العام فقط يستطيع الوصول.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  if (user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "only_manager_can_manage" }, { status: 403 });
  }

  const { id } = await params;

  const targetUser = await db.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true, isActive: true, employeeId: true },
  });

  if (!targetUser) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const permissions = await db.userPermission.findMany({
    where: { userId: id },
  });

  return NextResponse.json({
    ok: true,
    user: targetUser,
    permissions: permissions.map((p) => ({
      id: p.id,
      userId: p.userId,
      moduleKey: p.moduleKey,
      level: p.level,
    })),
  });
}

/**
 * PUT /api/users/[id]/permissions
 *
 * يحفظ صلاحيات مستخدم محدد (يستبدل جميع الصلاحيات).
 * المدير العام فقط يستطيع.
 *
 * الصلاحيات المدعومة:
 *   - level: "read" | "write" | "update" | "delete" | "full" | "hidden"
 *   - moduleKey: "services" | "customers" | "agents_companies" | "finance" | "monitoring" | "settings" | "policies"
 *                أو "service:hajj_program" لإخفاء خدمة محددة
 *
 * level = "hidden" يعني إخفاء القائمة/الخدمة عن الموظف
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  if (user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "only_manager_can_manage" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { permissions } = body as {
    permissions: Array<{ moduleKey: string; level: string }>;
  };

  if (!Array.isArray(permissions)) {
    return NextResponse.json({ ok: false, error: "invalid_permissions" }, { status: 400 });
  }

  const targetUser = await db.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true },
  });

  if (!targetUser) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // المدير العام لا يمكن تعديل صلاحياته (لديه صلاحيات كاملة دائماً)
  if (targetUser.role === "manager") {
    return NextResponse.json({ ok: false, error: "cannot_modify_manager" }, { status: 400 });
  }

  try {
    await db.$transaction(async (tx) => {
      // حذف جميع الصلاحيات الحالية
      await tx.userPermission.deleteMany({ where: { userId: id } });

      // إدراج الصلاحيات الجديدة
      if (permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map((p) => ({
            userId: id,
            moduleKey: p.moduleKey,
            level: p.level,
          })),
        });
      }
    });

    await logAudit(
      user,
      "تعديل صلاحيات مستخدم",
      "users",
      `تعديل صلاحيات المستخدم: ${targetUser.username} (${permissions.length} صلاحية)`,
      "user",
      id
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update permissions error:", err);
    return NextResponse.json(
      { ok: false, error: "update_failed", details: String(err) },
      { status: 500 }
    );
  }
}
