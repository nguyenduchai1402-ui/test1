import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Plus, Trash2, ChevronDown, ChevronUp, UserCheck, 
  Send, Save, RotateCcw, UserPlus, X, Check, Camera, Download, Copy, Share2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Product, Customer, Order, OrderItem } from '../../types/pos';
import { posDb, formatVND, formatK, generateOrderCode, generateZaloMessage } from '../../utils/posStorage';

interface CalculatorScreenProps {
  editingOrder: Order | null;
  onClearEditingOrder: () => void;
  onOrderSaved: () => void;
  onShowToast: (msg: string) => void;
  selectedCustomerForOrder?: Customer | null;
  onClearSelectedCustomer?: () => void;
}

// Helper to create an empty row
const createEmptyRow = (): OrderItem => ({
  id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
  productId: undefined,
  code: '',
  name: '',
  unitPrice: 0,
  quantity: 1,
  amount: 0
});

// Helper to ensure at least 3 rows
const ensureMinimumThreeRows = (items: OrderItem[]): OrderItem[] => {
  const list = [...items];
  while (list.length < 3) {
    list.push(createEmptyRow());
  }
  return list;
};

export const CalculatorScreen: React.FC<CalculatorScreenProps> = ({
  editingOrder,
  onClearEditingOrder,
  onOrderSaved,
  onShowToast,
  selectedCustomerForOrder,
  onClearSelectedCustomer
}) => {
  const [products, setProducts] = useState<Product[]>(posDb.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(posDb.getCustomers());

  // Search code state for top quick search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Order state - ALWAYS AT LEAST 3 ROWS
  const [orderItems, setOrderItems] = useState<OrderItem[]>(() => ensureMinimumThreeRows([]));
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderCode, setOrderCode] = useState(generateOrderCode());

  // Collapsible customer card (default collapsed on mobile)
  const [isCustomerExpanded, setIsCustomerExpanded] = useState(false);

  // Quick Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Zalo Screenshot & Save Confirmation Modals
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Refs for auto-focusing quantity input and receipt capture
  const quantityInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const receiptCaptureRef = useRef<HTMLDivElement>(null);

  // Sync products and customers on custom events
  useEffect(() => {
    const handleProductsChange = () => setProducts(posDb.getProducts());
    const handleCustomersChange = () => setCustomers(posDb.getCustomers());

    window.addEventListener('pos_products_updated', handleProductsChange);
    window.addEventListener('pos_customers_updated', handleCustomersChange);

    return () => {
      window.removeEventListener('pos_products_updated', handleProductsChange);
      window.removeEventListener('pos_customers_updated', handleCustomersChange);
    };
  }, []);

  // Handle Editing Order load
  useEffect(() => {
    if (editingOrder) {
      setOrderCode(editingOrder.code);
      setOrderItems(ensureMinimumThreeRows(editingOrder.items || []));
      setCustomerName(editingOrder.customerName || '');
      setCustomerPhone(editingOrder.customerPhone || '');
      setCustomerAddress(editingOrder.customerAddress || '');
      setCustomerId(editingOrder.customerId);
      setOrderNotes(editingOrder.notes || '');
      setIsCustomerExpanded(Boolean(editingOrder.customerName));
    }
  }, [editingOrder]);

  // Handle pre-selected customer from Customers screen
  useEffect(() => {
    if (selectedCustomerForOrder) {
      setCustomerId(selectedCustomerForOrder.id);
      setCustomerName(selectedCustomerForOrder.name);
      setCustomerPhone(selectedCustomerForOrder.phone);
      setCustomerAddress(selectedCustomerForOrder.address);
      setIsCustomerExpanded(true);
      if (onClearSelectedCustomer) onClearSelectedCustomer();
    }
  }, [selectedCustomerForOrder, onClearSelectedCustomer]);

  // Handle search query changes
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setFilteredProducts([]);
      setIsDropdownOpen(false);
      return;
    }

    const clean = q.trim().toLowerCase();
    const matches = products.filter(p => 
      p.code.toLowerCase().includes(clean) || 
      p.name.toLowerCase().includes(clean)
    );
    setFilteredProducts(matches.slice(0, 8));
    setIsDropdownOpen(true);
  };

  // Add/Fill Product into rows & Auto-focus quantity
  const handleSelectProduct = (product: Product, targetRowId?: string) => {
    let updatedRows = [...orderItems];
    let rowToFocusId: string;

    if (targetRowId) {
      // Specific row requested via inline selector
      const idx = updatedRows.findIndex(r => r.id === targetRowId);
      if (idx >= 0) {
        updatedRows[idx] = {
          ...updatedRows[idx],
          productId: product.id,
          code: product.code,
          name: product.name,
          unitPrice: product.price,
          costPrice: product.costPrice || 0,
          quantity: updatedRows[idx].quantity || 1,
          amount: (updatedRows[idx].quantity || 1) * product.price
        };
        rowToFocusId = targetRowId;
      } else {
        rowToFocusId = updatedRows[0].id;
      }
    } else {
      // Check if product is already in an existing filled row
      const existingIdx = updatedRows.findIndex(r => r.productId === product.id);
      if (existingIdx >= 0) {
        const newQty = updatedRows[existingIdx].quantity + 1;
        updatedRows[existingIdx] = {
          ...updatedRows[existingIdx],
          quantity: newQty,
          amount: newQty * updatedRows[existingIdx].unitPrice
        };
        rowToFocusId = updatedRows[existingIdx].id;
      } else {
        // Find the first empty row
        const firstEmptyIdx = updatedRows.findIndex(r => !r.productId);
        if (firstEmptyIdx >= 0) {
          updatedRows[firstEmptyIdx] = {
            ...updatedRows[firstEmptyIdx],
            productId: product.id,
            code: product.code,
            name: product.name,
            unitPrice: product.price,
            costPrice: product.costPrice || 0,
            quantity: 1,
            amount: product.price
          };
          rowToFocusId = updatedRows[firstEmptyIdx].id;
        } else {
          // If all rows are filled, append a new row
          const newRow: OrderItem = {
            id: 'row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            productId: product.id,
            code: product.code,
            name: product.name,
            unitPrice: product.price,
            quantity: 1,
            amount: product.price
          };
          updatedRows.push(newRow);
          rowToFocusId = newRow.id;
        }
      }
    }

    setOrderItems(ensureMinimumThreeRows(updatedRows));
    setSearchQuery('');
    setFilteredProducts([]);
    setIsDropdownOpen(false);

    // Auto-focus quantity input on the row
    setTimeout(() => {
      const inputEl = quantityInputRefs.current[rowToFocusId];
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 80);

    onShowToast(`Đã chọn: ${product.name} (${product.price}k)`);
  };

  // Update item quantity
  const handleUpdateQuantity = (rowId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveOrClearRow(rowId);
      return;
    }

    setOrderItems(prev => prev.map(item => {
      if (item.id === rowId) {
        return {
          ...item,
          quantity: newQty,
          amount: newQty * item.unitPrice
        };
      }
      return item;
    }));
  };

  // Remove row or clear back to empty slot (keeping minimum 3 rows)
  const handleRemoveOrClearRow = (rowId: string) => {
    if (orderItems.length > 3) {
      // More than 3 rows: delete this row
      setOrderItems(prev => ensureMinimumThreeRows(prev.filter(r => r.id !== rowId)));
    } else {
      // 3 or fewer rows: reset this row to a blank empty slot
      setOrderItems(prev => prev.map(r => {
        if (r.id === rowId) {
          return createEmptyRow();
        }
        return r;
      }));
    }
  };

  // Add a new empty row
  const handleAddNewEmptyRow = () => {
    setOrderItems(prev => [...prev, createEmptyRow()]);
  };

  // Quick Customer Select from existing list
  const handleSelectCustomer = (cId: string) => {
    const cust = customers.find(c => c.id === cId);
    if (cust) {
      setCustomerId(cust.id);
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      setCustomerAddress(cust.address);
      onShowToast(`Đã chọn: ${cust.name}`);
    }
  };

  // Quick save new customer
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust: Customer = {
      id: 'c-' + Date.now(),
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      createdAt: new Date().toISOString()
    };

    posDb.saveCustomer(newCust);
    setCustomerId(newCust.id);
    setCustomerName(newCust.name);
    setCustomerPhone(newCust.phone);
    setCustomerAddress(newCust.address);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    onShowToast(`Đã thêm khách hàng mới: ${newCust.name}`);
  };

  // Filter only valid items that have a product selected
  const validOrderItems = orderItems.filter(item => Boolean(item.productId && item.name));

  // Calculate totals (only from valid rows)
  const totalQuantity = validOrderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = validOrderItems.reduce((sum, item) => sum + item.amount, 0);

  // Save Order to Database
  const performSaveOrder = (): Order => {
    const order: Order = {
      id: editingOrder ? editingOrder.id : 'ord-' + Date.now(),
      code: orderCode,
      customerId: customerId,
      customerName: customerName.trim() || 'Khách Lẻ',
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      items: validOrderItems,
      totalQuantity,
      totalAmount,
      notes: orderNotes.trim(),
      status: editingOrder ? editingOrder.status : 'Chờ in',
      createdAt: editingOrder ? editingOrder.createdAt : new Date().toLocaleString('vi-VN'),
      updatedAt: new Date().toISOString()
    };

    posDb.saveOrder(order);
    onOrderSaved();
    return order;
  };

  const handleManualSave = () => {
    if (validOrderItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm vào đơn!');
      return;
    }

    const order = performSaveOrder();
    onShowToast(`Đã lưu đơn hàng của ${order.customerName}!`);

    if (editingOrder) {
      onClearEditingOrder();
    } else {
      handleResetForm();
    }
  };

  // Trigger Zalo Screenshot Action: prompt save confirmation
  const handleInitiateZaloAction = () => {
    if (validOrderItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm vào đơn trước khi chụp ảnh gửi Zalo!');
      return;
    }
    // Show confirmation modal: "Hỏi có lưu hay không?"
    setShowSaveConfirmModal(true);
  };

  // Execute Capture Receipt Image
  const executeCaptureScreenshot = async (saveOrderFirst: boolean) => {
    setShowSaveConfirmModal(false);

    if (saveOrderFirst) {
      performSaveOrder();
      onShowToast('Đã lưu đơn hàng vào hệ thống!');
    }

    setIsCapturing(true);

    try {
      // Allow DOM to render receipt container
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
    if (!capturedImageUrl) return;

    try {
      const res = await fetch(capturedImageUrl);
      const blob = await res.blob();
      const file = new File([blob], `don-hang-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Đơn hàng in ly - ${customerName || 'Khách hàng'}`,
          text: `Đơn hàng in ly xưởng in gửi ${customerName || 'Quý khách'}`
        });
        onShowToast('Đã mở Zalo để gửi ảnh đơn!');
      } else {
        // Fallback: download the image
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
      // ClipboardItem support
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
    if (!capturedImageUrl) return;
    const a = document.createElement('a');
    a.href = capturedImageUrl;
    a.download = `Don-Hang-In-Ly-${customerName || 'Khach'}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Copy Text format for Zalo as fallback
  const handleCopyTextZalo = () => {
    const dummyOrder: Order = {
      id: 'temp',
      code: orderCode,
      customerId,
      customerName: customerName.trim() || 'Khách hàng',
      customerPhone,
      customerAddress,
      items: validOrderItems,
      totalQuantity,
      totalAmount,
      notes: orderNotes,
      status: 'Chờ in',
      createdAt: new Date().toLocaleString('vi-VN'),
      updatedAt: new Date().toISOString()
    };

    const text = generateZaloMessage(dummyOrder);
    navigator.clipboard.writeText(text).then(() => {
      onShowToast('Đã sao chép tin nhắn chữ Zalo!');
    }).catch(() => {
      alert(text);
    });
  };

  // Reset Form for New Order (Always restores 3 empty rows)
  const handleResetForm = () => {
    setOrderCode(generateOrderCode());
    setOrderItems(ensureMinimumThreeRows([]));
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerId(undefined);
    setOrderNotes('');
    setSearchQuery('');
    setCapturedImageUrl(null);
    if (editingOrder) onClearEditingOrder();
    if (searchInputRef.current) searchInputRef.current.focus();
    onShowToast('Đã tạo đơn mới!');
  };

  // Popular quick chips
  const popularChips = [
    { code: 'T7', label: 'Tim 700' },
    { code: 'T5', label: 'Tim 500' },
    { code: 'TT2', label: 'Trái Tim 2 Ngăn' },
    { code: 'DC', label: 'Đáy Cầu 500' },
    { code: 'U5', label: 'Cốc U500' },
    { code: 'P500', label: 'PP 500' },
    { code: 'P700', label: 'PP 700' },
    { code: 'ND90', label: 'Nắp D90' },
    { code: 'NTT90', label: 'Nắp Tim' },
  ];

  return (
    <div className="pos-content">
      {/* Editing banner if active (WITHOUT displaying order code) */}
      {editingOrder && (
        <div style={{
          background: '#fef3c7', 
          border: '1px solid #fde68a', 
          padding: '8px 12px', 
          borderRadius: 8, 
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 600,
          color: '#92400e'
        }}>
          <span>Đang chỉnh sửa đơn hàng: <strong>{editingOrder.customerName || 'Khách Lẻ'}</strong></span>
          <button 
            type="button" 
            onClick={onClearEditingOrder}
            style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontWeight: 700 }}
          >
            Hủy sửa
          </button>
        </div>
      )}

      {/* TOP QUICK CODE SEARCH BAR */}
      <div className="pos-quick-search-box">
        <div className="pos-search-input-wrap">
          <Search size={18} className="pos-search-icon" />
          <input
            id="pos-search-input"
            ref={searchInputRef}
            type="text"
            className="pos-input pos-search-input"
            placeholder="Gõ mã (T7, TT2, DC, P5, U5, ND90...)"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim()) setIsDropdownOpen(true);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setIsDropdownOpen(false); }}
              style={{
                position: 'absolute', right: 10, background: 'none', border: 'none',
                color: '#94a3b8', cursor: 'pointer', padding: 4
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && filteredProducts.length > 0 && (
          <div className="pos-autocomplete-list">
            {filteredProducts.map(prod => (
              <div
                key={prod.id}
                className="pos-autocomplete-item"
                onClick={() => handleSelectProduct(prod)}
              >
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{prod.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>{prod.price}k</span>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{formatVND(prod.price)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK POPULAR CHIPS */}
      <div className="pos-chips-scroll">
        {popularChips.map(chip => {
          const prod = products.find(p => p.code.toLowerCase() === chip.code.toLowerCase());
          return (
            <button
              key={chip.code}
              type="button"
              className="pos-chip"
              onClick={() => {
                if (prod) handleSelectProduct(prod);
              }}
              title={prod ? prod.name : chip.label}
            >
              <span className="pos-chip-code">{chip.code}</span>
              <span>{chip.label}</span>
              {prod && <span style={{ fontSize: 11, color: '#166534', opacity: 0.85 }}>({prod.price}k)</span>}
            </button>
          );
        })}
      </div>

      {/* COLLAPSIBLE CUSTOMER INFORMATION CARD */}
      <div className="pos-customer-box">
        <div 
          className="pos-customer-header"
          onClick={() => setIsCustomerExpanded(!isCustomerExpanded)}
        >
          <div className="pos-customer-header-title">
            <UserCheck size={16} color={customerName ? '#15803d' : '#64748b'} />
            <span>
              {customerName ? (
                <>Khách: <strong>{customerName}</strong> {customerPhone && `(${customerPhone})`}</>
              ) : (
                'Khách hàng: Chọn hoặc thêm mới'
              )}
            </span>
          </div>
          {isCustomerExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
        </div>

        {isCustomerExpanded && (
          <div className="pos-customer-body">
            <div style={{ display: 'flex', gap: 6 }}>
              <select 
                className="pos-select pos-input-sm"
                value={customerId || ''}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">-- Chọn khách quen có sẵn --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.phone}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="pos-btn pos-btn-secondary pos-btn-sm"
                onClick={() => setShowAddCustomerModal(true)}
                title="Thêm khách mới"
              >
                <UserPlus size={14} />
                <span>+ Khách mới</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <input 
                  type="text" 
                  className="pos-input pos-input-sm" 
                  placeholder="Tên khách / Quán (mặc định: Khách Lẻ)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <input 
                  type="tel" 
                  className="pos-input pos-input-sm" 
                  placeholder="Số điện thoại"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <input 
              type="text" 
              className="pos-input pos-input-sm" 
              placeholder="Địa chỉ giao hàng / Nhà xe nhận hàng"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ORDER ITEMS LIST - ALWAYS AT LEAST 3 ROWS, ONLY SHOW PRODUCT NAME */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: 8,
          padding: '0 2px'
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
            DANH SÁCH MÓN ({validOrderItems.length} đã chọn)
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            *Đơn giá tính theo nghìn đồng (k)
          </span>
        </div>

        {orderItems.map((item, index) => {
          const isFilled = Boolean(item.productId && item.name);

          return (
            <div key={item.id} className="pos-item-row" style={{
              background: isFilled ? '#ffffff' : '#f8fafc',
              border: isFilled ? '1px solid var(--border)' : '1.5px dashed #cbd5e1'
            }}>
              {/* IF ROW HAS PRODUCT: SHOW ONLY PRODUCT NAME */}
              {isFilled ? (
                <>
                  <div className="pos-item-top">
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {item.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="pos-item-del-btn"
                      onClick={() => handleRemoveOrClearRow(item.id)}
                      title="Xóa hàng này"
                      aria-label="Xóa hàng"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="pos-item-bottom">
                    <div className="pos-item-price-info">
                      Giá: <span className="pos-item-unit-price">{item.unitPrice}k</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
                        ({formatVND(item.unitPrice)})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Quantity Stepper */}
                      <div className="pos-qty-control">
                        <button
                          type="button"
                          className="pos-qty-btn"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <input
                          ref={el => { quantityInputRefs.current[item.id] = el; }}
                          type="number"
                          min="1"
                          className="pos-qty-input"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                        />
                        <button
                          type="button"
                          className="pos-qty-btn"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="pos-item-amount">
                        {formatVND(item.amount)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* IF EMPTY ROW: SHOW PRODUCT SELECTOR PICKER (HÀNG TRỐNG TỰ ĐỘNG) */
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', width: 20 }}>
                    #{index + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <select
                      className="pos-select pos-input-sm"
                      value=""
                      onChange={(e) => {
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod) handleSelectProduct(prod, item.id);
                      }}
                      style={{ background: '#ffffff', fontWeight: 500 }}
                    >
                      <option value="">-- Chạm để chọn sản phẩm hàng #{index + 1} --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.price}k)
                        </option>
                      ))}
                    </select>
                  </div>
                  {orderItems.length > 3 && (
                    <button
                      type="button"
                      className="pos-item-del-btn"
                      onClick={() => handleRemoveOrClearRow(item.id)}
                      title="Xóa hàng trống thừa"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* + Thêm hàng button */}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="pos-btn pos-btn-secondary pos-btn-sm"
            onClick={handleAddNewEmptyRow}
          >
            <Plus size={14} />
            <span>+ Thêm hàng</span>
          </button>
        </div>
      </div>

      {/* ORDER NOTE */}
      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          className="pos-input pos-input-sm"
          placeholder="Ghi chú in ấn (màu mực, giao hàng, hẹn giờ...)"
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
        />
      </div>

      {/* HIDDEN RECEIPT COMPONENT FOR ULTRA-CRISP 2X SCREENSHOT CAPTURE */}
      <div className="receipt-capture-wrapper" ref={receiptCaptureRef}>
        <div className="receipt-header-box">
          <div className="receipt-shop-title">XƯỞNG IN LY NHỰA</div>
          <div className="receipt-sub-title">HÓA ĐƠN ĐẶT IN LY & PHỤ KIỆN</div>
          <div className="receipt-date-time">{new Date().toLocaleString('vi-VN')}</div>
        </div>

        <div className="receipt-customer-box">
          <div className="receipt-customer-row">
            <span className="receipt-cust-label">Khách hàng:</span>
            <span className="receipt-cust-val">{customerName || 'Khách Lẻ'}</span>
          </div>
          {customerPhone && (
            <div className="receipt-customer-row">
              <span className="receipt-cust-label">Số ĐT:</span>
              <span className="receipt-cust-val">{customerPhone}</span>
            </div>
          )}
          {customerAddress && (
            <div className="receipt-customer-row">
              <span className="receipt-cust-label">Địa chỉ:</span>
              <span className="receipt-cust-val">{customerAddress}</span>
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
            {validOrderItems.map((it, idx) => (
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
            <span className="receipt-grand-total">{formatVND(totalAmount)}</span>
          </div>
        </div>

        {orderNotes && (
          <div className="receipt-notes-box">
            <strong>Ghi chú:</strong> {orderNotes}
          </div>
        )}

        <div className="receipt-footer-box">
          Xưởng In Ly Nhựa xin chân thành cảm ơn Quý khách! 🙏
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL (Bottom Sheet) */}
      {showAddCustomerModal && (
        <div className="pos-sheet-backdrop" onClick={() => setShowAddCustomerModal(false)}>
          <div className="pos-sheet-container" onClick={(e) => e.stopPropagation()}>
            <div className="pos-sheet-header">
              <div className="pos-sheet-title">+ Thêm Khách Hàng Mới</div>
              <button 
                type="button" 
                className="pos-icon-btn" 
                style={{ color: '#64748b' }}
                onClick={() => setShowAddCustomerModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Tên Khách / Quán <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  className="pos-input"
                  placeholder="Ví dụ: Tiệm Trà Sữa Mochi"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
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
                  placeholder="0988xxxxxx"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Địa Chỉ / Nhà Xe
                </label>
                <input
                  type="text"
                  className="pos-input"
                  placeholder="Số nhà, đường phố hoặc bến xe"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="pos-btn pos-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowAddCustomerModal(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="pos-btn pos-btn-primary"
                  style={{ flex: 2 }}
                >
                  <Check size={16} />
                  <span>Lưu & Chọn Khách</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: HỎI CÓ LƯU HAY KHÔNG KHI GỬI ZALO */}
      {showSaveConfirmModal && (
        <div className="pos-sheet-backdrop" onClick={() => setShowSaveConfirmModal(false)}>
          <div className="pos-sheet-container" onClick={(e) => e.stopPropagation()}>
            <div className="pos-sheet-header">
              <div className="pos-sheet-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
                <Camera size={18} />
                <span>Chụp Ảnh Đơn Hàng Gửi Zalo</span>
              </div>
              <button 
                type="button" 
                className="pos-icon-btn" 
                style={{ color: '#64748b' }}
                onClick={() => setShowSaveConfirmModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '8px 0 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                Bạn có muốn lưu đơn hàng này vào hệ thống không?
              </p>
              <p style={{ fontSize: 13, color: '#64748b' }}>
                Khách hàng: <strong>{customerName || 'Khách Lẻ'}</strong> | Tổng tiền: <strong style={{ color: '#15803d' }}>{formatVND(totalAmount)}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="pos-btn pos-btn-primary"
                onClick={() => executeCaptureScreenshot(true)}
              >
                <Save size={16} />
                <span>Có, Lưu đơn & Chụp ảnh gửi Zalo</span>
              </button>

              <button
                type="button"
                className="pos-btn pos-btn-zalo"
                onClick={() => executeCaptureScreenshot(false)}
              >
                <Camera size={16} />
                <span>Không lưu (Chỉ chụp ảnh gửi Zalo)</span>
              </button>

              <button
                type="button"
                className="pos-btn pos-btn-secondary"
                onClick={() => setShowSaveConfirmModal(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT PREVIEW MODAL */}
      {capturedImageUrl && (
        <div className="pos-sheet-backdrop" onClick={() => setCapturedImageUrl(null)}>
          <div className="pos-sheet-container" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
            <div className="pos-sheet-header">
              <div className="pos-sheet-title" style={{ color: '#15803d' }}>
                📸 Ảnh Hóa Đơn Gửi Zalo
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
              <img src={capturedImageUrl} alt="Hóa đơn đặt in ly" />
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

      {/* STICKY BOTTOM SUMMARY BAR (TỔNG TIỀN & CÁC NÚT HÀNH ĐỘNG CHÍNH) */}
      <div className="pos-sticky-total-bar">
        <div className="pos-total-summary-row">
          <div className="pos-total-label">
            Tổng {totalQuantity} món ({validOrderItems.length} loại)
          </div>
          <div>
            <span className="pos-total-figure">{formatVND(totalAmount)}</span>
            <span className="pos-total-k-tag">({formatK(totalAmount)})</span>
          </div>
        </div>

        <div className="pos-action-btn-row">
          <button
            type="button"
            id="btn-save-order"
            className="pos-btn pos-btn-primary"
            onClick={handleManualSave}
            title="Lưu đơn hàng vào hệ thống"
          >
            <Save size={16} />
            <span>Lưu đơn</span>
          </button>

          <button
            type="button"
            id="btn-copy-zalo"
            className="pos-btn pos-btn-zalo"
            onClick={handleInitiateZaloAction}
            title="Chụp ảnh đơn hàng gửi Zalo"
            disabled={isCapturing}
          >
            <Camera size={15} />
            <span>{isCapturing ? 'Đang chụp...' : 'Gửi Zalo'}</span>
          </button>

          <button
            type="button"
            id="btn-new-order"
            className="pos-btn pos-btn-secondary"
            onClick={handleResetForm}
            title="Tạo đơn mới với 3 hàng trống"
          >
            <RotateCcw size={15} />
            <span>Đơn mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
