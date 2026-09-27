"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Plane, Loader2, Lock, User as UserIcon, KeyRound } from "lucide-react";
import { toast } from "sonner";

type Mode = "login" | "forgot_verify" | "forgot_reset";

export function LoginPage() {
  const lang = useAppStore((s) => s.lang);
  const login = useAppStore((s) => s.login);
  const forgotPassword = useAppStore((s) => s.forgotPassword);

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // حقول استعادة كلمة المرور
  const [forgotUsername, setForgotUsername] = useState("");
  const [answer1, setAnswer1] = useState(""); // متى تم افتتاح مكتب سما اليمن؟
  const [answer2, setAnswer2] = useState(""); // ما هو إيميلك الشخصي؟
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    login(username.trim(), password).then((ok) => {
      if (!ok) {
        setErr(tr(lang, "invalid_credentials"));
        setLoading(false);
      }
    });
  };

  const startForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    forgotPassword("verify", { username: forgotUsername, answer1, answer2 }).then((res) => {
      setLoading(false);
      if (res.ok && res.resetToken) {
        setResetToken(res.resetToken);
        setMode("forgot_reset");
        toast.success(lang === "ar" ? "تم التحقق بنجاح. عيّن كلمة مرور جديدة." : "Verified. Set a new password.");
      } else {
        const errKey = res.error ?? "server_error";
        const msg = errKey === "incorrect_answers"
          ? (lang === "ar" ? "الإجابات غير صحيحة" : "Incorrect answers")
          : errKey === "not_authorized"
          ? (lang === "ar" ? "هذا الخيار متاح للمدير العام فقط" : "This option is for General Manager only")
          : (lang === "ar" ? "حدث خطأ. حاول مرة أخرى." : "An error occurred. Try again.");
        setErr(msg);
      }
    });
  };

  const resetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setErr(lang === "ar" ? "كلمة المرور يجب أن تكون 4 أحرف على الأقل" : "Password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr(lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords don't match");
      return;
    }
    setLoading(true);
    setErr("");
    forgotPassword("reset", { resetToken, newPassword }).then((res) => {
      setLoading(false);
      if (res.ok) {
        toast.success(lang === "ar" ? "تم تغيير كلمة المرور بنجاح. سجّل الدخول." : "Password changed. Please sign in.");
        setMode("login");
        setForgotUsername("");
        setAnswer1("");
        setAnswer2("");
        setNewPassword("");
        setConfirmPassword("");
        setResetToken("");
      } else {
        setErr(lang === "ar" ? "فشل تغيير كلمة المرور" : "Failed to change password");
      }
    });
  };

  const renderForgotVerify = () => (
    <form onSubmit={startForgot} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgotUsername">{tr(lang, "username")}</Label>
        <div className="relative">
          <UserIcon className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            id="forgotUsername"
            value={forgotUsername}
            onChange={(e) => setForgotUsername(e.target.value)}
            placeholder={tr(lang, "username")}
            className="ps-9 h-11"
            required
          />
        </div>
      </div>

      <div className="p-3 rounded-lg bg-pastel-lilac/40 border border-primary/20">
        <p className="text-xs text-pastel-lilac font-medium mb-2">
          {lang === "ar" ? "أسئلة التحقق — للمدير العام فقط" : "Verification questions — General Manager only"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {lang === "ar" ? "أجب عن السؤالين التاليين للتحقق من هويتك" : "Answer the following two questions to verify your identity"}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{lang === "ar" ? "متى تم افتتاح مكتب سما اليمن؟" : "When was Sama Yemen office opened?"}</Label>
        <Input
          value={answer1}
          onChange={(e) => setAnswer1(e.target.value)}
          placeholder={lang === "ar" ? "السنة" : "Year"}
          className="h-11"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>{lang === "ar" ? "ما هو إيميلك الشخصي؟" : "What is your personal email?"}</Label>
        <Input
          type="email"
          value={answer2}
          onChange={(e) => setAnswer2(e.target.value)}
          placeholder="email@example.com"
          className="h-11"
          dir="ltr"
          required
        />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      <Button type="submit" className="w-full h-11 text-base bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 shadow-md" disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (lang === "ar" ? "تحقق" : "Verify")}
      </Button>

      <button type="button" className="w-full text-xs text-muted-foreground hover:text-primary" onClick={() => { setMode("login"); setErr(""); }}>
        {lang === "ar" ? "← العودة لتسجيل الدخول" : "← Back to sign in"}
      </button>
    </form>
  );

  const renderForgotReset = () => (
    <form onSubmit={resetPassword} className="space-y-4">
      <div className="p-3 rounded-lg bg-pastel-mint/40 border border-emerald-200">
        <p className="text-xs text-pastel-mint font-medium">
          {lang === "ar" ? "تم التحقق بنجاح. عيّن كلمة مرور جديدة." : "Verified. Set a new password."}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{tr(lang, "new_password")}</Label>
        <div className="relative">
          <Lock className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            type={show ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="ps-9 pe-9 h-11"
            dir="ltr"
            required
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 end-3 my-auto text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{tr(lang, "confirm_password")}</Label>
        <div className="relative">
          <Lock className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            type={show ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="ps-9 pe-9 h-11"
            dir="ltr"
            required
          />
        </div>
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      <Button type="submit" className="w-full h-11 text-base bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 shadow-md" disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (lang === "ar" ? "تعيين كلمة المرور" : "Set Password")}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative lg:w-5/12 bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] text-white p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-12 -left-12 w-80 h-80 rounded-full bg-white"></div>
          <div className="absolute bottom-12 right-12 w-64 h-64 rounded-full bg-white"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tr(lang, "brand_name")}</h1>
              <p className="text-white/80 text-sm">{tr(lang, "brand_sub")}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-8 lg:my-0">
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            {lang === "ar"
              ? "نظام إداري متكامل لخدمات السفر والسياحة والحج والعمرة"
              : "Integrated management system for travel, tourism, Hajj & Umrah"}
          </h2>
          <p className="text-white/85 leading-relaxed">
            {lang === "ar"
              ? "إدارة احترافية للعملاء والخدمات والفواتير والمدفوعات والإحصائيات في منصة واحدة آمنة وسريعة."
              : "Professional management of customers, services, invoices, payments, and statistics in one secure, fast platform."}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          {[
            lang === "ar" ? "حج وعمرة" : "Hajj & Umrah",
            lang === "ar" ? "تأشيرات" : "Visas",
            lang === "ar" ? "تذاكر طيران" : "Flight Tickets",
            lang === "ar" ? "نقل وشحن" : "Transport & Shipping",
          ].map((tag) => (
            <span key={tag} className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Card className="card-shadow border-border">
            <CardHeader className="space-y-2 text-center pb-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center lg:hidden">
                <Plane className="w-7 h-7 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {mode === "login" && tr(lang, "login_title")}
                {mode === "forgot_verify" && (lang === "ar" ? "استعادة كلمة المرور" : "Password Recovery")}
                {mode === "forgot_reset" && (lang === "ar" ? "تعيين كلمة مرور جديدة" : "Set New Password")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {mode === "login" && tr(lang, "login_subtitle")}
                {mode === "forgot_verify" && (lang === "ar" ? "تحقق من هويتك للمدير العام" : "Verify your identity (General Manager)")}
                {mode === "forgot_reset" && (lang === "ar" ? "أدخل كلمة المرور الجديدة" : "Enter your new password")}
              </p>
            </CardHeader>
            <CardContent>
              {mode === "login" && (
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{tr(lang, "username")}</Label>
                    <div className="relative">
                      <UserIcon className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={tr(lang, "username")}
                        className="ps-9 h-11"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{tr(lang, "password")}</Label>
                      <button type="button" className="text-xs text-primary hover:underline flex items-center gap-1" onClick={() => { setMode("forgot_verify"); setErr(""); setForgotUsername(username); }}>
                        <KeyRound className="w-3 h-3" />
                        {tr(lang, "forgot_password")}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={show ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={tr(lang, "password")}
                        className="ps-9 pe-9 h-11"
                        autoComplete="current-password"
                        required
                      />
                      <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 end-3 my-auto text-muted-foreground hover:text-foreground">
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">{tr(lang, "remember_me")}</Label>
                  </div>

                  {err && <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}

                  <Button type="submit" className="w-full h-11 text-base bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 shadow-md" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : tr(lang, "sign_in")}
                  </Button>
                </form>
              )}

              {mode === "forgot_verify" && renderForgotVerify()}
              {mode === "forgot_reset" && renderForgotReset()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
