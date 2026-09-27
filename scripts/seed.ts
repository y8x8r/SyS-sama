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
 *
 * لا تظهر هذه الإجابات في الواجهة أو النصوص المساعدة أو سجلات التدقيق أو الشيفرة الأمامية.
 */

import { db } from "../src/lib/db";
import * as crypto from "crypto";

// تجزئة بسيطة للأغراض التجريبية — في الإنتاج يُستخدم Argon2 أو bcrypt
function simpleHash(input: string): string {
  return crypto.createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

async function main() {
  // التحقق من عدم وجود حساب المدير مسبقاً
  const existing = await db.user.findFirst({
    where: { username: "user1" },
  });

  if (existing) {
    console.log("✓ حساب المدير العام موجود مسبقاً — تم تخطي التهيئة.");
    return;
  }

  // إنشاء حساب المدير العام فقط (لا حسابات تجريبية أخرى)
  const manager = await db.user.create({
    data: {
      username: "user1",
      passwordHash: "sama1", // في الإنتاج: Argon2 hash
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
