import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listTransactions } from "@/lib/accounting";

/** GET /api/transactions — قائمة العمليات المالية */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  const transactions = await listTransactions(limit);
  return NextResponse.json({ ok: true, transactions });
}
