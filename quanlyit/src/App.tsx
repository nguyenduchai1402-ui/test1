import React, { useState, useEffect } from 'react';
import { TabType, Order, Customer } from './types/pos';
import { PosHeader } from './components/pos/PosHeader';
import { BottomNav } from './components/pos/BottomNav';
import { CalculatorScreen } from './components/pos/CalculatorScreen';
import { OrdersScreen } from './components/pos/OrdersScreen';
import { ProductsScreen } from './components/pos/ProductsScreen';
import { CustomersScreen } from './components/pos/CustomersScreen';
import { Toast } from './components/pos/Toast';
import {
  posDb,
  initAutoSupabaseSync,
  syncFromLocalApi,
  syncFromSupabase,
  isUserAuthenticated,
  authenticateUserWithDatabase
} from './utils/posStorage';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isUserAuthenticated());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  // Đồng bộ dữ liệu chung giữa tất cả trình duyệt và kết nối Supabase sau khi đã đăng nhập
  useEffect(() => {
    if (!isAuthenticated) return;

    // 1. Tải dữ liệu từ database dùng chung (/api/db) ngay lập tức
    syncFromLocalApi();

    // 2. Tự động kết nối và đồng bộ với Supabase
    initAutoSupabaseSync().then((res) => {
      if (res && res.ok) {
        showToast('Đã kết nối và đồng bộ Supabase Cloud!');
      }
    });

    // 3. Khi chuyển tab hoặc đổi trình duyệt quay lại, tự động đồng bộ từ Supabase
    const handleFocus = () => {
      void syncFromSupabase();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    const res = await authenticateUserWithDatabase(username, password);
    setIsLoggingIn(false);
    if (res.ok) {
      setIsAuthenticated(true);
    } else {
      setLoginError(res.message || 'Sai tên đăng nhập hoặc mật khẩu!');
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: 16
        }}
      >
        <form
          onSubmit={handleLoginSubmit}
          style={{
            width: '100%',
            maxWidth: 360,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 24,
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 6
              }}
            >
              Tên đăng nhập
            </label>
            <input
              type="text"
              className="pos-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 6
              }}
            >
              Mật khẩu
            </label>
            <input
              type="password"
              className="pos-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {loginError && (
            <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="pos-btn pos-btn-primary"
            disabled={isLoggingIn}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {isLoggingIn ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    );
  }

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
