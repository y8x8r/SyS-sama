"use client";

import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import type { Role } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Shield, KeyRound, UserCog, Lock } from "lucide-react";

export function UsersPermissionsPage() {
  const lang = useAppStore((s) => s.lang);
  const users = useAppStore((s) => s.users);
  const employees = useAppStore((s) => s.employees);
  const setPage = useAppStore((s) => s.setPage);
  const currentUser = useAppStore((s) => s.currentUser);

  const roleLabel = (r: Role) =>
    r === "manager" ? tr(lang, "role_general_manager")
    : r === "accountant" ? tr(lang, "role_accountant")
    : tr(lang, "role_booking");

  const roleColor = (r: string) =>
    r === "manager" ? "bg-pastel-lilac text-pastel-lilac"
    : r === "accountant" ? "bg-pastel-peach text-pastel-peach"
    : "bg-pastel-mint text-pastel-mint";

  const isManager = currentUser?.role === "manager";

  const permissionsMatrix = [
    {
      role: "manager" as Role,
      label: tr(lang, "role_general_manager"),
      icon: Shield,
      color: "#7C3AED",
      bg: "bg-pastel-lilac",
      perms: [
        lang === "ar" ? "صلاحيات كاملة على النظام" : "Full system access",
        lang === "ar" ? "قراءة، كتابة، تعديل، حذف، حجز" : "Read, write, update, delete, book",
        lang === "ar" ? "إدارة كاملة للحسابات والصلاحيات والإعدادات" : "Manage accounts, permissions, settings",
        lang === "ar" ? "إدارة المالية والمراقبة والتقارير" : "Manage finance, monitoring, reports",
        lang === "ar" ? "إنشاء وتعديل وحذف الموظفين" : "Create, edit, delete employees",
        lang === "ar" ? "تغيير كلمة المرور الخاصة" : "Change own password",
      ],
    },
    {
      role: "booking_officer" as Role,
      label: tr(lang, "role_booking"),
      icon: UserCog,
      color: "#10B981",
      bg: "bg-pastel-mint",
      perms: [
        lang === "ar" ? "صلاحيات الحجز والخدمات التشغيلية المصرح بها" : "Booking and authorized operational services",
        lang === "ar" ? "البحث عن العملاء" : "Search customers",
        lang === "ar" ? "طباعة مستندات الخدمات" : "Print service documents",
        lang === "ar" ? "لا يصل لإعدادات المراقبة" : "No access to monitoring settings",
        lang === "ar" ? "لا يدير الحسابات أو الصلاحيات" : "Cannot manage accounts or permissions",
        lang === "ar" ? "لا يصل للفواتير" : "No access to invoices",
      ],
    },
    {
      role: "accountant" as Role,
      label: tr(lang, "role_accountant"),
      icon: KeyRound,
      color: "#F97316",
      bg: "bg-pastel-peach",
      perms: [
        lang === "ar" ? "تحكم كامل في الوحدات المالية" : "Full control over financial units",
        lang === "ar" ? "الإيرادات والمصروفات" : "Revenues and expenses",
        lang === "ar" ? "المدفوعات والفواتير" : "Payments and invoices",
        lang === "ar" ? "التقارير المالية" : "Financial reports",
        lang === "ar" ? "قراءة الوحدات التشغيلية للتحقق المحاسبي" : "Read operational units for accounting verification",
        lang === "ar" ? "لا يدير الحسابات أو الصلاحيات" : "Cannot manage accounts or permissions",
      ],
    },
  ];

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_users_permissions")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "ar"
              ? "إدارة الحسابات والصلاحيات — متاحة للمدير العام فقط."
              : "Accounts & permissions management — available to General Manager only."}
          </p>
        </div>
        {isManager && (
          <Button
            className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2 shadow-sm"
            onClick={() => setPage("employees")}
          >
            <Plus className="w-4 h-4" />
            {tr(lang, "create_employee")}
          </Button>
        )}
      </div>

      {/* Permissions matrix — الأدوار الثلاثة المعتمدة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {permissionsMatrix.map((r) => (
          <Card key={r.role} className="border-border card-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${r.bg}`}>
                  <r.icon className="w-5 h-5" style={{ color: r.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="text-[11px] text-muted-foreground num">
                    {users.filter((u) => u.role === r.role).length} {lang === "ar" ? "مستخدم" : "users"}
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {r.perms.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                    {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table — متاح للمدير العام فقط */}
      {isManager ? (
        <Card className="border-border card-shadow">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">{tr(lang, "employee_name")}</TableHead>
                    <TableHead className="text-xs font-semibold">{tr(lang, "username")}</TableHead>
                    <TableHead className="text-xs font-semibold">{tr(lang, "role")}</TableHead>
                    <TableHead className="text-xs font-semibold">{tr(lang, "status")}</TableHead>
                    <TableHead className="text-xs font-semibold">{lang === "ar" ? "آخر دخول" : "Last Login"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const emp = employees.find((e) => e.id === u.employeeId);
                    return (
                      <TableRow key={u.id} className="hover:bg-accent/30">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pastel-lilac to-pastel-lilac flex items-center justify-center text-pastel-lilac font-bold text-sm">
                              {emp?.fullName.charAt(0) ?? u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-foreground text-sm">{emp?.fullName ?? u.username}</div>
                              <div className="text-[11px] text-muted-foreground num">{emp?.employeeNumber}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground num">@{u.username}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={roleColor(u.role)}>
                            {roleLabel(u.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={u.isActive ? "bg-pastel-mint text-pastel-mint" : "bg-muted text-muted-foreground"}>
                            {u.isActive ? tr(lang, "active") : tr(lang, "inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground num">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-GB") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border card-shadow">
          <CardContent className="p-12 text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{tr(lang, "only_manager_can_manage")}</h3>
            <p className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "إدارة الحسابات والصلاحيات متاحة للمدير العام فقط."
                : "Account and permissions management is only available to the General Manager."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
