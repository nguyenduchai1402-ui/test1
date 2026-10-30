import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Phone, MapPin, ShoppingBag, Edit2, Trash2, 
  X, Check, Users, FileSpreadsheet, Upload, Download 
} from 'lucide-react';
import { Customer, Order } from '../../types/pos';
import { posDb, formatVND, parseOrderTimestamp } from '../../utils/posStorage';
import { 
  exportCustomersToExcel, 
  downloadCustomerExcelTemplate, 
  parseCustomersFromExcel 
} from '../../utils/excelHelper';
import { Pagination } from './Pagination';

interface CustomersScreenProps {
  onSelectCustomerForOrder: (customer: Customer) => void;
  onShowToast: (msg: string) => void;
}

const ITEMS_PER_PAGE = 10;

export const CustomersScreen: React.FC<CustomersScreenProps> = ({ 
  onSelectCustomerForOrder, 
  onShowToast 
}) => {
  const [customers, setCustomers] = useState<Customer[]>(posDb.getCustomers());
  const [orders, setOrders] = useState<Order[]>(posDb.getOrders());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // View Customer History Modal State
  const [viewHistoryCust, setViewHistoryCust] = useState<Customer | null>(null);

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleCustUpdate = () => setCustomers(posDb.getCustomers());
    const handleOrdersUpdate = () => {
      setOrders(posDb.getOrders());
      setCustomers(posDb.getCustomers());
    };

    window.addEventListener('pos_customers_updated', handleCustUpdate);
    window.addEventListener('pos_orders_updated', handleOrdersUpdate);

    return () => {
      window.removeEventListener('pos_customers_updated', handleCustUpdate);
      window.removeEventListener('pos_orders_updated', handleOrdersUpdate);
    };
  }, []);

  // Reset to page 1 on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    if (!searchQuery.trim()) return true;
    const clean = searchQuery.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(clean) ||
      (c.phone && c.phone.includes(clean)) ||
      (c.address && c.address.toLowerCase().includes(clean))
    );
  });

  // Sắp xếp khách hàng mới nhất lên đầu tiên (Newest first)
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const tA = parseOrderTimestamp(a.createdAt);
    const tB = parseOrderTimestamp(b.createdAt);
    if (tA && tB && tA !== tB) return tB - tA;
    const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
    if (numA !== numB) return numB - numA;
    return (b.code || b.id).localeCompare(a.code || a.id);
  });

  // Paginated customers (10 per page)
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (cust: Customer) => {
    setEditingId(cust.id);
    setFormName(cust.name);
    setFormPhone(cust.phone || '');
    setFormAddress(cust.address || '');
    setFormNotes(cust.notes || '');
    setIsModalOpen(true);
  };

  // Save Customer
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập tên khách / quán!');
      return;
    }

    const cust: Customer = {
      id: editingId || 'c-' + Date.now(),
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      notes: formNotes.trim(),
      createdAt: editingId 
        ? (customers.find(c => c.id === editingId)?.createdAt || new Date().toISOString())
        : new Date().toISOString()
    };

    posDb.saveCustomer(cust);
    onShowToast(editingId ? `Đã cập nhật khách [${cust.name}]!` : `Đã thêm khách mới [${cust.name}]!`);
    setIsModalOpen(false);
  };


  // Multi-selection handlers for Customers
  const handleToggleSelectAllCustomers = () => {
    if (selectedCustomerIds.length === filteredCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleToggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedCustomers = () => {
    if (selectedCustomerIds.length === 0) return;
    const isAll = selectedCustomerIds.length === customers.length || selectedCustomerIds.length === filteredCustomers.length;
    const confirmMsg = isAll
      ? `CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ ${selectedCustomerIds.length} khách hàng không? Hành động này không thể hoàn tác!`
      : `Xác nhận xóa ${selectedCustomerIds.length} khách hàng đã chọn?`;

    if (window.confirm(confirmMsg)) {
      if (isAll && selectedCustomerIds.length === customers.length) {
        posDb.clearAllCustomers();
      } else {
        posDb.deleteMultipleCustomers(selectedCustomerIds);
      }
      setSelectedCustomerIds([]);
      onShowToast(`Đã xóa ${selectedCustomerIds.length} khách hàng thành công!`);
    }
  };

  const handleDeleteAllCustomers = () => {
    if (customers.length === 0) return;
    if (window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ ${customers.length} khách hàng trong danh bạ không? Không thể hoàn tác!`)) {
      posDb.clearAllCustomers();
      setSelectedCustomerIds([]);
      onShowToast(`Đã xóa sạch toàn bộ khách hàng!`);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = (cust: Customer) => {
    if (window.confirm(`Xác nhận xóa khách hàng "${cust.name}"?`)) {
      posDb.deleteCustomer(cust.id);
      setSelectedCustomerIds(prev => prev.filter(id => id !== cust.id));
      onShowToast(`Đã xóa khách [${cust.name}]!`);
    }
  };

  // Get orders of a specific customer
  const getCustomerOrders = (cust: Customer) => {
    return orders.filter(o => 
      (o.customerId && o.customerId === cust.id) || 
      (o.customerPhone && cust.phone && o.customerPhone === cust.phone) ||
      (o.customerName && o.customerName.toLowerCase() === cust.name.toLowerCase())
    );
  };

  // Export Customers to Excel
  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) {
      alert('Không có khách hàng nào để xuất Excel!');
      return;
    }
    try {
      exportCustomersToExcel(filteredCustomers, orders);
      onShowToast(`Đã xuất file Excel cho ${filteredCustomers.length} khách hàng!`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
    }
  };

  // Handle Excel File Upload for Customers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsImporting(true);

    try {
      const importedCustomers = await parseCustomersFromExcel(file);
      if (importedCustomers.length === 0) {
        alert('Không tìm thấy dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra định dạng cột!');
        return;
      }

      importedCustomers.forEach(c => posDb.saveCustomer(c));
      onShowToast(`Đã nạp thành công ${importedCustomers.length} khách hàng từ Excel!`);
      setIsImportModalOpen(false);
    } catch (err) {
      console.error('Import error:', err);
      alert('Lỗi đọc file Excel khách hàng. Vui lòng thử lại!');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="pos-content" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 20px)' }}>
      {/* SEARCH AND ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div className="pos-search-input-wrap" style={{ flex: 1 }}>
          <Search size={18} className="pos-search-icon" />
          <input
            type="text"
            className="pos-input pos-search-input"
            placeholder="Tìm theo tên quán, SĐT, địa chỉ..."
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

        {/* XUẤT EXCEL BUTTON */}
        <button
          type="button"
          className="pos-btn pos-btn-secondary"
          onClick={handleExportExcel}
          title="Xuất danh sách khách hàng ra Excel"
          style={{ padding: '0 8px' }}
        >
          <FileSpreadsheet size={15} color="#15803d" />
          <span>Xuất</span>
        </button>

        {/* NHẬP EXCEL BUTTON */}
        <button
          type="button"
          className="pos-btn pos-btn-secondary"
          onClick={() => setIsImportModalOpen(true)}
          title="Nhập khách hàng từ file mẫu Excel"
          style={{ padding: '0 8px' }}
        >
          <Upload size={15} color="#15803d" />
          <span>Nhập</span>
        </button>

        {/* THÊM KHÁCH BUTTON */}
        <button
          type="button"
          className="pos-btn pos-btn-primary"
          onClick={handleOpenCreate}
          title="Thêm khách hàng mới"
          style={{ padding: '0 10px' }}
        >
          <Plus size={16} />
          <span>Thêm</span>
        </button>
      </div>

      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: '4px 2px 8px' }}>
        DANH BẠ KHÁCH HÀNG ({filteredCustomers.length})
      </div>

      {/* CUSTOMER LIST */}
      {filteredCustomers.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1.5px dashed #cbd5e1',
          borderRadius: 10,
          padding: '24px 16px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <Users size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
          <p style={{ fontSize: 14, fontWeight: 600 }}>Không tìm thấy khách hàng nào</p>
        </div>
      ) : (
        paginatedCustomers.map(cust => {
          const custOrders = getCustomerOrders(cust);
          const totalSpent = custOrders.reduce((sum, o) => sum + o.totalAmount, 0);

          return (
            <div 
              key={cust.id}
              className="pos-card"
              style={{ padding: '10px 12px', marginBottom: 8 }}
            >
              {/* TOP: NAME & ACTION BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    {cust.name}
                  </div>
                  {cust.phone && (
                    <a 
                      href={`tel:${cust.phone}`}
                      style={{ 
                        fontSize: 13, 
                        color: '#15803d', 
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 2
                      }}
                    >
                      <Phone size={12} />
                      <span>{cust.phone}</span>
                    </a>
                  )}
                </div>

                {/* CREATE ORDER BUTTON FOR THIS CUSTOMER */}
                <button
                  type="button"
                  className="pos-btn pos-btn-primary pos-btn-sm"
                  onClick={() => onSelectCustomerForOrder(cust)}
                  title="Lập đơn mới ngay cho khách này"
                >
                  <ShoppingBag size={13} />
                  <span>Lập đơn</span>
                </button>
              </div>

              {/* ADDRESS & NOTES */}
              {cust.address && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  fontSize: 12, 
                  color: '#64748b',
                  marginTop: 4 
                }}>
                  <MapPin size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cust.address}
                  </span>
                </div>
              )}

              {cust.notes && (
                <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>
                  * {cust.notes}
                </div>
              )}

              {/* BOTTOM: ORDERS STATS & ACTIONS */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginTop: 8,
                paddingTop: 6,
                borderTop: '1px solid #f1f5f9'
              }}>
                <button
                  type="button"
                  onClick={() => setViewHistoryCust(cust)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563eb',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {custOrders.length} đơn ({formatVND(totalSpent)})
                </button>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="pos-item-del-btn"
                    onClick={() => handleOpenEdit(cust)}
                    title="Sửa thông tin"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    className="pos-item-del-btn"
                    onClick={() => handleDeleteCustomer(cust)}
                    title="Xóa khách hàng"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* PHÂN TRANG: 10 KHÁCH HÀNG / TRANG */}
      <Pagination
        currentPage={currentPage}
        totalItems={sortedCustomers.length}
        pageSize={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      {/* MODAL NẠP KHÁCH HÀNG TỪ EXCEL */}
      {isImportModalOpen && (
        <div className="pos-sheet-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div className="pos-sheet-container" onClick={(e) => e.stopPropagation()}>
            <div className="pos-sheet-header">
              <div className="pos-sheet-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
                <FileSpreadsheet size={18} />
                <span>Nhập Khách Hàng Từ File Excel</span>
              </div>
              <button 
                type="button" 
                className="pos-icon-btn" 
                style={{ color: '#64748b' }}
                onClick={() => setIsImportModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '8px 0', fontSize: 13, color: '#475569' }}>
              <p style={{ marginBottom: 8 }}>
                Chọn file Excel danh bạ khách hàng, tiệm cà phê, quán trà sữa để nạp vào hệ thống.
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                color: '#334155',
                marginBottom: 14
              }}>
                <strong>Cột chuẩn trong file Excel:</strong>
                <div style={{ marginTop: 4, color: '#166534', fontWeight: 600 }}>
                  Tên khách / Quán | Số điện thoại | Địa chỉ | Ghi chú
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="pos-btn pos-btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <Upload size={16} />
                  <span>{isImporting ? 'Đang đọc file Excel...' : 'Chọn File Excel Từ Thiết Bị'}</span>
                </button>

                <button
                  type="button"
                  className="pos-btn pos-btn-secondary"
                  onClick={downloadCustomerExcelTemplate}
                >
                  <Download size={15} color="#15803d" />
                  <span>Tải File Excel Mẫu Khách Hàng</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL (BOTTOM SHEET) */}
      {isModalOpen && (
        <div className="pos-sheet-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="pos-sheet-container" onClick={(e) => e.stopPropagation()}>
            <div className="pos-sheet-header">
              <div className="pos-sheet-title">
                {editingId ? 'Sửa Khách Hàng' : '+ Thêm Khách Hàng Mới'}
              </div>
              <button 
                type="button" 
                className="pos-icon-btn" 
                style={{ color: '#64748b' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Tên Khách / Tên Quán <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className="pos-input"
                  placeholder="Ví dụ: Tiệm Trà Thị Ngọc"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Số Điện Thoại
                </label>
                <input
                  type="tel"
                  className="pos-input"
                  placeholder="098xxxxxxx"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Địa Chỉ / Nhà Xe
                </label>
                <input
                  type="text"
                  className="pos-input"
                  placeholder="Địa chỉ gửi xe hoặc giao tận nơi"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Ghi chú riêng
                </label>
                <input
                  type="text"
                  className="pos-input"
                  placeholder="Màu mực in quen thuộc, thời gian giao..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="pos-btn pos-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="pos-btn pos-btn-primary"
                  style={{ flex: 2 }}
                >
                  <Check size={16} />
                  <span>{editingId ? 'Cập nhật' : 'Thêm khách hàng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER ORDER HISTORY MODAL */}
      {viewHistoryCust && (
        <div className="pos-sheet-backdrop" onClick={() => setViewHistoryCust(null)}>
          <div className="pos-sheet-container" onClick={(e) => e.stopPropagation()}>
            <div className="pos-sheet-header">
              <div className="pos-sheet-title">
                Lịch sử: {viewHistoryCust.name}
              </div>
              <button 
                type="button" 
                className="pos-icon-btn" 
                style={{ color: '#64748b' }}
                onClick={() => setViewHistoryCust(null)}
              >
                <X size={18} />
              </button>
            </div>

            {getCustomerOrders(viewHistoryCust).length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: 14 }}>
                Chưa có đơn hàng nào cho khách này.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
                {getCustomerOrders(viewHistoryCust).map(ord => (
                  <div 
                    key={ord.id} 
                    style={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 8, 
                      padding: 8,
                      background: '#f8fafc' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}>
                      <span>{ord.code} ({ord.createdAt})</span>
                      <span style={{ color: '#15803d' }}>{formatVND(ord.totalAmount)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                      {ord.items.map(i => `${i.name} [${i.code}] x${i.quantity}`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="pos-btn pos-btn-secondary"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => setViewHistoryCust(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
