import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Plus, Trash2, ChevronDown, ChevronUp, UserCheck, 
  Send, Save, RotateCcw, X, Check, Camera, Download, Copy, Share2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Product, Customer, Order, OrderItem } from '../../types/pos';
import { posDb, formatVND, formatK, generateOrderCode, generateZaloMessage, formatVietnamDateTime, parseOrderTimestamp } from '../../utils/posStorage';

const KHACH_LE_ID = 'khach-le';
const KHACH_LE_NAME = 'Khách Lẻ';

interface CalculatorScreenProps {
  editingOrder: Order | null;
  onClearEditingOrder: () => void;
  onOrderSaved: () => void;
  onShowToast: (msg: string) => void;
  selectedCustomerForOrder?: Customer | null;
  onClearSelectedCustomer?: () => void;
  onFinishedEditOrder?: (savedOrder?: Order) => void;
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

// Helper to keep items list without pre-populating 3 empty rows
const ensureMinimumThreeRows = (items: OrderItem[]): OrderItem[] => {
  return [...items];
};

export const CalculatorScreen: React.FC<CalculatorScreenProps> = ({
  editingOrder,
  onClearEditingOrder,
  onOrderSaved,
  onShowToast,
  selectedCustomerForOrder,
  onClearSelectedCustomer,
  onFinishedEditOrder
}) => {
  const [products, setProducts] = useState<Product[]>(posDb.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(posDb.getCustomers());

  // Search code state for top quick search
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Order state - starts empty (no pre-populated 3 empty items) and Khách lẻ is NOT checked by default
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderCode, setOrderCode] = useState(generateOrderCode());
  const [captureTimeStr, setCaptureTimeStr] = useState<string>(() => formatVietnamDateTime());

  // Customer card is always displayed (no need to click to expand)
  const [isCustomerExpanded, setIsCustomerExpanded] = useState(true);

  // Customer search autocomplete state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustDropdownOpen, setIsCustDropdownOpen] = useState(false);
  const custSearchContainerRef = useRef<HTMLDivElement>(null);

  // Close customer search dropdown on outside click
  useEffect(() => {
    const handleClickOutsideCust = (e: MouseEvent) => {
      if (custSearchContainerRef.current && !custSearchContainerRef.current.contains(e.target as Node)) {
        setIsCustDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideCust);
    return () => document.removeEventListener('mousedown', handleClickOutsideCust);
  }, []);

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
      const isWalkIn = !editingOrder.customerName || editingOrder.customerName.trim().toLowerCase() === 'khách lẻ';
      setCustomerName(isWalkIn ? KHACH_LE_NAME : editingOrder.customerName);
      setCustomerPhone(editingOrder.customerPhone || '');
      setCustomerAddress(editingOrder.customerAddress || '');
      setCustomerId(isWalkIn ? KHACH_LE_ID : (editingOrder.customerId || 'existing-cust'));
      setOrderNotes(editingOrder.notes || '');
      setIsCustomerExpanded(!isWalkIn);
      setCustomerSearchQuery(isWalkIn ? '' : (editingOrder.customerName || ''));
    }
  }, [editingOrder]);

  // Handle pre-selected customer from Customers screen
  useEffect(() => {
    if (selectedCustomerForOrder) {
      setCustomerId(selectedCustomerForOrder.id);
      setCustomerName(selectedCustomerForOrder.name);
      setCustomerPhone(selectedCustomerForOrder.phone);
      setCustomerAddress(selectedCustomerForOrder.address);
      setCustomerSearchQuery(selectedCustomerForOrder.name);
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
    setIsCustDropdownOpen(false);
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

  // Update item unit price directly (cho phép nhập đơn giá tùy chỉnh)
  const handleUpdateUnitPrice = (rowId: string, newPrice: number) => {
    const validPrice = isNaN(newPrice) ? 0 : Math.max(0, newPrice);
    setOrderItems(prev => prev.map(item => {
      if (item.id === rowId) {
        return {
          ...item,
          unitPrice: validPrice,
          amount: (item.quantity || 1) * validPrice
        };
      }
      return item;
    }));
  };

  // Remove row directly
  const handleRemoveOrClearRow = (rowId: string) => {
    setOrderItems(prev => prev.filter(r => r.id !== rowId));
  };

  // Add a new empty row
  const handleAddNewEmptyRow = () => {
    setOrderItems(prev => [...prev, createEmptyRow()]);
  };

  // Quick Customer Select from existing list (toggle Khách Lẻ when clicked)
  const handleSelectCustomer = (cId: string) => {
    if (!cId) {
      setCustomerId(undefined);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerSearchQuery('');
      return;
    }
    if (cId === KHACH_LE_ID) {
      if (customerId === KHACH_LE_ID) {
        // Bỏ tích Khách lẻ khi bấm lại
        setCustomerId(undefined);
        setCustomerName('');
        setIsCustDropdownOpen(false);
        onShowToast('Đã bỏ chọn Khách Lẻ');
      } else {
        setCustomerId(KHACH_LE_ID);
        setCustomerName(KHACH_LE_NAME);
        setCustomerPhone('');
        setCustomerAddress('');
        setCustomerSearchQuery('');
        setIsCustDropdownOpen(false);
        onShowToast('Đã tích chọn: Khách Lẻ');
      }
      return;
    }
    const cust = customers.find(c => c.id === cId);
    if (cust) {
      setCustomerId(cust.id);
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone || '');
      setCustomerAddress(cust.address || '');
      setCustomerSearchQuery(cust.name);
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
      phone: (newCustPhone || '').trim(),
      address: (newCustAddress || '').trim(),
      createdAt: new Date().toISOString()
    };

    posDb.saveCustomer(newCust);
    setCustomerId(newCust.id);
    setCustomerName(newCust.name);
    setCustomerPhone(newCust.phone || '');
    setCustomerAddress(newCust.address || '');
    setCustomerSearchQuery(newCust.name);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    onShowToast(`Đã thêm khách hàng mới: ${newCust.name}`);
  };

  // Filter and sort customers for quick search
  const sortedCustMatches = customers.filter(c => {
    if (!customerSearchQuery.trim()) return true;
    const clean = customerSearchQuery.trim().toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(clean)) ||
      (c.phone && c.phone.includes(clean)) ||
      (c.address && c.address.toLowerCase().includes(clean)) ||
      (c.code && c.code.toLowerCase().includes(clean))
    );
  }).sort((a, b) => {
    const tA = parseOrderTimestamp(a.createdAt);
    const tB = parseOrderTimestamp(b.createdAt);
    if (tA && tB && tA !== tB) return tB - tA;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Filter only valid items that have a product selected or name
  const validOrderItems = orderItems
    .filter(item => Boolean((item.name && item.name.trim()) || item.productId))
    .map(item => ({
      ...item,
      productId: item.productId || 'p-' + item.id
    }));

  // Calculate totals (only from valid rows)
  const totalQuantity = validOrderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = validOrderItems.reduce((sum, item) => sum + item.amount, 0);

  // Valid customer info when either customerName is entered/selected OR Khách Lẻ is ticked
  const hasSelectedCustomer = Boolean(
    customerId === KHACH_LE_ID || (customerName && customerName.trim().length > 0)
  );

  // Automatically save new customer (or update existing customer info) when saving an order
  const ensureCustomerForOrder = (): { id?: string; name: string; phone: string; address: string; isNewCustomer: boolean } => {
    const cleanPhone = (customerPhone || '').trim();
    const cleanAddress = (customerAddress || '').trim();

    if (customerId === KHACH_LE_ID) {
      return { id: undefined, name: KHACH_LE_NAME, phone: cleanPhone, address: cleanAddress, isNewCustomer: false };
    }

    const cleanName = customerName.trim();
    if (!cleanName || cleanName.toLowerCase() === KHACH_LE_NAME.toLowerCase()) {
      return { id: undefined, name: cleanName || KHACH_LE_NAME, phone: cleanPhone, address: cleanAddress, isNewCustomer: false };
    }

    const currentCustomers = posDb.getCustomers();
    const existingCust = customerId
      ? currentCustomers.find(c => c.id === customerId)
      : currentCustomers.find(c => c.name.trim().toLowerCase() === cleanName.toLowerCase());

    if (existingCust) {
      const nextPhone = cleanPhone || existingCust.phone || '';
      const nextAddress = cleanAddress || existingCust.address || '';
      if (nextPhone !== (existingCust.phone || '') || nextAddress !== (existingCust.address || '') || existingCust.name !== cleanName) {
        const updatedCust: Customer = {
          ...existingCust,
          name: cleanName,
          phone: nextPhone,
          address: nextAddress
        };
        posDb.saveCustomer(updatedCust);
        setCustomers(posDb.getCustomers());
      }
      return {
        id: existingCust.id,
        name: cleanName,
        phone: nextPhone,
        address: nextAddress,
        isNewCustomer: false
      };
    }

    const newCust: Customer = {
      id: 'c-' + Date.now(),
      name: cleanName,
      phone: cleanPhone,
      address: cleanAddress,
      createdAt: new Date().toISOString()
    };
    posDb.saveCustomer(newCust);
    setCustomers(posDb.getCustomers());
    return {
      id: newCust.id,
      name: newCust.name,
      phone: newCust.phone || '',
      address: newCust.address || '',
      isNewCustomer: true
    };
  };

  // Save Order to Database
  const performSaveOrder = (): Order => {
    const resolvedCust = ensureCustomerForOrder();
    const nowVN = formatVietnamDateTime();
    const order: Order = {
      id: editingOrder ? editingOrder.id : 'ord-' + Date.now(),
      code: orderCode,
      customerId: resolvedCust.id,
      customerName: resolvedCust.name,
      customerPhone: resolvedCust.phone,
      customerAddress: resolvedCust.address,
      items: validOrderItems,
      totalQuantity,
      totalAmount,
      notes: (orderNotes || '').trim(),
      status: editingOrder ? editingOrder.status : 'Chờ in',
      createdAt: editingOrder ? (editingOrder.createdAt ? formatVietnamDateTime(editingOrder.createdAt) : nowVN) : nowVN,
      updatedAt: nowVN
    };

    posDb.saveOrder(order);
    onOrderSaved();
    return order;
  };

  const handleManualSave = () => {
    if (!hasSelectedCustomer) {
      alert('Không thể tạo đơn! Vui lòng nhập thông tin khách hàng, nếu không có thông tin bắt buộc phải tích vào nút "Khách lẻ"!');
      setIsCustomerExpanded(true);
      return;
    }

    if (validOrderItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm vào đơn!');
      return;
    }

    const isEditing = Boolean(editingOrder);
    const resolvedCust = ensureCustomerForOrder();
    const nowVN = formatVietnamDateTime();

    const orderToSave: Order = {
      id: editingOrder ? editingOrder.id : 'ord-' + Date.now(),
      code: orderCode,
      customerId: resolvedCust.id,
      customerName: resolvedCust.name,
      customerPhone: resolvedCust.phone,
      customerAddress: resolvedCust.address,
      items: validOrderItems,
      totalQuantity,
      totalAmount,
      notes: (orderNotes || '').trim(),
      status: editingOrder ? editingOrder.status : 'Chờ in',
      createdAt: editingOrder ? (editingOrder.createdAt ? formatVietnamDateTime(editingOrder.createdAt) : nowVN) : nowVN,
      updatedAt: nowVN
    };

    const savedOrder = posDb.saveOrder(orderToSave);

    if (isEditing) {
      handleResetForm(false);
      if (onFinishedEditOrder) {
        onFinishedEditOrder(savedOrder);
      } else {
        if (onClearEditingOrder) onClearEditingOrder();
        onShowToast(`Đã lưu cập nhật đơn ${savedOrder.code} của ${savedOrder.customerName} thành công!`);
        window.location.hash = 'orders';
      }
    } else {
      handleResetForm(true);
      onShowToast(
        resolvedCust.isNewCustomer
          ? `Đã lưu đơn & tự động thêm khách hàng mới: ${savedOrder.customerName}!`
          : `Đã lưu đơn hàng của ${savedOrder.customerName}!`
      );
    }
  };

  // Trigger Zalo Screenshot Action: prompt save confirmation
  const handleInitiateZaloAction = () => {
    if (!hasSelectedCustomer) {
      alert('Không thể tạo đơn! Vui lòng nhập thông tin khách hàng, nếu không có thông tin bắt buộc phải tích vào nút "Khách lẻ"!');
      setIsCustomerExpanded(true);
      return;
    }
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
    setCaptureTimeStr(formatVietnamDateTime());

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
    const nowVN = formatVietnamDateTime();
    const dummyOrder: Order = {
      id: 'temp',
      code: orderCode,
      customerId: customerId === KHACH_LE_ID ? undefined : customerId,
      customerName: customerName.trim() || KHACH_LE_NAME,
      customerPhone: (customerPhone || '').trim(),
      customerAddress: (customerAddress || '').trim(),
      items: validOrderItems,
      totalQuantity,
      totalAmount,
      notes: orderNotes,
      status: 'Chờ in',
      createdAt: nowVN,
      updatedAt: nowVN
    };

    const text = generateZaloMessage(dummyOrder);
    navigator.clipboard.writeText(text).then(() => {
      onShowToast('Đã sao chép tin nhắn chữ Zalo!');
    }).catch(() => {
      alert(text);
    });
  };

  // Reset Form for New Order (Khách Lẻ is NOT ticked by default)
  const handleResetForm = (showToastNotice?: boolean) => {
    setOrderCode(generateOrderCode());
    setOrderItems(ensureMinimumThreeRows([]));
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerId(undefined);
    setCustomerSearchQuery('');
    setIsCustDropdownOpen(false);
    setOrderNotes('');
    setSearchQuery('');
    setCapturedImageUrl(null);
    setCaptureTimeStr(formatVietnamDateTime());
    if (editingOrder && onClearEditingOrder) onClearEditingOrder();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (showToastNotice !== false) {
      onShowToast('Đã tạo đơn mới!');
    }
  };



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
            onClick={() => {
              handleResetForm();
              if (onFinishedEditOrder) {
                onFinishedEditOrder();
              } else {
                if (onClearEditingOrder) onClearEditingOrder();
                window.location.hash = 'orders';
              }
            }}
            style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontWeight: 700 }}
          >
            Hủy sửa
          </button>
        </div>
      )}





      {/* CUSTOMER INFORMATION CARD - ALWAYS DISPLAYED DIRECTLY */}
      <div
        className="pos-customer-box"
        style={{
          border: hasSelectedCustomer ? undefined : '1.5px solid #ef4444',
          background: hasSelectedCustomer ? undefined : '#fff5f5'
        }}
      >
        <div
          className="pos-customer-header"
          style={{ gap: 8, cursor: 'default' }}
        >
          <div className="pos-customer-header-title" style={{ flex: 1, minWidth: 0 }}>
            <UserCheck size={16} color={hasSelectedCustomer ? '#15803d' : '#dc2626'} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hasSelectedCustomer ? (
                <>
                  Khách: <strong style={{ color: '#15803d' }}>{customerId === KHACH_LE_ID ? KHACH_LE_NAME : customerName}</strong>{' '}
                  {customerPhone && `(${customerPhone})`}
                </>
              ) : (
                <span style={{ color: '#dc2626', fontWeight: 700 }}>
                  * Chưa có thông tin khách hàng (Nhập TT hoặc tích Khách lẻ)
                </span>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* NÚT TÍCH KHÁCH LẺ (KHÔNG TÍCH SẴN, KHI CẦN THÌ TÍCH) */}
            <button
              type="button"
              onClick={() => handleSelectCustomer(KHACH_LE_ID)}
              title="Tích chọn Khách Lẻ nếu không có thông tin khách hàng"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                border: customerId === KHACH_LE_ID ? '1.5px solid #16a34a' : '1.5px solid #94a3b8',
                background: customerId === KHACH_LE_ID ? '#dcfce7' : '#ffffff',
                color: customerId === KHACH_LE_ID ? '#15803d' : '#334155',
                cursor: 'pointer'
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 15,
                  height: 15,
                  borderRadius: 4,
                  background: customerId === KHACH_LE_ID ? '#16a34a' : '#ffffff',
                  border: customerId === KHACH_LE_ID ? '1.5px solid #16a34a' : '1.5px solid #64748b',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: 1
                }}
              >
                {customerId === KHACH_LE_ID ? '✓' : ''}
              </span>
              <span>Khách lẻ</span>
            </button>
          </div>
        </div>

        <div className="pos-customer-body">
          {/* Ô TÌM KIẾM KHÁCH QUEN */}
          <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
            <div ref={custSearchContainerRef} style={{ position: 'relative', flex: 1 }}>
              <Search 
                size={15} 
                color="#64748b" 
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} 
              />
              <input
                type="text"
                className="pos-input pos-input-sm"
                style={{
                  paddingLeft: 32,
                  paddingRight: customerSearchQuery || (customerId && customerId !== KHACH_LE_ID) ? 30 : 10,
                  borderColor: !hasSelectedCustomer ? '#ef4444' : undefined
                }}
                placeholder="🔍 Tìm chọn khách quen có sẵn (nhập Tên hoặc SĐT)..."
                value={customerSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerSearchQuery(val);
                  setCustomerName(val);
                  setCustomerId(undefined);
                  setIsCustDropdownOpen(true);
                }}
                onFocus={() => setIsCustDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (sortedCustMatches.length > 0) {
                      const firstCust = sortedCustMatches[0];
                      handleSelectCustomer(firstCust.id);
                      setCustomerSearchQuery(firstCust.name);
                      setIsCustDropdownOpen(false);
                    }
                  } else if (e.key === 'Escape') {
                    setIsCustDropdownOpen(false);
                  }
                }}
              />
              {(customerSearchQuery || (customerId && customerId !== KHACH_LE_ID)) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearchQuery('');
                    setCustomerId(undefined);
                    setCustomerName('');
                    setCustomerPhone('');
                    setCustomerAddress('');
                    setIsCustDropdownOpen(false);
                    onShowToast('Đã xóa thông tin khách hàng');
                  }}
                  title="Xóa tìm kiếm / Chọn lại khách hàng"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={15} />
                </button>
              )}

              {/* AUTOCOMPLETE DROPDOWN */}
              {isCustDropdownOpen && (
                <div
                  className="pos-autocomplete-list"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1.5px solid #16a34a',
                    borderRadius: 8,
                    marginTop: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    maxHeight: 280,
                    overflowY: 'auto',
                    zIndex: 110
                  }}
                >
                  {sortedCustMatches.length === 0 ? (
                    <div style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                      <div>Không tìm thấy khách quen nào khớp với <strong>"{customerSearchQuery}"</strong></div>
                      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
                        Khách hàng này sẽ tự động được thêm vào danh sách khi Lưu đơn.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{customerSearchQuery.trim() ? `Kết quả tìm kiếm (${sortedCustMatches.length})` : `Danh sách khách quen (${sortedCustMatches.length})`}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>Bấm để chọn</span>
                      </div>
                      {sortedCustMatches.map(c => {
                        const isSelected = customerId === c.id;
                        return (
                          <div
                            key={c.id}
                            className={`pos-autocomplete-item ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              handleSelectCustomer(c.id);
                              setCustomerSearchQuery(c.name);
                              setIsCustDropdownOpen(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              background: isSelected ? '#f0fdf4' : undefined
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {c.code && (
                                  <span style={{ fontSize: 10, background: '#e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                    {c.code}
                                  </span>
                                )}
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                  {c.name}
                                </span>
                                {c.phone && (
                                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                                    📞 {c.phone}
                                  </span>
                                )}
                              </div>
                              {c.address && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  📍 {c.address}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                ✓ Đang chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ô NHẬP TRỰC TIẾP THÔNG TIN KHÁCH HÀNG (TỰ ĐỘNG LƯU THÀNH KHÁCH HÀNG MỚI KHI LƯU ĐƠN) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div>
              <input 
                type="text" 
                className="pos-input pos-input-sm" 
                placeholder="Nhập tên khách / Quán..."
                value={customerId === KHACH_LE_ID ? '' : customerName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerName(val);
                  setCustomerSearchQuery(val);
                  setCustomerId(undefined);
                }}
              />
            </div>
            <div>
              <input 
                type="tel" 
                className="pos-input pos-input-sm" 
                placeholder="Số điện thoại"
                value={customerPhone || ''}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <input 
              type="text" 
              className="pos-input pos-input-sm" 
              placeholder="Địa chỉ giao hàng / Nhà xe nhận hàng"
              value={customerAddress || ''}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </div>

          {!hasSelectedCustomer && (
            <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
              ⚠️ Bắt buộc nhập thông tin khách hàng! Nếu không có thông tin, vui lòng tích vào nút <strong>"Khách lẻ"</strong> để tạo đơn.
            </div>
          )}
        </div>
      </div>

      {/* ORDER ITEMS LIST - KHÔNG HIỂN THỊ SẴN 3 MỤC TRỐNG */}
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

        {orderItems.length === 0 ? (
          <div style={{
            background: '#f8fafc',
            border: '1.5px dashed #cbd5e1',
            borderRadius: 8,
            padding: '16px 12px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: 13
          }}>
            Chưa có sản phẩm nào trong đơn. Tìm kiếm sản phẩm bên dưới hoặc bấm <strong>+ Thêm hàng</strong> để chọn món.
          </div>
        ) : (
          orderItems.map((item, index) => {
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
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                          {item.name}
                        </div>
                        {item.code && (
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                            Mã SP: <span style={{ color: '#15803d' }}>{item.code}</span>
                          </div>
                        )}
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
                      <div className="pos-item-price-info" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Đ.Giá:</span>
                        <div className="pos-unitprice-wrapper" style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: 6,
                          padding: '1px 6px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="pos-unitprice-input"
                            value={item.unitPrice === 0 ? '' : item.unitPrice}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleUpdateUnitPrice(item.id, isNaN(val) ? 0 : val);
                            }}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            style={{
                              width: 52,
                              border: 'none',
                              outline: 'none',
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#15803d',
                              textAlign: 'right',
                              background: 'transparent',
                              padding: 0
                            }}
                            title="Chạm để nhập đơn giá mới (k)"
                          />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginLeft: 2 }}>k</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                            onFocus={(e) => e.target.select()}
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
                        <div className="pos-item-amount" style={{ minWidth: 72, textAlign: 'right' }}>
                          {formatVND(item.amount)}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* IF EMPTY ROW: SHOW PRODUCT SELECTOR PICKER */
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
                            {p.name} [Mã: {p.code}] - {p.price}k
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="pos-item-del-btn"
                      onClick={() => handleRemoveOrClearRow(item.id)}
                      title="Xóa hàng trống"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

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
      <div style={{ marginBottom: 10 }}>
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
          <div className="receipt-date-time">{captureTimeStr || formatVietnamDateTime()}</div>
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
        {/* QUICK PRODUCT SEARCH BAR - SÁT BÊN DƯỚI CÙNG VÀ LUÔN CỐ ĐỊNH TRÊN MỤC TỔNG TIỀN */}
        <div className="pos-quick-search-box" style={{ marginBottom: 2 }}>
          <div className="pos-search-input-wrap">
            <Search size={16} className="pos-search-icon" />
            <input
              id="pos-search-input"
              ref={searchInputRef}
              type="text"
              className="pos-input pos-search-input pos-input-sm"
              placeholder="🔍 Tìm kiếm sản phẩm theo tên hoặc mã..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) {
                  setIsDropdownOpen(true);
                } else {
                  setFilteredProducts(products.slice(0, 10));
                  setIsDropdownOpen(true);
                }
              }}
              style={{ height: 38, fontSize: 13 }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setIsDropdownOpen(false); }}
                style={{
                  position: 'absolute', right: 8, background: 'none', border: 'none',
                  color: '#94a3b8', cursor: 'pointer', padding: 4
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown (mở hướng lên trên vì ở dưới cùng) */}
          {isDropdownOpen && filteredProducts.length > 0 && (
            <div className="pos-autocomplete-list" style={{ bottom: '100%', top: 'auto', marginBottom: 6, boxShadow: '0 -4px 20px rgba(0,0,0,0.18)' }}>
              {filteredProducts.map(prod => (
                <div
                  key={prod.id}
                  className="pos-autocomplete-item"
                  onClick={() => handleSelectProduct(prod)}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{prod.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                      Mã SP: <span style={{ color: '#15803d' }}>{prod.code}</span>
                    </div>
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
            onClick={() => handleResetForm(true)}
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
