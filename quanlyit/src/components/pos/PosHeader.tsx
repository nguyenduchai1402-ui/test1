import React from 'react';
import { Printer, RefreshCw, Smartphone } from 'lucide-react';
import { posDb } from '../../utils/posStorage';

interface PosHeaderProps {
  onShowToast: (msg: string) => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({ onShowToast }) => {
  const handleResetData = () => {
    if (window.confirm('Khôi phục danh mục sản phẩm, khách hàng và đơn mẫu ban đầu của xưởng in?')) {
      posDb.resetDemoData();
      onShowToast('Đã khôi phục dữ liệu mẫu xưởng in!');
    }
  };

  return (
    <header className="pos-header">
      <div className="pos-header-left">
        <Printer size={18} className="text-white" />
        <div className="pos-header-title">
          <span>XƯỞNG IN LY NHỰA</span>
          <span className="pos-header-badge">
            <Smartphone size={10} style={{ display: 'inline', marginRight: 2 }} />
            POS
          </span>
        </div>
      </div>

      <div className="pos-header-actions">
        <button 
          className="pos-icon-btn" 
          onClick={handleResetData}
          title="Khôi phục danh mục & đơn mẫu"
          aria-label="Khôi phục dữ liệu"
        >
          <RefreshCw size={15} />
        </button>
      </div>
    </header>
  );
};
