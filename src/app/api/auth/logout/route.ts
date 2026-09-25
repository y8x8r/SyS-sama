import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get("sama_session")?.value;
  if (sessionId) {
    // البحث عن الجلسة في قاعدة البيانات
    const session = await db.session.findUnique({
      where: { sessionId },
    });

    if (session) {
      // تسجيل الخروج في سجل التدقيق
      await db.auditLog.create({
        data: {
          actorUsername: session.username,
          actorRole: session.role,
          actorUserId: session.userId,
          action: "تسجيل خروج",
          moduleKey: "auth",
          entityType: "user",
          entityId: session.userId,
          summary: "تسجيل خروج",
        },
      });

      // حذف الجلسة من قاعدة البيانات
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("sama_session");
  return response;
}
