"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  FileText,
  FileSpreadsheet,
  Calendar,
  ChevronDown,
} from "lucide-react";

const currencySymbol = (c: string) => (c === "SAR" ? "ر.س" : c === "YER" ? "ر.ي" : "$");

export function PaymentsPage() {
  const lang = useAppStore((s) => s.lang);
  const payments = useAppStore((s) => s.payments);

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  const list = useMemo(() => {
    let l = payments;
    if (search.trim()) {
      const q = search.toLowerCase();
      l = l.filter(
        (p) =>
          p.paymentNumber.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          (p.invoiceNumber ?? "").toLowerCase().includes(q)
      );
    }
    if (methodFilter !== "all") l = l.filter((p) => p.method === methodFilter);
    if (statusFilter !== "all") l = l.filter((p) => p.status === statusFilter);
    return l;
  }, [payments, search, methodFilter, statusFilter]);

  // ملخص المبالغ حسب العملة
  const totalsByCurrency = useMemo(() => {
    const byCur: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
    for (const p of list) {
      if (p.status === "approved") {
        byCur[p.currency] = (byCur[p.currency] || 0) + p.amount;
      }
    }
    return byCur;
  }, [list]);

  const formatByCurrency = (byCur: Record<string, number>) => {
    const parts: string[] = [];
    if (byCur.SAR > 0) parts.push(`${byCur.SAR.toLocaleString("en-US")} ر.س`);
    if (byCur.USD > 0) parts.push(`${byCur.USD.toLocaleString("en-US")} $`);
    if (byCur.YER > 0) parts.push(`${byCur.YER.toLocaleString("en-US")} ر.ي`);
    return parts.length > 0 ? parts.join(" | ") : "0";
  };

  const exportPDF = (period: "daily" | "weekly" | "monthly" | "yearly" | "overall") => {
    // تصدير البيانات المفلترة فقط إلى PDF
    const params = new URLSearchParams({
      type: "payments",
      period,
      format: "pdf",
      q: search,
      method: methodFilter,
      status: statusFilter,
    });
    const url = `/api/export?${params.toString()}`;
    window.open(url, "_blank");
    toast.success(lang === "ar" ? "تم فتح تقرير PDF" : "PDF report opened");
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

const exportExcel = (period: "weekly" | "monthly" | "yearly") => {
    const params = new URLSearchParams({
      type: "payments",
      period,
      format: "excel",
      q: search,
      method: methodFilter,
      status: statusFilter,
    });
    const url = `/api/export?${params.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${period}_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(lang === "ar" ? "تم تصدير ملف Excel" : "Excel file exported");
  };

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_payments")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "ar" ? `إجمالي السندات: ${list.length}` : `Total vouchers: ${list.length}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-background gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                {tr(lang, "export_excel")}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === "ar" ? "start" : "end"}>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportExcel("weekly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_weekly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportExcel("monthly")}>
                <Calendar className="w-4 h-4" />
                {tr(lang, "export_monthly")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => exportExcel("yearly")}>
                <Calendar className="w-4 h-4" />
                {lang === "ar" ? "تصدير سنوي" : "Yearly Export"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setCustomDateOpen(true)}>
                <Calendar className="w-4 h-4" />
                {lang === "ar" ? "تصدير حسب التاريخ" : "Custom Date Export"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        </div>
      </div>

      {/* بطاقات الملخص */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border card-shadow">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{lang === "ar" ? "إجمالي المبالغ المعتمدة" : "Total Approved Amount"}</p>
            <p className="text-base font-bold text-foreground num mt-1">{formatByCurrency(totalsByCurrency)}</p>
          </CardContent>
        </Card>
      </div>

      {/* فلاتر البحث */}
      <Card className="border-border card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "ar" ? "بحث برقم السند، اسم العميل، رقم الفاتورة..." : "Search by voucher, customer, invoice..."}
                className="ps-9 h-10 bg-background"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-10 w-full sm:w-44 bg-background">
                <SelectValue placeholder={lang === "ar" ? "طريقة الدفع" : "Payment Method"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr(lang, "overall")}</SelectItem>
                <SelectItem value="cash">{tr(lang, "list_cash")}</SelectItem>
                <SelectItem value="transfer">{tr(lang, "list_transfer")}</SelectItem>
                <SelectItem value="wallet">{tr(lang, "list_wallet")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full sm:w-40 bg-background">
                <SelectValue placeholder={tr(lang, "status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr(lang, "overall")}</SelectItem>
                <SelectItem value="approved">{tr(lang, "completed")}</SelectItem>
                <SelectItem value="pending">{tr(lang, "pending")}</SelectItem>
                <SelectItem value="reversed">{lang === "ar" ? "معكوسة" : "Reversed"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول المدفوعات */}
      <Card className="border-border card-shadow">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>{tr(lang, "payment_no")}</TableHead>
                  <TableHead>{tr(lang, "customer_name")}</TableHead>
                  <TableHead>{tr(lang, "invoice_no")}</TableHead>
                  <TableHead>{tr(lang, "payment_amount")}</TableHead>
                  <TableHead>{tr(lang, "payment_method")}</TableHead>
                  <TableHead>{tr(lang, "payment_date")}</TableHead>
                  <TableHead>{tr(lang, "status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {tr(lang, "no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((p) => (
                    <TableRow key={p.id} className="hover:bg-accent/30">
                      <TableCell className="text-xs text-muted-foreground num">{p.paymentNumber}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{p.customerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground num">{p.invoiceNumber ?? "—"}</TableCell>
                      <TableCell className="text-sm font-bold text-foreground num">
                        {p.amount.toLocaleString("en-US")} {currencySymbol(p.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={
                          p.method === "cash" ? "bg-pastel-yellow text-pastel-yellow"
                          : p.method === "transfer" ? "bg-pastel-sky text-pastel-sky"
                          : "bg-pastel-lilac text-pastel-lilac"
                        }>
                          {p.method === "cash" ? tr(lang, "list_cash") : p.method === "transfer" ? tr(lang, "list_transfer") : tr(lang, "list_wallet")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground num">{new Date(p.receivedAt).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={
                          p.status === "approved" ? "bg-pastel-mint text-pastel-mint"
                          : p.status === "reversed" ? "bg-pastel-peach text-pastel-peach"
                          : "bg-muted text-muted-foreground"
                        }>
                          {p.status === "approved" ? tr(lang, "completed") : p.status === "reversed" ? (lang === "ar" ? "معكوسة" : "Reversed") : tr(lang, "pending")}
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
            <Button onClick={() => exportCustomExcel("payments")} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {tr(lang, "export_excel")}
            </Button>
            <Button onClick={() => exportCustomPDF("payments")} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              <FileText className="w-4 h-4" />
              {tr(lang, "export_pdf")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
