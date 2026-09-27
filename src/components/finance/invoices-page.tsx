"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { printViaIframe } from "@/lib/utils";
import type { Invoice } from "@/lib/types";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Printer,
  Receipt as ReceiptIcon,
  Pencil,
  Trash2,
  Eye,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Calendar,
  Loader2,
} from "lucide-react";

const currencySymbol = (c: string) => (c === "SAR" ? "ر.س" : c === "YER" ? "ر.ي" : "$");

export function InvoicesPage() {
  const lang = useAppStore((s) => s.lang);
  const invoices = useAppStore((s) => s.invoices);
  const updateInvoice = useAppStore((s) => s.updateInvoice);
  const deleteInvoice = useAppStore((s) => s.deleteInvoice);

  const [statusFilter, setStatusFilter] = useState("all");
  const [viewRecord, setViewRecord] = useState<Invoice | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ totalAmount: number; paidAmount: number; status: string }>({
    totalAmount: 0,
    paidAmount: 0,
    status: "issued",
  });
  const [saving, setSaving] = useState(false);
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  const list = invoices.filter((i) => statusFilter === "all" || i.status === statusFilter);

  const totalByCurrency = (field: "totalAmount" | "paidAmount" | "remainingAmount") => {
    const byCur: Record<string, number> = { SAR: 0, YER: 0, USD: 0 };
    for (const i of invoices) {
      byCur[i.currency] = (byCur[i.currency] || 0) + i[field];
    }
    return byCur;
  };

  const totalAmount = totalByCurrency("totalAmount");
  const totalPaid = totalByCurrency("paidAmount");
  const totalRemaining = totalByCurrency("remainingAmount");

  const formatByCurrency = (byCur: Record<string, number>) => {
    const parts: string[] = [];
    if (byCur.SAR > 0) parts.push(`${byCur.SAR.toLocaleString("en-US")} ر.س`);
    if (byCur.USD > 0) parts.push(`${byCur.USD.toLocaleString("en-US")} $`);
    if (byCur.YER > 0) parts.push(`${byCur.YER.toLocaleString("en-US")} ر.ي`);
    return parts.length > 0 ? parts.join(" | ") : "0";
  };

  const statusLabel = (s: string) =>
    s === "paid" ? tr(lang, "invoice_paid") : s === "partial" ? tr(lang, "invoice_partial") : s === "issued" ? tr(lang, "invoice_issued") : tr(lang, "invoice_draft");

  const openEdit = (i: Invoice) => {
    setEditForm({
      totalAmount: i.totalAmount,
      paidAmount: i.paidAmount,
      status: i.status,
    });
    setEditId(i.id);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await updateInvoice(editId, {
        totalAmount: editForm.totalAmount,
        paidAmount: editForm.paidAmount,
        status: editForm.status as Invoice["status"],
      });
      toast.success(lang === "ar" ? "تم تحديث الفاتورة" : "Invoice updated");
      setEditId(null);
    } catch (err) {
      toast.error(lang === "ar" ? "فشل التحديث" : "Failed to update");
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteInvoice(deleteId);
      setDeleteId(null);
      toast.success(lang === "ar" ? "تم حذف الفاتورة" : "Invoice deleted");
    } catch (err) {
      toast.error(lang === "ar" ? "فشل الحذف" : "Failed to delete");
    }
  };

  const printInvoice = (i: Invoice) => {
    if (!i || !i.id || !i.invoiceNumber) {
      toast.error(lang === "ar" ? "بيانات الفاتورة غير مكتملة — تعذر إنشاء نسخة الطباعة" : "Invoice data incomplete — cannot generate print view");
      return;
    }
    // طباعة عبر iframe خفي — يعمل على الهاتف والكمبيوتر بدون popup blockers
    printViaIframe(`/api/print/invoice?id=${i.id}`)
      .then(() => toast.success(lang === "ar" ? "تم فتح الطباعة" : "Print dialog opened"))
      .catch(() => toast.error(lang === "ar" ? "فشل الطباعة" : "Print failed"));
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
    const url = `/api/export?type=invoices&period=${period}&format=excel`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_${period}_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(lang === "ar" ? "تم تصدير ملف Excel" : "Excel file exported");
  };

  const exportPDF = (period: "weekly" | "monthly" | "yearly" | "daily") => {
    const url = `/api/export?type=invoices&period=${period}&format=pdf`;
    window.open(url, "_blank");
    toast.success(lang === "ar" ? "تم فتح تقرير PDF" : "PDF report opened");
  };

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_invoices")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "ar" ? `إجمالي الفواتير: ${invoices.length}` : `Total invoices: ${invoices.length}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-44 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr(lang, "overall")}</SelectItem>
                <SelectItem value="paid">{tr(lang, "invoice_paid")}</SelectItem>
                <SelectItem value="partial">{tr(lang, "invoice_partial")}</SelectItem>
                <SelectItem value="issued">{tr(lang, "invoice_issued")}</SelectItem>
                <SelectItem value="draft">{tr(lang, "invoice_draft")}</SelectItem>
              </SelectContent>
            </Select>
            {/* تصدير Excel */}
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
          </div>
        </div>

        {/* Summary cards — مفصولة حسب العملة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border card-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-pastel-lilac flex items-center justify-center">
                  <ReceiptIcon className="w-5 h-5 text-pastel-lilac" />
                </div>
                <p className="text-xs text-muted-foreground">{tr(lang, "total")}</p>
              </div>
              <p className="text-base font-bold text-foreground num">{formatByCurrency(totalAmount)}</p>
            </CardContent>
          </Card>
          <Card className="border-border card-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-pastel-mint flex items-center justify-center">
                  <ReceiptIcon className="w-5 h-5 text-pastel-mint" />
                </div>
                <p className="text-xs text-muted-foreground">{tr(lang, "paid")}</p>
              </div>
              <p className="text-base font-bold text-pastel-mint num">{formatByCurrency(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card className="border-border card-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-pastel-peach flex items-center justify-center">
                  <ReceiptIcon className="w-5 h-5 text-pastel-peach" />
                </div>
                <p className="text-xs text-muted-foreground">{tr(lang, "remaining")}</p>
              </div>
              <p className="text-base font-bold text-pastel-peach num">{formatByCurrency(totalRemaining)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border card-shadow">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold">{tr(lang, "invoice_no")}</TableHead>
                    <TableHead className="text-xs font-semibold">{tr(lang, "customer_name")}</TableHead>
                    <TableHead className="text-xs font-semibold">{tr(lang, "total")}</TableHead>
                    <TableHead className="text-xs font-semibold">{tr(lang, "paid")}</TableHead>
                    <TableHead className="text-xs font-semibold">{tr(lang, "remaining")}</TableHead>
                    <TableHead className="text-xs font-semibold">{tr(lang, "invoice_date")}</TableHead>
                    <TableHead className="text-xs font-semibold">{tr(lang, "invoice_status")}</TableHead>
                    <TableHead className="text-xs font-semibold text-end">{tr(lang, "actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                        {tr(lang, "empty_invoices")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((i) => (
                      <TableRow key={i.id} className="hover:bg-accent/30">
                        <TableCell className="text-xs text-muted-foreground num font-medium">{i.invoiceNumber}</TableCell>
                        <TableCell className="text-sm font-medium text-foreground">{i.customerName}</TableCell>
                        <TableCell className="text-sm font-bold text-foreground num">
                          {i.totalAmount.toLocaleString("en-US")} {currencySymbol(i.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-pastel-mint num">
                          {i.paidAmount.toLocaleString("en-US")} {currencySymbol(i.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-pastel-peach num">
                          {i.remainingAmount.toLocaleString("en-US")} {currencySymbol(i.currency)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground num">{new Date(i.issuedAt).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={
                            i.status === "paid" ? "bg-pastel-mint text-pastel-mint"
                            : i.status === "partial" ? "bg-pastel-yellow text-pastel-yellow"
                            : i.status === "issued" ? "bg-pastel-sky text-pastel-sky"
                            : "bg-muted text-muted-foreground"
                          }>
                            {statusLabel(i.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title={tr(lang, "action_preview")} onClick={() => setViewRecord(i)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title={tr(lang, "delete_invoice")} onClick={() => setDeleteId(i.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title={tr(lang, "edit_invoice")} onClick={() => openEdit(i)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title={tr(lang, "print_invoice")} onClick={() => printInvoice(i)}>
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
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


      {/* View dialog — للمعاينة فقط (مع أزرار) */}
      <Dialog open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ReceiptIcon className="w-5 h-5 text-primary" />
              {tr(lang, "print_invoice")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{tr(lang, "brand_name")}</h2>
                  <p className="text-xs text-muted-foreground">{tr(lang, "brand_sub")}</p>
                </div>
                <div className="text-end">
                  <p className="text-xs text-muted-foreground">{tr(lang, "invoice_no")}</p>
                  <p className="font-bold text-foreground num">{viewRecord?.invoiceNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{tr(lang, "customer_name")}</p>
                  <p className="font-semibold text-foreground">{viewRecord?.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{tr(lang, "invoice_date")}</p>
                  <p className="font-semibold text-foreground num">{viewRecord && new Date(viewRecord.issuedAt).toLocaleDateString("en-GB")}</p>
                </div>
              </div>
              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{tr(lang, "total")}</span>
                  <span className="font-bold text-foreground num">{viewRecord && `${viewRecord.totalAmount.toLocaleString("en-US")} ${currencySymbol(viewRecord.currency)}`}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{tr(lang, "paid")}</span>
                  <span className="font-bold text-pastel-mint num">{viewRecord && `${viewRecord.paidAmount.toLocaleString("en-US")} ${currencySymbol(viewRecord.currency)}`}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{tr(lang, "remaining")}</span>
                  <span className="font-bold text-pastel-peach num">{viewRecord && `${viewRecord.remainingAmount.toLocaleString("en-US")} ${currencySymbol(viewRecord.currency)}`}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">{tr(lang, "invoice_status")}</span>
                  <span className="font-bold text-foreground">{viewRecord && statusLabel(viewRecord.status)}</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-center text-[11px] text-muted-foreground">
                {tr(lang, "footer_copyright")}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setViewRecord(null)}>{tr(lang, "cancel")}</Button>
            <Button className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2" onClick={() => viewRecord && printInvoice(viewRecord)}>
              <Printer className="w-4 h-4" />
              {tr(lang, "print")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              {tr(lang, "edit_invoice")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>{tr(lang, "total")}</Label>
              <Input type="number" value={editForm.totalAmount} onChange={(e) => setEditForm({ ...editForm, totalAmount: parseFloat(e.target.value || "0") })} className="bg-background num" />
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "paid")}</Label>
              <Input type="number" value={editForm.paidAmount} onChange={(e) => setEditForm({ ...editForm, paidAmount: parseFloat(e.target.value || "0") })} className="bg-background num" />
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "invoice_status")}</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger className="sama-select bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{tr(lang, "invoice_draft")}</SelectItem>
                  <SelectItem value="issued">{tr(lang, "invoice_issued")}</SelectItem>
                  <SelectItem value="partial">{tr(lang, "invoice_partial")}</SelectItem>
                  <SelectItem value="paid">{tr(lang, "invoice_paid")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 text-sm">
              <p className="text-muted-foreground">{tr(lang, "remaining")}</p>
              <p className="font-bold text-foreground num">{(editForm.totalAmount - editForm.paidAmount).toLocaleString("en-US")}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditId(null)}>{tr(lang, "cancel")}</Button>
            <Button onClick={saveEdit} disabled={saving} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {tr(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr(lang, "delete_invoice")}</AlertDialogTitle>
            <AlertDialogDescription>{tr(lang, "confirm_delete_invoice")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr(lang, "cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tr(lang, "action_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <Button onClick={() => exportCustomExcel("invoices")} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              {tr(lang, "export_excel")}
            </Button>
            <Button onClick={() => exportCustomPDF("invoices")} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              <FileText className="w-4 h-4" />
              {tr(lang, "export_pdf")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
