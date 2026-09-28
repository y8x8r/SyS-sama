import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// مدة صلاحية الجلسة: 7 أيام
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "missing_credentials" },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({
      where: {
        username: { equals: username.trim() },
        isActive: true,
      },
    });

    // التحقق من وجود المستخدم
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "invalid_credentials" },
        { status: 401 }
      );
    }

    // التحقق من كلمة المرور المشفرة
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { ok: false, error: "invalid_credentials" },
        { status: 401 }
      );
    }

    // تحديث آخر دخول
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // جلب صلاحيات المستخدم الدقيقة
    const userPermissions = await db.userPermission.findMany({
      where: { userId: user.id },
    });

    // إنشاء جلسة في قاعدة البيانات (بدلاً من الذاكرة)
    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await db.session.create({
      data: {
        sessionId,
        userId: user.id,
        username: user.username,
        role: user.role,
        expiresAt,
      },
    });

    // تسجيل في سجل التدقيق
    await db.auditLog.create({
      data: {
        actorUsername: user.username,
        actorRole: user.role,
        actorUserId: user.id,
        action: "تسجيل دخول",
        moduleKey: "auth",
        entityType: "user",
        entityId: user.id,
        summary: "تسجيل دخول ناجح",
      },
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
      permissions: userPermissions.map((p) => ({
        userId: p.userId,
        moduleKey: p.moduleKey,
        level: p.level,
      })),
    });

    // تعيين cookie للجلسة — يستمر 7 أيام عبر إعادة التشغيل والتحديث
    response.cookies.set("sama_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 أيام بالثواني
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}

/** الحصول على معلومات الجلسة الحالية من قاعدة البيانات */
export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("sama_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ ok: false, user: null });
  }

  // البحث عن الجلسة في قاعدة البيانات
  const session = await db.session.findUnique({
    where: { sessionId },
  });

  if (!session) {
    return NextResponse.json({ ok: false, user: null });
  }

  // التحقق من عدم انتهاء صلاحية الجلسة
  if (session.expiresAt < new Date()) {
    // الجلسة منتهية — حذفها
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return NextResponse.json({ ok: false, user: null });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { permissions: true },
  });
  if (!user || !user.isActive) {
    // المستخدم غير نشط — حذف الجلسة
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return NextResponse.json({ ok: false, user: null });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    permissions: user.permissions.map((p) => ({
      userId: p.userId,
      moduleKey: p.moduleKey,
      level: p.level,
    })),
  });
}