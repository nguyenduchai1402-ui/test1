import React from 'react';
import { Printer, Smartphone } from 'lucide-react';

interface PosHeaderProps {
  onShowToast?: (msg: string) => void;
}

export const PosHeader: React.FC<PosHeaderProps> = () => {
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
    </header>
  );
};
