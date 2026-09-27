import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/audit — سجل التدقيق */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const logs = await db.auditLog.findMany({
    orderBy: { occurredAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    auditLogs: logs.map((l) => ({
      id: l.id,
      occurredAt: l.occurredAt.toISOString(),
      actorUsername: l.actorUsername,
      actorRole: l.actorRole,
      action: l.action,
      moduleKey: l.moduleKey,
      entityType: l.entityType,
      entityId: l.entityId,
      summary: l.summary,
    })),
  });
}
