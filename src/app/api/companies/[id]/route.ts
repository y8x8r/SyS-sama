import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع تعديل شركات النقل
  if (user.role === "accountant") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "403 — غير مصرح للمحاسب بإدارة شركات النقل" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const existing = await db.transportCompany.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const updated = await db.transportCompany.update({
    where: { id },
    data: {
      companyName: body.companyName ?? existing.companyName,
      companyNumber: body.companyNumber ?? existing.companyNumber,
      address: body.address ?? existing.address,
    },
  });

  await logAudit(user, "تعديل شركة نقل", "companies", `تعديل شركة النقل: ${updated.companyName}`, "company", id);
  return NextResponse.json({ ok: true, company: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع حذف شركات النقل
  if (user.role === "accountant") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "403 — غير مصرح للمحاسب بإدارة شركات النقل" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await db.transportCompany.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  await db.transportCompany.delete({ where: { id } });
  await logAudit(user, "حذف شركة نقل", "companies", `حذف شركة النقل: ${existing.companyName}`, "company", id);
  return NextResponse.json({ ok: true });
}
