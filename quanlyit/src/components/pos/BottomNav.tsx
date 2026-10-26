import React from 'react';
import { Calculator, FileText, Package, Users } from 'lucide-react';
import { TabType } from '../../types/pos';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  orderCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, orderCount }) => {
  const handleNavClick = (tab: TabType) => {
    window.location.hash = tab;
    onChangeTab(tab);
  };

  return (
    <nav className="pos-bottom-nav">
      <button 
        type="button"
        id="nav-calculator"
        className={`pos-nav-item ${activeTab === 'calculator' ? 'active' : ''}`}
        onClick={() => handleNavClick('calculator')}
      >
        <div className="pos-nav-icon-wrap">
          <Calculator size={20} />
        </div>
        <span>Tính tiền</span>
      </button>

      <button 
        type="button"
        id="nav-orders"
        className={`pos-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
        onClick={() => handleNavClick('orders')}
      >
        <div className="pos-nav-icon-wrap">
          <FileText size={20} />
          {orderCount > 0 && <span className="pos-nav-badge">{orderCount}</span>}
        </div>
        <span>Đơn hàng</span>
      </button>

      <button 
        type="button"
        id="nav-products"
        className={`pos-nav-item ${activeTab === 'products' ? 'active' : ''}`}
        onClick={() => handleNavClick('products')}
      >
        <div className="pos-nav-icon-wrap">
          <Package size={20} />
        </div>
        <span>Sản phẩm</span>
      </button>

      <button 
        type="button"
        id="nav-customers"
        className={`pos-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
        onClick={() => handleNavClick('customers')}
      >
        <div className="pos-nav-icon-wrap">
          <Users size={20} />
        </div>
        <span>Khách hàng</span>
      </button>
    </nav>
  );
};
