"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
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
  Globe,
  Moon,
  Sun,
  Shield,
  Wallet,
  BarChart3,
  MoonStar,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

export function SystemSettingsPage() {
  const lang = useAppStore((s) => s.lang);
  const theme = useAppStore((s) => s.theme);
  const setLang = useAppStore((s) => s.setLang);
  const setTheme = useAppStore((s) => s.setTheme);
  const currentUser = useAppStore((s) => s.currentUser);
  const changePassword = useAppStore((s) => s.changePassword);
  const policies = useAppStore((s) => s.policies);
  const addPolicy = useAppStore((s) => s.addPolicy);
  const updatePolicy = useAppStore((s) => s.updatePolicy);
  const deletePolicy = useAppStore((s) => s.deletePolicy);

  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [pwdSaving, setPwdSaving] = useState(false);

  // سياسات
  const [policyOpen, setPolicyOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [deletePolicyId, setDeletePolicyId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState({ title: "", description: "", category: "general" });
  const [policySaving, setPolicySaving] = useState(false);

  const handleChangePassword = async () => {
    const errs: Record<string, string> = {};
    if (!pwdForm.current) errs.current = lang === "ar" ? "مطلوب" : "Required";
    if (pwdForm.next.length < 4) errs.next = tr(lang, "err_password_short");
    if (pwdForm.next !== pwdForm.confirm) errs.confirm = lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords don't match";
    setPwdErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPwdSaving(true);
    const ok = await changePassword(pwdForm.current, pwdForm.next);
    setPwdSaving(false);
    if (!ok) {
      setPwdErrors({ current: tr(lang, "err_wrong_password") });
      return;
    }
    toast.success(tr(lang, "password_changed"));
    setPwdForm({ current: "", next: "", confirm: "" });
  };

  const openCreatePolicy = () => {
    setPolicyForm({ title: "", description: "", category: "general" });
    setEditingPolicyId(null);
    setPolicyOpen(true);
  };

  const openEditPolicy = (p: typeof policies[0]) => {
    setPolicyForm({ title: p.title, description: p.description, category: p.category });
    setEditingPolicyId(p.id);
    setPolicyOpen(true);
  };

  const savePolicy = async () => {
    if (!policyForm.title.trim()) {
      toast.error(lang === "ar" ? "أدخل عنوان السياسة" : "Enter policy title");
      return;
    }
    setPolicySaving(true);
    try {
      if (editingPolicyId) {
        await updatePolicy(editingPolicyId, policyForm);
        toast.success(lang === "ar" ? "تم تحديث السياسة" : "Policy updated");
      } else {
        await addPolicy(policyForm);
        toast.success(lang === "ar" ? "تم إضافة السياسة" : "Policy added");
      }
      setPolicyOpen(false);
      setPolicyForm({ title: "", description: "", category: "general" });
      setEditingPolicyId(null);
    } catch (err) {
      toast.error(lang === "ar" ? "فشل الحفظ" : "Failed to save");
    }
    setPolicySaving(false);
  };

  const confirmDeletePolicy = async () => {
    if (!deletePolicyId) return;
    try {
      await deletePolicy(deletePolicyId);
      setDeletePolicyId(null);
      toast.success(lang === "ar" ? "تم حذف السياسة" : "Policy deleted");
    } catch (err) {
      toast.error(lang === "ar" ? "فشل الحذف" : "Failed to delete");
    }
  };

  const isManager = currentUser?.role === "manager";

  const categoryLabel = (cat: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      general: { ar: "عامة", en: "General" },
      cancellation: { ar: "إلغاء", en: "Cancellation" },
      refund: { ar: "استرجاع", en: "Refund" },
      payment: { ar: "دفع", en: "Payment" },
      operational: { ar: "تشغيلية", en: "Operational" },
    };
    return lang === "ar" ? map[cat]?.ar : map[cat]?.en;
  };

  return (
    <div className="space-y-5" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{tr(lang, "nav_system_settings")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{lang === "ar" ? "إعدادات النظام العامة والتفضيلات" : "General system settings and preferences"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Language */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />{tr(lang, "settings_default_lang")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={lang} onValueChange={(v) => setLang(v as "ar" | "en")} className="grid grid-cols-2 gap-3">
              {[
                { value: "ar", label: tr(lang, "settings_arabic"), desc: lang === "ar" ? "من اليمين إلى اليسار (RTL)" : "Right-to-left (RTL)" },
                { value: "en", label: tr(lang, "settings_english"), desc: lang === "ar" ? "من اليسار إلى اليمين (LTR)" : "Left-to-right (LTR)" },
              ].map((o) => (
                <label key={o.value} htmlFor={`lang-${o.value}`} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${lang === o.value ? "border-primary bg-accent/40" : "border-border hover:border-primary/40 hover:bg-accent/20"}`}>
                  <RadioGroupItem value={o.value} id={`lang-${o.value}`} className="mt-0.5" />
                  <div><p className="text-sm font-medium text-foreground">{o.label}</p><p className="text-[11px] text-muted-foreground">{o.desc}</p></div>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><MoonStar className="w-4 h-4 text-primary" />{tr(lang, "settings_color_mode")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "light", label: tr(lang, "settings_light"), icon: Sun, color: "#F97316" },
                { value: "dark", label: tr(lang, "settings_dark"), icon: Moon, color: "#A855F7" },
              ].map((o) => (
                <button key={o.value} onClick={() => setTheme(o.value as "light" | "dark")} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${theme === o.value ? "border-primary bg-accent/40" : "border-border hover:border-primary/40 hover:bg-accent/20"}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: o.value === "light" ? "#FFEDD5" : "#1A1A2E" }}>
                    <o.icon className="w-4 h-4" style={{ color: o.color }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{o.label}</span>
                  {theme === o.value && <Badge variant="secondary" className="ms-auto bg-pastel-lilac text-pastel-lilac text-[10px]">{lang === "ar" ? "نشط" : "Active"}</Badge>}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">{lang === "ar" ? "الوضع الليلي يغير المظهر الخارجي والداخلي الكامل للنظام بشكل متناسق، والوضع النهاري يعيده كاملاً." : "Dark mode changes the entire external and internal appearance consistently, and light mode restores it fully."}</p>
          </CardContent>
        </Card>

        {/* Change Password */}
        {isManager && (
          <Card className="border-border card-shadow lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" />{tr(lang, "change_password")}</span>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setShowCurrent(!showCurrent); setShowNext(!showCurrent); }}>
                  <Unlock className="w-4 h-4" />
                  {tr(lang, "unlock")}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>{tr(lang, "current_password")} *</Label>
                  <div className="relative">
                    <Input type={showCurrent ? "text" : "password"} value={pwdForm.current} onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })} className="bg-background pe-9" dir="ltr" />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 end-3 my-auto text-muted-foreground hover:text-foreground">{showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  {pwdErrors.current && <p className="text-xs text-destructive">{pwdErrors.current}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{tr(lang, "new_password")} *</Label>
                  <div className="relative">
                    <Input type={showNext ? "text" : "password"} value={pwdForm.next} onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })} className="bg-background pe-9" dir="ltr" />
                    <button type="button" onClick={() => setShowNext(!showNext)} className="absolute inset-y-0 end-3 my-auto text-muted-foreground hover:text-foreground">{showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  {pwdErrors.next && <p className="text-xs text-destructive">{pwdErrors.next}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{tr(lang, "confirm_password")} *</Label>
                  <Input type={showNext ? "text" : "password"} value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} className="bg-background" dir="ltr" />
                  {pwdErrors.confirm && <p className="text-xs text-destructive">{pwdErrors.confirm}</p>}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleChangePassword} disabled={pwdSaving} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
                  {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {tr(lang, "change_password")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Policies section — مدير عام فقط */}
        {isManager && (
          <Card className="border-border card-shadow lg:col-span-2">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />{lang === "ar" ? "السياسات" : "Policies"}</CardTitle>
              <Button size="sm" className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2" onClick={openCreatePolicy}>
                <Plus className="w-4 h-4" />
                {lang === "ar" ? "إضافة سياسة" : "Add Policy"}
              </Button>
            </CardHeader>
            <CardContent>
              {policies.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  {lang === "ar" ? "لا توجد سياسات بعد. ابدأ بإضافة سياسة جديدة." : "No policies yet. Start by adding a new policy."}
                </div>
              ) : (
                <div className="space-y-2">
                  {policies.map((p) => (
                    <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:bg-accent/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground">{p.title}</p>
                          <Badge variant="secondary" className="bg-pastel-lilac text-pastel-lilac text-[10px]">{categoryLabel(p.category)}</Badge>
                          {!p.isActive && <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px]">{lang === "ar" ? "معطّلة" : "Inactive"}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeletePolicyId(p.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditPolicy(p)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cancellation policies settings */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />{tr(lang, "settings_cancel_policy")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{lang === "ar" ? "إلغاء مجاني خلال 24 ساعة" : "Free cancellation within 24h"}</Label>
                  <p className="text-[11px] text-muted-foreground">{lang === "ar" ? "السماح بالإلغاء المجاني خلال 24 ساعة من الحجز" : "Allow free cancellation within 24 hours of booking"}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{lang === "ar" ? "رسوم إلغاء 50% بعد 24 ساعة" : "50% cancellation fee after 24h"}</Label>
                  <p className="text-[11px] text-muted-foreground">{lang === "ar" ? "تطبيق رسوم إلغاء بنسبة 50% من القيمة" : "Apply 50% cancellation fee"}</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card className="border-border card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" />{tr(lang, "settings_payment_methods")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { key: "cash", label: tr(lang, "list_cash"), icon: Wallet, enabled: true },
                { key: "transfer", label: tr(lang, "list_transfer"), icon: Wallet, enabled: true },
                { key: "wallet", label: tr(lang, "list_wallet"), icon: Wallet, enabled: true },
              ].map((m) => (
                <div key={m.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-pastel-lilac flex items-center justify-center"><m.icon className="w-4 h-4 text-pastel-lilac" /></div>
                    <Label className="text-sm font-medium cursor-pointer">{m.label}</Label>
                  </div>
                  <Switch defaultChecked={m.enabled} />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Label className="text-sm font-medium block mb-2">{lang === "ar" ? "العملات المدعومة" : "Supported currencies"}</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-pastel-mint text-pastel-mint">ر.س (SAR)</Badge>
                <Badge variant="secondary" className="bg-pastel-peach text-pastel-peach">ر.ي (YER)</Badge>
                <Badge variant="secondary" className="bg-pastel-sky text-pastel-sky">$ (USD)</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy dialog */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {editingPolicyId ? (lang === "ar" ? "تعديل سياسة" : "Edit Policy") : (lang === "ar" ? "إضافة سياسة" : "Add Policy")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>{lang === "ar" ? "العنوان" : "Title"} *</Label>
              <Input value={policyForm.title} onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "ar" ? "الوصف" : "Description"}</Label>
              <Textarea value={policyForm.description} onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })} className="bg-background min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "ar" ? "التصنيف" : "Category"}</Label>
              <Select value={policyForm.category} onValueChange={(v) => setPolicyForm({ ...policyForm, category: v })}>
                <SelectTrigger className="sama-select bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{lang === "ar" ? "عامة" : "General"}</SelectItem>
                  <SelectItem value="cancellation">{lang === "ar" ? "إلغاء" : "Cancellation"}</SelectItem>
                  <SelectItem value="refund">{lang === "ar" ? "استرجاع" : "Refund"}</SelectItem>
                  <SelectItem value="payment">{lang === "ar" ? "دفع" : "Payment"}</SelectItem>
                  <SelectItem value="operational">{lang === "ar" ? "تشغيلية" : "Operational"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPolicyOpen(false)}>{tr(lang, "cancel")}</Button>
            <Button onClick={savePolicy} disabled={policySaving} className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2">
              {policySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {tr(lang, "save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete policy confirm */}
      <AlertDialog open={!!deletePolicyId} onOpenChange={(o) => !o && setDeletePolicyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "ar" ? "حذف السياسة" : "Delete Policy"}</AlertDialogTitle>
            <AlertDialogDescription>{lang === "ar" ? "هل أنت متأكد من حذف هذه السياسة؟" : "Are you sure you want to delete this policy?"}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr(lang, "cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePolicy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{tr(lang, "action_delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
