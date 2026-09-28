/**
 * Seed script — تهيئة الحساب الأولي للمدير العام فقط
 *
 * اسم المستخدم: user1
 * كلمة المرور الأولية: sama1
 * الدور: مدير عام
 *
 * أسئلة الاستعادة (للمدير العام فقط، تُخزَّن مجزّأة):
 * - متى تم افتتاح مكتب سما اليمن؟ → 2024
 * - ما هو إيميلك الشخصي؟ → ahmed778495152@gmail.com
 */

import { db } from "../src/lib/db";
import * as crypto from "crypto";
import bcrypt from "bcryptjs"; // تمت إضافة مكتبة التشفير

// تجزئة بسيطة للأغراض التجريبية (لأسئلة الاستعادة)
function simpleHash(input: string): string {
  return crypto.createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

async function main() {
  // تشفير كلمة المرور بشكل متوافق مع نظام تسجيل الدخول
  const hashedPassword = await bcrypt.hash("sama1", 10);

  // التحقق من وجود حساب المدير مسبقاً
  const existing = await db.user.findFirst({
    where: { username: "user1" },
  });

  if (existing) {
    // إذا كان موجوداً (كما في حالتك الآن)، نقوم بتحديث كلمة المرور فقط لتكون مشفرة
    await db.user.update({
      where: { id: existing.id },
      data: { passwordHash: hashedPassword },
    });
    console.log("✓ حساب المدير العام موجود مسبقاً — تم تحديث كلمة المرور لتكون مشفرة بشكل صحيح.");
    return;
  }

  // إنشاء حساب المدير العام إذا لم يكن موجوداً
  const manager = await db.user.create({
    data: {
      username: "user1",
      passwordHash: hashedPassword, // تم استخدام الكلمة المشفرة هنا
      role: "manager",
      isActive: true,
      mustChangePassword: false,
      // أسئلة الاستعادة — تُخزَّن مجزّأة وليس كنص صريح
      securityQ1Hash: simpleHash("2024"),
      securityQ2Hash: simpleHash("ahmed778495152@gmail.com"),
    },
  });

  console.log("✓ تم إنشاء حساب المدير العام:");
  console.log("  اسم المستخدم: user1");
  console.log("  كلمة المرور الأولية: sama1");
  console.log("  الدور: مدير عام");
  console.log("  تم تجهيز أسئلة الاستعادة بشكل آمن.");
  console.log(`  ID: ${manager.id}`);
}

main()
  .catch((e) => {
    console.error("✗ فشل التهيئة:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });