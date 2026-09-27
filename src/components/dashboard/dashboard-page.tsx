"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { serviceConfigs } from "@/components/services/service-configs";
import { allServiceTypes } from "@/lib/mock-data";
import type { NavPage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Receipt,
  ShieldAlert,
  ChevronLeft,
  Plane,
  Ticket,
  Hotel,
  Ship,
  HeartPulse,
  Briefcase,
  IdCard,
  Bus,
  Car,
  FileText,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  Plus,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const serviceTypeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  hajj_program: Plane,
  hajj_regular: Plane,
  umrah_program: Plane,
  umrah_regular: Plane,
  passport_attendance: IdCard,
  passport_without: IdCard,
  flight_ticket: Ticket,
  intl_bus: Bus,
  intl_car: Car,
  local_bus: Bus,
  local_car: Car,
  visa_medical: HeartPulse,
  visa_tourist: Plane,
  visa_work: Briefcase,
  visa_visit: FileText,
  shipping: Ship,
  customs: ScrollText,
  security_approval: ShieldCheck,
  medical_report: Stethoscope,
  travel_insurance: ShieldCheck,
  hotel_booking: Hotel,
  professional_exam: Stethoscope,
  visa_authorization: FileText,
  transit_visa: Plane,
};

const currencySymbol = (c: string) => (c === "SAR" ? "ر.س" : c === "YER" ? "ر.ي" : "$");

const variantStyles: Record<string, { bg: string; icon: string }> = {
  lilac: { bg: "bg-pastel-lilac", icon: "text-pastel-lilac" },
  sky: { bg: "bg-pastel-sky", icon: "text-pastel-sky" },
  peach: { bg: "bg-pastel-peach", icon: "text-pastel-peach" },
  mint: { bg: "bg-pastel-mint", icon: "text-pastel-mint" },
  yellow: { bg: "bg-pastel-yellow", icon: "text-pastel-yellow" },
};

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "lilac" | "sky" | "peach" | "mint" | "yellow";
  onClick?: () => void;
}

function KpiCard({ title, value, subtitle, icon: Icon, variant, onClick }: KpiCardProps) {
  const v = variantStyles[variant];
  return (
    <Card className="border-border card-shadow hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", v.bg)}>
            <Icon className={cn("w-5 h-5", v.icon)} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold text-foreground num tracking-tight">{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground whitespace-pre-line">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({ label, count, color, bgColor, icon: Icon }: { label: string; count: number; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/40 transition-colors">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bgColor }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold text-foreground num">{count}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const lang = useAppStore((s) => s.lang);
  const stats = useAppStore((s) => s.dashboardStats);
  const customers = useAppStore((s) => s.customers);
  const services = useAppStore((s) => s.services);
  const invoices = useAppStore((s) => s.invoices);
  const visaExpiry = useAppStore((s) => s.visaExpiry);
  const setPage = useAppStore((s) => s.setPage);
  const fetchDashboardStats = useAppStore((s) => s.fetchDashboardStats);

  const [servicePickerOpen, setServicePickerOpen] = useState(false);

  // تحديث المؤشرات عند تحميل الصفحة
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const pieColors = ["#7C3AED", "#F97316", "#10B981", "#EC4899", "#3B82F6"];

  const handleAddTransaction = () => {
    setServicePickerOpen(true);
  };

  const handlePickServiceType = (page: NavPage) => {
    setServicePickerOpen(false);
    setPage(page);
  };

  // تنسيق مبالغ العملات المفصولة
  const formatRevenue = (byCurrency: Record<string, number> | undefined) => {
    if (!byCurrency) return "—";
    const parts: string[] = [];
    if (byCurrency.SAR > 0) parts.push(`${byCurrency.SAR.toLocaleString("en-US")} ر.س`);
    if (byCurrency.USD > 0) parts.push(`${byCurrency.USD.toLocaleString("en-US")} $`);
    if (byCurrency.YER > 0) parts.push(`${byCurrency.YER.toLocaleString("en-US")} ر.ي`);
    return parts.length > 0 ? parts.join(" | ") : "0";
  };

  // مخطط المخطط المالي — عرض عملة واحدة افتراضياً (ر.س) مع إمكانية التبديل
  const [chartCurrency, setChartCurrency] = useState<"SAR" | "USD" | "YER">("SAR");
  const chartData = (stats?.chartData || []).map((d) => ({
    day: d.day,
    revenue: chartCurrency === "SAR" ? d.sar_revenue : chartCurrency === "USD" ? d.usd_revenue : d.yer_revenue,
    expenses: chartCurrency === "SAR" ? d.sar_expenses : chartCurrency === "USD" ? d.usd_expenses : d.yer_expenses,
  }));

  const distribution = (stats?.serviceDistribution || []).map((s) => ({
    name: tr(lang, `nav_${s.serviceType}`),
    value: s.count,
  }));

  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_dashboard")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "ar"
              ? `أهلاً بك! إليك ملخص نشاط المكتب اليوم ${new Date().toLocaleDateString("en-GB")}`
              : `Welcome! Here's your office activity summary for ${new Date().toLocaleDateString("en-GB")}`}
          </p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 shadow-sm" onClick={handleAddTransaction}>
          <Plus className="w-4 h-4" />
          {tr(lang, "add_transaction")}
        </Button>
      </div>

      {/* KPI Cards — مع فصل العملات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={tr(lang, "kpi_active_transactions")}
          value={String(stats?.activeTransactions ?? 0)}
          icon={Activity}
          variant="lilac"
          onClick={() => setServicePickerOpen(true)}
        />
        <KpiCard
          title={tr(lang, "kpi_today_revenue")}
          value={formatRevenue(stats?.todayRevenueByCurrency)}
          subtitle={lang === "ar" ? "مفصولة حسب العملة" : "Separated by currency"}
          icon={TrendingUp}
          variant="mint"
          onClick={() => setPage("revenues_expenses")}
        />
        <KpiCard
          title={tr(lang, "kpi_today_expenses")}
          value={formatRevenue(stats?.todayExpensesByCurrency)}
          subtitle={lang === "ar" ? "مفصولة حسب العملة" : "Separated by currency"}
          icon={TrendingDown}
          variant="peach"
          onClick={() => setPage("revenues_expenses")}
        />
        <KpiCard
          title={tr(lang, "kpi_unpaid_invoices")}
          value={String(stats?.unpaidInvoices ?? 0)}
          icon={Receipt}
          variant="sky"
          onClick={() => setPage("invoices")}
        />
      </div>

      {visaExpiry.length > 0 && (
        <Card className="border-yellow-400/40 bg-yellow-50 dark:bg-yellow-950/10 card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pastel-yellow flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-pastel-yellow" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{tr(lang, "kpi_visa_near_expiry")}</p>
              <p className="text-xs text-muted-foreground">{visaExpiry.length} {lang === "ar" ? "تأشيرة قاربت الانتهاء" : "visas near expiry"}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary text-xs gap-1" onClick={() => setPage("visa_expiry")}>
              {tr(lang, "view_all")}
              <ChevronLeft className="w-3 h-3 rtl:rotate-0" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions status + financial chart */}
        <Card className="lg:col-span-2 border-border card-shadow">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">{tr(lang, "widget_transactions_status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatusCard label={tr(lang, "pending")} count={stats?.statusCounts.pending ?? 0} color="#F97316" bgColor="var(--status-pending-bg)" icon={Activity} />
              <StatusCard label={tr(lang, "processing")} count={stats?.statusCounts.processing ?? 0} color="#3B82F6" bgColor="var(--status-processing-bg)" icon={Activity} />
              <StatusCard label={tr(lang, "completed")} count={stats?.statusCounts.completed ?? 0} color="#10B981" bgColor="var(--status-delivered-bg)" icon={Activity} />
              <StatusCard label={tr(lang, "cancelled")} count={stats?.statusCounts.cancelled ?? 0} color="#EF4444" bgColor="var(--status-cancelled-bg)" icon={Activity} />
            </div>

            {/* Financial chart — مع اختيار العملة */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h4 className="text-sm font-semibold text-foreground">{tr(lang, "widget_financial_overview")}</h4>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                    {(["SAR", "USD", "YER"] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setChartCurrency(c)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                          chartCurrency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {currencySymbol(c)}
                      </button>
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                    {tr(lang, "kpi_today_revenue")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                    {tr(lang, "kpi_today_expenses")}
                  </span>
                </div>
              </div>
              {services.length === 0 && (stats?.todayRevenueByCurrency.SAR === 0 && stats?.todayRevenueByCurrency.USD === 0 && stats?.todayRevenueByCurrency.YER === 0) ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  {tr(lang, "empty_services")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2.5} fill="url(#gradRev)" />
                    <Area type="monotone" dataKey="expenses" stroke="#F97316" strokeWidth={2.5} fill="url(#gradExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent customers */}
        <Card className="border-border card-shadow">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">{tr(lang, "widget_recent_customers")}</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary text-xs gap-1" onClick={() => setPage("customers")}>
              {tr(lang, "view_all")}
              <ChevronLeft className="w-3 h-3 rtl:rotate-0" />
            </Button>
          </CardHeader>
          <CardContent>
            {(stats?.recentCustomers ?? []).length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">{tr(lang, "empty_customers")}</div>
            ) : (
              <div className="space-y-2">
                {(stats?.recentCustomers ?? []).map((rc) => {
                  const Icon = rc.lastServiceType ? serviceTypeIconMap[rc.lastServiceType] ?? Briefcase : Briefcase;
                  return (
                    <div key={rc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/40 transition-colors cursor-pointer" onClick={() => setPage("customers")}>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pastel-lilac to-pastel-lilac flex items-center justify-center text-pastel-lilac font-bold text-sm flex-shrink-0">
                        {rc.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{rc.fullName}</p>
                        <p className="text-[11px] text-muted-foreground num">{rc.customerNumber} • {rc.phoneNumber}</p>
                      </div>
                      {rc.lastServiceType && (
                        <Badge variant="secondary" className="bg-pastel-mint text-pastel-mint hover:bg-pastel-mint text-[11px] gap-1">
                          <Icon className="w-3 h-3" />
                          {tr(lang, `nav_${rc.lastServiceType}`)}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service distribution */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{tr(lang, "widget_service_distribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {distribution.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">{tr(lang, "empty_services")}</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {distribution.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {distribution.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                        <span className="text-muted-foreground truncate max-w-[140px]">{d.name}</span>
                      </span>
                      <span className="font-semibold text-foreground num">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top services bar */}
        <Card className="lg:col-span-2 border-border card-shadow">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">{tr(lang, "widget_top_services")}</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary text-xs gap-1" onClick={() => setPage("statistics")}>
              {tr(lang, "view_details")}
              <ChevronLeft className="w-3 h-3 rtl:rotate-0" />
            </Button>
          </CardHeader>
          <CardContent>
            {distribution.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">{tr(lang, "empty_services")}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distribution} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontSize: "12px" }} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {distribution.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Performance — لا يوجد صافي الربح */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{tr(lang, "widget_performance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{lang === "ar" ? "إجمالي المعاملات" : "Total Transactions"}</span>
                <span className="font-bold text-foreground num">{stats?.totalServices ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{lang === "ar" ? "إجمالي العملاء" : "Total Customers"}</span>
                <span className="font-bold text-foreground num">{stats?.totalCustomers ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{lang === "ar" ? "الفواتير الصادرة" : "Issued Invoices"}</span>
                <span className="font-bold text-foreground num">{stats?.totalInvoices ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service type picker dialog */}
      <Dialog open={servicePickerOpen} onOpenChange={setServicePickerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{tr(lang, "select_service_type")}</DialogTitle>
            <p className="text-sm text-muted-foreground">{tr(lang, "select_service_type_desc")}</p>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
            {allServiceTypes.map((type) => {
              const cfg = serviceConfigs[type];
              if (!cfg) return null;
              const Icon = serviceTypeIconMap[type] ?? Briefcase;
              return (
                <button key={type} onClick={() => handlePickServiceType(type as NavPage)} className="group flex flex-col items-start gap-2 p-4 rounded-xl border border-border hover:border-primary hover:bg-accent/40 transition-all text-start">
                  <div className="w-10 h-10 rounded-lg bg-pastel-lilac flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-pastel-lilac" />
                  </div>
                  <span className="text-sm font-medium text-foreground leading-tight">{tr(lang, cfg.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
