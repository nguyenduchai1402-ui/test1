import React, { useState, useEffect } from 'react';
import { db } from '../utils/supabaseClient';
import { Employee, Computer, Monitor, ITAsset, SharedFolder } from '../types';
import { Search, User, Laptop, Monitor as MonitorIcon, Wrench, Folder, ArrowRight } from 'lucide-react';

interface GlobalSearchProps {
  query: string;
  onNavigate: (tab: string, itemId: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ query, onNavigate }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [itAssets, setITAssets] = useState<ITAsset[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [emps, pcs, mons, asts, folds] = await Promise.all([
          db.getEmployees(),
          db.getComputers(),
          db.getMonitors(),
          db.getITAssets(),
          db.getSharedFolders()
        ]);
        setEmployees(emps);
        setComputers(pcs);
        setMonitors(mons);
        setITAssets(asts);
        setFolders(folds);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  if (loading) {
    return <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>Đang tìm kiếm trên hệ thống...</div>;
  }

  // Filter matching elements
  const cleanQuery = query.toLowerCase().trim();

  if (!cleanQuery) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <Search size={32} style={{ marginBottom: '1rem' }} />
        <p>Gõ từ khóa vào thanh tìm kiếm ở trên để tìm kiếm nhân viên, máy tính, màn hình, thiết bị hoặc thư mục.</p>
      </div>
    );
  }

  const matchEmployees = employees.filter(e => 
    e.id.toLowerCase().includes(cleanQuery) ||
    e.name.toLowerCase().includes(cleanQuery) ||
    (e.name_kr && e.name_kr.toLowerCase().includes(cleanQuery)) ||
    (e.win_account && e.win_account.toLowerCase().includes(cleanQuery))
  );

  const matchComputers = computers.filter(c => 
    c.id.toLowerCase().includes(cleanQuery) ||
    c.name.toLowerCase().includes(cleanQuery) ||
    (c.serial && c.serial.toLowerCase().includes(cleanQuery)) ||
    (c.ip_address && c.ip_address.includes(cleanQuery))
  );

  const matchMonitors = monitors.filter(m => 
    m.id.toLowerCase().includes(cleanQuery) ||
    m.model.toLowerCase().includes(cleanQuery) ||
    (m.serial && m.serial.toLowerCase().includes(cleanQuery))
  );

  const matchITAssets = itAssets.filter(a => 
    a.id.toLowerCase().includes(cleanQuery) ||
    a.model.toLowerCase().includes(cleanQuery) ||
    a.asset_type.toLowerCase().includes(cleanQuery) ||
    (a.serial && a.serial.toLowerCase().includes(cleanQuery))
  );

  const matchFolders = folders.filter(f => 
    f.name.toLowerCase().includes(cleanQuery) ||
    f.folder_path.toLowerCase().includes(cleanQuery)
  );

  const totalResults = matchEmployees.length + matchComputers.length + matchMonitors.length + matchITAssets.length + matchFolders.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 className="page-title">Kết quả tìm kiếm toàn hệ thống</h1>
        <p className="page-subtitle">Tìm thấy {totalResults} kết quả phù hợp cho từ khóa: <b style={{ color: 'var(--primary-light)' }}>"{query}"</b></p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* EMPLOYEES */}
        {matchEmployees.length > 0 && (
          <div className="panel" style={{ margin: 0 }}>
            <h3 className="panel-title" style={{ fontSize: '1rem', color: 'var(--primary-light)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <User size={18} /> Nhân viên ({matchEmployees.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {matchEmployees.map(emp => (
                <div 
                  key={emp.id}
                  onClick={() => onNavigate('employees', emp.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="matrix-cell-interactive"
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{emp.name}</span>
                    {emp.name_kr && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}> ({emp.name_kr})</span>}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mã NV: {emp.id} | Tài khoản Win: {emp.win_account || 'N/A'}</div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPUTERS */}
        {matchComputers.length > 0 && (
          <div className="panel" style={{ margin: 0 }}>
            <h3 className="panel-title" style={{ fontSize: '1rem', color: 'var(--info)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <Laptop size={18} /> Máy tính ({matchComputers.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {matchComputers.map(pc => (
                <div 
                  key={pc.id}
                  onClick={() => onNavigate('computers', pc.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="matrix-cell-interactive"
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{pc.id} - {pc.name}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CPU: {pc.cpu} | Serial: {pc.serial || 'N/A'} | IP: {pc.ip_address || 'N/A'}</div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MONITORS */}
        {matchMonitors.length > 0 && (
          <div className="panel" style={{ margin: 0 }}>
            <h3 className="panel-title" style={{ fontSize: '1rem', color: 'var(--success)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <MonitorIcon size={18} /> Màn hình ({matchMonitors.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {matchMonitors.map(m => (
                <div 
                  key={m.id}
                  onClick={() => onNavigate('monitors', m.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="matrix-cell-interactive"
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{m.id} - {m.model}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Kích thước: {m.size_inches}" | Serial: {m.serial || 'N/A'}</div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IT DEVICES */}
        {matchITAssets.length > 0 && (
          <div className="panel" style={{ margin: 0 }}>
            <h3 className="panel-title" style={{ fontSize: '1rem', color: 'var(--warning)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <Wrench size={18} /> Thiết bị IT khác ({matchITAssets.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {matchITAssets.map(a => (
                <div 
                  key={a.id}
                  onClick={() => onNavigate('it-assets', a.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="matrix-cell-interactive"
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{a.id} - {a.model} ({a.asset_type})</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Serial: {a.serial || 'N/A'} | Vị trí: {a.location || 'N/A'}</div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOLDERS */}
        {matchFolders.length > 0 && (
          <div className="panel" style={{ margin: 0 }}>
            <h3 className="panel-title" style={{ fontSize: '1rem', color: 'var(--primary-light)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <Folder size={18} /> Thư mục ổ chung ({matchFolders.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {matchFolders.map(f => (
                <div 
                  key={f.id}
                  onClick={() => onNavigate('folders', f.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  className="matrix-cell-interactive"
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>📁 {f.name}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Đường dẫn: {f.folder_path}</div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {totalResults === 0 && (
          <div className="panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Không tìm thấy kết quả nào trùng khớp với từ khóa "{query}" trên hệ thống.
          </div>
        )}

      </div>
    </div>
  );
};
