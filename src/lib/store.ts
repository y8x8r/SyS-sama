"use client";

import { create } from "zustand";
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
  Lang,
  Theme,
  NavPage,
  Notification,
  PermissionLevel,
  UserPermission,
  Policy,
} from "./types";

/** تنسيق التواريخ من ISO إلى كائن */
function parseDate(iso: string): Date {
  return new Date(iso);
}

/** تنسيق سجل عميل من API */
function parseCustomer(c: any): Customer {
  return {
    id: c.id,
    customerNumber: c.customerNumber,
    fullName: c.fullName,
    phoneNumber: c.phoneNumber,
    passportNumber: c.passportNumber,
    nationalId: c.nationalId,
    cardNumber: c.cardNumber,
    joinedOn: c.joinedOn,
    referralSource: c.referralSource,
    isActive: c.isActive,
    createdAt: c.createdAt,
  };
}

function parseService(s: any): ServiceRecord {
  return {
    id: s.id,
    serviceType: s.serviceType,
    serviceNumber: s.serviceNumber,
    customerId: s.customerId,
    customerName: s.customerName,
    handledByEmployeeId: s.handledByEmployeeId,
    status: s.status,
    price: s.price,
    paid: s.paid,
    remaining: s.remaining,
    currency: s.currency,
    paymentMethod: s.paymentMethod,
    transferNo: s.transferNo,
    notes: s.notes,
    cancelReason: s.cancelReason,
    cancelledAt: s.cancelledAt,
    cancelledBy: s.cancelledBy,
    details: s.details,
    createdAt: s.createdAt,
  };
}

function parseInvoice(i: any): Invoice {
  return {
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    customerId: i.customerId,
    customerName: i.customerName,
    serviceId: i.serviceId,
    serviceType: i.serviceType,
    serviceNumber: i.serviceNumber,
    totalAmount: i.totalAmount,
    paidAmount: i.paidAmount,
    remainingAmount: i.remainingAmount,
    currency: i.currency,
    status: i.status,
    issuedAt: i.issuedAt,
    createdAt: i.createdAt,
  };
}

function parsePayment(p: any): Payment {
  return {
    id: p.id,
    paymentNumber: p.paymentNumber,
    customerId: p.customerId,
    customerName: p.customerName,
    invoiceId: p.invoiceId,
    invoiceNumber: p.invoiceNumber,
    serviceId: p.serviceId,
    serviceNumber: p.serviceNumber,
    amount: p.amount,
    currency: p.currency,
    method: p.method,
    transferNo: p.transferNo,
    status: p.status,
    receivedAt: p.receivedAt,
    createdAt: p.createdAt,
  };
}

function parseExpense(e: any): Expense {
  return {
    id: e.id,
    expenseNumber: e.expenseNumber,
    category: e.category,
    description: e.description,
    beneficiary: e.beneficiary,
    amount: e.amount,
    currency: e.currency,
    method: e.method,
    reference: e.reference,
    status: e.status,
    paidAt: e.paidAt,
    createdAt: e.createdAt,
    createdBy: e.createdBy,
  };
}

function parseNotification(n: any): Notification {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    moduleKey: n.moduleKey,
    relatedEntityId: n.relatedEntityId,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

function parseAuditLog(l: any): AuditLog {
  return {
    id: l.id,
    occurredAt: l.occurredAt,
    actorUsername: l.actorUsername,
    actorRole: l.actorRole,
    action: l.action,
    moduleKey: l.moduleKey,
    entityType: l.entityType,
    entityId: l.entityId,
    summary: l.summary,
  };
}

interface DashboardStats {
  activeTransactions: number;
  todayRevenueByCurrency: Record<string, number>;
  todayExpensesByCurrency: Record<string, number>;
  unpaidInvoices: number;
  statusCounts: { pending: number; processing: number; completed: number; cancelled: number };
  totalCustomers: number;
  totalServices: number;
  totalInvoices: number;
  serviceDistribution: Array<{ serviceType: string; count: number }>;
  recentCustomers: Array<{
    id: string;
    customerNumber: string;
    fullName: string;
    phoneNumber: string;
    lastServiceType: string | null;
    lastServiceNumber: string | null;
  }>;
  chartData: Array<{
    day: string;
    sar_revenue: number;
    sar_expenses: number;
    usd_revenue: number;
    usd_expenses: number;
    yer_revenue: number;
    yer_expenses: number;
  }>;
}

interface AppState {
  // Auth
  isAuthed: boolean;
  currentUser: User | null;
  authLoading: boolean;
  // i18n & theme
  lang: Lang;
  theme: Theme;
  // Navigation
  currentPage: NavPage;
  expandedSections: Record<string, boolean>;
  // Data
  customers: Customer[];
  employees: Employee[];
  users: User[];
  userPermissions: UserPermission[];
  myPermissions: UserPermission[]; // صلاحيات المستخدم الحالي الدقيقة
  hiddenServiceTypes: Set<string>; // أنواع الخدمات المخفية للمستخدم الحالي
  agents: Agent[];
  transportCompanies: TransportCompany[];
  services: ServiceRecord[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  visaExpiry: VisaExpiryRecord[];
  notifications: Notification[];
  policies: Policy[];
  dashboardStats: DashboardStats | null;
  // Loading states
  dataLoading: boolean;
  // Actions — Auth
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  changePassword: (oldPwd: string, newPwd: string) => Promise<boolean>;
  forgotPassword: (step: string, data: any) => Promise<{ ok: boolean; error?: string; resetToken?: string }>;
  // Actions — Settings
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setPage: (p: NavPage) => void;
  toggleSection: (s: string) => void;
  // Mobile sidebar
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  // Actions — Data loading
  fetchAllData: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  // Actions — Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  // Actions — Customers
  addCustomer: (c: Omit<Customer, "id" | "customerNumber" | "createdAt" | "isActive">) => Promise<Customer | null>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  // Actions — Employees
  addEmployee: (e: { fullName: string; username: string; role: User["role"]; password: string }) => Promise<{ ok: boolean; error?: string }>;
  deleteEmployee: (id: string) => Promise<void>;
  // Actions — Agents & Companies
  addAgent: (a: Omit<Agent, "id" | "createdAt" | "isActive">) => Promise<void>;
  updateAgent: (id: string, a: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  addTransportCompany: (c: Omit<TransportCompany, "id" | "createdAt" | "isActive">) => Promise<void>;
  updateTransportCompany: (id: string, c: Partial<TransportCompany>) => Promise<void>;
  deleteTransportCompany: (id: string) => Promise<void>;
  // Actions — Services
  addService: (s: Omit<ServiceRecord, "id" | "serviceNumber" | "createdAt" | "remaining">) => Promise<ServiceRecord | null>;
  updateService: (id: string, s: Partial<ServiceRecord>) => Promise<void>;
  cancelService: (id: string, reason: string) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  // Actions — Invoices
  updateInvoice: (id: string, i: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  // Actions — Expenses
  addExpense: (e: { purpose: string; paidAt: string; amount: number; currency: Expense["currency"] }) => Promise<void>;
  // Actions — Policies
  addPolicy: (p: { title: string; description: string; category?: string }) => Promise<void>;
  updatePolicy: (id: string, p: Partial<Policy>) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>()((set, get) => ({
  isAuthed: false,
  currentUser: null,
  authLoading: true,
  lang: "ar",
  theme: "light",
  currentPage: "dashboard",
  expandedSections: { services: false, management: false, finance: false, monitoring: false, settings: false },
  mobileSidebarOpen: false,
  customers: [],
  employees: [],
  users: [],
  userPermissions: [],
  myPermissions: [],
  hiddenServiceTypes: new Set<string>(),
  agents: [],
  transportCompanies: [],
  services: [],
  invoices: [],
  payments: [],
  expenses: [],
  auditLogs: [],
  visaExpiry: [],
  notifications: [],
  policies: [],
  dashboardStats: null,
  dataLoading: false,

  login: async (username, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.ok) {
        // معالجة الصلاحيات الدقيقة للمستخدم الحالي
        const perms: UserPermission[] = (data.permissions ?? []).map((p: any) => ({
          userId: p.userId,
          moduleKey: p.moduleKey,
          level: p.level as PermissionLevel,
        }));
        const hidden = new Set<string>();
        for (const p of perms) {
          if (p.moduleKey.startsWith("service:") && p.level === "hidden") {
            hidden.add(p.moduleKey.replace("service:", ""));
          }
        }
        set({
          isAuthed: true,
          currentUser: data.user,
          currentPage: "dashboard",
          myPermissions: perms,
          hiddenServiceTypes: hidden,
        });
        await get().fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    sessionStorage.removeItem("sama_current_page");
    set({
      isAuthed: false,
      currentUser: null,
      currentPage: "dashboard",
      customers: [],
      services: [],
      invoices: [],
      payments: [],
      expenses: [],
      auditLogs: [],
      notifications: [],
      dashboardStats: null,
      myPermissions: [],
      hiddenServiceTypes: new Set<string>(),
    });
  },

  checkSession: async () => {
    try {
      // credentials: "include" يضمن إرسال cookie الجلسة مع كل طلب
      const res = await fetch("/api/auth/login", { credentials: "include" });
      const data = await res.json();
      if (data.ok && data.user) {
        // استعادة الصفحة المحفوظة من sessionStorage (للحفاظ على موضع المستخدم بعد F5)
        const savedPage = typeof window !== "undefined"
          ? sessionStorage.getItem("sama_current_page") as NavPage | null
          : null;
        // معالجة الصلاحيات الدقيقة للمستخدم الحالي
        const perms: UserPermission[] = (data.permissions ?? []).map((p: any) => ({
          userId: p.userId,
          moduleKey: p.moduleKey,
          level: p.level as PermissionLevel,
        }));
        const hidden = new Set<string>();
        for (const p of perms) {
          if (p.moduleKey.startsWith("service:") && p.level === "hidden") {
            hidden.add(p.moduleKey.replace("service:", ""));
          }
        }
        set({
          isAuthed: true,
          currentUser: data.user,
          authLoading: false,
          currentPage: savedPage || "dashboard",
          myPermissions: perms,
          hiddenServiceTypes: hidden,
        });
        await get().fetchAllData();
      } else {
        set({ isAuthed: false, currentUser: null, authLoading: false });
      }
    } catch {
      set({ isAuthed: false, currentUser: null, authLoading: false });
    }
  },

  /** تحديث خفيف للصلاحيات الدقيقة فقط — بدون إعادة تحميل كل البيانات */
  refreshPermissions: async () => {
    try {
      const res = await fetch("/api/auth/login", { credentials: "include" });
      const data = await res.json();
      if (data.ok && data.user) {
        const perms: UserPermission[] = (data.permissions ?? []).map((p: any) => ({
          userId: p.userId,
          moduleKey: p.moduleKey,
          level: p.level as PermissionLevel,
        }));
        const hidden = new Set<string>();
        for (const p of perms) {
          if (p.moduleKey.startsWith("service:") && p.level === "hidden") {
            hidden.add(p.moduleKey.replace("service:", ""));
          }
        }
        set({
          isAuthed: true,
          currentUser: data.user,
          myPermissions: perms,
          hiddenServiceTypes: hidden,
        });
      }
    } catch {
      // تجاهل الأخطاء في التحديث الخفي
    }
  },

  changePassword: async (oldPwd, newPwd) => {
    try {
      const res = await fetch("/api/auth/change-password", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: oldPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      return data.ok;
    } catch {
      return false;
    }
  },

  forgotPassword: async (step, data) => {
    try {
      const res = await fetch("/api/auth/forgot-password", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, ...data }),
      });
      const result = await res.json();
      if (result.ok) {
        return { ok: true, resetToken: result.resetToken };
      }
      return { ok: false, error: result.error };
    } catch (e) {
      return { ok: false, error: "server_error" };
    }
  },

  setLang: (l) => set({ lang: l }),
  setTheme: (t) => set({ theme: t }),
  toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
  setPage: (p) => set({ currentPage: p, mobileSidebarOpen: false }),
  toggleSection: (s) =>
    set((st) => ({
      expandedSections: { ...st.expandedSections, [s]: !st.expandedSections[s] },
    })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  fetchAllData: async () => {
    set({ dataLoading: true });
    try {
      const [customersRes, servicesRes, invoicesRes, paymentsRes, expensesRes, employeesRes, agentsRes, companiesRes, auditRes, notifRes, policiesRes, statsRes] = await Promise.all([
        fetch("/api/customers", { credentials: "include" }),
        fetch("/api/services", { credentials: "include" }),
        fetch("/api/invoices", { credentials: "include" }),
        fetch("/api/payments", { credentials: "include" }),
        fetch("/api/expenses", { credentials: "include" }),
        fetch("/api/employees", { credentials: "include" }),
        fetch("/api/agents", { credentials: "include" }),
        fetch("/api/companies", { credentials: "include" }),
        fetch("/api/audit", { credentials: "include" }),
        fetch("/api/notifications", { credentials: "include" }),
        fetch("/api/policies", { credentials: "include" }),
        fetch("/api/stats", { credentials: "include" }),
      ]);

      const [customers, services, invoices, payments, expenses, employees, agents, companies, audit, notif, policies, stats] = await Promise.all([
        customersRes.json(),
        servicesRes.json(),
        invoicesRes.json(),
        paymentsRes.json(),
        expensesRes.json(),
        employeesRes.json(),
        agentsRes.json(),
        companiesRes.json(),
        auditRes.json(),
        notifRes.json(),
        policiesRes.json(),
        statsRes.json(),
      ]);

      // حساب تأشيرات قاربت الانتهاء (85 يوم من تاريخ الدخول للعمرة العادية)
      const visaExpiry: VisaExpiryRecord[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const s of (services.services || []) as ServiceRecord[]) {
        if (s.serviceType === "umrah_regular" && s.details?.entryDate) {
          const entry = new Date(s.details.entryDate as string);
          const expiry = new Date(entry);
          expiry.setDate(expiry.getDate() + 85);
          const diff = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diff <= 30) {
            const status = diff < 0 ? "expired" : diff <= 7 ? "urgent" : "near";
            const customer = (customers.customers || []).find((c: Customer) => c.id === s.customerId);
            visaExpiry.push({
              id: `ve_${s.id}`,
              serviceId: s.id,
              serviceNumber: s.serviceNumber,
              serviceType: s.serviceType,
              customerId: s.customerId,
              customerName: s.customerName,
              phone: customer?.phoneNumber,
              entryDate: s.details.entryDate as string,
              expiryDate: expiry.toISOString().split("T")[0],
              daysRemaining: diff,
              visaKind: "عمرة عادية",
              status,
            });
          }
        }
      }
      visaExpiry.sort((a, b) => a.daysRemaining - b.daysRemaining);

      set({
        customers: (customers.customers || []).map(parseCustomer),
        services: (services.services || []).map(parseService),
        invoices: (invoices.invoices || []).map(parseInvoice),
        payments: (payments.payments || []).map(parsePayment),
        expenses: (expenses.expenses || []).map(parseExpense),
        employees: (employees.employees || []),
        users: (employees.users || []),
        agents: (agents.agents || []),
        transportCompanies: (companies.companies || []),
        auditLogs: (audit.auditLogs || []).map(parseAuditLog),
        notifications: (notif.notifications || []).map(parseNotification),
        policies: (policies.policies || []),
        dashboardStats: stats.stats ?? null,
        visaExpiry,
        dataLoading: false,
      });
    } catch (e) {
      console.error("Fetch all data error:", e);
      set({ dataLoading: false });
    }
  },

  fetchDashboardStats: async () => {
    try {
      const res = await fetch("/api/stats", { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        set({ dashboardStats: data.stats });
      }
    } catch {}
  },

  markNotificationRead: async (id) => {
    await fetch("/api/notifications", { credentials: "include", 
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
  },

  markAllNotificationsRead: async () => {
    await fetch("/api/notifications", { credentials: "include", 
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  },

  addCustomer: async (c) => {
    try {
      const res = await fetch("/api/customers", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const data = await res.json();
      if (data.ok) {
        const newC = parseCustomer(data.customer);
        set((s) => ({ customers: [newC, ...s.customers] }));
        return newC;
      }
      return null;
    } catch {
      return null;
    }
  },

  updateCustomer: async (id, patch) => {
    try {
      const res = await fetch(`/api/customers/${id}`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok) {
        const updated = parseCustomer(data.customer);
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? updated : c)),
        }));
      }
    } catch {}
  },

  deleteCustomer: async (id) => {
    try {
      await fetch(`/api/customers/${id}`, { credentials: "include",  method: "DELETE" });
      set((s) => ({
        customers: s.customers.filter((c) => c.id !== id),
      }));
    } catch {}
  },

  addEmployee: async (e) => {
    try {
      const res = await fetch("/api/employees", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e),
      });
      const data = await res.json();
      if (data.ok) {
        // تحديث محلي مباشر بدلاً من إعادة جلب القائمة كاملة (توفير طلب API)
        if (data.employee) {
          set((st) => ({ employees: [data.employee, ...st.employees] }));
        }
        if (data.user) {
          set((st) => ({ users: [data.user, ...st.users] }));
        }
        return { ok: true };
      }
      return { ok: false, error: data.error ?? "create_failed", message: data.message };
    } catch (err) {
      return { ok: false, error: "server_error" };
    }
  },

  deleteEmployee: async (id) => {
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        // إزالة محلية + إعادة جلب الموظفين
        set((s) => ({
          employees: s.employees.filter((e) => e.id !== id),
        }));
        const empRes = await fetch("/api/employees", { credentials: "include" });
        const empData = await empRes.json();
        if (empData.ok) {
          set({ employees: empData.employees, users: empData.users });
        }
      }
    } catch {}
  },

  addAgent: async (a) => {
    try {
      const res = await fetch("/api/agents", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      const data = await res.json();
      if (data.ok) {
        const newA: Agent = {
          id: data.agent.id,
          officeName: data.agent.officeName,
          agentNumber: data.agent.agentNumber,
          serviceType: data.agent.serviceType,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ agents: [newA, ...s.agents] }));
      }
    } catch {}
  },

  updateAgent: async (id, patch) => {
    try {
      const res = await fetch(`/api/agents/${id}`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok) {
        set((s) => ({
          agents: s.agents.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          ),
        }));
      }
    } catch {}
  },

  deleteAgent: async (id) => {
    try {
      await fetch(`/api/agents/${id}`, { credentials: "include",  method: "DELETE" });
      set((s) => ({ agents: s.agents.filter((a) => a.id !== id) }));
    } catch {}
  },

  addTransportCompany: async (c) => {
    try {
      const res = await fetch("/api/companies", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const data = await res.json();
      if (data.ok) {
        const newC: TransportCompany = {
          id: data.company.id,
          companyName: data.company.companyName,
          companyNumber: data.company.companyNumber,
          address: data.company.address,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ transportCompanies: [newC, ...s.transportCompanies] }));
      }
    } catch {}
  },

  updateTransportCompany: async (id, patch) => {
    try {
      const res = await fetch(`/api/companies/${id}`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok) {
        set((s) => ({
          transportCompanies: s.transportCompanies.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        }));
      }
    } catch {}
  },

  deleteTransportCompany: async (id) => {
    try {
      await fetch(`/api/companies/${id}`, { credentials: "include",  method: "DELETE" });
      set((s) => ({ transportCompanies: s.transportCompanies.filter((c) => c.id !== id) }));
    } catch {}
  },

  addService: async (s) => {
    try {
      const res = await fetch("/api/services", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (data.ok) {
        const newS = parseService(data.service);
        set((st) => ({ services: [newS, ...st.services] }));
        // تحديث الإحصائيات فقط (1 طلب بدلاً من 12)
        await get().fetchDashboardStats();
        return newS;
      }
      return null;
    } catch {
      return null;
    }
  },

  updateService: async (id, patch) => {
    try {
      const res = await fetch(`/api/services/${id}`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok) {
        const updated = parseService(data.service);
        set((s) => ({
          services: s.services.map((srv) => (srv.id === id ? updated : srv)),
        }));
        // تحديث الإحصائيات فقط (1 طلب بدلاً من 12)
        await get().fetchDashboardStats();
      }
    } catch {}
  },

  cancelService: async (id, reason) => {
    try {
      const res = await fetch(`/api/services/${id}`, { credentials: "include", 
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: reason }),
      });
      const data = await res.json();
      if (data.ok) {
        // تحديث محلي بدلاً من fetchAllData (12 طلبات)
        if (data.service) {
          const updated = parseService(data.service);
          set((s) => ({ services: s.services.map((srv) => srv.id === id ? updated : srv) }));
        }
        await get().fetchDashboardStats();
      }
    } catch {}
  },

  deleteService: async (id) => {
    try {
      const res = await fetch(`/api/services/${id}?hardDelete=true`, { credentials: "include", 
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        // إزالة محلية بدلاً من fetchAllData
        set((s) => ({ services: s.services.filter((srv) => srv.id !== id) }));
        await get().fetchDashboardStats();
      }
    } catch {}
  },

  updateInvoice: async (id, patch) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.invoice) {
          const updated = parseInvoice(data.invoice);
          set((s) => ({ invoices: s.invoices.map((inv) => inv.id === id ? updated : inv) }));
        }
        await get().fetchDashboardStats();
      }
    } catch {}
  },

  deleteInvoice: async (id) => {
    try {
      await fetch(`/api/invoices/${id}`, { credentials: "include",  method: "DELETE" });
      set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) }));
    } catch {}
  },

  addExpense: async (e) => {
    try {
      const res = await fetch("/api/expenses", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e),
      });
      const data = await res.json();
      if (data.ok) {
        const newE = parseExpense(data.expense);
        set((s) => ({ expenses: [newE, ...s.expenses] }));
        await get().fetchDashboardStats();
      }
    } catch {}
  },

  addPolicy: async (p) => {
    try {
      const res = await fetch("/api/policies", { credentials: "include", 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (data.ok) {
        set((s) => ({ policies: [data.policy, ...s.policies] }));
      }
    } catch {}
  },

  updatePolicy: async (id, patch) => {
    try {
      const res = await fetch(`/api/policies/${id}`, { credentials: "include", 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.ok) {
        set((s) => ({
          policies: s.policies.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      }
    } catch {}
  },

  deletePolicy: async (id) => {
    try {
      await fetch(`/api/policies/${id}`, { credentials: "include",  method: "DELETE" });
      set((s) => ({ policies: s.policies.filter((p) => p.id !== id) }));
    } catch {}
  },
}));

// مزامنة الثيم واللغة مع localStorage (للتفضيلات فقط، وليس للبيانات)
// حفظ الصفحة الحالية في sessionStorage لاستعادتها عند التحديث (F5)
if (typeof window !== "undefined") {
  const savedLang = localStorage.getItem("sama_lang") as Lang | null;
  const savedTheme = localStorage.getItem("sama_theme") as Theme | null;
  if (savedLang) useAppStore.setState({ lang: savedLang });
  if (savedTheme) useAppStore.setState({ theme: savedTheme });

  // استعادة الصفحة الحالية من sessionStorage (للحفاظ على موضع المستخدم بعد F5)
  const savedPage = sessionStorage.getItem("sama_current_page") as NavPage | null;
  if (savedPage) useAppStore.setState({ currentPage: savedPage });

  // حفظ التفضيلات عند التغيير
  useAppStore.subscribe((state) => {
    if (state.lang) localStorage.setItem("sama_lang", state.lang);
    if (state.theme) localStorage.setItem("sama_theme", state.theme);
    if (state.currentPage) sessionStorage.setItem("sama_current_page", state.currentPage);
  });

  // ملاحظة: انتهاء الجلسة بالخمول يُدار في dashboard-layout.tsx (30 دقيقة)
  // لا حاجة لمؤقت إضافي هنا — يمنع الازدواجية
}
