import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, ChevronDown, ChevronUp, Camera, Share2, Copy, Download, Edit, Trash2, Calendar, 
  Phone, MapPin, X, FileSpreadsheet, TrendingUp, PackageCheck, Coins 
} from 'lucide-react';
import { Order } from '../../types/pos';
import { posDb, formatVND, formatK, generateZaloMessage } from '../../utils/posStorage';
import { exportOrdersToExcel } from '../../utils/excelHelper';
import { Pagination } from './Pagination';
import html2canvas from 'html2canvas';

interface OrdersScreenProps {
  onEditOrder: (order: Order) => void;
  onShowToast: (msg: string) => void;
}

const ITEMS_PER_PAGE = 10;

// Helper to reliably parse date from various formats
function parseOrderDate(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;
  // Format DD/MM/YYYY
  const vnMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vnMatch) {
    return {
      day: parseInt(vnMatch[1]),
      month: parseInt(vnMatch[2]),
      year: parseInt(vnMatch[3])
    };
  }
  // Format YYYY-MM-DD
  const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1]),
      month: parseInt(isoMatch[2]),
      day: parseInt(isoMatch[3])
    };
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear()
    };
  }
  return null;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ onEditOrder, onShowToast }) => {
  const [orders, setOrders] = useState<Order[]>(posDb.getOrders());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Time & Revenue Filter
  const currentDate = new Date();
  const [filterType, setFilterType] = useState<'all' | 'today' | '7days' | 'month' | 'year'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Pagination state (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);

  // Order Receipt Capture Modal State
  const [selectedOrderForCapture, setSelectedOrderForCapture] = useState<Order | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const receiptCaptureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => setOrders(posDb.getOrders());
    window.addEventListener('pos_orders_updated', handleUpdate);
    return () => window.removeEventListener('pos_orders_updated', handleUpdate);
  }, []);

  // Reset to page 1 whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, selectedMonth, selectedYear]);

  // Available years for dropdown
  const availableYears = [2024, 2025, 2026, 2027];

  // Filter orders by search and time
  const filteredOrders = orders.filter(o => {
    // Search match
    if (searchQuery.trim()) {
      const clean = searchQuery.trim().toLowerCase();
      const matchesSearch = (
        o.code.toLowerCase().includes(clean) ||
        o.customerName.toLowerCase().includes(clean) ||
        (o.customerPhone && o.customerPhone.includes(clean))
      );
      if (!matchesSearch) return false;
    }

    // Time & Revenue filter match
    if (filterType === 'all') return true;

    const parsed = parseOrderDate(o.createdAt);
    if (!parsed) return true;

    const now = new Date();

    if (filterType === 'today') {
      const todayDay = now.getDate();
      const todayMonth = now.getMonth() + 1;
      const todayYear = now.getFullYear();
      return parsed.day === todayDay && parsed.month === todayMonth && parsed.year === todayYear;
    } else if (filterType === '7days') {
      const orderDateObj = new Date(parsed.year, parsed.month - 1, parsed.day);
      const diffDays = (now.getTime() - orderDateObj.getTime()) / (1000 * 3600 * 24);
      return diffDays >= -0.5 && diffDays <= 7;
    } else if (filterType === 'month') {
      return parsed.month === selectedMonth && parsed.year === selectedYear;
    } else if (filterType === 'year') {
      return parsed.year === selectedYear;
    }

    return true;
  });

  // Sắp xếp đơn hàng mới nhất lên đầu tiên (Newest first)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
    if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
      return tB - tA;
    }
    const numA = parseInt(a.code.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.code.replace(/\D/g, '')) || 0;
    if (numA !== numB) return numB - numA;
    return (b.code || '').localeCompare(a.code || '');
  });


  // Bảng tra giá vốn sản phẩm để tính lợi nhuận
  const products = posDb.getProducts();
  const productCostMap = new Map<string, number>();
  products.forEach(p => {
    if (p.costPrice !== undefined && p.costPrice !== null) {
      productCostMap.set(p.id, p.costPrice);
      productCostMap.set(p.code.toUpperCase(), p.costPrice);
    }
  });

  const getOrderItemCost = (it: any): number => {
    const qty = it.quantity || 0;
    if (it.costPrice !== undefined && it.costPrice !== null && it.costPrice > 0) {
      return it.costPrice * qty;
    }
    if (it.productId && productCostMap.has(it.productId)) {
      return (productCostMap.get(it.productId) || 0) * qty;
    }
    if (it.code && productCostMap.has(String(it.code).toUpperCase())) {
      return (productCostMap.get(String(it.code).toUpperCase()) || 0) * qty;
    }
    return 0;
  };

  const getOrderProfit = (order: Order): number => {
    let cost = 0;
    (order.items || []).forEach(it => {
      cost += getOrderItemCost(it);
    });
    return Math.max(0, order.totalAmount - cost);
  };

  // Calculate Statistics for filtered data
  const totalOrdersCount = sortedOrders.length;
  const totalRevenue = sortedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalProfit = sortedOrders.reduce((sum, o) => sum + getOrderProfit(o), 0);
  const totalItemsSold = sortedOrders.reduce((sum, o) => sum + o.totalQuantity, 0);

  // Paginated slice (10 items per page)
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Toggle order expansion
  const toggleExpand = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (sortedOrders.length === 0) {
      alert('Không có đơn hàng nào để xuất Excel!');
      return;
    }
    try {
      exportOrdersToExcel(sortedOrders);
      onShowToast(`Đã xuất file Excel cho ${filteredOrders.length} đơn hàng!`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
    }
  };

  // Execute Capture Receipt Image
  const handleCaptureOrder = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderForCapture(order);
    setIsCapturing(true);

    try {
      // Allow DOM to render receipt template
      await new Promise(r => setTimeout(r, 120));

      if (!receiptCaptureRef.current) {
        throw new Error('Receipt element not found');
      }

      const canvas = await html2canvas(receiptCaptureRef.current, {
        scale: 2, // High resolution crisp image
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      setCapturedImageUrl(imgData);
    } catch (err) {
      console.error('Error capturing receipt screenshot:', err);
      alert('Không thể tạo ảnh chụp hóa đơn. Vui lòng thử lại!');
    } finally {
      setIsCapturing(false);
    }
  };

  // Share Image via Web Share API (Direct to Zalo on Mobile)
  const handleShareToZalo = async () => {
    if (!capturedImageUrl || !selectedOrderForCapture) return;

    try {
      const res = await fetch(capturedImageUrl);
      const blob = await res.blob();
      const file = new File([blob], `don-hang-${selectedOrderForCapture.code || 'In-Ly'}-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Đơn hàng in ly - ${selectedOrderForCapture.customerName || 'Khách Lẻ'}`,
          text: `Đơn hàng in ly ${selectedOrderForCapture.code} gửi ${selectedOrderForCapture.customerName || 'Quý khách'}`
        });
        onShowToast('Đã mở Zalo để gửi ảnh đơn!');
      } else {
        handleDownloadImage();
        onShowToast('Trình duyệt chưa hỗ trợ chia sẻ trực tiếp. Đã tải ảnh về máy!');
      }
    } catch (err) {
      console.warn('Share cancelled or not supported:', err);
    }
  };

  // Copy Image to Clipboard (Ctrl+V in Zalo PC / Web)
  const handleCopyImageToClipboard = async () => {
    if (!capturedImageUrl) return;

    try {
      const res = await fetch(capturedImageUrl);
      const blob = await res.blob();
      // @ts-ignore
      if (navigator.clipboard && window.ClipboardItem) {
        // @ts-ignore
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        onShowToast('Đã sao chép ảnh! Hãy mở Zalo và nhấn Ctrl+V để dán ảnh.');
      } else {
        handleDownloadImage();
        onShowToast('Đã tải ảnh về máy!');
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      handleDownloadImage();
      onShowToast('Đã tải ảnh về máy để gửi Zalo!');
    }
  };

  // Download image file
  const handleDownloadImage = () => {
    if (!capturedImageUrl || !selectedOrderForCapture) return;
    const a = document.createElement('a');
    a.href = capturedImageUrl;
    a.download = `Don-Hang-${selectedOrderForCapture.code || 'In-Ly'}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copy Text format for Zalo as fallback
  const handleCopyTextZalo = () => {
    if (!selectedOrderForCapture) return;
    const text = generateZaloMessage(selectedOrderForCapture);
    navigator.clipboard.writeText(text).then(() => {
      onShowToast(`Đã sao chép tin nhắn đơn ${selectedOrderForCapture.code}!`);
    }).catch(() => {
      alert(text);
    });
  };


  // Multi-selection handlers for Orders
  const handleToggleSelectAllOrders = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedOrders = () => {
    if (selectedOrderIds.length === 0) return;
    const isAll = selectedOrderIds.length === orders.length || selectedOrderIds.length === filteredOrders.length;
    const confirmMsg = isAll
      ? `CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ ${selectedOrderIds.length} đơn hàng không? Hành động này không thể hoàn tác!`
      : `Xác nhận xóa ${selectedOrderIds.length} đơn hàng đã chọn?`;

    if (window.confirm(confirmMsg)) {
      if (isAll && selectedOrderIds.length === orders.length) {
        posDb.clearAllOrders();
      } else {
        posDb.deleteMultipleOrders(selectedOrderIds);
      }
      setSelectedOrderIds([]);
      onShowToast(`Đã xóa ${selectedOrderIds.length} đơn hàng thành công!`);
    }
  };

  const handleDeleteAllOrders = () => {
    if (orders.length === 0) return;
    if (window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ ${orders.length} đơn hàng trong hệ thống không? Không thể hoàn tác!`)) {
      posDb.clearAllOrders();
      setSelectedOrderIds([]);
      onShowToast(`Đã xóa sạch toàn bộ đơn hàng!`);
    }
  };

  // Delete Order
  const handleDeleteOrder = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Xác nhận xóa đơn hàng ${order.code} của ${order.customerName || 'Khách Lẻ'}?`)) {
      posDb.deleteOrder(order.id);
      setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
      onShowToast(`Đã xóa đơn ${order.code}!`);
    }
  };

  // Edit Order
  const handleEdit = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditOrder(order);
  };

  return (
    <div className="pos-content" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 20px)' }}>
      {/* TOP STATS CARDS: DOANH THU & LỢI NHUẬN CẠNH NHAU */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 6,
        marginBottom: 8
      }}>
        {/* DOANH THU */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 11, color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={12} />
            <span>Doanh Thu</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatVND(totalRevenue)}
          </div>
        </div>

        {/* LỢI NHUẬN (CẠNH Ô DOANH THU) */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Coins size={12} />
            <span>Lợi Nhuận</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatVND(totalProfit)}
          </div>
        </div>

        {/* SỐ ĐƠN HÀNG */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Số Đơn Hàng</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
            {totalOrdersCount} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>đơn</span>
          </div>
        </div>

        {/* TỔNG ĐÃ BÁN */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <PackageCheck size={12} />
            <span>Tổng Đã Bán</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
            {totalItemsSold} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>cây/thiên</span>
          </div>
        </div>
      </div>

      {/* TIME & REVENUE FILTER CHIPS */}
      <div className="pos-chips-scroll" style={{ marginBottom: 6 }}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'today', label: 'Hôm nay' },
          { key: '7days', label: '7 ngày qua' },
          { key: 'month', label: 'Theo Tháng' },
          { key: 'year', label: 'Theo Năm' }
        ].map(tf => (
          <button
            key={tf.key}
            type="button"
            className="pos-chip"
            style={{
              backgroundColor: filterType === tf.key ? '#15803d' : '#ffffff',
              color: filterType === tf.key ? '#ffffff' : '#475569',
              borderColor: filterType === tf.key ? '#15803d' : '#e2e8f0',
              fontWeight: filterType === tf.key ? 700 : 500
            }}
            onClick={() => setFilterType(tf.key as any)}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* MONTH / YEAR SELECTOR (WHEN FILTERING BY MONTH OR YEAR) */}
      {filterType === 'month' && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          background: '#f0fdf4', 
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '6px 10px',
          marginBottom: 8
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', flexShrink: 0 }}>
            Doanh thu tháng:
          </span>
          <select 
            className="pos-select pos-input-sm" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{ flex: 1, height: 34, background: '#ffffff' }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select 
            className="pos-select pos-input-sm" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: 85, height: 34, background: '#ffffff' }}
          >
            {availableYears.map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>
      )}

      {filterType === 'year' && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          background: '#f0fdf4', 
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '6px 10px',
          marginBottom: 8
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', flexShrink: 0 }}>
            Doanh thu năm:
          </span>
          <select 
            className="pos-select pos-input-sm" 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ flex: 1, height: 34, background: '#ffffff' }}
          >
            {availableYears.map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>
      )}

      {/* SEARCH AND EXPORT EXCEL BAR */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div className="pos-search-input-wrap" style={{ flex: 1 }}>
          <Search size={18} className="pos-search-icon" />
          <input
            type="text"
            className="pos-input pos-search-input"
            placeholder="Tìm theo mã (#DH...), tên khách, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 10, background: 'none', border: 'none',
                color: '#94a3b8', cursor: 'pointer', padding: 4
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* EXPORT EXCEL BUTTON */}
        <button
          type="button"
          className="pos-btn pos-btn-secondary"
          onClick={handleExportExcel}
          title="Kết xuất file Excel danh sách đơn hàng"
          style={{ padding: '0 12px' }}
        >
          <FileSpreadsheet size={16} color="#15803d" />
          <span>Xuất Excel</span>
        </button>
      </div>

      
      {/* SELECTION BAR / BATCH ACTIONS */}
      {filteredOrders.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: selectedOrderIds.length > 0 ? '#fef2f2' : '#f8fafc',
          border: selectedOrderIds.length > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
          borderRadius: 8,
          marginBottom: 8
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}>
            <input
              type="checkbox"
              checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
              onChange={handleToggleSelectAllOrders}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#dc2626' }}
            />
            <span>
              {selectedOrderIds.length > 0 
                ? `Đã chọn ${selectedOrderIds.length} / ${filteredOrders.length} đơn` 
                : `Chọn tất cả (${filteredOrders.length} đơn)`}
            </span>
          </label>

          {selectedOrderIds.length > 0 ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="pos-btn pos-btn-secondary"
                style={{ height: 30, padding: '0 8px', fontSize: 12 }}
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedOrders}
                className="pos-btn"
                style={{
                  height: 30,
                  padding: '0 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Trash2 size={13} />
                <span>Xóa {selectedOrderIds.length === filteredOrders.length ? 'toàn bộ' : `(${selectedOrderIds.length})`}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDeleteAllOrders}
              title="Xóa toàn bộ đơn hàng"
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px'
              }}
            >
              <Trash2 size={12} />
              <span>Xóa toàn bộ</span>
            </button>
          )}
        </div>
      )}

      {/* ORDERS LIST (PAGINATED 10 PER PAGE) */}
      {filteredOrders.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1.5px dashed #cbd5e1',
          borderRadius: 10,
          padding: '30px 16px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Không tìm thấy đơn hàng nào</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Chuyển sang tab "Tính tiền" để lập đơn mới.</p>
        </div>
      ) : (
        paginatedOrders.map(order => {
          const isExpanded = expandedOrderId === order.id;

          return (
            <div 
              key={order.id} 
              className="pos-card"
              style={{
                padding: '10px 12px',
                marginBottom: 8,
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                border: selectedOrderIds.includes(order.id) ? '1.5px solid #ef4444' : isExpanded ? '1.5px solid #15803d' : '1px solid var(--border)',
                backgroundColor: selectedOrderIds.includes(order.id) ? '#fff5f5' : '#ffffff'
              }}
              onClick={() => toggleExpand(order.id)}
            >
              {/* TOP HEADER OF CARD */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.includes(order.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleSelectOrder(order.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 17,
                      height: 17,
                      cursor: 'pointer',
                      accentColor: '#dc2626',
                      flexShrink: 0
                    }}
                    aria-label={`Chọn đơn ${order.code}`}
                  />
                  <span style={{
                    background: '#15803d',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 4
                  }}>
                    {order.code}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    {order.customerName}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#15803d' }}>
                    {formatVND(order.totalAmount)}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 3 }}>
                    ({formatK(order.totalAmount)})
                  </span>
                </div>
              </div>

              {/* SECOND LINE: DATE + ITEM COUNT */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                fontSize: 12, 
                color: '#64748b',
                paddingBottom: isExpanded ? 8 : 0,
                borderBottom: isExpanded ? '1px dashed #e2e8f0' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} />
                  <span>{order.createdAt}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{order.totalQuantity} món ({order.items.length} loại)</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {/* EXPANDED DETAILS */}
              {isExpanded && (
                <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                  {/* Customer Meta */}
                  {(order.customerPhone || order.customerAddress) && (
                    <div style={{ 
                      fontSize: 12, 
                      color: '#475569', 
                      background: '#f8fafc', 
                      padding: '6px 8px', 
                      borderRadius: 6,
                      marginBottom: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3
                    }}>
                      {order.customerPhone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={12} color="#15803d" />
                          <span>{order.customerPhone}</span>
                        </div>
                      )}
                      {order.customerAddress && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} color="#15803d" />
                          <span>{order.customerAddress}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items Table */}
                  <div style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: 6, 
                    overflow: 'hidden', 
                    fontSize: 12, 
                    marginBottom: 8 
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: '#f1f5f9', color: '#475569' }}>
                        <tr>
                          <th style={{ padding: '4px 8px' }}>Tên sản phẩm</th>
                          <th style={{ padding: '4px 6px', textAlign: 'center' }}>SL</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Giá (k)</th>
                          <th style={{ padding: '4px 8px', textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((it, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: 600 }}>
                              {it.name}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>
                              {it.quantity}
                            </td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', color: '#64748b' }}>
                              {it.unitPrice}k
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                              {formatVND(it.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {order.notes && (
                    <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 8 }}>
                      📝 Ghi chú: {order.notes}
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 6, marginTop: 6 }}>
                    <button
                      type="button"
                      className="pos-btn pos-btn-zalo pos-btn-sm"
                      onClick={(e) => handleCaptureOrder(order, e)}
                      disabled={isCapturing}
                      title="Chụp ảnh đơn hàng giống bên màn hình đặt đơn"
                    >
                      <Camera size={13} />
                      <span>{isCapturing && selectedOrderForCapture?.id === order.id ? 'Đang chụp...' : 'Chụp ảnh đơn'}</span>
                    </button>

                    <button
                      type="button"
                      className="pos-btn pos-btn-secondary pos-btn-sm"
                      onClick={(e) => handleEdit(order, e)}
                    >
                      <Edit size={13} />
                      <span>Sửa đơn</span>
                    </button>

                    <button
                      type="button"
                      className="pos-btn pos-btn-danger pos-btn-sm"
                      onClick={(e) => handleDeleteOrder(order, e)}
                    >
                      <Trash2 size={13} />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* PAGINATION: 10 ĐƠN / TRANG */}
      <Pagination
        currentPage={currentPage}
        totalItems={sortedOrders.length}
        pageSize={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      {/* HIDDEN RECEIPT COMPONENT FOR ULTRA-CRISP 2X SCREENSHOT CAPTURE */}
      <div className="receipt-capture-wrapper" ref={receiptCaptureRef}>
        {selectedOrderForCapture && (
          <>
            <div className="receipt-header-box">
              <div className="receipt-shop-title">XƯỞNG IN LY NHỰA</div>
              <div className="receipt-sub-title">HÓA ĐƠN ĐẶT IN LY & PHỤ KIỆN</div>
              <div className="receipt-date-time">
                Mã đơn: <strong>{selectedOrderForCapture.code}</strong> | Ngày: {selectedOrderForCapture.createdAt || new Date().toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="receipt-customer-box">
              <div className="receipt-customer-row">
                <span className="receipt-cust-label">Khách hàng:</span>
                <span className="receipt-cust-val">{selectedOrderForCapture.customerName || 'Khách Lẻ'}</span>
              </div>
              {selectedOrderForCapture.customerPhone && (
                <div className="receipt-customer-row">
                  <span className="receipt-cust-label">Số ĐT:</span>
                  <span className="receipt-cust-val">{selectedOrderForCapture.customerPhone}</span>
                </div>
              )}
              {selectedOrderForCapture.customerAddress && (
                <div className="receipt-customer-row">
                  <span className="receipt-cust-label">Địa chỉ:</span>
                  <span className="receipt-cust-val">{selectedOrderForCapture.customerAddress}</span>
                </div>
              )}
            </div>

            <table className="receipt-table">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Tên Sản Phẩm</th>
                  <th style={{ textAlign: 'center', width: '15%' }}>SL</th>
                  <th style={{ textAlign: 'right', width: '15%' }}>Đ.Giá</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>T.Tiền</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrderForCapture.items.map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{it.name}</td>
                    <td style={{ textAlign: 'center', fontWeight: 800 }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right', color: '#475569' }}>{it.unitPrice}k</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#15803d' }}>{formatVND(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="receipt-total-box">
              <div className="receipt-total-row" style={{ alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>TỔNG TIỀN:</span>
                <span className="receipt-grand-total">{formatVND(selectedOrderForCapture.totalAmount)}</span>
              </div>
            </div>

            {selectedOrderForCapture.notes && (
              <div className="receipt-notes-box">
                <strong>Ghi chú:</strong> {selectedOrderForCapture.notes}
              </div>
            )}

            <div className="receipt-footer-box">
              Xưởng In Ly Nhựa xin chân thành cảm ơn Quý khách! 🙏
            </div>
          </>
        )}
      </div>

      {/* SCREENSHOT PREVIEW MODAL */}
      {capturedImageUrl && (
        <div className="pos-sheet-backdrop" onClick={() => setCapturedImageUrl(null)}>
          <div className="pos-sheet-container" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
            <div className="pos-sheet-header">
              <div className="pos-sheet-title" style={{ color: '#15803d' }}>
                📸 Ảnh Hóa Đơn Đơn Hàng {selectedOrderForCapture?.code}
              </div>
              <button 
                type="button" 
                className="pos-icon-btn" 
                style={{ color: '#64748b' }}
                onClick={() => setCapturedImageUrl(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* PREVIEW OF THE CAPTURED IMAGE */}
            <div className="pos-image-preview-card">
              <img src={capturedImageUrl} alt={`Hóa đơn ${selectedOrderForCapture?.code || ''}`} />
            </div>

            {/* ACTION BUTTONS: SHARE / COPY / DOWNLOAD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="pos-btn pos-btn-zalo"
                onClick={handleShareToZalo}
              >
                <Share2 size={16} />
                <span>Gửi qua ứng dụng Zalo</span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  type="button"
                  className="pos-btn pos-btn-secondary"
                  onClick={handleCopyImageToClipboard}
                  title="Sao chép ảnh vào bộ nhớ tạm (dán Ctrl+V vào Zalo PC)"
                >
                  <Copy size={15} />
                  <span>Sao chép ảnh</span>
                </button>

                <button
                  type="button"
                  className="pos-btn pos-btn-secondary"
                  onClick={handleDownloadImage}
                  title="Tải file ảnh PNG về máy"
                >
                  <Download size={15} />
                  <span>Tải ảnh về máy</span>
                </button>
              </div>

              <button
                type="button"
                className="pos-btn pos-btn-secondary pos-btn-sm"
                onClick={handleCopyTextZalo}
                style={{ color: '#475569' }}
              >
                <span>Sao chép thêm tin nhắn chữ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
