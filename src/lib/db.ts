/**
 * طبقة الاتصال بقاعدة البيانات — Prisma Client
 *
 * جاهزة للترحيل إلى PostgreSQL عبر تغيير DATABASE_URL في .env
 * حالياً تستخدم SQLite محلي (ملف على القرص) — حفظ دائم وليس تخزين متصفح
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
