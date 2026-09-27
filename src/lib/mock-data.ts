import type {
  Customer,
  Employee,
  User,
  Agent,
  TransportCompany,
  ServiceRecord,
  Invoice,
  Payment,
  Expense,
  AuditLog,
  VisaExpiryRecord,
  ServiceType,
  Notification,
} from "./types";

/**
 * رقم فاتورة تسلسلي */
export function genInvoiceNo(seq: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}
export function genServiceNo(seq: number): string {
  const year = new Date().getFullYear();
  return `SRV-${year}-${String(seq).padStart(5, "0")}`;
}
export function genCustomerNo(seq: number): string {
  return `CUST-${String(seq).padStart(5, "0")}`;
}
export function genEmployeeNo(seq: number): string {
  return `EMP-${String(seq).padStart(4, "0")}`;
}
export function genPaymentNo(seq: number): string {
  const year = new Date().getFullYear();
  return `PAY-${year}-${String(seq).padStart(5, "0")}`;
}
export function genExpenseNo(seq: number): string {
  const year = new Date().getFullYear();
  return `EXP-${year}-${String(seq).padStart(5, "0")}`;
}

/**
 * لا توجد بيانات تجريبية في النظام.
 * تم حذف جميع العملاء والخدمات والفواتير والمدفوعات والمصروفات التجريبية نهائياً.
 * الحساب الأولي الوحيد هو حساب المدير العام الذي يُنشأ عند التهيئة الأولى للنظام.
 * لا تُعرض بيانات هذا الحساب في أي واجهة أو سجل أو صفحة مساعدة.
 */

export const customers: Customer[] = [];
export const employees: Employee[] = [];
export const agents: Agent[] = [];
export const transportCompanies: TransportCompany[] = [];
export const services: ServiceRecord[] = [];
export const invoices: Invoice[] = [];
export const payments: Payment[] = [];
export const expenses: Expense[] = [];
export const auditLogs: AuditLog[] = [];
export const visaExpiryRecords: VisaExpiryRecord[] = [];
export const notifications: Notification[] = [];

/**
 * الحساب الأولي الوحيد — يُنشأ عند التهيئة الأولى على مستوى الخادم.
 * كلمة المرور مجزّأة عبر تجزئة بسيطة لأغراض العرض التوضيحي (في الإنتاج يستخدم Argon2/bcrypt).
 * لا تُعرض بيانات هذا الحساب في الواجهة أو السجلات أو صفحات المساعدة.
 *
 * اسم المستخدم: user1
 * كلمة المرور الأولية: sama1
 * الدور: مدير عام (manager)
 */
const SAMA_INITIAL_HASH = "sama1"; // في الإنتاج: Argon2 hash — لا يُخزَّن كنص

export const initialUser: User = {
  id: "u_root",
  username: "user1",
  passwordHash: SAMA_INITIAL_HASH,
  role: "manager",
  isActive: true,
  mustChangePassword: false,
  createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
};

export const users: User[] = [initialUser];

/** حساب الأيام المتبقية لتأشيرة العمرة (85 يوماً من تاريخ الدخول) */
export function computeVisaExpiry(services: ServiceRecord[]): VisaExpiryRecord[] {
  const out: VisaExpiryRecord[] = [];
  for (const s of services) {
    if (s.serviceType === "umrah_regular" && s.details.entryDate) {
      const entry = new Date(s.details.entryDate as string);
      const expiry = new Date(entry);
      expiry.setDate(expiry.getDate() + 85);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const status = diff < 0 ? "expired" : diff <= 7 ? "urgent" : diff <= 30 ? "near" : "near";
      if (diff <= 30) {
        out.push({
          id: `ve_${s.id}`,
          serviceId: s.id,
          serviceNumber: s.serviceNumber,
          serviceType: s.serviceType,
          customerId: s.customerId,
          customerName: s.customerName,
          phone: undefined, // يُملأ من سجل العميل في وقت العرض
          entryDate: s.details.entryDate as string,
          expiryDate: expiry.toISOString().split("T")[0],
          daysRemaining: diff,
          visaKind: "عمرة عادية",
          status,
        });
      }
    }
  }
  return out.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/** Service type → label key map */
export const serviceTypeLabels: Record<ServiceType, string> = {
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
};

/** قائمة أنواع الخدمات الـ 21 — تُستخدم في شاشة «تحديد نوع الخدمة» */
export const allServiceTypes: ServiceType[] = [
  "hajj_program",
  "hajj_regular",
  "umrah_program",
  "umrah_regular",
  "passport_attendance",
  "passport_without",
  "flight_ticket",
  "intl_bus",
  "intl_car",
  "local_bus",
  "local_car",
  "visa_medical",
  "visa_tourist",
  "visa_work",
  "visa_visit",
  "shipping",
  "customs",
  "security_approval",
  "medical_report",
  "travel_insurance",
  "hotel_booking",
  "professional_exam",
  "visa_authorization",
  "transit_visa",
];
