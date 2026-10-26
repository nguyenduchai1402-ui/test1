import React, { useState, useEffect } from 'react';
import { 
  Search, ChevronDown, ChevronUp, Send, Edit, Trash2, Calendar, 
  Phone, MapPin, X, FileSpreadsheet, TrendingUp, PackageCheck 
} from 'lucide-react';
import { Order } from '../../types/pos';
import { posDb, formatVND, formatK, generateZaloMessage } from '../../utils/posStorage';
import { exportOrdersToExcel } from '../../utils/excelHelper';
import { Pagination } from './Pagination';

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

  // Time & Revenue Filter
  const currentDate = new Date();
  const [filterType, setFilterType] = useState<'all' | 'today' | '7days' | 'month' | 'year'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Pagination state (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);

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

  // Calculate Statistics for filtered data
  const totalOrdersCount = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalItemsSold = filteredOrders.reduce((sum, o) => sum + o.totalQuantity, 0);

  // Paginated slice (10 items per page)
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Toggle order expansion
  const toggleExpand = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      alert('Không có đơn hàng nào để xuất Excel!');
      return;
    }
    try {
      exportOrdersToExcel(filteredOrders);
      onShowToast(`Đã xuất file Excel cho ${filteredOrders.length} đơn hàng!`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
    }
  };

  // Copy Zalo
  const handleCopyZalo = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = generateZaloMessage(order);
    navigator.clipboard.writeText(text).then(() => {
      onShowToast(`Đã chép nội dung đơn ${order.code} để gửi Zalo!`);
    }).catch(() => {
      alert(text);
    });
  };

  // Delete Order
  const handleDeleteOrder = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Xác nhận xóa đơn hàng ${order.code} của ${order.customerName}?`)) {
      posDb.deleteOrder(order.id);
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
      {/* TOP STATS CARDS (THỐNG KÊ DOANH THU & ĐƠN HÀNG) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 6,
        marginBottom: 8
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Số Đơn</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
            {totalOrdersCount}
          </div>
        </div>

        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 11, color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            <TrendingUp size={11} />
            <span>Doanh Thu</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatVND(totalRevenue)}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 10px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            <PackageCheck size={11} />
            <span>Đã Bán</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
            {totalItemsSold} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>cây</span>
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
                border: isExpanded ? '1.5px solid #15803d' : '1px solid var(--border)'
              }}
              onClick={() => toggleExpand(order.id)}
            >
              {/* TOP HEADER OF CARD */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                      onClick={(e) => handleCopyZalo(order, e)}
                    >
                      <Send size={13} />
                      <span>Gửi Zalo</span>
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
        totalItems={filteredOrders.length}
        pageSize={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
