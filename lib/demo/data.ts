import type { Shop, User, Client, Service, Employee, Appointment, Invoice, Product, Expense } from '@/lib/types';

// #1 — Demo products
export const DEMO_PRODUCTS: Product[] = [
  { id: 'pr1', shop_id: 'demo-shop-001', name_ar: 'شامبو رجالي',         name_en: 'Men Shampoo',       price: 45,  description: 'شامبو للشعر الجاف',     stock_qty: 20, active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'pr2', shop_id: 'demo-shop-001', name_ar: 'جل تصفيف الشعر',     name_en: 'Hair Styling Gel',  price: 55,  description: 'تثبيت قوي طوال اليوم',  stock_qty: 15, active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'pr3', shop_id: 'demo-shop-001', name_ar: 'زيت اللحية',          name_en: 'Beard Oil',         price: 80,  description: null,                    stock_qty: 10, active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'pr4', shop_id: 'demo-shop-001', name_ar: 'كريم ما بعد الحلاقة', name_en: 'Aftershave Cream',  price: 60,  description: 'يرطب ويهدئ البشرة',    stock_qty: 8,  active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'pr5', shop_id: 'demo-shop-001', name_ar: 'ماكينة حلاقة',        name_en: 'Shaving Machine',   price: 350, description: null,                    stock_qty: 3,  active: false, created_at: '2024-01-01T00:00:00Z' },
];

export const DEMO_SHOP: Shop = {
  id: 'demo-shop-001',
  name: 'Barber King',
  logo_url: null,
  brand_color: '#1a1a2e',
  slug: 'barber-king',
  lat: 30.0444,
  lng: 31.2357,
  attendance_radius_m: 150,
  created_at: '2024-01-01T00:00:00Z',
};

export const DEMO_USER: User = {
  id: 'demo-user-001',
  shop_id: 'demo-shop-001',
  email: 'omaremad9975@gmail.com',
  name: 'Omar Emad',
  role: 'owner',
  created_at: '2024-01-01T00:00:00Z',
};

// #2 — each client has a numeric code
export const DEMO_CLIENTS: Client[] = [
  { id: 'c1', code: 1, shop_id: 'demo-shop-001', name: 'أحمد محمد',    phone: '01012345678', whatsapp: '01012345678', email: 'ahmed@example.com', notes: 'عميل مميز',                   created_at: '2024-03-01T10:00:00Z' },
  { id: 'c2', code: 2, shop_id: 'demo-shop-001', name: 'محمود علي',    phone: '01123456789', whatsapp: null,          email: null,               notes: null,                          created_at: '2024-03-05T11:00:00Z' },
  { id: 'c3', code: 3, shop_id: 'demo-shop-001', name: 'خالد إبراهيم', phone: '01234567890', whatsapp: '01234567890', email: null,               notes: 'يفضل الحلاقة الكلاسيكية', created_at: '2024-03-10T09:00:00Z' },
  { id: 'c4', code: 4, shop_id: 'demo-shop-001', name: 'Omar Hassan',   phone: '01098765432', whatsapp: null,          email: 'omar@example.com', notes: null,                          created_at: '2024-04-01T12:00:00Z' },
  { id: 'c5', code: 5, shop_id: 'demo-shop-001', name: 'Karim Samir',   phone: '01187654321', whatsapp: '01187654321', email: null,               notes: null,                          created_at: '2024-04-10T14:00:00Z' },
  { id: 'c6', code: 6, shop_id: 'demo-shop-001', name: 'يوسف طارق',    phone: '01276543210', whatsapp: null,          email: null,               notes: null,                          created_at: '2024-05-01T10:00:00Z' },
];

// #7 — removed s6 (تدليك الرأس) and s7 (العناية بالحواجب)
export const DEMO_SERVICES: Service[] = [
  { id: 's1', shop_id: 'demo-shop-001', name_ar: 'قص الشعر',        name_en: 'Haircut',          price: 80,  duration_minutes: 30, is_package: false, active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 's2', shop_id: 'demo-shop-001', name_ar: 'حلاقة اللحية',    name_en: 'Beard Trim',       price: 50,  duration_minutes: 20, is_package: false, active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 's3', shop_id: 'demo-shop-001', name_ar: 'قص + لحية',       name_en: 'Haircut + Beard',  price: 120, duration_minutes: 45, is_package: false, active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 's4', shop_id: 'demo-shop-001', name_ar: 'الحلاقة الكلاسيكية', name_en: 'Classic Shave', price: 70,  duration_minutes: 30, is_package: false, active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 's5', shop_id: 'demo-shop-001', name_ar: 'تلوين الشعر',     name_en: 'Hair Color',       price: 200, duration_minutes: 60, is_package: false, active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 's8', shop_id: 'demo-shop-001', name_ar: 'كيراتين',         name_en: 'Keratin Treatment', price: 350, duration_minutes: 90, is_package: false, active: false, created_at: '2024-01-01T00:00:00Z' },
  // Packages — p1 now contains only s1 + s2 (s6 removed), p2 contains only s1 (s7 removed)
  {
    id: 'p1', shop_id: 'demo-shop-001', name_ar: 'باقة الرجل الكامل', name_en: 'Full Groom Package',
    price: 120, duration_minutes: 50, is_package: true, active: true, created_at: '2024-01-01T00:00:00Z',
    package_items: [
      { id: 'pi1', package_id: 'p1', service_id: 's1', service: { id: 's1', shop_id: 'demo-shop-001', name_ar: 'قص الشعر',     name_en: 'Haircut',    price: 80, duration_minutes: 30, is_package: false, active: true, created_at: '' } },
      { id: 'pi2', package_id: 'p1', service_id: 's2', service: { id: 's2', shop_id: 'demo-shop-001', name_ar: 'حلاقة اللحية', name_en: 'Beard Trim', price: 50, duration_minutes: 20, is_package: false, active: true, created_at: '' } },
    ],
  },
  {
    id: 'p2', shop_id: 'demo-shop-001', name_ar: 'باقة العناية الأساسية', name_en: 'Basic Care Package',
    price: 80, duration_minutes: 30, is_package: true, active: true, created_at: '2024-01-01T00:00:00Z',
    package_items: [
      { id: 'pi3', package_id: 'p2', service_id: 's1', service: { id: 's1', shop_id: 'demo-shop-001', name_ar: 'قص الشعر', name_en: 'Haircut', price: 80, duration_minutes: 30, is_package: false, active: true, created_at: '' } },
    ],
  },
];

export const DEMO_EMPLOYEES: Employee[] = [
  { id: 'e1', shop_id: 'demo-shop-001', name: 'محمد رضا',  phone: '01011112222', position: 'حلاق أول', shift: 'صباحي',  hire_date: '2022-06-01', active: true, code: 1, has_pin: true,  created_at: '2022-06-01T00:00:00Z' },
  { id: 'e2', shop_id: 'demo-shop-001', name: 'كريم أحمد', phone: '01033334444', position: 'حلاق',     shift: 'مسائي',  hire_date: '2023-01-15', active: true, code: 2, has_pin: true,  created_at: '2023-01-15T00:00:00Z' },
  { id: 'e3', shop_id: 'demo-shop-001', name: 'يوسف سامي', phone: '01055556666', position: 'مساعد',    shift: 'صباحي',  hire_date: '2024-02-01', active: true, code: 3, has_pin: false, created_at: '2024-02-01T00:00:00Z' },
];

const today = new Date().toISOString().split('T')[0];

export const DEMO_APPOINTMENTS: Appointment[] = [
  { id: 'a1', shop_id: 'demo-shop-001', client_id: 'c1', employee_id: 'e1', service_id: 's1', date: today, time: '09:00:00', status: 'done',      notes: null,             created_at: new Date().toISOString(), client: DEMO_CLIENTS[0], employee: DEMO_EMPLOYEES[0], service: DEMO_SERVICES[0] },
  { id: 'a2', shop_id: 'demo-shop-001', client_id: 'c2', employee_id: 'e2', service_id: 's3', date: today, time: '10:30:00', status: 'confirmed',  notes: null,             created_at: new Date().toISOString(), client: DEMO_CLIENTS[1], employee: DEMO_EMPLOYEES[1], service: DEMO_SERVICES[2] },
  { id: 'a3', shop_id: 'demo-shop-001', client_id: null, employee_id: 'e1', service_id: 's2', date: today, time: '11:00:00', status: 'pending',    notes: 'زيارة مباشرة', created_at: new Date().toISOString(), client: undefined,       employee: DEMO_EMPLOYEES[0], service: DEMO_SERVICES[1] },
  { id: 'a4', shop_id: 'demo-shop-001', client_id: 'c3', employee_id: 'e2', service_id: 'p1', date: today, time: '13:00:00', status: 'pending',    notes: null,             created_at: new Date().toISOString(), client: DEMO_CLIENTS[2], employee: DEMO_EMPLOYEES[1], service: DEMO_SERVICES[6] },
  { id: 'a5', shop_id: 'demo-shop-001', client_id: 'c4', employee_id: 'e1', service_id: 's5', date: today, time: '14:30:00', status: 'confirmed',  notes: 'لون بني',       created_at: new Date().toISOString(), client: DEMO_CLIENTS[3], employee: DEMO_EMPLOYEES[0], service: DEMO_SERVICES[4] },
];

function makeDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function makeDateStr(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export const DEMO_INVOICES: Invoice[] = [
  { id: 'inv1',  shop_id: 'demo-shop-001', client_id: 'c1', employee_id: 'e1', payment_method: 'cash',         total: 80,  discount: 0,  net_total: 80,  status: 'paid', created_by: 'demo-user-001', created_at: makeDate(0),  client: DEMO_CLIENTS[0], employee: DEMO_EMPLOYEES[0], invoice_items: [{ id: 'ii1',  invoice_id: 'inv1',  service_id: 's1', name_snapshot: 'قص الشعر',        price_snapshot: 80,  quantity: 1 }] },
  { id: 'inv2',  shop_id: 'demo-shop-001', client_id: 'c2', employee_id: 'e2', payment_method: 'card',         total: 120, discount: 10, net_total: 110, status: 'paid', created_by: 'demo-user-001', created_at: makeDate(0),  client: DEMO_CLIENTS[1], employee: DEMO_EMPLOYEES[1], invoice_items: [{ id: 'ii2',  invoice_id: 'inv2',  service_id: 's3', name_snapshot: 'قص + لحية',       price_snapshot: 120, quantity: 1 }] },
  { id: 'inv3',  shop_id: 'demo-shop-001', client_id: 'c3', employee_id: 'e1', payment_method: 'instapay',     total: 120, discount: 0,  net_total: 120, status: 'paid', created_by: 'demo-user-001', created_at: makeDate(1),  client: DEMO_CLIENTS[2], employee: DEMO_EMPLOYEES[0], invoice_items: [{ id: 'ii3',  invoice_id: 'inv3',  service_id: 'p1', name_snapshot: 'باقة الرجل الكامل', price_snapshot: 120, quantity: 1 }] },
  { id: 'inv4',  shop_id: 'demo-shop-001', client_id: 'c4', employee_id: 'e2', payment_method: 'vodafone_cash',total: 200, discount: 20, net_total: 180, status: 'paid', created_by: 'demo-user-001', created_at: makeDate(2),  client: DEMO_CLIENTS[3], employee: DEMO_EMPLOYEES[1], invoice_items: [{ id: 'ii4',  invoice_id: 'inv4',  service_id: 's5', name_snapshot: 'تلوين الشعر',     price_snapshot: 200, quantity: 1 }] },
  { id: 'inv5',  shop_id: 'demo-shop-001', client_id: 'c5', employee_id: 'e1', payment_method: 'cash',         total: 130, discount: 0,  net_total: 130, status: 'paid', created_by: 'demo-user-001', created_at: makeDate(3),  client: DEMO_CLIENTS[4], employee: DEMO_EMPLOYEES[0], invoice_items: [{ id: 'ii5a', invoice_id: 'inv5',  service_id: 's1', name_snapshot: 'قص الشعر',        price_snapshot: 80,  quantity: 1 }, { id: 'ii5b', invoice_id: 'inv5', service_id: 's2', name_snapshot: 'حلاقة اللحية', price_snapshot: 50, quantity: 1 }] },
  { id: 'inv6',  shop_id: 'demo-shop-001', client_id: 'c1', employee_id: 'e2', payment_method: 'cash',         total: 80,  discount: 0,  net_total: 80,  status: 'paid', created_by: 'demo-user-001', created_at: makeDate(5),  client: DEMO_CLIENTS[0], employee: DEMO_EMPLOYEES[1], invoice_items: [{ id: 'ii6',  invoice_id: 'inv6',  service_id: 's1', name_snapshot: 'قص الشعر',        price_snapshot: 80,  quantity: 1 }] },
  { id: 'inv7',  shop_id: 'demo-shop-001', client_id: 'c6', employee_id: 'e1', payment_method: 'card',         total: 80,  discount: 0,  net_total: 80,  status: 'paid', created_by: 'demo-user-001', created_at: makeDate(7),  client: DEMO_CLIENTS[5], employee: DEMO_EMPLOYEES[0], invoice_items: [{ id: 'ii7',  invoice_id: 'inv7',  service_id: 'p2', name_snapshot: 'باقة العناية الأساسية', price_snapshot: 80, quantity: 1 }] },
  { id: 'inv8',  shop_id: 'demo-shop-001', client_id: 'c2', employee_id: 'e2', payment_method: 'instapay',     total: 50,  discount: 0,  net_total: 50,  status: 'paid', created_by: 'demo-user-001', created_at: makeDate(10), client: DEMO_CLIENTS[1], employee: DEMO_EMPLOYEES[1], invoice_items: [{ id: 'ii8',  invoice_id: 'inv8',  service_id: 's2', name_snapshot: 'حلاقة اللحية',    price_snapshot: 50,  quantity: 1 }] },
  { id: 'inv9',  shop_id: 'demo-shop-001', client_id: 'c3', employee_id: 'e1', payment_method: 'cash',         total: 80,  discount: 0,  net_total: 80,  status: 'paid', created_by: 'demo-user-001', created_at: makeDate(12), client: DEMO_CLIENTS[2], employee: DEMO_EMPLOYEES[0], invoice_items: [{ id: 'ii9',  invoice_id: 'inv9',  service_id: 's1', name_snapshot: 'قص الشعر',        price_snapshot: 80,  quantity: 1 }] },
  { id: 'inv10', shop_id: 'demo-shop-001', client_id: 'c4', employee_id: 'e2', payment_method: 'cash',         total: 150, discount: 0,  net_total: 150, status: 'paid', created_by: 'demo-user-001', created_at: makeDate(15), client: DEMO_CLIENTS[3], employee: DEMO_EMPLOYEES[1], invoice_items: [{ id: 'ii10a',invoice_id: 'inv10', service_id: 's1', name_snapshot: 'قص الشعر',        price_snapshot: 80,  quantity: 1 }, { id: 'ii10b', invoice_id: 'inv10', service_id: 's4', name_snapshot: 'الحلاقة الكلاسيكية', price_snapshot: 70, quantity: 1 }] },
];

// ── Demo Expenses ────────────────────────────────────────────────────────────
// Spread across the last 30 days; totals ~3 500 EGP so demo profit is visible.
export const DEMO_EXPENSES: Expense[] = [
  { id: 'exp1', shop_id: 'demo-shop-001', amount: 2000, category: 'rent',        notes: 'إيجار الشهر',             date: makeDateStr(1),  created_at: makeDate(1)  },
  { id: 'exp2', shop_id: 'demo-shop-001', amount: 350,  category: 'supplies',    notes: 'مستلزمات حلاقة',          date: makeDateStr(3),  created_at: makeDate(3)  },
  { id: 'exp3', shop_id: 'demo-shop-001', amount: 180,  category: 'electricity', notes: 'فاتورة الكهرباء',          date: makeDateStr(5),  created_at: makeDate(5)  },
  { id: 'exp4', shop_id: 'demo-shop-001', amount: 600,  category: 'salaries',    notes: 'مكافأة يوسف سامي',        date: makeDateStr(7),  created_at: makeDate(7)  },
  { id: 'exp5', shop_id: 'demo-shop-001', amount: 120,  category: 'maintenance', notes: 'إصلاح ماكينة الحلاقة',    date: makeDateStr(10), created_at: makeDate(10) },
  { id: 'exp6', shop_id: 'demo-shop-001', amount: 90,   category: 'supplies',    notes: 'شراء شامبو وكريمات',       date: makeDateStr(12), created_at: makeDate(12) },
  { id: 'exp7', shop_id: 'demo-shop-001', amount: 75,   category: 'other',       notes: 'مصاريف متنوعة',            date: makeDateStr(15), created_at: makeDate(15) },
  { id: 'exp8', shop_id: 'demo-shop-001', amount: 100,  category: 'electricity', notes: null,                       date: makeDateStr(20), created_at: makeDate(20) },
];
