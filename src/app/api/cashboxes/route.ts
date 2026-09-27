import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { listCashBoxes, getDefaultCashBox } from "@/lib/accounting";

/** GET /api/cashboxes — قائمة الصناديق مع أرصدتها */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });

  const boxes = await listCashBoxes();

  // ضمان وجود صناديق افتراضية لكل عملة
  await getDefaultCashBox("SAR");
  await getDefaultCashBox("USD");
  await getDefaultCashBox("YER");
  const allBoxes = await listCashBoxes();

  return NextResponse.json({ ok: true, cashBoxes: allBoxes });
}
