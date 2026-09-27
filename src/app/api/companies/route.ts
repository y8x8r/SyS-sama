import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const companies = await db.transportCompany.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    ok: true,
    companies: companies.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      companyNumber: c.companyNumber,
      address: c.address,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع إضافة شركات نقل
  if (user.role === "accountant") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "403 — غير مصرح للمحاسب بإدارة شركات النقل" }, { status: 403 });
  }

  const { companyName, companyNumber, address } = await req.json();
  if (!companyName?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const company = await db.transportCompany.create({
    data: {
      companyName: companyName.trim(),
      companyNumber: companyNumber || "",
      address: address || "",
      isActive: true,
    },
  });

  await logAudit(user, "إضافة شركة نقل", "companies", `إضافة شركة نقل: ${company.companyName}`, "company", company.id);
  return NextResponse.json({ ok: true, company });
}
