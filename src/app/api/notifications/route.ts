import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/notifications — قائمة الإشعارات */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const notifications = await db.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      moduleKey: n.moduleKey,
      relatedEntityId: n.relatedEntityId,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

/** PUT /api/notifications — تعليم إشعار كمقروء */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { id, markAll } = await req.json();

  if (markAll) {
    await db.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  } else if (id) {
    await db.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ ok: true });
}
