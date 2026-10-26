import * as XLSX from 'xlsx';
import { Product, Customer, Order } from '../types/pos';
import { formatVND } from './posStorage';

// EXPORT ORDERS TO EXCEL
export function exportOrdersToExcel(orders: Order[]) {
  const data = orders.map((ord, idx) => ({
    'STT': idx + 1,
    'Mã đơn': ord.code,
    'Ngày đặt': ord.createdAt,
    'Tên khách / Quán': ord.customerName,
    'Số điện thoại': ord.customerPhone || '',
    'Địa chỉ giao hàng': ord.customerAddress || '',
    'Chi tiết sản phẩm': ord.items.map(it => `${it.name} (x${it.quantity})`).join(', '),
    'Tổng số lượng': ord.totalQuantity,
    'Tổng tiền (k)': ord.totalAmount,
    'Tổng tiền (VNĐ)': ord.totalAmount * 1000,
    'Trạng thái': ord.status,
    'Ghi chú': ord.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  // Auto-fit column widths
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã đơn
    { wch: 18 }, // Ngày đặt
    { wch: 24 }, // Tên khách
    { wch: 14 }, // SĐT
    { wch: 30 }, // Địa chỉ
    { wch: 40 }, // Chi tiết
    { wch: 14 }, // Tổng SL
    { wch: 14 }, // Tổng k
    { wch: 16 }, // Tổng VNĐ
    { wch: 12 }, // Trạng thái
    { wch: 30 }, // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Đơn Hàng');
  const filename = `Don_Hang_In_Ly_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// EXPORT CUSTOMERS TO EXCEL
export function exportCustomersToExcel(customers: Customer[], orders: Order[]) {
  const data = customers.map((c, idx) => {
    const custOrders = orders.filter(o => 
      (o.customerId && o.customerId === c.id) || 
      (o.customerPhone && c.phone && o.customerPhone === c.phone) ||
      (o.customerName && o.customerName.toLowerCase() === c.name.toLowerCase())
    );
    const totalSpentK = custOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      'STT': idx + 1,
      'Tên khách / Quán': c.name,
      'Số điện thoại': c.phone || '',
      'Địa chỉ': c.address || '',
      'Ghi chú riêng': c.notes || '',
      'Số đơn đã đặt': custOrders.length,
      'Tổng tiền đã mua (VNĐ)': totalSpentK * 1000,
      'Ngày tạo': c.createdAt ? c.createdAt.slice(0, 10) : ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 15 },
    { wch: 35 },
    { wch: 30 },
    { wch: 15 },
    { wch: 20 },
    { wch: 14 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Khách Hàng');
  const filename = `Danh_Sach_Khach_Hang_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// DOWNLOAD PRODUCT EXCEL TEMPLATE
export function downloadProductExcelTemplate() {
  const sampleProducts = [
    {
      'Mã sản phẩm': 'T7',
      'Tên sản phẩm': 'Cốc Tim 700ml UKP',
      'Đơn giá (k)': 730,
      'Đơn vị tính': 'thiên',
      'Danh mục': 'Cốc Tim'
    },
    {
      'Mã sản phẩm': 'DC',
      'Tên sản phẩm': 'Cốc Đáy Cầu 500ml',
      'Đơn giá (k)': 580,
      'Đơn vị tính': 'thiên',
      'Danh mục': 'Cốc Đáy Cầu'
    },
    {
      'Mã sản phẩm': 'P500',
      'Tên sản phẩm': 'Cốc PP 500ml (P5)',
      'Đơn giá (k)': 540,
      'Đơn vị tính': 'thiên',
      'Danh mục': 'Cốc PP'
    },
    {
      'Mã sản phẩm': 'ND90',
      'Tên sản phẩm': 'Nắp D90 Đậy Cốc',
      'Đơn giá (k)': 400,
      'Đơn vị tính': 'thiên',
      'Danh mục': 'Nắp & Phụ kiện'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleProducts);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_San_Pham');
  XLSX.writeFile(workbook, 'Mau_Nhap_San_Pham_Ly_Nhua.xlsx');
}

// DOWNLOAD CUSTOMER EXCEL TEMPLATE
export function downloadCustomerExcelTemplate() {
  const sampleCustomers = [
    {
      'Tên khách / Quán': 'Tiệm Trà Thị Ngọc',
      'Số điện thoại': '0976234567',
      'Địa chỉ': 'KĐT Văn Quán, Hà Đông, HN',
      'Ghi chú': 'In logo 1 màu đỏ, gửi xe buýt'
    },
    {
      'Tên khách / Quán': 'La Cà Coffee',
      'Số điện thoại': '0912345678',
      'Địa chỉ': '19 Nguyễn Trãi, Thanh Xuân, HN',
      'Ghi chú': 'Giao trực tiếp buổi chiều'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleCustomers);
  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 16 },
    { wch: 35 },
    { wch: 30 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Khach_Hang');
  XLSX.writeFile(workbook, 'Mau_Nhap_Khach_Hang.xlsx');
}

// PARSE PRODUCTS FROM UPLOADED EXCEL FILE
export async function parseProductsFromExcel(file: File): Promise<Product[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

  const products: Product[] = [];

  for (const r of rows) {
    // Find fields with flexible column naming
    const code = String(r['Mã sản phẩm'] || r['Mã'] || r['Ma'] || r['Code'] || '').trim();
    const name = String(r['Tên sản phẩm'] || r['Tên'] || r['Ten'] || r['Name'] || '').trim();
    
    // Price could be in k or full VND (e.g. 750 or 750000)
    let rawPrice = Number(r['Đơn giá (k)'] || r['Đơn giá'] || r['Don gia'] || r['Giá'] || r['Price'] || 0);
    if (rawPrice >= 10000) {
      rawPrice = Math.round(rawPrice / 1000); // Convert 750000 to 750k
    }

    const unit = String(r['Đơn vị tính'] || r['Đơn vị'] || r['Don vi'] || r['Unit'] || 'thiên').trim();
    const category = String(r['Danh mục'] || r['Danh muc'] || r['Loại'] || r['Category'] || 'Khác').trim();

    if (name) {
      products.push({
        id: 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        code: code || ('SP' + (products.length + 1)),
        name,
        price: rawPrice || 0,
        unit: unit || 'thiên',
        category: category || 'Khác',
        isPopular: true
      });
    }
  }

  return products;
}

// PARSE CUSTOMERS FROM UPLOADED EXCEL FILE
export async function parseCustomersFromExcel(file: File): Promise<Customer[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

  const customers: Customer[] = [];

  for (const r of rows) {
    const name = String(r['Tên khách / Quán'] || r['Tên khách'] || r['Tên quán'] || r['Tên'] || r['Name'] || '').trim();
    const phone = String(r['Số điện thoại'] || r['SĐT'] || r['SDT'] || r['Phone'] || '').trim();
    const address = String(r['Địa chỉ'] || r['Dia chi'] || r['Address'] || '').trim();
    const notes = String(r['Ghi chú riêng'] || r['Ghi chú'] || r['Ghi chu'] || r['Notes'] || '').trim();

    if (name) {
      customers.push({
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        name,
        phone,
        address,
        notes,
        createdAt: new Date().toISOString()
      });
    }
  }

  return customers;
}
