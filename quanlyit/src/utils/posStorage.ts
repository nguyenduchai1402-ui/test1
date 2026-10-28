
export function cleanSupabaseUrl(url: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}
import { Product, Customer, Order, OrderItem } from '../types/pos';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase Configuration & Management
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

export const DEFAULT_SUPABASE_URL = 'https://wxwmbowpwbjpevawgvup.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_LnhAaf4nOQ0FtuvOKWyzoQ_OjlReFRn';

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    url: cleanSupabaseUrl(envUrl && envUrl.trim() ? envUrl : DEFAULT_SUPABASE_URL),
    anonKey: (envKey && envKey.trim() ? envKey : DEFAULT_SUPABASE_ANON_KEY).trim(),
    autoSync: true
  };
}

let _supabaseInstance: SupabaseClient | null = null;
let _isListeningRealtime = false;

export function getSupabaseClient(): SupabaseClient | null {
  if (!_supabaseInstance) {
    const cfg = getSupabaseConfig();
    if (cfg.url && cfg.anonKey) {
      try {
        _supabaseInstance = createClient(cleanSupabaseUrl(cfg.url), cfg.anonKey.trim());
        initRealtimeSync();
      } catch (err) {
        console.warn('Không thể khởi tạo Supabase client:', err);
      }
    }
  }
  return _supabaseInstance;
}

export const isSupabaseConfigured = (): boolean => {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey);
};

export function saveSupabaseConfig(cfg: SupabaseConfig): void {
  localStorage.setItem('pos_supabase_config', JSON.stringify(cfg));
  _supabaseInstance = null;
  _isListeningRealtime = false;
  getSupabaseClient();
  window.dispatchEvent(new Event('pos_supabase_config_changed'));
}

export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Chưa cấu hình Supabase URL hoặc Anon Key!' };
  }
  try {
    const { data, error } = await client.from('pos_products').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('relation "pos_products" does not exist') || error.message?.includes('schema cache')) {
        return { 
          ok: false, 
          message: 'Kết nối Supabase thành công nhưng chưa có bảng! Vui lòng bấm sao chép SQL và chạy trong SQL Editor của Supabase.' 
        };
      }
      return { ok: false, message: `Lỗi kết nối Supabase: ${error.message}` };
    }
    return { ok: true, message: 'Kết nối Supabase thành công! Dữ liệu Cloud đã sẵn sàng.' };
  } catch (err: any) {
    return { ok: false, message: `Không thể kết nối đến Supabase: ${err.message || 'Lỗi mạng'}` };
  }
}

function initRealtimeSync() {
  if (_isListeningRealtime || !_supabaseInstance) return;
  _isListeningRealtime = true;

  try {
    _supabaseInstance
      .channel('pos_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_products' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_customers' }, () => {
        syncFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders' }, () => {
        syncFromSupabase();
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription error:', err);
  }
}

export async function syncFromSupabase(): Promise<{ 
  ok: boolean; 
  count: { products: number; customers: number; orders: number }; 
  message: string 
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, count: { products: 0, customers: 0, orders: 0 }, message: 'Chưa cấu hình Supabase!' };
  }

  try {
    const [pRes, cRes, oRes] = await Promise.all([
      client.from('pos_products').select('*'),
      client.from('pos_customers').select('*'),
      client.from('pos_orders').select('*')
    ]);

    if (pRes.error) throw pRes.error;
    if (cRes.error) throw cRes.error;
    if (oRes.error) throw oRes.error;

    const currentLocalProducts = getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const localMap = new Map(currentLocalProducts.map(p => [p.id, p]));

    const cloudProducts: Product[] = (pRes.data || []).map((row: any) => {
      const local = localMap.get(row.id);
      const rawCost = row.cost_price ?? row.costPrice ?? local?.costPrice;
      const costPrice = rawCost !== undefined && rawCost !== null && rawCost !== '' ? Number(rawCost) : undefined;
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        price: Number(row.price),
        costPrice,
        unit: row.unit || 'thiên',
        category: row.category || 'Cốc Tim',
        isPopular: row.is_popular !== false
      };
    });

    const cloudCustomers: Customer[] = (cRes.data || []).map((row: any) => ({
      id: row.id,
      code: row.code || undefined,
      name: row.name,
      phone: row.phone || undefined,
      address: row.address || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at
    }));

    const cloudOrders: Order[] = (oRes.data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      customerId: row.customer_id || undefined,
      customerName: row.customer_name,
      customerPhone: row.customer_phone || undefined,
      customerAddress: row.customer_address || undefined,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
      totalQuantity: Number(row.total_quantity || 0),
      totalAmount: Number(row.total_amount || 0),
      notes: row.notes || undefined,
      status: row.status || 'Chờ in',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    if (cloudProducts.length > 0) {
      setStorage(STORAGE_KEYS.PRODUCTS, cloudProducts);
      window.dispatchEvent(new Event('pos_products_updated'));
    }
    if (cloudCustomers.length > 0) {
      setStorage(STORAGE_KEYS.CUSTOMERS, cloudCustomers);
      window.dispatchEvent(new Event('pos_customers_updated'));
    }
    if (cloudOrders.length > 0) {
      setStorage(STORAGE_KEYS.ORDERS, cloudOrders);
      window.dispatchEvent(new Event('pos_orders_updated'));
    }

    return {
      ok: true,
      count: {
        products: cloudProducts.length,
        customers: cloudCustomers.length,
        orders: cloudOrders.length
      },
      message: `Đã đồng bộ từ Cloud: ${cloudProducts.length} sản phẩm, ${cloudCustomers.length} khách, ${cloudOrders.length} đơn hàng.`
    };
  } catch (err: any) {
    return { ok: false, count: { products: 0, customers: 0, orders: 0 }, message: `Lỗi đồng bộ: ${err.message}` };
  }
}

export async function pushAllToSupabase(): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: 'Chưa cấu hình Supabase!' };

  try {
    const products = posDb.getProducts();
    const customers = posDb.getCustomers();
    const orders = posDb.getOrders();

    if (products.length > 0) {
      const pRows = products.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.price,
        cost_price: p.costPrice !== undefined && p.costPrice !== null ? Number(p.costPrice) : null,
        unit: p.unit,
        category: p.category,
        is_popular: p.isPopular ?? true,
        created_at: new Date().toISOString()
      }));
      try {
        await client.from('pos_products').upsert(pRows, { onConflict: 'id' });
      } catch {
        const pRowsFallback = products.map(p => ({
          id: p.id,
          code: p.code,
          name: p.name,
          price: p.price,
          unit: p.unit,
          category: p.category,
          is_popular: p.isPopular ?? true,
          created_at: new Date().toISOString()
        }));
        await client.from('pos_products').upsert(pRowsFallback, { onConflict: 'id' });
      }
    }

    if (customers.length > 0) {
      const cRows = customers.map(c => ({
        id: c.id,
        code: c.code || null,
        name: c.name,
        phone: c.phone || null,
        address: c.address || null,
        notes: c.notes || null,
        created_at: c.createdAt || new Date().toISOString()
      }));
      await client.from('pos_customers').upsert(cRows, { onConflict: 'id' });
    }

    if (orders.length > 0) {
      const oRows = orders.map(o => ({
        id: o.id,
        code: o.code,
        customer_id: o.customerId || null,
        customer_name: o.customerName,
        customer_phone: o.customerPhone || null,
        customer_address: o.customerAddress || null,
        items: o.items,
        total_quantity: o.totalQuantity,
        total_amount: o.totalAmount,
        notes: o.notes || '',
        status: o.status,
        created_at: o.createdAt,
        updated_at: o.updatedAt || new Date().toISOString()
      }));
      await client.from('pos_orders').upsert(oRows, { onConflict: 'id' });
    }

    return { 
      ok: true, 
      message: `Đã đẩy lên Supabase thành công: ${products.length} SP, ${customers.length} khách, ${orders.length} đơn!` 
    };
  } catch (err: any) {
    return { ok: false, message: `Lỗi tải lên: ${err.message}` };
  }
}

// LocalStorage Keys
const STORAGE_KEYS = {
  PRODUCTS: 'pos_print_products_v2',
  CUSTOMERS: 'pos_print_customers_v2',
  ORDERS: 'pos_print_orders_v2',
  SETTINGS: 'pos_print_settings_v2'
};

// Seed Products extracted from printing workshop price sheets
export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', code: 'T7', name: 'Cốc Tim 700ml UKP', price: 730, costPrice: 580, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p2', code: 'T7N', name: 'Cốc Tim 700ml Nhám UKP', price: 760, costPrice: 600, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p3', code: 'T5', name: 'Cốc Tim 500ml UKP', price: 630, costPrice: 500, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p4', code: 'T5N', name: 'Cốc Tim 500ml Nhám UKP', price: 660, costPrice: 520, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p5', code: 'TT2', name: 'Cốc Trái Tim 2 Ngăn', price: 820, costPrice: 650, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p6', code: 'DC', name: 'Cốc Đáy Cầu 500ml', price: 580, costPrice: 450, unit: 'thiên', category: 'Cốc Đáy Cầu', isPopular: true },
  { id: 'p7', code: 'DC7', name: 'Cốc Đáy Cầu 700ml', price: 670, costPrice: 520, unit: 'thiên', category: 'Cốc Đáy Cầu' },
  { id: 'p8', code: 'U5', name: 'Cốc U 500ml', price: 580, costPrice: 450, unit: 'thiên', category: 'Cốc U', isPopular: true },
  { id: 'p9', code: 'U5UKP', name: 'Cốc U 500ml UKP', price: 650, costPrice: 500, unit: 'thiên', category: 'Cốc U' },
  { id: 'p10', code: 'U7', name: 'Cốc U 700ml UKP', price: 680, costPrice: 530, unit: 'thiên', category: 'Cốc U' },
  { id: 'p11', code: 'P360', name: 'Cốc PP 360ml', price: 495, costPrice: 380, unit: 'thiên', category: 'Cốc PP', isPopular: true },
  { id: 'p12', code: 'P500', name: 'Cốc PP 500ml (P5)', price: 540, costPrice: 420, unit: 'thiên', category: 'Cốc PP', isPopular: true },
  { id: 'p13', code: 'P650', name: 'Cốc PP 650ml', price: 620, costPrice: 480, unit: 'thiên', category: 'Cốc PP' },
  { id: 'p14', code: 'P700', name: 'Cốc PP 700ml (P7)', price: 620, costPrice: 480, unit: 'thiên', category: 'Cốc PP', isPopular: true },
  { id: 'p15', code: 'P1000', name: 'Cốc PP 1000ml Khổng Lồ', price: 850, costPrice: 660, unit: 'thiên', category: 'Cốc PP' },
  { id: 'p16', code: 'PET300', name: 'Cốc Pet 300ml UKP', price: 438, costPrice: 340, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p17', code: 'PET360', name: 'Cốc Pet 360ml UKP', price: 495, costPrice: 380, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p18', code: 'PET400', name: 'Cốc Pet 400ml Dày UKP', price: 505, costPrice: 390, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p19', code: 'PET500', name: 'Cốc Pet 500ml UKP', price: 567, costPrice: 440, unit: 'thiên', category: 'Cốc Pet', isPopular: true },
  { id: 'p20', code: 'PET620', name: 'Cốc Pet 620ml UKP', price: 743, costPrice: 580, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p21', code: 'PET700', name: 'Cốc Pet 700ml UKP', price: 755, costPrice: 590, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p22', code: 'ND90', name: 'Nắp D90 Đậy Cốc', price: 400, costPrice: 300, unit: 'thiên', category: 'Nắp & Phụ kiện', isPopular: true },
  { id: 'p23', code: 'NN90', name: 'Nắp N90 Bằng Tiêu Chuẩn', price: 210, costPrice: 150, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p24', code: 'NC84', name: 'Nắp Cầu 84 UKP', price: 371, costPrice: 280, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p25', code: 'NC90', name: 'Nắp Cầu 90 UKP', price: 429, costPrice: 320, unit: 'thiên', category: 'Nắp & Phụ kiện', isPopular: true },
  { id: 'p26', code: 'NB90', name: 'Nắp Bằng 90 UKP', price: 309, costPrice: 230, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p27', code: 'NTT90', name: 'Nắp Tim Trong 90 UKP', price: 521, costPrice: 390, unit: 'thiên', category: 'Nắp & Phụ kiện', isPopular: true },
  { id: 'p28', code: 'NTW90', name: 'Nắp Tim Trắng 90 UKP', price: 569, costPrice: 430, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p29', code: 'NUT90', name: 'Nắp Uống Trực Tiếp 90', price: 429, costPrice: 320, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p30', code: 'MANG', name: 'Cuộn Màng Ép Cốc Ly', price: 180, costPrice: 130, unit: 'cuộn', category: 'Phụ kiện' },
  { id: 'p31', code: 'ONGHUT', name: 'Ống Hút Trà Sữa Bọc Màng', price: 65, costPrice: 45, unit: 'cây', category: 'Phụ kiện' },
  { id: 'p32', code: 'TUI1', name: 'Túi Đựng 1 Ly Chữ T', price: 55, costPrice: 38, unit: 'kg', category: 'Phụ kiện' },
  { id: 'p33', code: 'TUI2', name: 'Túi Đựng 2 Ly Xoè Đáy', price: 55, costPrice: 38, unit: 'kg', category: 'Phụ kiện' }
];

// Seed Customers from Workshop data
export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', code: 'KH-TN', name: 'Tiệm Trà Thị Ngọc', phone: '0976234567', address: 'KĐT Văn Quán, Hà Đông, HN', notes: 'In logo 1 màu đỏ, gửi xe buýt', createdAt: '2026-08-15' },
  { id: 'c2', code: 'KH-LC', name: 'La Cà Coffee', phone: '0912345678', address: '19 Nguyễn Trãi, Thanh Xuân, HN', notes: 'Giao trực tiếp buổi chiều', createdAt: '2026-08-20' },
  { id: 'c3', code: 'KH-NA', name: 'Ngọc Ánh Tea', phone: '0904567890', address: '45 Cầu Giấy, Hà Nội', notes: 'Hay lấy Tim7 và Nắp D90', createdAt: '2026-09-01' },
  { id: 'c4', code: 'KH-95', name: '1995 Café', phone: '0968789012', address: 'Định Công, Hoàng Mai, HN', notes: 'Lấy U500 in 2 mặt', createdAt: '2026-09-10' },
  { id: 'c5', code: 'KH-CL', name: 'Chill Trà Chanh', phone: '0971223344', address: 'Triều Khúc, Thanh Xuân, HN', notes: 'Khách quen lấy P500', createdAt: '2026-09-15' },
  { id: 'c6', code: 'KH-TT', name: 'T&T Quán', phone: '0936889900', address: 'Lê Đức Thọ, Nam Từ Liêm, HN', notes: 'Thường in P5 và P7', createdAt: '2026-09-22' },
  { id: 'c7', code: 'KH-OT', name: 'One Tea', phone: '0982112233', address: '120 Xã Đàn, Đống Đa, HN', notes: 'Cốc Pet cao cấp', createdAt: '2026-10-01' },
  { id: 'c8', code: 'KH-MX', name: 'Mixue Chi Nhánh HN', phone: '0988123456', address: 'Hà Nội', notes: 'Tim 7 nhám ukp số lượng lớn', createdAt: '2026-10-05' },
  { id: 'c9', code: 'KH-PL', name: 'Phúc Long Hà Đông', phone: '0918765432', address: 'Quang Trung, Hà Đông, HN', notes: 'Cốc PP 700ml in 1 màu', createdAt: '2026-10-10' },
  { id: 'c10', code: 'KH-DD', name: 'Trà Sữa Đô Đô', phone: '0934567891', address: 'Trần Đại Nghĩa, Hai Bà Trưng, HN', notes: 'Lấy kèm nắp tim trắng', createdAt: '2026-10-12' },
  { id: 'c11', code: 'KH-BX', name: 'Bạc Xỉu Coffee', phone: '0978998877', address: 'Huỳnh Thúc Kháng, Ba Đình, HN', notes: 'Cốc Pet 500 nắp cầu', createdAt: '2026-10-15' },
  { id: 'c12', code: 'KH-GC', name: 'Gong Cha Cầu Giấy', phone: '0945112233', address: 'Trần Thái Tông, Cầu Giấy, HN', notes: 'In logo 2 màu', createdAt: '2026-10-18' },
  { id: 'c13', code: 'KH-DT', name: 'Ding Tea Giải Phóng', phone: '0966443322', address: 'Giải Phóng, Hoàng Mai, HN', notes: 'Gửi nhà xe Giáp Bát', createdAt: '2026-10-20' },
  { id: 'c14', code: 'KH-BP', name: 'Trà Chanh Bụi Phố', phone: '0987332211', address: 'Nguyễn Văn Cừ, Long Biên, HN', notes: 'Khách sỉ lấy cuộn màng và ly PP', createdAt: '2026-10-22' }
];

// Seed Sample Orders
export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1025',
    code: '#DH-1025',
    customerId: 'c1',
    customerName: 'Tiệm Trà Thị Ngọc',
    customerPhone: '0976234567',
    customerAddress: 'KĐT Văn Quán, Hà Đông, HN',
    items: [
      { id: 'item-1', productId: 'p2', code: 'T7N', name: 'Cốc Tim 700ml Nhám UKP', unitPrice: 760, quantity: 2, amount: 1520 },
      { id: 'item-2', productId: 'p27', code: 'NTT90', name: 'Nắp Tim Trong 90 UKP', unitPrice: 521, quantity: 2, amount: 1042 }
    ],
    totalQuantity: 4,
    totalAmount: 2562,
    notes: 'In mực đỏ tươi, đóng gói cẩn thận gửi bến xe Yên Nghĩa',
    status: 'Chờ in',
    createdAt: '2026-10-26 09:30',
    updatedAt: '2026-10-26 09:30'
  },
  {
    id: 'ord-1024',
    code: '#DH-1024',
    customerId: 'c2',
    customerName: 'La Cà Coffee',
    customerPhone: '0912345678',
    customerAddress: '19 Nguyễn Trãi, Thanh Xuân, HN',
    items: [
      { id: 'item-3', productId: 'p12', code: 'P500', name: 'Cốc PP 500ml (P5)', unitPrice: 540, quantity: 3, amount: 1620 },
      { id: 'item-4', productId: 'p14', code: 'P700', name: 'Cốc PP 700ml (P7)', unitPrice: 620, quantity: 2, amount: 1240 }
    ],
    totalQuantity: 5,
    totalAmount: 2860,
    notes: 'In logo 1 màu đen, giao trước 17h',
    status: 'Đã in',
    createdAt: '2026-10-25 14:15',
    updatedAt: '2026-10-25 16:40'
  },
  {
    id: 'ord-1023',
    code: '#DH-1023',
    customerId: 'c3',
    customerName: 'Ngọc Ánh Tea',
    customerPhone: '0904567890',
    customerAddress: '45 Cầu Giấy, Hà Nội',
    items: [
      { id: 'item-5', productId: 'p1', code: 'T7', name: 'Cốc Tim 700ml Trơn UKP', unitPrice: 750, quantity: 3, amount: 2250 },
      { id: 'item-6', productId: 'p22', code: 'ND90', name: 'Nắp D90 Đậy Cốc', unitPrice: 400, quantity: 3, amount: 1200 }
    ],
    totalQuantity: 6,
    totalAmount: 3450,
    notes: 'In logo xanh lá',
    status: 'Đã in',
    createdAt: '2026-10-24 10:20',
    updatedAt: '2026-10-24 11:00'
  },
  {
    id: 'ord-1022',
    code: '#DH-1022',
    customerId: 'c4',
    customerName: '1995 Café',
    customerPhone: '0968789012',
    customerAddress: 'Định Công, Hoàng Mai, HN',
    items: [
      { id: 'item-7', productId: 'p15', code: 'U500', name: 'Cốc Đáy Bầu U 500ml (U5)', unitPrice: 535, quantity: 4, amount: 2140 }
    ],
    totalQuantity: 4,
    totalAmount: 2140,
    notes: 'Giao buổi sáng',
    status: 'Đã in',
    createdAt: '2026-10-22 15:45',
    updatedAt: '2026-10-22 17:00'
  },
  {
    id: 'ord-1021',
    code: '#DH-1021',
    customerId: 'c5',
    customerName: 'Chill Trà Chanh',
    customerPhone: '0971223344',
    customerAddress: 'Triều Khúc, Thanh Xuân, HN',
    items: [
      { id: 'item-8', productId: 'p12', code: 'P500', name: 'Cốc PP 500ml (P5)', unitPrice: 540, quantity: 5, amount: 2700 },
      { id: 'item-9', productId: 'p30', code: 'MANG', name: 'Cuộn Màng Ép Cốc Ly', unitPrice: 180, quantity: 2, amount: 360 }
    ],
    totalQuantity: 7,
    totalAmount: 3060,
    notes: '',
    status: 'Đã in',
    createdAt: '2026-10-20 08:30',
    updatedAt: '2026-10-20 09:10'
  },
  {
    id: 'ord-1020',
    code: '#DH-1020',
    customerId: 'c6',
    customerName: 'T&T Quán',
    customerPhone: '0936889900',
    customerAddress: 'Lê Đức Thọ, Nam Từ Liêm, HN',
    items: [
      { id: 'item-10', productId: 'p14', code: 'P700', name: 'Cốc PP 700ml (P7)', unitPrice: 620, quantity: 3, amount: 1860 }
    ],
    totalQuantity: 3,
    totalAmount: 1860,
    notes: 'In 2 màu vàng + đen',
    status: 'Chờ in',
    createdAt: '2026-10-18 16:00',
    updatedAt: '2026-10-18 16:00'
  },
  {
    id: 'ord-1019',
    code: '#DH-1019',
    customerId: 'c7',
    customerName: 'One Tea',
    customerPhone: '0982112233',
    customerAddress: '120 Xã Đàn, Đống Đa, HN',
    items: [
      { id: 'item-11', productId: 'p19', code: 'PET500', name: 'Cốc Pet 500ml UKP', unitPrice: 686, quantity: 4, amount: 2744 },
      { id: 'item-12', productId: 'p25', code: 'NC90', name: 'Nắp Cầu 90 UKP', unitPrice: 429, quantity: 4, amount: 1716 }
    ],
    totalQuantity: 8,
    totalAmount: 4460,
    notes: 'Hàng xuất khẩu gấp',
    status: 'Đã in',
    createdAt: '2026-10-15 11:20',
    updatedAt: '2026-10-15 14:00'
  },
  {
    id: 'ord-1018',
    code: '#DH-1018',
    customerId: 'c8',
    customerName: 'Mixue Chi Nhánh HN',
    customerPhone: '0988123456',
    customerAddress: 'Hà Nội',
    items: [
      { id: 'item-13', productId: 'p2', code: 'T7N', name: 'Cốc Tim 700ml Nhám UKP', unitPrice: 760, quantity: 10, amount: 7600 },
      { id: 'item-14', productId: 'p28', code: 'NTW90', name: 'Nắp Tim Trắng 90 UKP', unitPrice: 569, quantity: 10, amount: 5690 }
    ],
    totalQuantity: 20,
    totalAmount: 13290,
    notes: 'Hợp đồng tháng',
    status: 'Đã in',
    createdAt: '2026-10-10 09:00',
    updatedAt: '2026-10-10 17:00'
  },
  {
    id: 'ord-1017',
    code: '#DH-1017',
    customerId: 'c9',
    customerName: 'Phúc Long Hà Đông',
    customerPhone: '0918765432',
    customerAddress: 'Quang Trung, Hà Đông, HN',
    items: [
      { id: 'item-15', productId: 'p14', code: 'P700', name: 'Cốc PP 700ml (P7)', unitPrice: 620, quantity: 6, amount: 3720 }
    ],
    totalQuantity: 6,
    totalAmount: 3720,
    notes: 'Giao trước thứ 6',
    status: 'Đã in',
    createdAt: '2026-10-05 13:40',
    updatedAt: '2026-10-05 15:30'
  },
  {
    id: 'ord-1016',
    code: '#DH-1016',
    customerId: 'c10',
    customerName: 'Trà Sữa Đô Đô',
    customerPhone: '0934567891',
    customerAddress: 'Trần Đại Nghĩa, Hai Bà Trưng, HN',
    items: [
      { id: 'item-16', productId: 'p1', code: 'T7', name: 'Cốc Tim 700ml Trơn UKP', unitPrice: 750, quantity: 4, amount: 3000 },
      { id: 'item-17', productId: 'p27', code: 'NTT90', name: 'Nắp Tim Trong 90 UKP', unitPrice: 521, quantity: 4, amount: 2084 }
    ],
    totalQuantity: 8,
    totalAmount: 5084,
    notes: 'In logo thương hiệu',
    status: 'Đã in',
    createdAt: '2026-10-02 10:00',
    updatedAt: '2026-10-02 11:30'
  },
  {
    id: 'ord-1015',
    code: '#DH-1015',
    customerId: 'c3',
    customerName: 'Ngọc Ánh Tea',
    customerPhone: '0904567890',
    customerAddress: '45 Cầu Giấy, Hà Nội',
    items: [
      { id: 'item-18', productId: 'p12', code: 'P500', name: 'Cốc PP 500ml (P5)', unitPrice: 540, quantity: 5, amount: 2700 }
    ],
    totalQuantity: 5,
    totalAmount: 2700,
    notes: 'Đơn tháng 9',
    status: 'Đã in',
    createdAt: '2026-09-28 15:20',
    updatedAt: '2026-09-28 16:00'
  },
  {
    id: 'ord-1014',
    code: '#DH-1014',
    customerId: 'c4',
    customerName: '1995 Café',
    customerPhone: '0968789012',
    customerAddress: 'Định Công, Hoàng Mai, HN',
    items: [
      { id: 'item-19', productId: 'p15', code: 'U500', name: 'Cốc Đáy Bầu U 500ml (U5)', unitPrice: 535, quantity: 6, amount: 3210 }
    ],
    totalQuantity: 6,
    totalAmount: 3210,
    notes: 'Đơn tháng 9',
    status: 'Đã in',
    createdAt: '2026-09-15 09:15',
    updatedAt: '2026-09-15 11:00'
  },
  {
    id: 'ord-1013',
    code: '#DH-1013',
    customerId: 'c1',
    customerName: 'Tiệm Trà Thị Ngọc',
    customerPhone: '0976234567',
    customerAddress: 'KĐT Văn Quán, Hà Đông, HN',
    items: [
      { id: 'item-20', productId: 'p2', code: 'T7N', name: 'Cốc Tim 700ml Nhám UKP', unitPrice: 760, quantity: 5, amount: 3800 }
    ],
    totalQuantity: 5,
    totalAmount: 3800,
    notes: 'Đơn tháng 8',
    status: 'Đã in',
    createdAt: '2026-08-20 14:00',
    updatedAt: '2026-08-20 16:00'
  }
];

// LocalStorage Helper
function getStorage<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    const parsed = JSON.parse(item) as T;
// LocalStorage loaded successfully
    return parsed;
  } catch (err) {
    console.warn(`Error reading localStorage key ${key}:`, err);
    return defaultVal;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`Error saving localStorage key ${key}:`, err);
  }
}

// FORMATTING UTILITIES
export function formatVND(amountInK: number): string {
  const vnd = Math.round((amountInK || 0) * 1000);
  return new Intl.NumberFormat('vi-VN').format(vnd) + 'đ';
}

export function formatK(amountInK: number): string {
  if (amountInK === undefined || amountInK === null) return '0k';
  return (amountInK).toLocaleString('vi-VN') + 'k';
}

export function generateOrderCode(): string {
  const orders = posDb.getOrders();
  const nextNum = 1000 + orders.length + 1;
  return `#DH-${nextNum}`;
}

// ZALO MESSAGE BUILDER
export function generateZaloMessage(order: Order): string {
  const dateStr = order.createdAt ? order.createdAt.slice(0, 16) : new Date().toLocaleString('vi-VN');
  const itemsText = order.items.map((it, idx) => {
    return `${idx + 1}. ${it.name} [${it.code}]\n   ${it.quantity} x ${it.unitPrice}k = ${formatVND(it.amount)}`;
  }).join('\n');

  return `📋 ĐƠN HÀNG IN LY - ${(order.customerName || "Khách Lẻ").toUpperCase()}
Mã đơn: ${order.code} | Ngày: ${dateStr}
👤 Khách hàng: ${order.customerName || "Khách Lẻ"}
📞 SĐT: ${order.customerPhone || 'Chưa có'}
📍 Đ/C: ${order.customerAddress || 'Giao tại xưởng'}
------------------------------
${itemsText}
------------------------------
📦 Tổng số lượng: ${order.totalQuantity} (${order.items.map(i => i.code + ':' + i.quantity).join(', ')})
💰 TỔNG CỘNG: ${formatVND(order.totalAmount)} (${formatK(order.totalAmount)})
${order.notes ? `📝 Ghi chú: ${order.notes}\n` : ''}------------------------------
Xưởng In Ly Nhựa xin cảm ơn Quý khách! 🙏`;
}

// POS DATABASE REPOSITORY

// SHARED DATABASE API UTILITIES (Multi-Browser Sync)
export async function postLocalApi(payload: any): Promise<void> {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Ignore when offline
  }
}

export async function syncFromLocalApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/db');
    if (!res.ok) return false;
    const data = await res.json();
    let hasChanges = false;

    if (Array.isArray(data.products) && data.products.length > 0) {
      const existing = getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);
      const exMap = new Map(existing.map(p => [p.id, p]));
      const mergedProducts = data.products.map((p: any) => ({
        ...p,
        costPrice: p.costPrice !== undefined && p.costPrice !== null && p.costPrice !== '' 
          ? Number(p.costPrice) 
          : exMap.get(p.id)?.costPrice
      }));
      setStorage(STORAGE_KEYS.PRODUCTS, mergedProducts);
      window.dispatchEvent(new Event('pos_products_updated'));
      hasChanges = true;
    }
    if (Array.isArray(data.customers) && data.customers.length > 0) {
      setStorage(STORAGE_KEYS.CUSTOMERS, data.customers);
      window.dispatchEvent(new Event('pos_customers_updated'));
      hasChanges = true;
    }
    if (Array.isArray(data.orders)) {
      setStorage(STORAGE_KEYS.ORDERS, data.orders);
      window.dispatchEvent(new Event('pos_orders_updated'));
      hasChanges = true;
    }
    return hasChanges;
  } catch {
    return false;
  }
}

export const posDb = {
  // PRODUCTS
  getProducts(): Product[] {
    const list = getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return [...list].sort((a, b) => {
      const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      if (tA && tB && tA !== tB) return tB - tA;
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numB - numA;
      return b.id.localeCompare(a.id);
    });
  },

  saveProduct(prod: Product): void {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === prod.id);
    const updatedProd: Product = {
      ...prod,
      createdAt: prod.createdAt || (idx >= 0 ? list[idx].createdAt : undefined) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      list.splice(idx, 1);
    }
    list.unshift(updatedProd);
    setStorage(STORAGE_KEYS.PRODUCTS, list);
    window.dispatchEvent(new Event('pos_products_updated'));
    void postLocalApi({ action: 'saveProduct', product: prod });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          const payload: any = {
            id: prod.id,
            code: prod.code,
            name: prod.name,
            price: prod.price,
            unit: prod.unit,
            category: prod.category,
            is_popular: prod.isPopular ?? true,
            created_at: new Date().toISOString()
          };
          if (prod.costPrice !== undefined && prod.costPrice !== null && prod.costPrice !== ('' as any)) {
            payload.cost_price = Number(prod.costPrice);
          }
          const { error } = await client.from('pos_products').upsert(payload, { onConflict: 'id' });
          if (error) {
            delete payload.cost_price;
            await client.from('pos_products').upsert(payload, { onConflict: 'id' });
          }
        } catch (err) {
          console.warn('Lỗi mạng Supabase:', err);
        }
      })();
    }
  },

  deleteProduct(id: string): void {
    const list = this.getProducts().filter(p => p.id !== id);
    setStorage(STORAGE_KEYS.PRODUCTS, list);
    window.dispatchEvent(new Event('pos_products_updated'));
    void postLocalApi({ action: 'deleteProduct', id });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          const { error } = await client.from('pos_products').delete().eq('id', id);
          if (error) console.warn('Lỗi xóa SP trên Supabase:', error.message);
        } catch (err) {
          console.warn('Lỗi mạng Supabase:', err);
        }
      })();
    }
  },

  // CUSTOMERS
  getCustomers(): Customer[] {
    const list = getStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    return [...list].sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      if (tA && tB && tA !== tB) return tB - tA;
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numB - numA;
      return (b.code || b.id).localeCompare(a.code || a.id);
    });
  },

  saveCustomer(cust: Customer): Customer {
    const list = this.getCustomers();
    const idx = list.findIndex(c => c.id === cust.id);
    const updatedCust: Customer = {
      ...cust,
      createdAt: cust.createdAt || (idx >= 0 ? list[idx].createdAt : undefined) || new Date().toISOString()
    };
    if (idx >= 0) {
      list.splice(idx, 1);
    }
    list.unshift(updatedCust);
    setStorage(STORAGE_KEYS.CUSTOMERS, list);
    window.dispatchEvent(new Event('pos_customers_updated'));
    void postLocalApi({ action: 'saveCustomer', customer: cust });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          const { error } = await client.from('pos_customers').upsert({
            id: cust.id,
            code: cust.code || null,
            name: cust.name,
            phone: cust.phone || null,
            address: cust.address || null,
            notes: cust.notes || null,
            created_at: cust.createdAt || new Date().toISOString()
          }, { onConflict: 'id' });
          if (error) console.warn('Lỗi lưu khách lên Supabase:', error.message);
        } catch (err) {
          console.warn('Lỗi mạng Supabase:', err);
        }
      })();
    }
    return cust;
  },

  deleteCustomer(id: string): void {
    const list = this.getCustomers().filter(c => c.id !== id);
    setStorage(STORAGE_KEYS.CUSTOMERS, list);
    window.dispatchEvent(new Event('pos_customers_updated'));
    void postLocalApi({ action: 'deleteCustomer', id });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          const { error } = await client.from('pos_customers').delete().eq('id', id);
          if (error) console.warn('Lỗi xóa khách trên Supabase:', error.message);
        } catch (err) {
          console.warn('Lỗi mạng Supabase:', err);
        }
      })();
    }
  },

  // ORDERS
  getOrders(): Order[] {
    const list = getStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    return [...list].sort((a, b) => {
      const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      if (!isNaN(tA) && !isNaN(tB) && tA !== tB) return tB - tA;
      const numA = parseInt(a.code.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.code.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numB - numA;
      return (b.code || '').localeCompare(a.code || '');
    });
  },

  getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  },

  saveOrder(order: Order): Order {
    const list = this.getOrders();
    const idx = list.findIndex(o => o.id === order.id);
    const updated: Order = {
      ...order,
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      list.splice(idx, 1);
    }
    list.unshift(updated);
    setStorage(STORAGE_KEYS.ORDERS, list);
    window.dispatchEvent(new Event('pos_orders_updated'));
    void postLocalApi({ action: 'saveOrder', order: updated });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          const { error } = await client.from('pos_orders').upsert({
            id: updated.id,
            code: updated.code,
            customer_id: updated.customerId || null,
            customer_name: updated.customerName,
            customer_phone: updated.customerPhone || null,
            customer_address: updated.customerAddress || null,
            items: updated.items,
            total_quantity: updated.totalQuantity,
            total_amount: updated.totalAmount,
            notes: updated.notes || '',
            status: updated.status,
            created_at: updated.createdAt,
            updated_at: updated.updatedAt
          }, { onConflict: 'id' });
          if (error) console.warn('Lỗi lưu đơn hàng lên Supabase:', error.message);
        } catch (err) {
          console.warn('Lỗi mạng Supabase:', err);
        }
      })();
    }
    return updated;
  },

  
  // BATCH DELETE & CLEAR PRODUCTS
  deleteMultipleProducts(ids: string[]): void {
    const idSet = new Set(ids);
    const list = this.getProducts().filter(p => !idSet.has(p.id));
    setStorage(STORAGE_KEYS.PRODUCTS, list);
    window.dispatchEvent(new Event('pos_products_updated'));
    void postLocalApi({ action: 'deleteMultipleProducts', ids });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          await client.from('pos_products').delete().in('id', ids);
        } catch (err) {
          console.warn('Lỗi xóa nhiều SP trên Supabase:', err);
        }
      })();
    }
  },

  clearAllProducts(): void {
    setStorage(STORAGE_KEYS.PRODUCTS, []);
    window.dispatchEvent(new Event('pos_products_updated'));
    void postLocalApi({ action: 'clearAllProducts' });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          await client.from('pos_products').delete().neq('id', '');
        } catch (err) {
          console.warn('Lỗi xóa toàn bộ SP trên Supabase:', err);
        }
      })();
    }
  },

  // BATCH DELETE & CLEAR CUSTOMERS
  deleteMultipleCustomers(ids: string[]): void {
    const idSet = new Set(ids);
    const list = this.getCustomers().filter(c => !idSet.has(c.id));
    setStorage(STORAGE_KEYS.CUSTOMERS, list);
    window.dispatchEvent(new Event('pos_customers_updated'));
    void postLocalApi({ action: 'deleteMultipleCustomers', ids });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          await client.from('pos_customers').delete().in('id', ids);
        } catch (err) {
          console.warn('Lỗi xóa nhiều khách trên Supabase:', err);
        }
      })();
    }
  },

  clearAllCustomers(): void {
    setStorage(STORAGE_KEYS.CUSTOMERS, []);
    window.dispatchEvent(new Event('pos_customers_updated'));
    void postLocalApi({ action: 'clearAllCustomers' });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          await client.from('pos_customers').delete().neq('id', '');
        } catch (err) {
          console.warn('Lỗi xóa toàn bộ khách trên Supabase:', err);
        }
      })();
    }
  },

  // BATCH DELETE & CLEAR ORDERS
  deleteMultipleOrders(ids: string[]): void {
    const idSet = new Set(ids);
    const list = this.getOrders().filter(o => !idSet.has(o.id));
    setStorage(STORAGE_KEYS.ORDERS, list);
    window.dispatchEvent(new Event('pos_orders_updated'));
    void postLocalApi({ action: 'deleteMultipleOrders', ids });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          await client.from('pos_orders').delete().in('id', ids);
        } catch (err) {
          console.warn('Lỗi xóa nhiều đơn trên Supabase:', err);
        }
      })();
    }
  },

  clearAllOrders(): void {
    setStorage(STORAGE_KEYS.ORDERS, []);
    window.dispatchEvent(new Event('pos_orders_updated'));
    void postLocalApi({ action: 'clearAllOrders' });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          await client.from('pos_orders').delete().neq('id', '');
        } catch (err) {
          console.warn('Lỗi xóa toàn bộ đơn trên Supabase:', err);
        }
      })();
    }
  },

  deleteOrder(id: string): void {
    const list = this.getOrders().filter(o => o.id !== id);
    setStorage(STORAGE_KEYS.ORDERS, list);
    window.dispatchEvent(new Event('pos_orders_updated'));
    void postLocalApi({ action: 'deleteOrder', id });

    const client = getSupabaseClient();
    if (client) {
      void (async () => {
        try {
          const { error } = await client.from('pos_orders').delete().eq('id', id);
          if (error) console.warn('Lỗi xóa đơn trên Supabase:', error.message);
        } catch (err) {
          console.warn('Lỗi mạng Supabase:', err);
        }
      })();
    }
  },

  resetDemoData(): void {
    setStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    setStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    setStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    window.dispatchEvent(new Event('pos_products_updated'));
    window.dispatchEvent(new Event('pos_customers_updated'));
    window.dispatchEvent(new Event('pos_orders_updated'));
  }
};

export async function initAutoSupabaseSync(): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Chưa khởi tạo client Supabase' };
  }

  try {
    const { data: existingProducts, error: pError } = await client
      .from('pos_products')
      .select('id')
      .limit(1);

    if (pError) {
      if (pError.code === 'PGRST205' || pError.code === '42P01' || pError.message?.includes('schema cache')) {
        console.warn('[Supabase AutoSync] Chưa tạo bảng trên Supabase. Cần chạy schema SQL trên Supabase.');
        return { 
          ok: false, 
          message: 'Supabase đã kết nối nhưng chưa có bảng SQL.' 
        };
      }
      return { ok: false, message: `Lỗi Supabase: ${pError.message}` };
    }

    if (!existingProducts || existingProducts.length === 0) {
      console.log('[Supabase AutoSync] Cloud rỗng, tự động đẩy dữ liệu xưởng lên Cloud...');
      const pushRes = await pushAllToSupabase();
      return { ok: true, message: `Đã tự động khởi tạo dữ liệu lên Cloud: ${pushRes.message}` };
    }

    console.log('[Supabase AutoSync] Đang đồng bộ dữ liệu từ Cloud về máy...');
    const syncRes = await syncFromSupabase();
    return { ok: true, message: `Đã đồng bộ từ Cloud: ${syncRes.message}` };
  } catch (err: any) {
    console.warn('[Supabase AutoSync] Lỗi:', err);
    return { ok: false, message: `Lỗi kết nối tự động: ${err.message || 'Lỗi mạng'}` };
  }
}
