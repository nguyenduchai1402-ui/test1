// TypeScript interfaces for Workshop Cup Printing POS & Cash Register System

export interface Product {
  id: string;
  code: string;       // Shortcode: T7, TT2, DC, P5, U5, etc.
  name: string;       // Full name
  price: number;      // Price in thousand VND (k), e.g. 750 = 750.000đ
  unit: string;       // Đơn vị tính: thiên, cây, cái, cuộn, thùng
  category: string;   // Cốc Tim, Cốc PP, Cốc Pet, Cốc U, Nắp & Phụ kiện
  description?: string;
  isPopular?: boolean;
}

export interface Customer {
  id: string;
  code?: string;      // Mã khách KH01, KH02...
  name: string;       // Tên quán / Tên khách
  phone: string;      // Số điện thoại
  address: string;    // Địa chỉ giao hàng
  notes?: string;     // Ghi chú (màu in quen thuộc, nhà xe gửi...)
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId?: string;
  code?: string;
  name: string;
  unitPrice: number;  // Price in thousand VND (k)
  quantity: number;   // Số lượng
  amount: number;     // unitPrice * quantity (in k)
  notes?: string;     // Ghi chú từng món (in màu, kèm nắp...)
}

export interface Order {
  id: string;
  code: string;       // Mã đơn ví dụ: #DH-1024
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  totalQuantity: number;
  totalAmount: number;// Total in thousand VND (k)
  notes: string;
  status: 'Chờ in' | 'Đang in' | 'Đã in' | 'Đã giao' | 'Đã thanh toán';
  createdAt: string;
  updatedAt: string;
}

export type TabType = 'calculator' | 'orders' | 'products' | 'customers';
