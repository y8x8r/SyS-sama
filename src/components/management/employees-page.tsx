"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import type { Role } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Shield,
  KeyRound,
  UserCog,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export function EmployeesPage() {
  const lang = useAppStore((s) => s.lang);
  const currentUser = useAppStore((s) => s.currentUser);
  const employees = useAppStore((s) => s.employees);
  const users = useAppStore((s) => s.users);
  const addEmployee = useAppStore((s) => s.addEmployee);
  const deleteEmployee = useAppStore((s) => s.deleteEmployee);

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    role: "booking_officer" as Role,
    password: "",
  });
  const [editForm, setEditForm] = useState({
    fullName: "",
    username: "",
    password: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  // منع الإرسال المزدوج عند النقر المتكرر على زر الإنشاء
  const submittingRef = useRef(false);

  const isManager = currentUser?.role === "manager";

  const roleLabel = (r: Role) =>
    r === "manager" ? tr(lang, "role_general_manager")
    : r === "accountant" ? tr(lang, "role_accountant")
    : tr(lang, "role_booking");

  const roleColor = (r: string) =>
    r === "manager" ? "bg-pastel-lilac text-pastel-lilac"
    : r === "accountant" ? "bg-pastel-peach text-pastel-peach"
    : "bg-pastel-mint text-pastel-mint";

  const openCreate = () => {
    if (!isManager) {
      toast.error(tr(lang, "only_manager_can_manage"));
      return;
    }
    setForm({ fullName: "", username: "", role: "booking_officer", password: "" });
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    // منع الإرسال المزدوج — إذا كان هناك طلب قيد التنفيذ، تجاهل
    if (submittingRef.current) return;
    submittingRef.current = true;

    const errs: Record<string, string> = {};
    const trimmedName = form.fullName.trim();
    const trimmedUsername = form.username.trim();

    if (!trimmedName) errs.fullName = lang === "ar" ? "مطلوب" : "Required";
    if (!trimmedUsername) errs.username = lang === "ar" ? "مطلوب" : "Required";
    if (trimmedUsername.includes(" ")) errs.username = lang === "ar" ? "اسم المستخدم لا يجب أن يحتوي على مسافات" : "Username must not contain spaces";
    if (form.password.length < 4) errs.password = tr(lang, "err_password_short");
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      submittingRef.current = false;
      return;
    }

    setSaving(true);
    try {
      const result = await addEmployee({
        fullName: trimmedName,
        username: trimmedUsername,
        role: form.role,
        password: form.password,
      });
      if (!result.ok) {
        const errKey = result.error ?? "server_error";
        let msg: string;
        if (errKey === "username_exists") msg = result.message ?? (lang === "ar" ? "اسم المستخدم مستخدم حالياً من حساب نشط" : "Username already in use");
        else if (errKey === "username_no_spaces") msg = lang === "ar" ? "اسم المستخدم لا يجب أن يحتوي على مسافات" : "Username must not contain spaces";
        else if (errKey === "missing_fields_or_short_password") msg = lang === "ar" ? "بيانات ناقصة أو كلمة مرور قصيرة (4 أحرف على الأقل)" : "Missing fields or short password (min 4 chars)";
        else if (errKey === "not_authed") msg = lang === "ar" ? "يجب تسجيل الدخول أولاً" : "Not authenticated";
        else if (errKey === "only_manager_can_manage") msg = lang === "ar" ? "هذا الإجراء متاح للمدير العام فقط" : "Only manager can do this";
        else if (errKey === "employee_number_conflict") msg = lang === "ar" ? "تعارض في رقم الموظف — حاول مرة أخرى" : "Employee number conflict — try again";
        else if (errKey === "create_failed") msg = result.message ?? (lang === "ar" ? "فشل إنشاء الحساب — تحقق من البيانات" : "Failed to create account");
        else msg = result.message ?? (lang === "ar" ? "فشل إنشاء الحساب" : "Failed to create account");
        setErrors({ username: msg });
        toast.error(msg);
        submittingRef.current = false;
        return;
      }
      // النجاح فقط بعد تأكيد الحفظ فعلياً
      toast.success(lang === "ar" ? "تم إنشاء حساب الموظف بنجاح" : "Employee account created successfully");
      setOpen(false);
      setForm({ fullName: "", username: "", role: "booking_officer", password: "" });
      setErrors({});
    } catch (err) {
      toast.error(lang === "ar" ? "حدث خطأ غير متوقع" : "Unexpected error");
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEmployee(deleteId);
      setDeleteId(null);
      toast.success(lang === "ar" ? "تم حذف الموظف" : "Employee deleted");
    } catch (err) {
      toast.error(lang === "ar" ? "فشل الحذف" : "Failed to delete");
    }
  };

  const openEdit = (e: any) => {
    const linkedUser = users.find((u: any) => u.employeeId === e.id);
    setEditForm({
      fullName: e.fullName,
      username: linkedUser?.username ?? "",
      password: "",
    });
    setEditId(e.id);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editId) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/employees/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: editForm.fullName,
          username: editForm.username,
          password: editForm.password || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(lang === "ar" ? "تم تعديل بيانات الموظف" : "Employee updated");
        setEditOpen(false);
        setEditId(null);
        // تحديث البيانات
        window.location.reload();
      } else {
        const msg = data.error === "username_exists" ? tr(lang, "err_username_exists") : lang === "ar" ? "فشل التعديل" : "Failed";
        toast.error(msg);
      }
    } catch {
      toast.error(lang === "ar" ? "فشل التعديل" : "Failed");
    }
    setEditSaving(false);
  };

  if (!isManager) {
    return (
      <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
        <Card className="border-border card-shadow">
          <CardContent className="p-12 text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{tr(lang, "only_manager_can_manage")}</h3>
            <p className="text-sm text-muted-foreground">{lang === "ar" ? "صفحة إدارة الموظفين متاحة للمدير العام فقط." : "Employee management is only available to the General Manager."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_employees")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? `إجمالي الموظفين: ${employees.length}` : `Total employees: ${employees.length}`}</p>
        </div>
        <Button className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2 shadow-sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          {tr(lang, "create_employee")}
        </Button>
      </div>

      <Card className="border-border card-shadow">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">{tr(lang, "employee_name")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "employee_number")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "username")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "role")}</TableHead>
                  <TableHead className="text-xs font-semibold">{tr(lang, "status")}</TableHead>
                  <TableHead className="text-xs font-semibold text-end">{tr(lang, "actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12"><div className="flex flex-col items-center gap-3 text-muted-foreground"><div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center"><Plus className="w-6 h-6" /></div><p className="text-sm">{tr(lang, "empty_employees")}</p></div></TableCell></TableRow>
                ) : (
                  employees.map((e: any) => {
                    const linkedUser = users.find((u: any) => u.employeeId === e.id);
                    return (
                      <TableRow key={e.id} className="hover:bg-accent/30">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pastel-sky to-pastel-sky flex items-center justify-center text-pastel-sky font-bold text-sm">{e.fullName.charAt(0)}</div>
                            <div><div className="font-medium text-foreground text-sm">{e.fullName}</div><div className="text-[11px] text-muted-foreground">{e.jobTitle}</div></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground num">{e.employeeNumber}</TableCell>
                        <TableCell className="text-sm text-muted-foreground num">@{linkedUser?.username ?? "—"}</TableCell>
                        <TableCell>{linkedUser && <Badge variant="secondary" className={roleColor(linkedUser.role)}>{roleLabel(linkedUser.role)}</Badge>}</TableCell>
                        <TableCell>{linkedUser && <Badge variant="secondary" className={linkedUser.isActive ? "bg-pastel-mint text-pastel-mint" : "bg-muted text-muted-foreground"}>{linkedUser.isActive ? tr(lang, "active") : tr(lang, "inactive")}</Badge>}</TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title={lang === "ar" ? "تعديل" : "Edit"} onClick={() => openEdit(e)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title={tr(lang, "action_delete")} onClick={() => setDeleteId(e.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Employee Dialog — اسم الموظف ← اسم المستخدم ← الدور ← كلمة مرور الموظف */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-primary" />{tr(lang, "create_employee")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>{tr(lang, "f_employee_name")} *</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="bg-background" placeholder={lang === "ar" ? "الاسم الكامل" : "Full name"} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "f_username")} *</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="bg-background num" placeholder="username" dir="ltr" />
              {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "role")} *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger className="sama-select bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">{tr(lang, "role_general_manager")}</SelectItem>
                  <SelectItem value="booking_officer">{tr(lang, "role_booking")}</SelectItem>
                  <SelectItem value="accountant">{tr(lang, "role_accountant")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "f_employee_password")} *</Label>
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-background pe-9" dir="ltr" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute inset-y-0 end-3 my-auto text-muted-foreground hover:text-foreground">{showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              <p className="text-[11px] text-muted-foreground">{lang === "ar" ? "لن تظهر كلمة المرور لاحقاً في أي جدول أو سجل." : "Password will not be shown later in any table or log."}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{tr(lang, "cancel")}</Button>
            <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {tr(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تعديل بيانات الموظف — الاسم + اسم المستخدم + كلمة المرور فقط */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              {lang === "ar" ? "تعديل بيانات الموظف" : "Edit Employee"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>{tr(lang, "f_employee_name")} *</Label>
              <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="bg-background" placeholder={lang === "ar" ? "الاسم الكامل" : "Full name"} />
            </div>
            <div className="space-y-1.5">
              <Label>{tr(lang, "f_username")} *</Label>
              <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="bg-background num" placeholder="username" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "ar" ? "كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)" : "New Password (leave empty to keep)"}</Label>
              <div className="relative">
                <Input type={showEditPwd ? "text" : "password"} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="bg-background pe-9" dir="ltr" placeholder="••••••" />
                <button type="button" onClick={() => setShowEditPwd(!showEditPwd)} className="absolute inset-y-0 end-3 my-auto text-muted-foreground hover:text-foreground">{showEditPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
              <p className="text-[11px] text-muted-foreground">{lang === "ar" ? "اتركها فارغة إذا كنت لا تريد تغيير كلمة المرور." : "Leave empty if you don't want to change the password."}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>{tr(lang, "cancel")}</Button>
            <Button onClick={submitEdit} disabled={editSaving} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {tr(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr(lang, "action_delete")}</AlertDialogTitle>
            <AlertDialogDescription>{lang === "ar" ? "سيتم الحفاظ على السجل التاريخي للعمليات. هل أنت متأكد؟" : "Historical records will be preserved. Are you sure?"}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr(lang, "cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{tr(lang, "action_delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
