"use client";

import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Menu,
  Moon,
  Sun,
  Globe,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  ChevronLeft,
  CheckCheck,
  X,
  Maximize,
  Minimize,
  Unlock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const pageLabels: Record<string, string> = {
  dashboard: "nav_dashboard",
  hajj_program: "nav_hajj_program",
  hajj_regular: "nav_hajj_regular",
  umrah_program: "nav_umrah_program",
  umrah_regular: "nav_umrah_regular",
  passport_attendance: "nav_passport_attendance",
  passport_without: "nav_passport_without",
  flight_ticket: "nav_flight_ticket",
  intl_bus: "nav_intl_bus",
  intl_car: "nav_intl_car",
  local_bus: "nav_local_bus",
  local_car: "nav_local_car",
  visa_medical: "nav_visa_medical",
  visa_tourist: "nav_visa_tourist",
  visa_work: "nav_visa_work",
  visa_visit: "nav_visa_visit",
  shipping: "nav_shipping",
  customs: "nav_customs",
  security_approval: "nav_security_approval",
  medical_report: "nav_medical_report",
  travel_insurance: "nav_travel_insurance",
  hotel_booking: "nav_hotel_booking",
  professional_exam: "nav_professional_exam",
  visa_authorization: "nav_visa_authorization",
  transit_visa: "nav_transit_visa",
  customers: "nav_customers",
  employees: "nav_employees",
  agents_companies: "nav_agents_companies",
  revenues_expenses: "nav_revenues_expenses",
  payments: "nav_payments",
  invoices: "nav_invoices",
  statistics: "nav_statistics",
  audit_log: "nav_audit_log",
  visa_expiry: "nav_visa_expiry",
  users_permissions: "nav_users_permissions",
  system_settings: "nav_system_settings",
};

export function Topbar() {
  const lang = useAppStore((s) => s.lang);
  const theme = useAppStore((s) => s.theme);
  const setLang = useAppStore((s) => s.setLang);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const currentUser = useAppStore((s) => s.currentUser);
  const setPage = useAppStore((s) => s.setPage);
  const logout = useAppStore((s) => s.logout);
  const currentPage = useAppStore((s) => s.currentPage);
  const notifications = useAppStore((s) => s.notifications);
  const visaExpiry = useAppStore((s) => s.visaExpiry);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);
  const mobileSidebarOpen = useAppStore((s) => s.mobileSidebarOpen);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const roleLabel =
    currentUser?.role === "manager"
      ? tr(lang, "role_general_manager")
      : currentUser?.role === "accountant"
      ? tr(lang, "role_accountant")
      : tr(lang, "role_booking");

  const pageTitle = tr(lang, pageLabels[currentPage] ?? "nav_dashboard");

  const initials = currentUser?.username?.slice(0, 2).toUpperCase() ?? "SY";

  // عدد الإشعارات غير المقروءة فقط
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  const handleNotificationClick = (id: string, moduleKey?: string, relatedId?: string) => {
    markNotificationRead(id);
    if (moduleKey === "services") {
      setPage("umrah_regular"); // انتقال للخدمات كافتراضي
    } else if (moduleKey === "visa_expiry" || moduleKey === "visas") {
      setPage("visa_expiry");
    }
  };

  return (
    <header
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border"
    >
      <div className="flex items-center justify-between h-16 px-4 lg:px-6 gap-4">
        {/* Right side (in RTL): breadcrumb + page title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* زر القائمة للجوال — يفتح الشريط الجانبي */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-muted-foreground hidden sm:inline">
              {tr(lang, "nav_dashboard")}
            </span>
            <ChevronLeft className="w-4 h-4 text-muted-foreground hidden sm:inline rtl:rotate-0" />
            <span className="font-semibold text-foreground truncate">{pageTitle}</span>
          </div>
        </div>

        {/* Left side (in RTL): actions */}
        <div className="flex items-center gap-2">
          {/* Fullscreen toggle */}
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? tr(lang, "exit_fullscreen") : tr(lang, "fullscreen")}>
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
          {/* Language */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="gap-2 text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">
              {lang === "ar" ? "EN" : "ع"}
            </span>
          </Button>

          {/* Theme */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {/* العلامة الحمراء — تظهر فقط عند وجود إشعارات غير مقروءة */}
                {hasUnread && (
                  <span className="absolute top-1 end-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center num">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === "ar" ? "start" : "end"} className="w-80">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="font-semibold text-sm">
                  {tr(lang, "notifications")}
                </span>
                {hasUnread && (
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={() => markAllNotificationsRead()}
                  >
                    <CheckCheck className="w-3 h-3" />
                    {tr(lang, "mark_all_read")}
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {tr(lang, "no_notifications")}
                </div>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={cn(
                      "flex flex-col items-start gap-1 py-2.5 cursor-pointer",
                      !n.isRead && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(n.id, n.moduleKey, n.relatedEntityId)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          n.type === "danger" ? "bg-destructive"
                          : n.type === "warning" ? "bg-orange-500"
                          : n.type === "success" ? "bg-emerald-500"
                          : "bg-sky-500"
                        )}
                      />
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium flex-1 truncate">
                        {n.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ps-4 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground ps-4 num">
                      {new Date(n.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 ps-1 pe-2">
                <Avatar className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#A855F7]">
                  <AvatarFallback className="bg-transparent text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    {currentUser?.username ?? "—"}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {roleLabel}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === "ar" ? "start" : "end"} className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{currentUser?.username}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <DropdownMenuSeparator />
              {/* تغيير كلمة المرور: المدير العام فقط */}
              {currentUser?.role === "manager" && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setPage("system_settings")}
                  >
                    <UserIcon className="w-4 h-4 me-2" />
                    {tr(lang, "change_password")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setPage("system_settings")}
                  >
                    <SettingsIcon className="w-4 h-4 me-2" />
                    {tr(lang, "nav_system_settings")}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => {
                  if (window.confirm(lang === "ar" ? "هل أنت متأكد من تسجيل الخروج؟" : "Are you sure you want to logout?")) {
                    logout();
                  }
                }}
              >
                <LogOut className="w-4 h-4 me-2" />
                {tr(lang, "logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
