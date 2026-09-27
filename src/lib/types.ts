/**
 * أنواع البيانات الأساسية لنظام سما اليمن للسفريات والسياحة
 */

export type Role = "manager" | "accountant" | "booking_officer";
export type Lang = "ar" | "en";
export type Theme = "light" | "dark";

export type Currency = "SAR" | "YER" | "USD";

export type ServiceType =
  | "hajj_program"
  | "hajj_regular"
  | "umrah_program"
  | "umrah_regular"
  | "passport_attendance"
  | "passport_without"
  | "flight_ticket"
  | "intl_bus"
  | "intl_car"
  | "local_bus"
  | "local_car"
  | "visa_medical"
  | "visa_tourist"
  | "visa_work"
  | "visa_visit"
  | "shipping"
  | "customs"
  | "security_approval"
  | "medical_report"
  | "travel_insurance"
  | "hotel_booking"
  | "professional_exam"
  | "visa_authorization"
  | "transit_visa";

export type ServiceStatus =
  | "pending"
  | "processing"
  | "completed"
  | "cancelled"
  | "delivered";

export type PaymentMethod = "cash" | "transfer" | "wallet";

export type VisaStatus =
  | "deported"
  | "in_embassy"
  | "issued"
  | "sent_customer";

export type PassportStatus =
  | "in_passport_office"
  | "issue"
  | "received"
  | "in_office"
  | "delivered";

export interface Customer {
  id: string;
  customerNumber: string;
  fullName: string;
  phoneNumber: string;
  passportNumber?: string;
  nationalId?: string;
  joinedOn: string;
  referralSource?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  hiredOn: string;
  jobTitle: string;
  isActive: boolean;
  linkedUserId?: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  /** كلمة المرور مجزّأة — لا تُعرض في أي واجهة */
  passwordHash: string;
  role: Role;
  employeeId?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

/** مستوى الصلاحية الدقيقة لكل وحدة — يحددها المدير العام فقط */
export type PermissionLevel = "read" | "write" | "update" | "delete" | "book" | "full" | "hidden";

/** صلاحيات موظف على وحدة محددة */
export interface UserPermission {
  userId: string;
  moduleKey: string;
  level: PermissionLevel;
}

export interface Agent {
  id: string;
  officeName: string;
  agentNumber: string;
  serviceType: string;
  isActive: boolean;
  createdAt: string;
}

export interface TransportCompany {
  id: string;
  companyName: string;
  companyNumber: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceRecord {
  id: string;
  serviceType: ServiceType;
  serviceNumber: string;
  customerId: string;
  customerName: string;
  handledByEmployeeId?: string;
  status: ServiceStatus;
  price: number;
  paid: number;
  remaining: number;
  currency: Currency;
  paymentMethod?: PaymentMethod;
  transferNo?: string;
  notes?: string;
  // حقول الإلغاء
  cancelReason?: string;
  cancelledAt?: string | null;
  cancelledBy?: string;
  createdAt: string;
  // Dynamic service-specific fields
  details: Record<string, string | number | undefined>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceType: ServiceType;
  serviceNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: Currency;
  status: "draft" | "issued" | "paid" | "partial" | "cancelled";
  issuedAt: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  transferNo?: string;
  status: "pending" | "approved" | "reversed";
  receivedAt: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  description: string;
  beneficiary: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  reference?: string;
  status: "pending" | "approved";
  paidAt: string;
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  occurredAt: string;
  actorUsername: string;
  actorRole: Role;
  action: string;
  moduleKey: string;
  entityType: string;
  entityId?: string;
  summary: string;
}

export interface VisaExpiryRecord {
  id: string;
  serviceId: string;
  serviceNumber: string;
  serviceType: ServiceType;
  customerId: string;
  customerName: string;
  phone?: string;
  entryDate?: string;
  issueDate?: string;
  expiryDate: string;
  daysRemaining: number;
  visaKind: string;
  status: "near" | "urgent" | "expired";
}

/** إشعار نظامي — يُنشأ تلقائياً عند الأحداث المهمة */
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "success" | "danger";
  moduleKey?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

/** سياسة نظامية — يديرها المدير العام فقط */
export interface Policy {
  id: string;
  title: string;
  description: string;
  category: "general" | "cancellation" | "refund" | "payment" | "operational";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NavSection =
  | "dashboard"
  | "services"
  | "management"
  | "finance"
  | "monitoring"
  | "settings";

export type NavPage =
  // dashboard
  | "dashboard"
  // services (sub-pages — one per service type)
  | "hajj_program"
  | "hajj_regular"
  | "umrah_program"
  | "umrah_regular"
  | "passport_attendance"
  | "passport_without"
  | "flight_ticket"
  | "intl_bus"
  | "intl_car"
  | "local_bus"
  | "local_car"
  | "visa_medical"
  | "visa_tourist"
  | "visa_work"
  | "visa_visit"
  | "shipping"
  | "customs"
  | "security_approval"
  | "medical_report"
  | "travel_insurance"
  | "hotel_booking"
  | "professional_exam"
  | "visa_authorization"
  | "transit_visa"
  // management
  | "customers"
  | "employees"
  | "agents_companies"
  // finance
  | "revenues_expenses"
  | "payments"
  | "invoices"
  // monitoring
  | "statistics"
  | "audit_log"
  | "visa_expiry"
  // settings
  | "users_permissions"
  | "system_settings";
