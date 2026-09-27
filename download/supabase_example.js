/**
 * مثال JavaScript — ربط نظام سما اليمن بـ Supabase
 *
 * هذا الملف يوضح كيفية:
 *   1. تهيئة عميل Supabase
 *   2. تسجيل الدخول والتحقق من الجلسة
 *   3. إضافة عميل جديد
 *   4. إنشاء معاملة خدمة + فاتورة + دفعة (عملية ذرية)
 *   5. جلب البيانات والبحث
 *   6. طباعة فاتورة
 *
 * طريقة الاستخدام:
 *   1. ثبّت المكتبة: npm install @supabase/supabase-js
 *   2. أنشئ ملف .env في جذر المشروع وأضف:
 *        NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
 *        NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
 *   3. استدعِ الدوال من أي مكون في النظام
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// 1. تهيئة عميل Supabase
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// عميل واحد مشترك لكل التطبيق
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { "x-application-name": "sama-yemen-travel" },
  },
});

// ============================================================================
// 2. المصادقة (Authentication)
// ============================================================================

/** تسجيل الدخول باستخدام اسم المستخدم وكلمة المرور */
export async function login(username: string, password: string) {
  // ملاحظة: Supabase Auth يستخدم البريد الإلكتروني افتراضياً
  // لتسجيل الدخول باسم المستخدم، نستخدم استعلام مباشر على جدول users
  // ثم نتحقق من كلمة المرور (يجب تجزئتها بـ bcrypt في الإنتاج)

  const { data: user, error } = await supabase
    .from("users")
    .select(`
      id,
      username,
      password_hash,
      role,
      employee_id,
      is_active,
      must_change_password,
      last_login_at,
      employees (
        id,
        employee_number,
        full_name,
        job_title
      )
    `)
    .eq("username", username)
    .eq("is_active", true)
    .single();

  if (error || !user) {
    return { ok: false, error: "invalid_credentials" };
  }

  // التحقق من كلمة المرور (في الإنتاج: استخدم bcrypt.compare)
  if (user.password_hash !== password) {
    return { ok: false, error: "invalid_credentials" };
  }

  // تحديث آخر تسجيل دخول
  await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  // تسجيل في سجل التدقيق
  await supabase.from("audit_logs").insert({
    actor_username: user.username,
    actor_role: user.role,
    action: "تسجيل دخول",
    module_key: "auth",
    entity_type: "user",
    entity_id: user.id,
    summary: "تسجيل دخول ناجح",
  });

  // إنشاء إشعار
  await supabase.from("notifications").insert({
    title: "تسجيل دخول",
    body: `تم تسجيل دخول المستخدم ${user.username}`,
    type: "info",
    module_key: "auth",
    related_entity_id: user.id,
  });

  // إزالة كلمة المرور من البيانات المُعادة
  const { password_hash, ...userWithoutPassword } = user;
  return { ok: true, user: userWithoutPassword };
}

/** تسجيل الخروج ومسح الجلسة */
export async function logout(username: string) {
  await supabase.from("audit_logs").insert({
    actor_username: username,
    action: "تسجيل خروج",
    module_key: "auth",
    summary: "تسجيل خروج",
  });

  // مسح الجلسة المحلية
  await supabase.auth.signOut();
  return { ok: true };
}

// ============================================================================
// 3. إدارة العملاء (Customers)
// ============================================================================

/** إضافة عميل جديد — يولد رقم العميل تلقائياً */
export async function addCustomer(customer: {
  full_name: string;
  phone_number: string;
  passport_number?: string;
  card_number?: string;
  referral_source?: string;
}) {
  // توليد رقم العميل التسلسلي
  const { count } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const seq = (count ?? 0) + 1;
  const customerNumber = `CUST-${String(seq).padStart(5, "0")}`;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      customer_number: customerNumber,
      full_name: customer.full_name,
      phone_number: customer.phone_number,
      passport_number: customer.passport_number || null,
      card_number: customer.card_number || null,
      referral_source: customer.referral_source || null,
      joined_on: new Date().toISOString().split("T")[0],
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Add customer error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, customer: data };
}

/** البحث عن عميل بالاسم أو الهاتف أو الجواز */
export async function searchCustomers(query: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%,passport_number.ilike.%${query}%`)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Search customers error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, customers: data };
}

/** تعديل بيانات عميل */
export async function updateCustomer(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Update customer error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, customer: data };
}

// ============================================================================
// 4. إنشاء معاملة خدمة + فاتورة + دفعة (عملية ذرية)
// ============================================================================

/**
 * إنشاء معاملة جديدة مع فاتورة ودفعة في عملية واحدة
 *
 * @param params - تفاصيل المعاملة
 * @returns نتيجة العملية
 */
export async function createServiceTransaction(params: {
  serviceType: string;
  customerId: string;
  customerName: string;
  price: number;
  paid: number;
  currency: string;
  paymentMethod?: string;
  transferNo?: string;
  status?: string;
  notes?: string;
  details?: Record<string, any>;
  employeeId?: string;
}) {
  const {
    serviceType,
    customerId,
    customerName,
    price,
    paid,
    currency,
    paymentMethod,
    transferNo,
    status,
    notes,
    details,
    employeeId,
  } = params;

  // 1. توليد رقم الخدمة
  const { count: serviceCount } = await supabase
    .from("service_records")
    .select("*", { count: "exact", head: true });
  const serviceNumber = `SRV-${new Date().getFullYear()}-${String((serviceCount ?? 0) + 1).padStart(5, "0")}`;

  // 2. إنشاء سجل الخدمة
  const { data: service, error: serviceError } = await supabase
    .from("service_records")
    .insert({
      service_type: serviceType,
      service_number: serviceNumber,
      customer_id: customerId,
      customer_name: customerName,
      handled_by_employee_id: employeeId || null,
      status: status || "pending",
      price,
      paid,
      remaining: price - paid,
      currency,
      payment_method: paymentMethod || null,
      transfer_no: transferNo || null,
      notes: notes || null,
      details: details || {},
    })
    .select()
    .single();

  if (serviceError || !service) {
    console.error("Create service error:", serviceError);
    return { ok: false, error: serviceError?.message ?? "create_failed" };
  }

  // 3. توليد رقم الفاتورة وإنشائها
  const { count: invoiceCount } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String((invoiceCount ?? 0) + 1).padStart(5, "0")}`;

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      customer_id: customerId,
      customer_name: customerName,
      service_id: service.id,
      service_type: serviceType,
      service_number: serviceNumber,
      total_amount: price,
      paid_amount: paid,
      remaining_amount: price - paid,
      currency,
      status: price - paid === 0 ? "paid" : paid > 0 ? "partial" : "issued",
    })
    .select()
    .single();

  if (invoiceError || !invoice) {
    // إذا فشل إنشاء الفاتورة، نحذف الخدمة (عكس العملية)
    await supabase.from("service_records").delete().eq("id", service.id);
    console.error("Create invoice error:", invoiceError);
    return { ok: false, error: invoiceError?.message ?? "invoice_failed" };
  }

  // 4. إنشاء سجل دفعة إذا كان هناك مبلغ مدفوع
  let payment = null;
  if (paid > 0) {
    const { count: paymentCount } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true });
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String((paymentCount ?? 0) + 1).padStart(5, "0")}`;

    const { data: payData, error: payError } = await supabase
      .from("payments")
      .insert({
        payment_number: paymentNumber,
        customer_id: customerId,
        customer_name: customerName,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
        service_id: service.id,
        service_number: serviceNumber,
        amount: paid,
        currency,
        method: paymentMethod || "cash",
        transfer_no: transferNo || null,
        status: "approved",
      })
      .select()
      .single();

    if (payError || !payData) {
      // إذا فشل إنشاء الدفعة، نحذف الفاتورة والخدمة
      await supabase.from("invoices").delete().eq("id", invoice.id);
      await supabase.from("service_records").delete().eq("id", service.id);
      console.error("Create payment error:", payError);
      return { ok: false, error: payError?.message ?? "payment_failed" };
    }
    payment = payData;

    // 5. تحديث رصيد الصندوق (credit — إضافة)
    const { data: cashBox } = await supabase
      .from("cash_boxes")
      .select("*")
      .eq("currency", currency)
      .eq("kind", "cash")
      .eq("is_active", true)
      .single();

    if (cashBox) {
      const newBalance = cashBox.balance + paid;
      await supabase.from("cash_boxes").update({ balance: newBalance }).eq("id", cashBox.id);

      // 6. تسجيل الحركة في سجل العمليات
      const { count: txCount } = await supabase
        .from("transaction_ledger")
        .select("*", { count: "exact", head: true });
      const txNumber = `TX-${new Date().getFullYear()}-${String((txCount ?? 0) + 1).padStart(5, "0")}`;

      await supabase.from("transaction_ledger").insert({
        tx_number: txNumber,
        cash_box_id: cashBox.id,
        cash_box_code: cashBox.code,
        direction: "credit",
        amount: paid,
        currency,
        reason: `تحصيل دفعة ${paymentNumber} — ${customerName}`,
        module_key: "payments",
        related_entity_type: "payment",
        related_entity_id: payment.id,
        actor_username: "system",
      });
    }
  }

  // 7. إنشاء إشعار
  await supabase.from("notifications").insert({
    title: "معاملة جديدة",
    body: `تم إنشاء معاملة ${serviceNumber} للعميل ${customerName}`,
    type: "success",
    module_key: "services",
    related_entity_id: service.id,
  });

  return { ok: true, service, invoice, payment };
}

// ============================================================================
// 5. جلب البيانات والفلاتر
// ============================================================================

/** جلب جميع الفواتير مع فلترة */
export async function getInvoices(filters?: {
  status?: string;
  customerId?: string;
  from?: string;
  to?: string;
}) {
  let query = supabase
    .from("invoices")
    .select("*")
    .order("issued_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.customerId) {
    query = query.eq("customer_id", filters.customerId);
  }
  if (filters?.from) {
    query = query.gte("issued_at", filters.from);
  }
  if (filters?.to) {
    query = query.lte("issued_at", filters.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Get invoices error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, invoices: data };
}

/** جلب جميع المدفوعات */
export async function getPayments(filters?: {
  method?: string;
  status?: string;
}) {
  let query = supabase
    .from("payments")
    .select("*")
    .order("received_at", { ascending: false });

  if (filters?.method && filters.method !== "all") {
    query = query.eq("method", filters.method);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Get payments error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, payments: data };
}

/** جلب خدمات نوع معين */
export async function getServices(serviceType: string, filters?: {
  status?: string;
  search?: string;
}) {
  let query = supabase
    .from("service_records")
    .select("*, customers!inner(customer_number, phone_number)")
    .eq("service_type", serviceType)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    query = query.or(`customer_name.ilike.%${filters.search}%,service_number.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Get services error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, services: data };
}

// ============================================================================
// 6. إضافة مصروف + خصم من الصندوق
// ============================================================================

export async function addExpense(params: {
  purpose: string;
  amount: number;
  currency: string;
  paidAt: string;
  actorUsername: string;
}) {
  const { purpose, amount, currency, paidAt, actorUsername } = params;

  // 1. توليد رقم المصروف
  const { count } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true });
  const expenseNumber = `EXP-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;

  // 2. الحصول على الصندوق الافتراضي
  const { data: cashBox } = await supabase
    .from("cash_boxes")
    .select("*")
    .eq("currency", currency)
    .eq("kind", "cash")
    .eq("is_active", true)
    .single();

  if (!cashBox) {
    return { ok: false, error: "no_cashbox_for_currency" };
  }

  // 3. إنشاء سجل المصروف
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      expense_number: expenseNumber,
      category: purpose,
      description: purpose,
      beneficiary: "—",
      amount,
      currency,
      method: "cash",
      reference: `${cashBox.code}`,
      status: "approved",
      paid_at: paidAt,
      created_by: actorUsername,
    })
    .select()
    .single();

  if (expenseError || !expense) {
    console.error("Add expense error:", expenseError);
    return { ok: false, error: expenseError?.message ?? "expense_failed" };
  }

  // 4. خصم المبلغ من الصندوق (debit)
  const newBalance = cashBox.balance - amount;
  await supabase.from("cash_boxes").update({ balance: newBalance }).eq("id", cashBox.id);

  // 5. تسجيل الحركة في سجل العمليات
  const { count: txCount } = await supabase
    .from("transaction_ledger")
    .select("*", { count: "exact", head: true });
  const txNumber = `TX-${new Date().getFullYear()}-${String((txCount ?? 0) + 1).padStart(5, "0")}`;

  await supabase.from("transaction_ledger").insert({
    tx_number: txNumber,
    cash_box_id: cashBox.id,
    cash_box_code: cashBox.code,
    direction: "debit",
    amount,
    currency,
    reason: `مصروف ${expenseNumber} — ${purpose}`,
    module_key: "expenses",
    related_entity_type: "expense",
    related_entity_id: expense.id,
    actor_username: actorUsername,
  });

  return { ok: true, expense, newBalance };
}

// ============================================================================
// 7. إحصائيات لوحة التحكم
// ============================================================================

export async function getDashboardStats() {
  const today = new Date().toISOString().split("T")[0];

  // المعاملات النشطة
  const { count: activeTransactions } = await supabase
    .from("service_records")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "processing"]);

  // الإيرادات اليوم (مفصولة حسب العملة)
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount, currency")
    .eq("status", "approved")
    .gte("received_at", today);

  const todayRevenue: Record<string, number> = { SAR: 0, USD: 0, YER: 0 };
  todayPayments?.forEach((p) => {
    todayRevenue[p.currency] = (todayRevenue[p.currency] || 0) + p.amount;
  });

  // المصروفات اليوم
  const { data: todayExpenses } = await supabase
    .from("expenses")
    .select("amount, currency")
    .eq("status", "approved")
    .gte("paid_at", today);

  const todayExpensesByCurrency: Record<string, number> = { SAR: 0, USD: 0, YER: 0 };
  todayExpenses?.forEach((e) => {
    todayExpensesByCurrency[e.currency] = (todayExpensesByCurrency[e.currency] || 0) + e.amount;
  });

  // الفواتير غير المسددة
  const { count: unpaidInvoices } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .gt("remaining_amount", 0)
    .in("status", ["issued", "partial"]);

  // أرصدة الصناديق
  const { data: cashBoxes } = await supabase
    .from("cash_boxes")
    .select("*")
    .eq("is_active", true);

  return {
    activeTransactions: activeTransactions ?? 0,
    todayRevenue,
    todayExpensesByCurrency,
    unpaidInvoices: unpaidInvoices ?? 0,
    cashBoxes: cashBoxes ?? [],
  };
}

// ============================================================================
// 8. تأشيرات قاربت الانتهاء (View)
// ============================================================================

export async function getVisaExpiry() {
  const { data, error } = await supabase
    .rpc("get_visa_expiry"); // أو استخدم: .from("visa_expiry_view").select("*")

  // طريقة بديلة باستخدام الـ View
  if (error) {
    const { data: viewData, error: viewError } = await supabase
      .from("visa_expiry_view")
      .select("*")
      .order("days_remaining", { ascending: true });

    if (viewError) {
      console.error("Get visa expiry error:", viewError);
      return { ok: false, error: viewError.message };
    }

    return { ok: true, visas: viewData };
  }

  return { ok: true, visas: data };
}

// ============================================================================
// 9. الإشعارات
// ============================================================================

export async function getNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Get notifications error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, notifications: data };
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  return { ok: !error, error: error?.message };
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  return { ok: !error, error: error?.message };
}

// ============================================================================
// 10. مثال استخدام كامل
// ============================================================================

/**
 * مثال: إضافة عميل ثم إنشاء معاملة عمرة عادية له
 */
export async function exampleCreateCustomerAndService() {
  // 1. إضافة عميل
  const customerResult = await addCustomer({
    full_name: "أحمد محمد الصبري",
    phone_number: "+967777112233",
    passport_number: "P5236987",
    card_number: "98765432",
    referral_source: "توصية صديق",
  });

  if (!customerResult.ok) {
    console.error("Failed to add customer:", customerResult.error);
    return;
  }

  const customer = customerResult.customer!;
  console.log("✓ تم إضافة العميل:", customer.customer_number);

  // 2. إنشاء معاملة عمرة عادية
  const serviceResult = await createServiceTransaction({
    serviceType: "umrah_regular",
    customerId: customer.id,
    customerName: customer.full_name,
    price: 3500,
    paid: 3500,
    currency: "SAR",
    paymentMethod: "transfer",
    transferNo: "TRF-998123",
    status: "completed",
    details: {
      agency: "وكالة البدر للحج والعمرة",
      entryDate: "2026-06-15",
      guarantorName: "سالم أحمد",
      guarantorNo: "+967777111222",
      guarantorAddress: "عدن — كريتر",
      guaranteeType: "commercial",
      visaStatus: "sent_customer",
    },
    notes: "تم الاستلام بالكامل",
  });

  if (!serviceResult.ok) {
    console.error("Failed to create service:", serviceResult.error);
    return;
  }

  console.log("✓ تم إنشاء المعاملة:", serviceResult.service.service_number);
  console.log("✓ تم إنشاء الفاتورة:", serviceResult.invoice.invoice_number);
  if (serviceResult.payment) {
    console.log("✓ تم تسجيل الدفعة:", serviceResult.payment.payment_number);
  }
}

/**
 * مثال: إضافة مصروف وخصمه من الصندوق
 */
export async function exampleAddExpense() {
  const result = await addExpense({
    purpose: "إيجار المكتب شهري",
    amount: 1500,
    currency: "SAR",
    paidAt: new Date().toISOString(),
    actorUsername: "user1",
  });

  if (!result.ok) {
    console.error("Failed to add expense:", result.error);
    return;
  }

  console.log("✓ تم إضافة المصروف:", result.expense.expense_number);
  console.log("✓ رصيد الصندوق الجديد:", result.newBalance);
}
