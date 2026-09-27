"use client";

import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, AlertTriangle, Clock, XCircle } from "lucide-react";

export function VisaExpiryPage() {
  const lang = useAppStore((s) => s.lang);
  const visaExpiry = useAppStore((s) => s.visaExpiry);

  const counts = {
    near: visaExpiry.filter((v) => v.status === "near").length,
    urgent: visaExpiry.filter((v) => v.status === "urgent").length,
    expired: visaExpiry.filter((v) => v.status === "expired").length,
  };

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{tr(lang, "visa_expiry_title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "ar"
            ? "تأشيرة العمرة تُحسب لمدة 85 يوماً من تاريخ الدخول. مرتب تصاعدياً حسب الأيام المتبقية."
            : "Umrah visa is calculated as 85 days from entry date. Sorted ascending by days remaining."}
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border card-shadow">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FEF9C3] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#EAB308]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "قريبة (8-30 يوم)" : "Near (8-30 days)"}</p>
              <p className="text-2xl font-bold text-foreground num">{counts.near}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border card-shadow">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FFEDD5] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-[#F97316]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "عاجلة (0-7 أيام)" : "Urgent (0-7 days)"}</p>
              <p className="text-2xl font-bold text-[#F97316] num">{counts.urgent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border card-shadow">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "منتهية" : "Expired"}</p>
              <p className="text-2xl font-bold text-destructive num">{counts.expired}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{lang === "ar" ? "قائمة التأشيرات" : "Visa List"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">{tr(lang, "customer_name")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "audit_record_no")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "visa_kind")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "f_entry_date")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "expiry_date")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "days_left")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "phone")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visaExpiry.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      {tr(lang, "no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  visaExpiry.map((v) => (
                    <TableRow key={v.id} className="hover:bg-accent/30">
                      <TableCell className="text-sm font-medium text-foreground">{v.customerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground num">{v.serviceNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.visaKind}</TableCell>
                      <TableCell className="text-xs text-muted-foreground num">{v.entryDate ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground num">{v.expiryDate}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-bold num ${v.daysRemaining < 0 ? "text-destructive" : v.daysRemaining <= 7 ? "text-[#F97316]" : "text-[#EAB308]"}`}>
                          {v.daysRemaining > 0 ? v.daysRemaining : 0} {lang === "ar" ? "يوم" : "d"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground num">{v.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={
                          v.status === "expired" ? "bg-[#FEF2F2] text-destructive"
                          : v.status === "urgent" ? "bg-[#FFEDD5] text-[#F97316]"
                          : "bg-[#FEF9C3] text-[#EAB308]"
                        }>
                          {v.status === "expired" ? tr(lang, "cancelled") : v.status === "urgent" ? tr(lang, "list_urgent") : tr(lang, "list_regular")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
