import React, { useState, useEffect } from 'react';
import { 
  Cloud, CloudCheck, CloudUpload, CloudDownload, RefreshCw, 
  X, Check, Key, Globe, Database, Copy, AlertCircle, ExternalLink 
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  checkSupabaseConnection, 
  syncFromSupabase, 
  pushAllToSupabase,
  SupabaseConfig
} from '../../utils/posStorage';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

const POS_SQL_SCHEMA = `-- BẢNG SẢN PHẨM IN LY
create table if not exists pos_products (
  id text primary key,
  code text not null,
  name text not null,
  price numeric not null,
  unit text not null default 'thiên',
  category text not null default 'Cốc Tim',
  is_popular boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BẢNG KHÁCH HÀNG
create table if not exists pos_customers (
  id text primary key,
  code text,
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BẢNG ĐƠN HÀNG
create table if not exists pos_orders (
  id text primary key,
  code text not null,
  customer_id text,
  customer_name text not null,
  customer_phone text,
  customer_address text,
  items jsonb not null default '[]'::jsonb,
  total_quantity integer not null default 0,
  total_amount numeric not null default 0,
  notes text,
  status text not null default 'Chờ in',
  created_at text not null,
  updated_at text not null
);

-- BẬT ROW LEVEL SECURITY & POLICY CHO PHÉP TRUY CẬP TRỰC TIẾP TỪ POS
alter table pos_products enable row level security;
alter table pos_customers enable row level security;
alter table pos_orders enable row level security;

create policy "Allow anon pos_products" on pos_products for all using (true) with check (true);
create policy "Allow anon pos_customers" on pos_customers for all using (true) with check (true);
create policy "Allow anon pos_orders" on pos_orders for all using (true) with check (true);
`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const [config, setConfig] = useState<SupabaseConfig>(getSupabaseConfig());
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setConfig(cfg);
      if (cfg.url && cfg.anonKey) {
        handleTestConnection(cfg);
      } else {
        setStatus('disconnected');
        setStatusMsg('Chưa thiết lập URL hoặc Anon Key của Supabase.');
      }
    }
  }, [isOpen]);

  const handleTestConnection = async (targetCfg?: SupabaseConfig) => {
    setIsLoading(true);
    setStatus('checking');
    setStatusMsg('Đang kiểm tra kết nối tới Supabase Cloud...');
    
    if (targetCfg) {
      saveSupabaseConfig(targetCfg);
    }

    try {
      const res = await checkSupabaseConnection();
      if (res.ok) {
        setStatus('connected');
        setStatusMsg(res.message);
      } else {
        setStatus('error');
        setStatusMsg(res.message);
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err.message || 'Lỗi kết nối.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.url.trim() || !config.anonKey.trim()) {
      alert('Vui lòng nhập đầy đủ Supabase Project URL và Public Anon Key!');
      return;
    }
    saveSupabaseConfig({
      url: config.url.trim(),
      anonKey: config.anonKey.trim(),
      autoSync: true
    });
    handleTestConnection();
    onShowToast('Đã lưu cấu hình Supabase!');
  };

  const handleSyncFromCloud = async () => {
    setIsLoading(true);
    try {
      const res = await syncFromSupabase();
      if (res.ok) {
        onShowToast(res.message);
        setStatus('connected');
        setStatusMsg(res.message);
      } else {
        alert(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToCloud = async () => {
    if (!window.confirm('Đẩy toàn bộ đơn hàng, sản phẩm và khách hàng hiện tại lên Supabase Cloud?')) return;
    setIsLoading(true);
    try {
      const res = await pushAllToSupabase();
      if (res.ok) {
        onShowToast(res.message);
        setStatus('connected');
        setStatusMsg(res.message);
      } else {
        alert(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(POS_SQL_SCHEMA).then(() => {
      onShowToast('Đã sao chép mã SQL tạo bảng vào bộ nhớ tạm!');
    }).catch(() => {
      alert('Vui lòng chọn và sao chép thủ công đoạn mã SQL bên dưới.');
    });
  };

  if (!isOpen) return null;

  return (
    <div className="pos-sheet-backdrop" onClick={onClose}>
      <div 
        className="pos-sheet-container" 
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pos-sheet-header">
          <div className="pos-sheet-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
            <Database size={18} />
            <span>Kết Nối Supabase Cloud Lưu Trữ</span>
          </div>
          <button 
            type="button" 
            className="pos-icon-btn" 
            style={{ color: '#64748b' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* STATUS CARD */}
        <div style={{
          background: status === 'connected' ? '#f0fdf4' : status === 'checking' ? '#eff6ff' : '#fffbeb',
          border: `1px solid ${status === 'connected' ? '#86efac' : status === 'checking' ? '#93c5fd' : '#fde68a'}`,
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-block',
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: status === 'connected' ? '#16a34a' : status === 'checking' ? '#2563eb' : '#d97706'
            }} />
            <strong style={{ 
              fontSize: 13, 
              color: status === 'connected' ? '#15803d' : status === 'checking' ? '#1d4ed8' : '#b45309' 
            }}>
              {status === 'connected' ? 'Đã kết nối Supabase Cloud' : status === 'checking' ? 'Đang kiểm tra kết nối...' : 'Chưa kết nối Supabase (Đang lưu nội bộ)'}
            </strong>
          </div>
          {statusMsg && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
              {statusMsg}
            </div>
          )}
        </div>

        {/* FORM CONFIG */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Globe size={13} color="#15803d" />
              <span>Supabase Project URL</span>
            </label>
            <input
              type="url"
              required
              className="pos-input"
              placeholder="https://xyzcompany.supabase.co"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Key size={13} color="#15803d" />
              <span>Public Anon Key</span>
            </label>
            <textarea
              required
              rows={2}
              className="pos-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              style={{ height: 'auto', padding: '6px 8px', fontSize: 11, fontFamily: 'monospace' }}
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="pos-btn pos-btn-secondary"
              onClick={() => handleTestConnection(config)}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Kiểm tra kết nối</span>
            </button>

            <button
              type="submit"
              className="pos-btn pos-btn-primary"
              disabled={isLoading}
            >
              <Check size={15} />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </form>

        {/* CLOUD ACTIONS (WHEN CONNECTED) */}
        <div style={{ 
          marginTop: 14, 
          paddingTop: 12, 
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
            ĐỒNG BỘ DỮ LIỆU CLOUD
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              className="pos-btn pos-btn-secondary"
              onClick={handleSyncFromCloud}
              disabled={isLoading || status !== 'connected'}
              title="Tải toàn bộ đơn hàng, sản phẩm từ Supabase về máy này"
            >
              <CloudDownload size={15} color="#15803d" />
              <span>Tải từ Cloud</span>
            </button>

            <button
              type="button"
              className="pos-btn pos-btn-secondary"
              onClick={handlePushToCloud}
              disabled={isLoading || status !== 'connected'}
              title="Đẩy dữ liệu trên máy hiện tại lên Supabase Cloud"
            >
              <CloudUpload size={15} color="#2563eb" />
              <span>Đẩy lên Cloud</span>
            </button>
          </div>
        </div>

        {/* SQL SCRIPT HELPER */}
        <div style={{
          marginTop: 14,
          padding: '10px 12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
              📜 Tạo bảng dữ liệu trên Supabase (30s)
            </div>
            <button
              type="button"
              className="pos-btn pos-btn-secondary pos-btn-sm"
              onClick={handleCopySql}
              style={{ padding: '3px 8px', fontSize: 11 }}
            >
              <Copy size={12} />
              <span>Copy SQL</span>
            </button>
          </div>

          <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>
            Mở Supabase Dashboard ➜ Vào <strong>SQL Editor</strong> ➜ Bấm <strong>New Query</strong> ➜ Dán mã SQL vừa copy và bấm <strong>Run</strong>.
          </p>

          <button
            type="button"
            onClick={() => setShowSql(!showSql)}
            style={{
              background: 'none',
              border: 'none',
              color: '#15803d',
              fontSize: 11,
              fontWeight: 600,
              padding: 0,
              marginTop: 4,
              cursor: 'pointer'
            }}
          >
            {showSql ? '▼ Ẩn mã SQL' : '▶ Xem chi tiết mã SQL'}
          </button>

          {showSql && (
            <pre style={{
              background: '#0f172a',
              color: '#a7f3d0',
              padding: 8,
              borderRadius: 6,
              fontSize: 10,
              overflowX: 'auto',
              maxHeight: 140,
              marginTop: 6
            }}>
              {POS_SQL_SCHEMA}
            </pre>
          )}
        </div>

        <button
          type="button"
          className="pos-btn pos-btn-secondary"
          style={{ width: '100%', marginTop: 12 }}
          onClick={onClose}
        >
          Đóng
        </button>
      </div>
    </div>
  );
};
