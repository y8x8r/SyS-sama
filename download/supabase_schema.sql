-- ============================================================================
-- سما اليمن للسفريات والسياحة — سكريبت قاعدة بيانات PostgreSQL لـ Supabase
-- Single-Tenant: قاعدة بيانات مستقلة وخاصة بالمكتب
-- 
-- طريقة التنفيذ:
--   1. افتح Supabase Dashboard → SQL Editor
--   2. انسخ هذا الملف بالكامل والصقه
--   3. اضغط Run
-- ============================================================================

-- تفعيل الإضافات اللازمة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. الهوية والصلاحيات
-- ============================================================================

-- جدول الموظفين
CREATE TABLE IF NOT EXISTS employees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_number VARCHAR(20)  NOT NULL UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    hired_on       DATE         NOT NULL,
    job_title       VARCHAR(100) NOT NULL DEFAULT 'موظف',
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_active ON employees(is_active);

-- جدول المستخدمين (حسابات الدخول)
CREATE TABLE IF NOT EXISTS users (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username             VARCHAR(50)  NOT NULL UNIQUE,
    password_hash        VARCHAR(500) NOT NULL,
    role                 VARCHAR(20)  NOT NULL DEFAULT 'booking_officer', -- manager | accountant | booking_officer
    employee_id          UUID UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
    is_active            BOOLEAN      NOT NULL DEFAULT true,
    must_change_password BOOLEAN      NOT NULL DEFAULT false,
    security_q1_hash     VARCHAR(500), -- مجزّأ: متى تم افتتاح مكتب سما اليمن؟
    security_q2_hash     VARCHAR(500), -- مجزّأ: ما هو إيميلك الشخصي؟
    last_login_at       TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);

-- جدول صلاحيات المستخدمين الدقيقة
CREATE TABLE IF NOT EXISTS user_permissions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_key VARCHAR(50) NOT NULL, -- services | customers | finance | monitoring | reports
    level      VARCHAR(20) NOT NULL DEFAULT 'read', -- read | write | update | book | full
    UNIQUE(user_id, module_key)
);

CREATE INDEX idx_user_permissions_user ON user_permissions(user_id);

-- ============================================================================
-- 2. البيانات المرجعية
-- ============================================================================

-- جدول العملاء
CREATE TABLE IF NOT EXISTS customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_number VARCHAR(20)  NOT NULL UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(50)  NOT NULL,
    passport_number VARCHAR(50),
    national_id     VARCHAR(50),
    card_number     VARCHAR(50),
    joined_on       DATE         NOT NULL DEFAULT CURRENT_DATE,
    referral_source VARCHAR(200),
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_name ON customers(full_name);
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_passport ON customers(passport_number);

-- جدول وكلاء السفر
CREATE TABLE IF NOT EXISTS agents (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_name  VARCHAR(255) NOT NULL,
    agent_number VARCHAR(50),
    service_type VARCHAR(100),
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- جدول شركات النقل
CREATE TABLE IF NOT EXISTS transport_companies (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name   VARCHAR(255) NOT NULL,
    company_number VARCHAR(50),
    address        TEXT,
    is_active      BOOLEAN      NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. المعاملات والخدمات (21 نوع خدمة)
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_records (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type          VARCHAR(50)  NOT NULL, -- hajj_program | umrah_regular | flight_ticket | ...
    service_number        VARCHAR(30)  NOT NULL UNIQUE,
    customer_id           UUID         NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name         VARCHAR(255) NOT NULL,
    handled_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    status                VARCHAR(20)  NOT NULL DEFAULT 'pending', -- pending | processing | completed | cancelled | delivered
    price                 NUMERIC(14,2) NOT NULL DEFAULT 0,
    paid                  NUMERIC(14,2) NOT NULL DEFAULT 0,
    remaining             NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency              VARCHAR(3)   NOT NULL DEFAULT 'SAR', -- SAR | YER | USD
    payment_method        VARCHAR(20), -- cash | transfer | wallet
    transfer_no           VARCHAR(100),
    notes                 TEXT,
    -- حقول الإلغاء
    cancel_reason         TEXT,
    cancelled_at          TIMESTAMPTZ,
    cancelled_by          VARCHAR(50),
    -- تفاصيل الخدمة الخاصة بكل نوع (JSON)
    details               JSONB        NOT NULL DEFAULT '{}',
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_type ON service_records(service_type);
CREATE INDEX idx_services_customer ON service_records(customer_id);
CREATE INDEX idx_services_status ON service_records(status);
CREATE INDEX idx_services_created ON service_records(created_at);
-- فهرس GIN للبحث داخل حقل JSON للتفاصيل
CREATE INDEX idx_services_details ON service_records USING GIN (details);

-- ============================================================================
-- 4. المالية
-- ============================================================================

-- جدول الفواتير
CREATE TABLE IF NOT EXISTS invoices (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number   VARCHAR(30)   NOT NULL UNIQUE,
    customer_id      UUID          NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name    VARCHAR(255)  NOT NULL,
    service_id       UUID          NOT NULL UNIQUE REFERENCES service_records(id) ON DELETE CASCADE,
    service_type     VARCHAR(50)   NOT NULL,
    service_number   VARCHAR(30)   NOT NULL,
    total_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
    paid_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency         VARCHAR(3)    NOT NULL DEFAULT 'SAR',
    status           VARCHAR(20)   NOT NULL DEFAULT 'issued', -- draft | issued | paid | partial | cancelled
    issued_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issued ON invoices(issued_at);

-- جدول المدفوعات (سندات القبض)
CREATE TABLE IF NOT EXISTS payments (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(30)   NOT NULL UNIQUE,
    customer_id    UUID          NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name  VARCHAR(255)  NOT NULL,
    invoice_id     UUID REFERENCES invoices(id) ON DELETE SET NULL,
    invoice_number VARCHAR(30),
    service_id     UUID REFERENCES service_records(id) ON DELETE SET NULL,
    service_number VARCHAR(30),
    amount         NUMERIC(14,2) NOT NULL,
    currency       VARCHAR(3)    NOT NULL DEFAULT 'SAR',
    method         VARCHAR(20)   NOT NULL DEFAULT 'cash', -- cash | transfer | wallet
    transfer_no    VARCHAR(100),
    status         VARCHAR(20)   NOT NULL DEFAULT 'approved', -- pending | approved | reversed
    received_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_received ON payments(received_at);

-- جدول المصروفات
CREATE TABLE IF NOT EXISTS expenses (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(30)   NOT NULL UNIQUE,
    category       VARCHAR(255)  NOT NULL, -- غرض الصرف
    description    TEXT,
    beneficiary    VARCHAR(255)  NOT NULL DEFAULT '—',
    amount         NUMERIC(14,2) NOT NULL,
    currency       VARCHAR(3)    NOT NULL DEFAULT 'SAR',
    method         VARCHAR(20)   NOT NULL DEFAULT 'cash',
    reference      VARCHAR(200),
    status         VARCHAR(20)   NOT NULL DEFAULT 'approved', -- pending | approved | cancelled
    paid_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by     VARCHAR(50)   NOT NULL
);

CREATE INDEX idx_expenses_paid ON expenses(paid_at);
CREATE INDEX idx_expenses_status ON expenses(status);

-- ============================================================================
-- 5. الصندوق/الحساب المحاسبي (Double-Entry Ledger)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cash_boxes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code       VARCHAR(50)   NOT NULL UNIQUE, -- CASH_SAR | BANK_USD | ...
    name       VARCHAR(200)  NOT NULL,
    kind       VARCHAR(20)   NOT NULL DEFAULT 'cash', -- cash | bank
    currency   VARCHAR(3)    NOT NULL DEFAULT 'SAR',
    balance    NUMERIC(14,2) NOT NULL DEFAULT 0,
    is_active  BOOLEAN       NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_cashboxes_currency ON cash_boxes(currency);
CREATE INDEX idx_cashboxes_active ON cash_boxes(is_active);

-- سجل العمليات المالية
CREATE TABLE IF NOT EXISTS transaction_ledger (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_number           VARCHAR(30)   NOT NULL UNIQUE, -- TX-2026-00001
    cash_box_id         UUID          NOT NULL REFERENCES cash_boxes(id) ON DELETE RESTRICT,
    cash_box_code       VARCHAR(50)   NOT NULL,
    direction           VARCHAR(10)   NOT NULL, -- debit (خصم/صرف) | credit (إضافة/تحصيل)
    amount              NUMERIC(14,2) NOT NULL,
    currency            VARCHAR(3)    NOT NULL DEFAULT 'SAR',
    reason              TEXT          NOT NULL,
    module_key          VARCHAR(50)   NOT NULL, -- expenses | payments | services | manual
    related_entity_type VARCHAR(50), -- expense | payment | service | invoice
    related_entity_id   UUID,
    actor_username      VARCHAR(50)   NOT NULL,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_cashbox ON transaction_ledger(cash_box_id);
CREATE INDEX idx_ledger_created ON transaction_ledger(created_at);
CREATE INDEX idx_ledger_module ON transaction_ledger(module_key);

-- ============================================================================
-- 6. المراقبة والتدقيق
-- ============================================================================

-- سجل التدقيق (غير قابل للتعديل من الواجهة)
CREATE TABLE IF NOT EXISTS audit_logs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actor_username VARCHAR(50) NOT NULL,
    actor_role     VARCHAR(20) NOT NULL,
    action         VARCHAR(200) NOT NULL,
    module_key     VARCHAR(50) NOT NULL,
    entity_type    VARCHAR(50) NOT NULL DEFAULT '',
    entity_id      UUID,
    summary        TEXT         NOT NULL,
    before_data    JSONB,
    after_data     JSONB,
    actor_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    employee_id    UUID REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_occurred ON audit_logs(occurred_at);
CREATE INDEX idx_audit_user ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_module ON audit_logs(module_key);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title             VARCHAR(200) NOT NULL,
    body              TEXT         NOT NULL,
    type             VARCHAR(20)  NOT NULL DEFAULT 'info', -- info | warning | success | danger
    module_key        VARCHAR(50),
    related_entity_id UUID,
    is_read           BOOLEAN      NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================================================
-- 7. السياسات
-- ============================================================================

CREATE TABLE IF NOT EXISTS policies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(50)  NOT NULL DEFAULT 'general', -- general | cancellation | refund | payment | operational
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_policies_category ON policies(category);
CREATE INDEX idx_policies_active ON policies(is_active);

-- ============================================================================
-- 8. Triggers — تحديث updated_at تلقائياً
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الترايجر على جميع الجداول التي تحتوي updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
        AND table_name NOT IN ('audit_logs', 'transaction_ledger', 'notifications')
    LOOP
        EXECUTE format('
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
        ', t);
    END LOOP;
END $$;

-- ============================================================================
-- 9. بيانات أولية (Seed Data)
-- ============================================================================

-- إنشاء صناديق افتراضية لكل عملة
INSERT INTO cash_boxes (code, name, kind, currency, balance, is_active)
VALUES
    ('CASH_SAR', 'الصندوق النقدي (ر.س)', 'cash', 'SAR', 0, true),
    ('CASH_USD', 'الصندوق النقدي ($)',   'cash', 'USD', 0, true),
    ('CASH_YER', 'الصندوق النقدي (ر.ي)', 'cash', 'YER', 0, true)
ON CONFLICT (code) DO NOTHING;

-- إنشاء حساب المدير العام الأولي (user1 / sama1)
-- ملاحظة: كلمة المرور هنا نص عادي لأغراض التهيئة — يجب تغييرها فوراً
-- في الإنتاج: استخدم Argon2 أو bcrypt لتجزئة كلمة المرور
INSERT INTO employees (employee_number, full_name, hired_on, job_title, is_active)
VALUES ('EMP-0001', 'المدير العام', CURRENT_DATE, 'مدير عام', true)
ON CONFLICT (employee_number) DO NOTHING;

INSERT INTO users (username, password_hash, role, employee_id, is_active, must_change_password, security_q1_hash, security_q2_hash)
SELECT
    'user1',
    'sama1',
    'manager',
    (SELECT id FROM employees WHERE employee_number = 'EMP-0001'),
    true,
    false,
    -- مجزّأ بـ SHA-256: السؤال 1 = 2024، السؤال 2 = ahmed778495152@gmail.com
    encode(digest('2024', 'sha256'), 'hex'),
    encode(digest('ahmed778495152@gmail.com', 'sha256'), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'user1');

-- ============================================================================
-- 10. Row Level Security (RLS) — أمان Supabase
-- ============================================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدم المصادق عليه يستطيع قراءة كل البيانات
-- (Single-Tenant: المكتب لديه قاعدة بيانات مستقلة، فكل البيانات تخصه)
CREATE POLICY "authenticated_read_all" ON users
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON employees
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON customers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON agents
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON transport_companies
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON service_records
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON invoices
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON payments
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON expenses
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON cash_boxes
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON transaction_ledger
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON audit_logs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON notifications
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON policies
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_all" ON user_permissions
    FOR SELECT TO authenticated USING (true);

-- سياسة: المستخدم المصادق عليه يستطيع الكتابة (إضافة/تعديل/حذف)
-- ملاحظة: التحقق من الصلاحيات يتم في طبقة التطبيق (API) أيضاً
CREATE POLICY "authenticated_write_all" ON users
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON employees
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON customers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON agents
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON transport_companies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON service_records
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON invoices
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON expenses
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON cash_boxes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON transaction_ledger
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON audit_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON notifications
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON policies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write_all" ON user_permissions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 11. View — تأشيرات قاربت الانتهاء (85 يوماً من تاريخ الدخول للعمرة)
-- ============================================================================

CREATE OR REPLACE VIEW visa_expiry_view AS
SELECT
    s.id,
    s.service_number,
    s.service_type,
    s.customer_id,
    s.customer_name,
    c.phone_number,
    (s.details->>'entryDate')::date AS entry_date,
    ((s.details->>'entryDate')::date + INTERVAL '85 days')::date AS expiry_date,
    EXTRACT(DAY FROM ((s.details->>'entryDate')::date + INTERVAL '85 days') - CURRENT_DATE)::int AS days_remaining,
    CASE
        WHEN ((s.details->>'entryDate')::date + INTERVAL '85 days') < CURRENT_DATE THEN 'expired'
        WHEN ((s.details->>'entryDate')::date + INTERVAL '85 days') <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        ELSE 'near'
    END AS status
FROM service_records s
JOIN customers c ON c.id = s.customer_id
WHERE s.service_type = 'umrah_regular'
    AND s.status != 'cancelled'
    AND s.details->>'entryDate' IS NOT NULL
    AND ((s.details->>'entryDate')::date + INTERVAL '85 days') <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY days_remaining ASC;

-- ============================================================================
-- ملاحظات:
--   1. بعد تنفيذ السكريبت، احصل على SUPABASE_URL و SUPABASE_ANON_KEY
--      من Settings → API في لوحة Supabase
--   2. كلمة مرور المدير الأولي: sama1 (غيّرها فوراً بعد أول تسجيل دخول)
--   3. أسئلة استعادة كلمة المرور:
--        السؤال 1: متى تم افتتاح مكتب سما اليمن؟ → 2024
--        السؤال 2: ما هو إيميلك الشخصي؟ → ahmed778495152@gmail.com
-- ============================================================================
