import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

/** GET /api/agents */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const agents = await db.agent.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    ok: true,
    agents: agents.map((a) => ({
      id: a.id,
      officeName: a.officeName,
      agentNumber: a.agentNumber,
      serviceType: a.serviceType,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

/** POST /api/agents — إضافة وكيل (اعتماد فوري) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  // المحاسب لا يستطيع إضافة وكلاء
  if (user.role === "accountant") {
    return NextResponse.json({ ok: false, error: "forbidden", message: "403 — غير مصرح للمحاسب بإدارة الوكلاء" }, { status: 403 });
  }

  const { officeName, agentNumber, serviceType } = await req.json();
  if (!officeName?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const agent = await db.agent.create({
    data: {
      officeName: officeName.trim(),
      agentNumber: agentNumber || "",
      serviceType: serviceType || "",
      isActive: true,
    },
  });

  await logAudit(user, "إضافة وكيل", "agents", `إضافة وكيل: ${agent.officeName}`, "agent", agent.id);
  return NextResponse.json({ ok: true, agent });
}
