"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { tr } from "@/lib/translations";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/** مدة الخمول قبل انتهاء الجلسة (30 دقيقة) — زيادة لتجنب الخروج المفاجئ */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** عرض تنبيه قبل الانتهاء بـ 60 ثانية */
const WARNING_BEFORE_MS = 60 * 1000;

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const lang = useAppStore((s) => s.lang);
  const theme = useAppStore((s) => s.theme);
  const logout = useAppStore((s) => s.logout);
  const isAuthed = useAppStore((s) => s.isAuthed);

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apply theme & direction to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang, theme]);

  // انتهاء الجلسة بعد 3 دقائق من الخمول
  useEffect(() => {
    if (!isAuthed) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      // إذا كان التنبيه ظاهراً، أخفه عند العودة للنشاط
      if (showTimeoutWarning) {
        setShowTimeoutWarning(false);
      }
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "wheel"];
    events.forEach((e) => window.addEventListener(e, resetActivity, { passive: true }));

    // فحص دوري كل 10 ثوانٍ (بدلاً من كل ثانية) — تقليل إعادة العرض
    timerRef.current = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const warningThreshold = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS;

      if (idleMs >= IDLE_TIMEOUT_MS) {
        // انتهت الجلسة — تسجيل الخروج تلقائياً
        setShowTimeoutWarning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        logout();
        return;
      }

      if (idleMs >= warningThreshold) {
        // عرض تنبيه قبل الانتهاء بـ 30 ثانية
        const secondsUntilLogout = Math.ceil((IDLE_TIMEOUT_MS - idleMs) / 1000);
        setSecondsLeft(secondsUntilLogout);
        if (!showTimeoutWarning) {
          setShowTimeoutWarning(true);
        }
      }
    }, 10000); // كل 10 ثوانٍ

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetActivity));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthed, logout, showTimeoutWarning]);

  const handleStayLoggedIn = () => {
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);
  };

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={cn(
        "min-h-screen flex flex-col bg-background",
        lang === "ar" ? "font-cairo" : "font-cairo"
      )}
    >
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-4 lg:p-6 fade-in">
            {children}
          </main>
          <footer className="app-footer px-6 py-3 text-center">
            <p className="text-[11px] leading-relaxed">
              {tr(lang, "footer_copyright")}
            </p>
          </footer>
        </div>
      </div>

      {/* تنبيه انتهاء الجلسة قبل 30 ثانية */}
      <Dialog open={showTimeoutWarning} onOpenChange={(o) => {
        if (!o) {
          // إذا أغلق المستخدم التنبيه يدوياً، نعيد ضبط المؤقت
          handleStayLoggedIn();
        }
      }}>
        <DialogContent className="max-w-md" dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              {lang === "ar" ? "تنبيه: الجلسة على وشك الانتهاء" : "Session Timeout Warning"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-center gap-3 py-3">
              <Clock className="w-10 h-10 text-orange-500" />
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 num">
                {secondsLeft}
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {lang === "ar"
                ? "ستنتهي جلستك تلقائياً خلال الثواني المتبقية بسبب الخمول. اضغط «البقاء متصلاً» للاستمرار."
                : "Your session will expire soon due to inactivity. Click 'Stay signed in' to continue."}
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleStayLoggedIn}
              className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-95 gap-2 w-full"
            >
              {lang === "ar" ? "البقاء متصلاً" : "Stay signed in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
