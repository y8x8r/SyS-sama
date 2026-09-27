import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

function simpleHash(input: string): string {
  return crypto.createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

/**
 * استعادة كلمة المرور — للمدير العام فقط
 *
 * يطرح سؤالين أمنيين:
 * 1. متى تم افتتاح مكتب سما اليمن؟ → 2024
 * 2. ما هو إيميلك الشخصي؟ → ahmed778495152@gmail.com
 *
 * لا تظهر الإجابات في الواجهة أو النصوص المساعدة أو سجلات التدقيق.
 * عند التحقق الصحيح، يسمح بتعيين كلمة مرور جديدة.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step, username, answer1, answer2, newPassword } = body;

    // العثور على حساب المدير العام فقط
    const user = await db.user.findFirst({
      where: {
        username: username?.trim() ?? "user1",
        role: "manager",
        isActive: true,
      },
    });

    // لا نكشف ما إذا كان المستخدم موجوداً أم لا
    if (!user || user.role !== "manager") {
      return NextResponse.json(
        { ok: false, error: "not_authorized" },
        { status: 403 }
      );
    }

    // الخطوة 1: التحقق من السؤالين الأمنيين
    if (step === "verify") {
      // التحقق من الإجابات بشكل آمن (مقارنة المجزّأات)
      const a1Hash = simpleHash(answer1 ?? "");
      const a2Hash = simpleHash(answer2 ?? "");

      const ok1 = user.securityQ1Hash && user.securityQ1Hash === a1Hash;
      const ok2 = user.securityQ2Hash && user.securityQ2Hash === a2Hash;

      if (!ok1 || !ok2) {
        // تسجيل محاولة فاشلة (بدون كشف الإجابات)
        await db.auditLog.create({
          data: {
            actorUsername: user.username,
            actorRole: user.role,
            action: "محاولة استعادة كلمة مرور فاشلة",
            moduleKey: "auth",
            entityType: "user",
            entityId: user.id,
            summary: "إجابات أسئلة الاستعادة غير صحيحة",
          },
        });
        return NextResponse.json(
          { ok: false, error: "incorrect_answers" },
          { status: 401 }
        );
      }

      // إصدار رمز استعادة مؤقت لمرة واحدة
      const resetToken = crypto.randomBytes(32).toString("hex");
      resetTokens.set(resetToken, {
        userId: user.id,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 دقائق
      });

      return NextResponse.json({ ok: true, resetToken });
    }

    // الخطوة 2: تعيين كلمة مرور جديدة
    if (step === "reset") {
      const { resetToken } = body;
      const tokenData = resetTokens.get(resetToken);

      if (!tokenData || tokenData.expiresAt < Date.now()) {
        return NextResponse.json(
          { ok: false, error: "invalid_or_expired_token" },
          { status: 401 }
        );
      }

      if (!newPassword || newPassword.length < 4) {
        return NextResponse.json(
          { ok: false, error: "password_too_short" },
          { status: 400 }
        );
      }

      // تحديث كلمة المرور
      await db.user.update({
        where: { id: tokenData.userId },
        data: {
          passwordHash: newPassword,
          mustChangePassword: false,
        },
      });

      // حذف الرمز بعد الاستخدام (لمرة واحدة)
      resetTokens.delete(resetToken);

      // تسجيل في سجل التدقيق (بدون كشف كلمة المرور)
      await db.auditLog.create({
        data: {
          actorUsername: user.username,
          actorRole: user.role,
          action: "استعادة كلمة المرور",
          moduleKey: "auth",
          entityType: "user",
          entityId: user.id,
          summary: "تم تعيين كلمة مرور جديدة عبر مسار الاستعادة",
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "invalid_step" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}

// رموز استعادة مؤقتة في الذاكرة (لمرة واحدة، تنتهي بعد 10 دقائق)
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();
