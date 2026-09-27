"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { LoginPage } from "@/components/auth/login-page";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ServicePage } from "@/components/services/service-page";
import { serviceConfigs } from "@/components/services/service-configs";
import { CustomersPage } from "@/components/management/customers-page";
import { EmployeesPage } from "@/components/management/employees-page";
import { AgentsCompaniesPage } from "@/components/management/agents-companies-page";
import { RevenuesExpensesPage } from "@/components/finance/revenues-expenses-page";
import { PaymentsPage } from "@/components/finance/payments-page";
import { InvoicesPage } from "@/components/finance/invoices-page";
import { StatisticsPage } from "@/components/monitoring/statistics-page";
import { AuditLogPage } from "@/components/monitoring/audit-log-page";
import { VisaExpiryPage } from "@/components/monitoring/visa-expiry-page";
import { UsersPermissionsPage } from "@/components/settings/users-permissions-page";
import { SystemSettingsPage } from "@/components/settings/system-settings-page";
import { Loader2 } from "lucide-react";
import type { NavPage, Role } from "@/lib/types";

export default function Home() {
  const isAuthed = useAppStore((s) => s.isAuthed);
  const authLoading = useAppStore((s) => s.authLoading);
  const currentPage = useAppStore((s) => s.currentPage);
  const currentUser = useAppStore((s) => s.currentUser);
  const checkSession = useAppStore((s) => s.checkSession);
  const setPage = useAppStore((s) => s.setPage);

  // التحقق من الجلسة عند تحميل الصفحة — Cookie يستمر عبر F5
  useEffect(() => {
    checkSession();
  }, []);

  // منع زر الرجوع من الخروج من النظام
  useEffect(() => {
    if (!isAuthed) return;

    // دفع حالة أولية لمنع الرجوع لصفحة الدخول
    window.history.pushState({ sama: "app" }, "", "/");

    const handlePopState = () => {
      // إذا حاول المستخدم الرجوع، نعيد دفع الحالة ليبقى في النظام
      window.history.pushState({ sama: "app" }, "", "/");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthed]);

  // التحقق من الصلاحيات: إعادة توجيه المستخدمين غير المصرح لهم
  useEffect(() => {
    if (!isAuthed || !currentUser) return;

    const role = currentUser.role as Role;
    // الصلاحيات الدقيقة للمستخدم الحالي
    const myPermissions = useAppStore.getState().myPermissions;
    const hiddenServiceTypes = useAppStore.getState().hiddenServiceTypes;

    // صفحات لا يصل لها سوى المدير العام
    const managerOnlyPages: NavPage[] = [
      "employees",
      "users_permissions",
      "system_settings",
    ];

    // صفحات لا يصل لها موظف الحجوزات (لكن المحاسب يصل لها)
    // ملاحظة: الإحصائيات والتأشيرات قاربت الانتهاء متاحة لموظف الحجوزات
    const bookingOfficerBlocked: NavPage[] = [
      "audit_log",
      "revenues_expenses",
      "payments",
      "invoices",
    ];

    // التحقق من الصلاحيات الدقيقة: هل الصفحة الحالية مخفية للمستخدم؟
    const pageToModule: Record<string, string> = {
      customers: "customers",
      agents_companies: "agents_companies",
      statistics: "statistics",
      visa_expiry: "visa_expiry",
      policies: "policies",
    };

    // إذا كانت الصفحة الحالية محددة كمخفية في الصلاحيات الدقيقة، أعد التوجيه للوحة التحكم
    const moduleKey = pageToModule[currentPage as string];
    if (moduleKey) {
      const perm = myPermissions.find((p) => p.moduleKey === moduleKey);
      if (perm?.level === "hidden") {
        setPage("dashboard");
        return;
      }
    }

    // إذا كانت الصفحة الحالية خدمة محددة كمخفية، أعد التوجيه للوحة التحكم
    if (hiddenServiceTypes.has(currentPage as string)) {
      setPage("dashboard");
      return;
    }

    if (role === "booking_officer") {
      // موظف الحجوزات لا يصل لصفحات المدير فقط
      if (managerOnlyPages.includes(currentPage)) {
        setPage("dashboard");
        return;
      }
      // موظف الحجوزات لا يصل للوحدات المالية وسجل التدقيق
      // لكنه يصل للإحصائيات والتأشيرات قاربت الانتهاء
      if (bookingOfficerBlocked.includes(currentPage)) {
        setPage("dashboard");
        return;
      }
    }

    if (role === "accountant") {
      // المحاسب لا يصل لصفحات المدير فقط
      if (managerOnlyPages.includes(currentPage)) {
        setPage("revenues_expenses");
        return;
      }
    }
  }, [isAuthed, currentUser, currentPage, setPage]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthed) {
    return <LoginPage />;
  }

  return (
    <DashboardLayout>
      <PageRouter page={currentPage} role={currentUser?.role as Role} />
    </DashboardLayout>
  );
}

function PageRouter({ page, role }: { page: string; role?: Role }) {
  // الصلاحيات الدقيقة للمستخدم الحالي
  const myPermissions = useAppStore.getState().myPermissions;
  const hiddenServiceTypes = useAppStore.getState().hiddenServiceTypes;

  // التحقق من الصلاحيات الدقيقة قبل أي شيء
  // إذا كانت الصفحة محددة كمخفية، عرض لوحة التحكم بدلاً منها
  const pageToModule: Record<string, string> = {
    customers: "customers",
    agents_companies: "agents_companies",
    statistics: "statistics",
    visa_expiry: "visa_expiry",
    policies: "policies",
  };
  const moduleKey = pageToModule[page];
  if (moduleKey) {
    const perm = myPermissions.find((p) => p.moduleKey === moduleKey);
    if (perm?.level === "hidden") {
      return <DashboardPage />;
    }
  }
  // إذا كانت الصفحة خدمة محددة كمخفية
  if (hiddenServiceTypes.has(page)) {
    return <DashboardPage />;
  }

  if (role === "booking_officer") {
    const allowedForBookingOfficer = [
      "dashboard",
      "hajj_program", "hajj_regular", "umrah_program", "umrah_regular",
      "passport_attendance", "passport_without", "flight_ticket",
      "intl_bus", "intl_car", "local_bus", "local_car",
      "visa_medical", "visa_tourist", "visa_work", "visa_visit",
      "shipping", "customs", "security_approval", "medical_report",
      "travel_insurance", "hotel_booking",
      "professional_exam", "visa_authorization", "transit_visa",
      "customers", "agents_companies",
      "visa_expiry", "statistics", "system_settings",
    ];
    if (!allowedForBookingOfficer.includes(page)) {
      return <DashboardPage />;
    }
  }

  if (role === "accountant") {
    // المحاسب: المالية فقط (لا المراقبة)
    const allowedForAccountant = [
      "dashboard",
      "revenues_expenses",
      "payments",
      "invoices",
    ];
    if (!allowedForAccountant.includes(page)) {
      return <RevenuesExpensesPage />;
    }
  }

  if (serviceConfigs[page]) {
    return <ServicePage config={serviceConfigs[page]} />;
  }

  switch (page) {
    case "dashboard":
      return <DashboardPage />;
    case "customers":
      return <CustomersPage />;
    case "employees":
      return <EmployeesPage />;
    case "agents_companies":
      return <AgentsCompaniesPage />;
    case "revenues_expenses":
      return <RevenuesExpensesPage />;
    case "payments":
      return <PaymentsPage />;
    case "invoices":
      return <InvoicesPage />;
    case "statistics":
      return <StatisticsPage />;
    case "audit_log":
      return <AuditLogPage />;
    case "visa_expiry":
      return <VisaExpiryPage />;
    case "users_permissions":
      return <UsersPermissionsPage />;
    case "system_settings":
      return <SystemSettingsPage />;
    default:
      return <DashboardPage />;
  }
}
