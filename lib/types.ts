export type Role = 'owner' | 'cashier';
export type AppointmentStatus = 'pending' | 'confirmed' | 'done' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'instapay' | 'vodafone_cash';
export type InvoiceStatus = 'paid' | 'void';
export type ExpenseCategory = 'rent' | 'supplies' | 'electricity' | 'salaries' | 'maintenance' | 'other' | (string & {});

export interface Shop {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  slug: string;
  created_at: string;
}

export interface User {
  id: string;
  shop_id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface Client {
  id: string;
  shop_id: string;
  code?: number;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  shop_id: string;
  name_ar: string;
  name_en: string;
  price: number;
  duration_minutes: number;
  is_package: boolean;
  active: boolean;
  created_at: string;
  package_items?: PackageItem[];
}

export interface PackageItem {
  id: string;
  package_id: string;
  service_id: string;
  service?: Service;
}

// #1 — Product type
export interface Product {
  id: string;
  shop_id: string;
  name_ar: string;
  name_en: string;
  price: number;
  description: string | null;
  stock_qty: number;
  active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  position: string | null;
  shift: string | null;
  hire_date: string | null;
  active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  shop_id: string;
  client_id: string | null;
  employee_id: string | null;
  service_id: string | null;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  client?: Client;
  employee?: Employee;
  service?: Service;
}

export interface Invoice {
  id: string;
  shop_id: string;
  client_id: string | null;
  employee_id: string | null;
  payment_method: PaymentMethod;
  total: number;
  discount: number;
  net_total: number;
  status: InvoiceStatus;
  created_by: string | null;
  created_at: string;
  client?: Client;
  employee?: Employee;
  invoice_items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  service_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
}

// Unified cart item for POS (services + products)
export interface CartItem {
  id: string;
  type: 'service' | 'product';
  name_ar: string;
  name_en: string;
  price: number;
  quantity: number;
  is_package?: boolean;
}

// ── Shift Configuration ─────────────────────────────────────────────────────
// Supabase-ready structure; in demo mode stored in localStorage under
// the key 'barber-shift-settings'.

export interface ShiftConfig {
  id: number;         // 1 | 2 | 3  (shift index)
  name: string;       // e.g. "صباحي" / "Morning"
  start_time: string; // "HH:MM" 24-hour format
  end_time: string;   // "HH:MM" 24-hour format
}

export interface ShiftSettings {
  count: 1 | 2 | 3;
  shifts: ShiftConfig[];
}

// ── Expense ─────────────────────────────────────────────────────────────────
export interface Expense {
  id: string;
  shop_id: string;
  amount: number;
  category: ExpenseCategory;
  notes: string | null;
  date: string;         // "YYYY-MM-DD"
  created_at: string;
}
