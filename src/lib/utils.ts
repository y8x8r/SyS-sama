import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * طباعة محتوى عبر iframe خفي — يعمل بشكل موثوق على الهاتف والكمبيوتر
 *
 * يعتمد على:
 * 1. إنشاء iframe خفي في الصفحة الحالية
 * 2. تحميل رابط الطباعة فيه (مع إرسال cookie تلقائياً لنفس الأصل)
 * 3. انتظار تحميل المحتوى
 * 4. استدعاء print() على الـ iframe
 * 5. إزالة الـ iframe بعد الطباعة
 *
 * هذا النهج يتلاشى مشاكل popup blockers على الهاتف
 */
export function printViaIframe(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // إنشاء iframe خفي
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.setAttribute("aria-hidden", "true");

    let resolved = false;

    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    // مهلة 30 ثانية لمنع التعلق
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error("Print timeout"));
      }
    }, 30000);

    iframe.onload = () => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;

      try {
        // محاولة الطباعة على الـ iframe
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          // بعض المتصفحات تحتاج تأخير بسيط قبل الطباعة
          setTimeout(() => {
            try {
              iframeWindow.focus();
              iframeWindow.print();
            } catch (e) {
              console.error("Print error:", e);
            }
            // إزالة الـ iframe بعد 5 ثوانٍ (وقت كافٍ للطباعة)
            setTimeout(cleanup, 5000);
            resolve();
          }, 500);
        } else {
          cleanup();
          reject(new Error("No iframe content window"));
        }
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    iframe.onerror = () => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(new Error("Failed to load print content"));
    };

    // تعيين الرابط — cookie يُرسل تلقائياً لنفس الأصل
    iframe.src = url;
    document.body.appendChild(iframe);
  });
}
