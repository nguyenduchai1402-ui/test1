import { Product, Customer, Order, OrderItem } from '../types/pos';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration - falls back gracefully to localStorage
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://xdxdeggyrdifnrcyaqmu.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeGRlZ2d5cmRpZm5yY3lhcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjc4NDUsImV4cCI6MjEwMTY0Mzg0NX0.9T8L9azWQMTRHxqubLcwjvbni9IIIWS-OHptiJmlJ1g";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// LocalStorage Keys
const STORAGE_KEYS = {
  PRODUCTS: 'pos_print_products_v2',
  CUSTOMERS: 'pos_print_customers_v2',
  ORDERS: 'pos_print_orders_v2',
  SETTINGS: 'pos_print_settings_v2'
};

// Seed Products extracted from printing workshop price sheets
export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', code: 'T7', name: 'Cốc Tim 700ml UKP', price: 730, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p2', code: 'T7N', name: 'Cốc Tim 700ml Nhám UKP', price: 760, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p3', code: 'T5', name: 'Cốc Tim 500ml UKP', price: 630, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p4', code: 'T5N', name: 'Cốc Tim 500ml Nhám UKP', price: 660, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p5', code: 'TT2', name: 'Cốc Trái Tim 2 Ngăn', price: 820, unit: 'thiên', category: 'Cốc Tim', isPopular: true },
  { id: 'p6', code: 'DC', name: 'Cốc Đáy Cầu 500ml', price: 580, unit: 'thiên', category: 'Cốc Đáy Cầu', isPopular: true },
  { id: 'p7', code: 'DC7', name: 'Cốc Đáy Cầu 700ml', price: 670, unit: 'thiên', category: 'Cốc Đáy Cầu' },
  { id: 'p8', code: 'U5', name: 'Cốc U 500ml', price: 580, unit: 'thiên', category: 'Cốc U', isPopular: true },
  { id: 'p9', code: 'U5UKP', name: 'Cốc U 500ml UKP', price: 650, unit: 'thiên', category: 'Cốc U' },
  { id: 'p10', code: 'U7', name: 'Cốc U 700ml UKP', price: 680, unit: 'thiên', category: 'Cốc U' },
  { id: 'p11', code: 'P360', name: 'Cốc PP 360ml', price: 495, unit: 'thiên', category: 'Cốc PP', isPopular: true },
  { id: 'p12', code: 'P500', name: 'Cốc PP 500ml (P5)', price: 540, unit: 'thiên', category: 'Cốc PP', isPopular: true },
  { id: 'p13', code: 'P650', name: 'Cốc PP 650ml', price: 620, unit: 'thiên', category: 'Cốc PP' },
  { id: 'p14', code: 'P700', name: 'Cốc PP 700ml (P7)', price: 620, unit: 'thiên', category: 'Cốc PP', isPopular: true },
  { id: 'p15', code: 'P1000', name: 'Cốc PP 1000ml Khổng Lồ', price: 850, unit: 'thiên', category: 'Cốc PP' },
  { id: 'p16', code: 'PET300', name: 'Cốc Pet 300ml UKP', price: 438, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p17', code: 'PET360', name: 'Cốc Pet 360ml UKP', price: 495, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p18', code: 'PET400', name: 'Cốc Pet 400ml Dày UKP', price: 505, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p19', code: 'PET500', name: 'Cốc Pet 500ml UKP', price: 567, unit: 'thiên', category: 'Cốc Pet', isPopular: true },
  { id: 'p20', code: 'PET620', name: 'Cốc Pet 620ml UKP', price: 743, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p21', code: 'PET700', name: 'Cốc Pet 700ml UKP', price: 755, unit: 'thiên', category: 'Cốc Pet' },
  { id: 'p22', code: 'ND90', name: 'Nắp D90 Đậy Cốc', price: 400, unit: 'thiên', category: 'Nắp & Phụ kiện', isPopular: true },
  { id: 'p23', code: 'NN90', name: 'Nắp N90 Bằng Tiêu Chuẩn', price: 210, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p24', code: 'NC84', name: 'Nắp Cầu 84 UKP', price: 371, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p25', code: 'NC90', name: 'Nắp Cầu 90 UKP', price: 429, unit: 'thiên', category: 'Nắp & Phụ kiện', isPopular: true },
  { id: 'p26', code: 'NB90', name: 'Nắp Bằng 90 UKP', price: 309, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p27', code: 'NTT90', name: 'Nắp Tim Trong 90 UKP', price: 521, unit: 'thiên', category: 'Nắp & Phụ kiện', isPopular: true },
  { id: 'p28', code: 'NTW90', name: 'Nắp Tim Trắng 90 UKP', price: 569, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p29', code: 'NUT90', name: 'Nắp Uống Trực Tiếp 90', price: 429, unit: 'thiên', category: 'Nắp & Phụ kiện' },
  { id: 'p30', code: 'MANG', name: 'Cuộn Màng Ép Cốc Ly', price: 180, unit: 'cuộn', category: 'Phụ kiện' },
  { id: 'p31', code: 'ONGHUT', name: 'Ống Hút Trà Sữa Bọc Màng', price: 65, unit: 'cây', category: 'Phụ kiện' },
  { id: 'p32', code: 'TUI1', name: 'Túi Đựng 1 Ly Chữ T', price: 55, unit: 'kg', category: 'Phụ kiện' },
  { id: 'p33', code: 'TUI2', name: 'Túi Đựng 2 Ly Xoè Đáy', price: 55, unit: 'kg', category: 'Phụ kiện' }
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
    // Auto-expand default list if stored list is the old 2-order or 8-customer demo seed
    if (Array.isArray(parsed) && Array.isArray(defaultVal)) {
      if (key === STORAGE_KEYS.ORDERS && parsed.length <= 2 && defaultVal.length > 2) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      if (key === STORAGE_KEYS.CUSTOMERS && parsed.length <= 8 && defaultVal.length > 8) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
    }
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

  return `📋 ĐƠN HÀNG IN LY - ${order.customerName.toUpperCase()}
Mã đơn: ${order.code} | Ngày: ${dateStr}
👤 Khách hàng: ${order.customerName}
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
export const posDb = {
  // PRODUCTS
  getProducts(): Product[] {
    return getStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },

  saveProduct(prod: Product): void {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === prod.id);
    if (idx >= 0) {
      list[idx] = prod;
    } else {
      list.unshift(prod);
    }
    setStorage(STORAGE_KEYS.PRODUCTS, list);
    window.dispatchEvent(new Event('pos_products_updated'));
  },

  deleteProduct(id: string): void {
    const list = this.getProducts().filter(p => p.id !== id);
    setStorage(STORAGE_KEYS.PRODUCTS, list);
    window.dispatchEvent(new Event('pos_products_updated'));
  },

  // CUSTOMERS
  getCustomers(): Customer[] {
    return getStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  },

  saveCustomer(cust: Customer): Customer {
    const list = this.getCustomers();
    const idx = list.findIndex(c => c.id === cust.id);
    if (idx >= 0) {
      list[idx] = cust;
    } else {
      list.unshift(cust);
    }
    setStorage(STORAGE_KEYS.CUSTOMERS, list);
    window.dispatchEvent(new Event('pos_customers_updated'));
    return cust;
  },

  deleteCustomer(id: string): void {
    const list = this.getCustomers().filter(c => c.id !== id);
    setStorage(STORAGE_KEYS.CUSTOMERS, list);
    window.dispatchEvent(new Event('pos_customers_updated'));
  },

  // ORDERS
  getOrders(): Order[] {
    return getStorage<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  },

  getOrderById(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  },

  saveOrder(order: Order): Order {
    const list = this.getOrders();
    const idx = list.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      list[idx] = { ...order, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(order);
    }
    setStorage(STORAGE_KEYS.ORDERS, list);
    window.dispatchEvent(new Event('pos_orders_updated'));
    return order;
  },

  deleteOrder(id: string): void {
    const list = this.getOrders().filter(o => o.id !== id);
    setStorage(STORAGE_KEYS.ORDERS, list);
    window.dispatchEvent(new Event('pos_orders_updated'));
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
