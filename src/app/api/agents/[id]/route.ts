import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع تعديل الوكلاء
  if (user.role === "accountant") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "403 — غير مصرح للمحاسب بإدارة الوكلاء" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const existing = await db.agent.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const updated = await db.agent.update({
    where: { id },
    data: {
      officeName: body.officeName ?? existing.officeName,
      agentNumber: body.agentNumber ?? existing.agentNumber,
      serviceType: body.serviceType ?? existing.serviceType,
    },
  });

  await logAudit(user, "تعديل وكيل", "agents", `تعديل الوكيل: ${updated.officeName}`, "agent", id);
  return NextResponse.json({ ok: true, agent: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع حذف الوكلاء
  if (user.role === "accountant") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "403 — غير مصرح للمحاسب بإدارة الوكلاء" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await db.agent.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  await db.agent.delete({ where: { id } });
  await logAudit(user, "حذف وكيل", "agents", `حذف الوكيل: ${existing.officeName}`, "agent", id);
  return NextResponse.json({ ok: true });
}
