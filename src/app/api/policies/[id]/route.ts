import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  if (user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "only_manager_can_manage" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const existing = await db.policy.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const updated = await db.policy.update({
    where: { id },
    data: {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      category: body.category ?? existing.category,
      isActive: body.isActive ?? existing.isActive,
    },
  });

  await logAudit(user, "تعديل سياسة", "policies", `تعديل السياسة: ${updated.title}`, "policy", id);
  return NextResponse.json({ ok: true, policy: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  if (user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "only_manager_can_manage" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.policy.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  await db.policy.delete({ where: { id } });
  await logAudit(user, "حذف سياسة", "policies", `حذف السياسة: ${existing.title}`, "policy", id);
  return NextResponse.json({ ok: true });
}
