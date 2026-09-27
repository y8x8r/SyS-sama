"use client";

import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, User, Clock, Activity, FileText } from "lucide-react";

export function AuditLogPage() {
  const lang = useAppStore((s) => s.lang);
  const logs = useAppStore((s) => s.auditLogs);

  const roleLabel = (r: string) =>
    r === "manager" ? tr(lang, "role_manager") : r === "accountant" ? tr(lang, "role_accountant") : tr(lang, "role_booking");

  const actionColor = (action: string) => {
    if (action.includes("دخول") || action.includes("Login")) return { bg: "#E0F2FE", fg: "#0EA5E9", icon: User };
    if (action.includes("إنشاء") || action.includes("Create")) return { bg: "#ECFDF5", fg: "#10B981", icon: Activity };
    if (action.includes("تعديل") || action.includes("Edit")) return { bg: "#FEF9C3", fg: "#EAB308", icon: FileText };
    if (action.includes("إلغاء") || action.includes("حذف") || action.includes("Cancel")) return { bg: "#FEF2F2", fg: "#EF4444", icon: Activity };
    return { bg: "#F3E8FF", fg: "#7C3AED", icon: ScrollText };
  };

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_audit_log")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "ar"
              ? "سجل تدقيق غير قابل للتعديل أو الحذف من الواجهة"
              : "Immutable audit log — cannot be modified or deleted from UI"}
          </p>
        </div>
        <Badge variant="secondary" className="bg-[#F3E8FF] text-[#6D28D9]">
          <ScrollText className="w-3 h-3 me-1" />
          {logs.length} {lang === "ar" ? "سجل" : "records"}
        </Badge>
      </div>

      <Card className="border-border card-shadow">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const c = actionColor(log.action);
              const Icon = c.icon;
              return (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-accent/30 transition-colors">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: c.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: c.fg }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-foreground">{log.action}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium">
                        {log.moduleKey}
                      </Badge>
                      <span className="text-xs text-muted-foreground num">
                        {log.entityId && `# ${log.entityId}`}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1.5">{log.summary}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium text-foreground">{log.actorUsername}</span>
                        <span>•</span>
                        <span>{roleLabel(log.actorRole)}</span>
                      </span>
                      <span className="flex items-center gap-1 num">
                        <Clock className="w-3 h-3" />
                        {new Date(log.occurredAt).toLocaleString("en-GB")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
