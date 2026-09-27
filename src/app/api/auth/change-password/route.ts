import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** تغيير كلمة المرور للمستخدم الحالي */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  const dbUser = await db.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // التحقق من كلمة المرور الحالية
  if (dbUser.passwordHash !== currentPassword) {
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });
  }

  if (!newPassword || newPassword.length < 4) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  }

  await db.user.update({
    where: { id: dbUser.id },
    data: {
      passwordHash: newPassword,
      mustChangePassword: false,
    },
  });

  await db.auditLog.create({
    data: {
      actorUsername: dbUser.username,
      actorRole: dbUser.role,
      actorUserId: dbUser.id,
      action: "تغيير كلمة المرور",
      moduleKey: "auth",
      entityType: "user",
      entityId: dbUser.id,
      summary: "تغيير كلمة المرور",
    },
  });

  return NextResponse.json({ ok: true });
}
