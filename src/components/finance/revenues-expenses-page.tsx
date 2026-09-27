"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import type { Currency } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  CheckCircle2,
  Calendar,
  ChevronDown,
  FileText,
  FileSpreadsheet,
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
} from "recharts";

const currencySymbol = (c: string) => (c === "SAR" ? "ر.س" : c === "YER" ? "ر.ي" : "$");

export function RevenuesExpensesPage() {
  const lang = useAppStore((s) => s.lang);
  const payments = useAppStore((s) => s.payments);
  const expenses = useAppStore((s) => s.expenses);
  const addExpense = useAppStore((s) => s.addExpense);
  const fetchDashboardStats = useAppStore((s) => s.fetchDashboardStats);

  const [period, setPeriod] = useState("overall");
  const [openExpense, setOpenExpense] = useState(false);
  const [expForm, setExpForm] = useState({
    purpose: "",
    paidAt: new Date().toISOString().split("T")[0],
    amount: "",
    currency: "SAR" as Currency,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [chartCurrency, setChartCurrency] = useState<"SAR" | "USD" | "YER">("SAR");
  const [formDirty, setFormDirty] = useState(false);
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  // إيرادات اليوم مفصولة حسب العملة
  const todayRevenueByCurrency: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
  const todayExpensesByCurrency: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const p of payments) {
    if (p.status === "approved" && new Date(p.receivedAt) >= today) {
      todayRevenueByCurrency[p.currency] = (todayRevenueByCurrency[p.currency] || 0) + p.amount;
    }
  }
  for (const e of expenses) {
    if (e.status === "approved" && new Date(e.paidAt) >= today) {
      todayExpensesByCurrency[e.currency] = (todayExpensesByCurrency[e.currency] || 0) + e.amount;
    }
  }

  // إجمالي الإيرادات والمصروفات مفصولة حسب العملة
  const totalRevenueByCurrency: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
  const totalExpensesByCurrency: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
  for (const p of payments) {
    if (p.status === "approved") {
      totalRevenueByCurrency[p.currency] = (totalRevenueByCurrency[p.currency] || 0) + p.amount;
    }
  }
  for (const e of expenses) {
    if (e.status === "approved") {
      totalExpensesByCurrency[e.currency] = (totalExpensesByCurrency[e.currency] || 0) + e.amount;
    }
  }

  const formatByCurrency = (byCur: Record<string, number>) => {
    const parts: string[] = [];
    if (byCur.SAR > 0) parts.push(`${byCur.SAR.toLocaleString("en-US")} ر.س`);
    if (byCur.USD > 0) parts.push(`${byCur.USD.toLocaleString("en-US")} $`);
    if (byCur.YER > 0) parts.push(`${byCur.YER.toLocaleString("en-US")} ر.ي`);
    return parts.length > 0 ? parts.join(" | ") : "0";
  };

  // مخطط 14 يوم — مفصول حسب العملة المختارة
  const chartData = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dayStr = d.toDateString();
    const rev = payments.filter((p) => p.status === "approved" && new Date(p.receivedAt).toDateString() === dayStr && p.currency === chartCurrency).reduce((sum, p) => sum + p.amount, 0);
    const exp = expenses.filter((e) => e.status === "approved" && new Date(e.paidAt).toDateString() === dayStr && e.currency === chartCurrency).reduce((sum, e) => sum + e.amount, 0);
    return { day: `${d.getDate()}/${d.getMonth() + 1}`, revenue: Math.round(rev), expenses: Math.round(exp) };
  });

  const nextExpNumber = `EXP-${new Date().getFullYear()}-${String(expenses.length + 1).padStart(5, "0")}`;

  const submitExpense = async () => {
    const errs: Record<string, string> = {};
    if (!expForm.purpose.trim()) errs.purpose = lang === "ar" ? "مطلوب" : "Required";
    if (!expForm.paidAt) errs.paidAt = lang === "ar" ? "مطلوب" : "Required";
    const amt = parseFloat(expForm.amount);
    if (!amt || amt <= 0) errs.amount = lang === "ar" ? "أدخل مبلغاً صحيحاً" : "Enter valid amount";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await addExpense({
        purpose: expForm.purpose,
        paidAt: expForm.paidAt,
        amount: amt,
        currency: expForm.currency,
      });
      toast.success(lang === "ar" ? "تم حفظ المصروف فوراً" : "Expense saved immediately");
      setOpenExpense(false);
      setExpForm({ purpose: "", paidAt: new Date().toISOString().split("T")[0], amount: "", currency: "SAR" });
      setFormDirty(false);
      // تحديث المؤشرات فوراً
      fetchDashboardStats();
    } catch (err) {
      toast.error(lang === "ar" ? "فشل الحفظ" : "Failed to save");
    }
    setSaving(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && formDirty) {
      if (!window.confirm(lang === "ar" ? "لديك تغييرات غير محفوظة. هل تريد المغادرة؟" : "You have unsaved changes. Leave anyway?")) {
        return;
      }
    }
    setOpenExpense(open);
    if (!open) {
      setExpForm({ purpose: "", paidAt: new Date().toISOString().split("T")[0], amount: "", currency: "SAR" });
      setFormDirty(false);
    }
  };

  const exportPDF = (period: "daily" | "weekly" | "monthly" | "yearly") => {
    // تصدير الحسابات المالية والمدفوعات إلى PDF
    const url = `/api/export?type=payments&period=${period}&format=pdf`;
    window.open(url, "_blank");
    toast.success(lang === "ar" ? "تم فتح تقرير PDF" : "PDF report opened");
  };

  const exportExcel = (period: "weekly" | "monthly" | "yearly") => {
    const url = `/api/export?type=expenses&period=${period}&format=excel`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${period}_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(lang === "ar" ? "تم تصدير ملف Excel" : "Excel file exported");
  };

  const exportExpensesPDF = (period: "daily" | "weekly" | "monthly" | "yearly") => {
    const url = `/api/export?type=expenses&period=${period}&format=pdf`;
    window.open(url, "_blank");
    toast.success(lang === "ar" ? "تم فتح تقرير PDF" : "PDF report opened");
  };

  const exportExpensesExcel = (period: "weekly" | "monthly" | "yearly") => {
    const url = `/api/export?type=expenses&period=${period}&format=excel`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${period}_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(lang === "ar" ? "تم تصدير ملف Excel" : "Excel file exported");
  };

  const exportCustomExcel = (type: string) => {
    if (!customFromDate || !customToDate) {
      toast.error(lang === "ar" ? "يرجى تحديد التاريخ من وإلى" : "Please select from and to dates");
      return;
    }
    const url = `/api/export?type=${type}&period=custom&format=excel&fromDate=${customFromDate}&toDate=${customToDate}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_custom_${customFromDate}_to_${customToDate}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setCustomDateOpen(false);
    toast.success(lang === "ar" ? "تم تصدير ملف Excel" : "Excel file exported");
  };

  const exportCustomPDF = (type: string) => {
    if (!customFromDate || !customToDate) {
      toast.error(lang === "ar" ? "يرجى تحديد التاريخ من وإلى" : "Please select from and to dates");
      return;
    }
    const url = `/api/export?type=${type}&period=custom&format=pdf&fromDate=${customFromDate}&toDate=${customToDate}`;
    window.open(url, "_blank");
    setCustomDateOpen(false);
    toast.success(lang === "ar" ? "تم فتح تقرير PDF" : "PDF report opened");
  };

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_revenues_expenses")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? "نظرة مالية شاملة — مفصولة حسب العملة" : "Comprehensive financial overview — separated by currency"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-10 w-44 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{tr(lang, "today")}</SelectItem>
              <SelectItem value="week">{tr(lang, "this_week")}</SelectItem>
              <SelectItem value="month">{tr(lang, "this_month")}</SelectItem>
              <SelectItem value="overall">{tr(lang, "overall")}</SelectItem>
            </SelectContent>
          </Select>
          {/* تصدير PDF — يومي/أسبوعي/شهري/سنوي */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-background gap-2">
                <FileText className="w-4 h-4" />
                {tr(lang, "export_pdf")}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === "ar" ? "start" : "end"}>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportPDF("daily")}>
                <Calendar className="w-4 h-4" />
                {lang === "ar" ? "تقرير يومي" : "Daily Report"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportPDF("weekly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_weekly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportPDF("monthly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_monthly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportPDF("yearly")}>
                <Calendar className="w-4 h-4" />
                {lang === "ar" ? "تصدير سنوي" : "Yearly Export"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setCustomDateOpen(true)}>
                <Calendar className="w-4 h-4" />
                {lang === "ar" ? "تصدير حسب التاريخ" : "Custom Date Export"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* تصدير Excel للمصروفات */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-background gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                {tr(lang, "export_excel")}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === "ar" ? "start" : "end"}>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportExpensesExcel("weekly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_weekly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportExpensesExcel("monthly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_monthly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportExpensesExcel("yearly")}>
                <Calendar className="w-4 h-4" />
                {lang === "ar" ? "تصدير سنوي" : "Yearly Export"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setCustomDateOpen(true)}>
                <Calendar className="w-4 h-4" />
                {lang === "ar" ? "تصدير حسب التاريخ" : "Custom Date Export"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2 shadow-sm" onClick={() => setOpenExpense(true)}>
            <Plus className="w-4 h-4" />
            {tr(lang, "add_expense")}
          </Button>
        </div>
      </div>

      {/* Stat cards — مفصولة حسب العملة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border card-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-pastel-mint flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-pastel-mint" />
              </div>
              <Badge className="bg-pastel-mint text-pastel-mint hover:bg-pastel-mint gap-1">+12%</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{tr(lang, "kpi_today_revenue")}</p>
            <p className="text-base font-bold text-foreground num mt-1">
              {formatByCurrency(period === "today" ? todayRevenueByCurrency : totalRevenueByCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border card-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-pastel-peach flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-pastel-peach" />
              </div>
              <Badge className="bg-pastel-peach text-pastel-peach hover:bg-pastel-peach gap-1">-3%</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{tr(lang, "kpi_today_expenses")}</p>
            <p className="text-base font-bold text-foreground num mt-1">
              {formatByCurrency(period === "today" ? todayExpensesByCurrency : totalExpensesByCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart — مع اختيار العملة */}
      <Card className="border-border card-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">
              {lang === "ar" ? "الإيرادات والمصروفات (14 يوم)" : "Revenue & Expenses (14 days)"}
            </CardTitle>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              {(["SAR", "USD", "YER"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChartCurrency(c)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    chartCurrency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {currencySymbol(c)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 && expenses.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              {tr(lang, "empty_expenses")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="r1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="e1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)", fontSize: "12px" }} />
                <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2.5} fill="url(#r1)" />
                <Area type="monotone" dataKey="expenses" stroke="#F97316" strokeWidth={2.5} fill="url(#e1)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pastel-mint" />
              {tr(lang, "kpi_today_revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">{tr(lang, "payment_no")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "customer_name")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "payment_amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">{tr(lang, "empty_payments")}</TableCell></TableRow>
                ) : (
                  payments.slice(0, 5).map((p) => (
                    <TableRow key={p.id} className="hover:bg-accent/30">
                      <TableCell className="text-xs text-muted-foreground num">{p.paymentNumber}</TableCell>
                      <TableCell className="text-sm font-medium">{p.customerName}</TableCell>
                      <TableCell className="text-sm font-bold num text-pastel-mint">{p.amount.toLocaleString("en-US")} {currencySymbol(p.currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-pastel-peach" />
              {tr(lang, "kpi_today_expenses")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">{lang === "ar" ? "رقم المصروف" : "Expense No."}</TableHead>
                  <TableHead className="text-xs font-semibold">{lang === "ar" ? "غرض الصرف" : "Purpose"}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "payment_amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground">{tr(lang, "empty_expenses")}</TableCell></TableRow>
                ) : (
                  expenses.slice(0, 5).map((e) => (
                    <TableRow key={e.id} className="hover:bg-accent/30">
                      <TableCell className="text-xs text-muted-foreground num">{e.expenseNumber}</TableCell>
                      <TableCell className="text-sm font-medium">{e.category}</TableCell>
                      <TableCell className="text-sm font-bold num text-pastel-peach">{e.amount.toLocaleString("en-US")} {currencySymbol(e.currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* نموذج إضافة مصروف */}
      <Dialog open={openExpense} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {tr(lang, "add_expense")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>{tr(lang, "expense_no_auto")}</Label>
              <Input value={nextExpNumber} disabled className="bg-muted text-muted-foreground num" />
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "f_expense_purpose")} *</Label>
              <Input value={expForm.purpose} onChange={(e) => setExpForm({ ...expForm, purpose: e.target.value })} className="bg-background" placeholder={lang === "ar" ? "مثال: إيجار المكتب، رواتب..." : "e.g. Office rent, salaries..."} />
              {errors.purpose && <p className="text-xs text-destructive">{errors.purpose}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{tr(lang, "f_expense_date")} *</Label>
              <Input type="date" value={expForm.paidAt} onChange={(e) => setExpForm({ ...expForm, paidAt: e.target.value })} className="bg-background num" />
              {errors.paidAt && <p className="text-xs text-destructive">{errors.paidAt}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tr(lang, "payment_amount")} *</Label>
                <Input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="bg-background num" placeholder="0.00" />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{tr(lang, "currency")}</Label>
                <Select value={expForm.currency} onValueChange={(v) => setExpForm({ ...expForm, currency: v as Currency })}>
                  <SelectTrigger className="sama-select bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">{tr(lang, "sar")}</SelectItem>
                    <SelectItem value="YER">{tr(lang, "yer")}</SelectItem>
                    <SelectItem value="USD">{tr(lang, "usd")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handleDialogChange(false)}>{tr(lang, "cancel")}</Button>
            <Button onClick={submitExpense} disabled={saving} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {tr(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تصدير حسب التاريخ — نافذة منبثقة */}
      <Dialog open={customDateOpen} onOpenChange={setCustomDateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {lang === "ar" ? "تصدير حسب التاريخ" : "Export by Date Range"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>{lang === "ar" ? "من تاريخ" : "From Date"}</Label>
              <Input type="date" value={customFromDate} onChange={(e) => setCustomFromDate(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "ar" ? "إلى تاريخ" : "To Date"}</Label>
              <Input type="date" value={customToDate} onChange={(e) => setCustomToDate(e.target.value)} className="bg-background" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCustomDateOpen(false)}>{tr(lang, "cancel")}</Button>
            <Button onClick={() => exportCustomExcel("expenses")} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {tr(lang, "export_excel")}
            </Button>
            <Button onClick={() => exportCustomPDF("expenses")} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              <FileText className="w-4 h-4" />
              {tr(lang, "export_pdf")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
