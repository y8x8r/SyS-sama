import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

/** GET /api/policies — قائمة السياسات */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const policies = await db.policy.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    ok: true,
    policies: policies.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

/** POST /api/policies — إضافة سياسة (المدير العام فقط) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  if (user.role !== "manager") {
    return NextResponse.json({ ok: false, error: "only_manager_can_manage" }, { status: 403 });
  }

  const { title, description, category } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const policy = await db.policy.create({
    data: {
      title: title.trim(),
      description: description || "",
      category: category || "general",
      isActive: true,
    },
  });

  await logAudit(user, "إضافة سياسة", "policies", `إضافة سياسة: ${policy.title}`, "policy", policy.id);
  return NextResponse.json({ ok: true, policy });
}
