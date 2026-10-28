import { useState, useEffect } from 'react';
import { TabType, Order, Customer } from './types/pos';
import { PosHeader } from './components/pos/PosHeader';
import { BottomNav } from './components/pos/BottomNav';
import { CalculatorScreen } from './components/pos/CalculatorScreen';
import { OrdersScreen } from './components/pos/OrdersScreen';
import { ProductsScreen } from './components/pos/ProductsScreen';
import { CustomersScreen } from './components/pos/CustomersScreen';
import { Toast } from './components/pos/Toast';
import { posDb, initAutoSupabaseSync, syncFromLocalApi } from './utils/posStorage';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '');
    if (['calculator', 'orders', 'products', 'customers'].includes(hash)) {
      return hash as TabType;
    }
    return 'calculator';
  });
  const [orders, setOrders] = useState<Order[]>(posDb.getOrders());
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState<Customer | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync hash with activeTab
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['calculator', 'orders', 'products', 'customers'].includes(hash)) {
        setActiveTab(hash as TabType);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Đồng bộ dữ liệu chung giữa tất cả trình duyệt và kết nối Supabase
  useEffect(() => {
    // 1. Tải dữ liệu từ database dùng chung (/api/db) ngay lập tức
    syncFromLocalApi();

    // 2. Khi chuyển tab hoặc đổi trình duyệt quay lại, tự động cập nhật
    const handleFocus = () => {
      syncFromLocalApi();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Tự động kết nối và đồng bộ với Supabase khi khởi chạy app
  useEffect(() => {
    initAutoSupabaseSync().then((res) => {
      if (res && res.ok) {
        showToast('Đã kết nối và đồng bộ Supabase Cloud!');
      }
    });
  }, []);

  // Sync orders count
  useEffect(() => {
    const handleUpdate = () => setOrders(posDb.getOrders());
    window.addEventListener('pos_orders_updated', handleUpdate);
    return () => window.removeEventListener('pos_orders_updated', handleUpdate);
  }, []);

  // Show Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Handle Edit Order action: navigate to calculator and load order
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    window.location.hash = 'calculator';
    setActiveTab('calculator');
    showToast(`Đang sửa đơn ${order.code} của ${order.customerName || 'Khách Lẻ'}`);
  };

  // Return to orders tab when editing is finished or cancelled
  const handleFinishedEditOrder = (savedOrder?: Order) => {
    setEditingOrder(null);
    window.location.hash = 'orders';
    setActiveTab('orders');
    if (savedOrder) {
      showToast(`Đã lưu cập nhật đơn ${savedOrder.code} thành công!`);
    }
  };

  // Handle Select Customer for New Order: navigate to calculator with customer pre-selected
  const handleSelectCustomerForOrder = (customer: Customer) => {
    setSelectedCustomerForOrder(customer);
    setEditingOrder(null);
    setActiveTab('calculator');
    showToast(`Đang lập đơn mới cho: ${customer.name}`);
  };

  return (
    <div className="pos-app-wrapper">
      {/* COMPACT TOP HEADER */}
      <PosHeader onShowToast={showToast} />

      {/* ACTIVE SCREEN CONTENT */}
      {activeTab === 'calculator' && (
        <CalculatorScreen
          editingOrder={editingOrder}
          onClearEditingOrder={() => setEditingOrder(null)}
          onOrderSaved={() => setEditingOrder(null)}
          onShowToast={showToast}
          selectedCustomerForOrder={selectedCustomerForOrder}
          onClearSelectedCustomer={() => setSelectedCustomerForOrder(null)}
          onFinishedEditOrder={handleFinishedEditOrder}
        />
      )}

      {activeTab === 'orders' && (
        <OrdersScreen
          onEditOrder={handleEditOrder}
          onShowToast={showToast}
        />
      )}

      {activeTab === 'products' && (
        <ProductsScreen
          onShowToast={showToast}
        />
      )}

      {activeTab === 'customers' && (
        <CustomersScreen
          onSelectCustomerForOrder={handleSelectCustomerForOrder}
          onShowToast={showToast}
        />
      )}

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (editingOrder && tab !== 'calculator') {
            setEditingOrder(null);
          }
          setActiveTab(tab);
        }}
        orderCount={orders.length}
      />

      {/* FLOATING TOAST FEEDBACK */}
      <Toast message={toastMessage} />
    </div>
  );
}

export default App;
