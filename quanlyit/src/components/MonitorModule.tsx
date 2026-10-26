import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Monitor, 
  QrCode, 
  User, 
  Laptop, 
  Calendar, 
  Clock, 
  X,
  UserPlus,
  ArrowRightLeft
} from 'lucide-react';
import { db } from '../utils/supabaseClient';
import { Monitor as MonitorType, Employee, Computer, AssetHistory } from '../types';
import { QrModal } from './QrModal';

interface MonitorModuleProps {
  currentUserRole: string;
  searchQuery?: string;
}

export const MonitorModule: React.FC<MonitorModuleProps> = ({ currentUserRole, searchQuery = '' }) => {
  const [monitors, setMonitors] = useState<MonitorType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [history, setHistory] = useState<AssetHistory[]>([]);

  // Filtering
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [selectedMon, setSelectedMon] = useState<MonitorType | null>(null);

  // QR Modal
  const [qrAsset, setQrAsset] = useState<{ id: string; name: string; serial?: string; user?: string; location?: string } | null>(null);

  // Modal CRUD
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formMon, setFormMon] = useState<Partial<MonitorType>>({
    id: '', model: '', serial: '', size_inches: '', resolution: '', current_user_id: '', connected_computer_id: '',
    location: '', purchase_date: new Date().toISOString().split('T')[0], warranty_months: 24, status: 'Spare'
  });

  // Handover Modal
  const [isHandoverOpen, setIsHandoverOpen] = useState<boolean>(false);
  const [handoverUserId, setHandoverUserId] = useState<string>('');
  const [handoverPcId, setHandoverPcId] = useState<string>('');

  const canEdit = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'IT_ADMIN';
  const canUpdateStatus = canEdit || currentUserRole === 'IT_USER';

  const loadData = async () => {
    try {
      const [mons, emps, pcs, hist] = await Promise.all([
        db.getMonitors(),
        db.getEmployees(),
        db.getComputers(),
        db.getAssetHistory()
      ]);
      setMonitors(mons);
      setEmployees(emps);
      setComputers(pcs);
      setHistory(hist);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('webapp_user_changed', loadData);
    return () => window.removeEventListener('webapp_user_changed', loadData);
  }, []);

  const activeSearch = searchQuery || localSearch;
  const filteredMonitors = monitors.filter(m => {
    const matchesSearch = 
      m.id.toLowerCase().includes(activeSearch.toLowerCase()) ||
      m.model.toLowerCase().includes(activeSearch.toLowerCase()) ||
      (m.serial && m.serial.toLowerCase().includes(activeSearch.toLowerCase())) ||
      (m.size_inches && m.size_inches.includes(activeSearch)) ||
      (m.resolution && m.resolution.toLowerCase().includes(activeSearch.toLowerCase()));
    
    const matchesStatus = statusFilter ? m.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const getEmployeeName = (id?: string) => employees.find(e => e.id === id)?.name || 'Chưa bàn giao';
  const getComputerName = (id?: string) => computers.find(c => c.id === id)?.name || 'Chưa kết nối';

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormMon({
      id: `MON-${(monitors.length + 1).toString().padStart(3, '0')}`,
      model: '',
      serial: '',
      size_inches: '24',
      resolution: '1920x1080 FHD',
      current_user_id: '',
      connected_computer_id: '',
      location: 'Kho IT Tầng 3',
      purchase_date: new Date().toISOString().split('T')[0],
      warranty_months: 24,
      status: 'Spare'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: MonitorType) => {
    setModalMode('edit');
    setFormMon(m);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMon.id || !formMon.model) return;
    try {
      await db.saveMonitor(formMon as MonitorType);
      setIsModalOpen(false);
      loadData();
      if (selectedMon && selectedMon.id === formMon.id) {
        setSelectedMon(formMon as MonitorType);
      }
    } catch (err) {
      alert('Lỗi lưu cấu hình màn hình');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa màn hình này khỏi hệ thống?')) return;
    try {
      await db.deleteMonitor(id);
      loadData();
      if (selectedMon?.id === id) setSelectedMon(null);
    } catch (err) {
      alert('Lỗi xóa màn hình');
    }
  };

  // Handover controls
  const handleOpenHandover = () => {
    setHandoverUserId(employees[0]?.id || '');
    setHandoverPcId('');
    setIsHandoverOpen(true);
  };

  const handleCommitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMon) return;

    const updatedMon: MonitorType = {
      ...selectedMon,
      current_user_id: handoverUserId || undefined,
      connected_computer_id: handoverPcId || undefined,
      status: 'Active'
    };

    try {
      await db.saveMonitor(updatedMon);
      setIsHandoverOpen(false);
      setSelectedMon(updatedMon);
      loadData();
    } catch (err) {
      alert('Lỗi bàn giao màn hình');
    }
  };

  const handleReclaim = async () => {
    if (!selectedMon || !window.confirm('Thu hồi màn hình này về kho dự phòng?')) return;
    
    const updatedMon: MonitorType = {
      ...selectedMon,
      current_user_id: undefined,
      connected_computer_id: undefined,
      status: 'Spare'
    };

    try {
      await db.saveMonitor(updatedMon);
      setSelectedMon(updatedMon);
      loadData();
    } catch (err) {
      alert('Lỗi thu hồi màn hình');
    }
  };

  const handleStatusChange = async (status: any) => {
    if (!selectedMon) return;
    const updatedMon = { ...selectedMon, status };
    try {
      await db.saveMonitor(updatedMon);
      setSelectedMon(updatedMon);
      loadData();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  const monHistory = selectedMon ? history.filter(h => h.asset_id === selectedMon.id) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Quản lý Màn hình</h1>
          <p className="page-subtitle">Roster màn hình hiển thị, liên kết PC và hỗ trợ chế độ đa màn hình (Dual/Triple)</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Thêm màn hình
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm mã màn hình, model, độ phân giải, serial..."
            className="form-control"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả Tình trạng</option>
          <option value="Active">Đang sử dụng</option>
          <option value="Spare">Dự phòng</option>
          <option value="Repair">Bảo trì</option>
          <option value="Broken">Hỏng</option>
          <option value="Disposed">Thanh lý</option>
        </select>
      </div>

      <div className="split-layout">
        {/* MONITORS ROSTER */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="table-container">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Mã màn hình</th>
                  <th>Model / Kích thước</th>
                  <th>Độ phân giải</th>
                  <th>Người sử dụng</th>
                  <th>PC Kết nối</th>
                  <th>Tình trạng</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonitors.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Không tìm thấy màn hình nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredMonitors.map(m => (
                    <tr 
                      key={m.id} 
                      style={{ cursor: 'pointer', backgroundColor: selectedMon?.id === m.id ? 'rgba(99, 102, 241, 0.08)' : '' }}
                      onClick={() => setSelectedMon(m)}
                    >
                      <td style={{ fontWeight: 700 }}>{m.id}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{m.model}</span>
                          {m.size_inches && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Kích thước: {m.size_inches}"</span>}
                        </div>
                      </td>
                      <td><code>{m.resolution || 'N/A'}</code></td>
                      <td>{getEmployeeName(m.current_user_id)}</td>
                      <td><b>{getComputerName(m.connected_computer_id)}</b></td>
                      <td>
                        <span className={`badge ${
                          m.status === 'Active' ? 'badge-success' : 
                          m.status === 'Spare' ? 'badge-info' : 
                          m.status === 'Repair' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {m.status === 'Active' && 'Đang sử dụng'}
                          {m.status === 'Spare' && 'Dự phòng'}
                          {m.status === 'Repair' && 'Bảo trì'}
                          {m.status === 'Broken' && 'Hỏng'}
                          {m.status === 'Disposed' && 'Thanh lý'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn btn-secondary btn-icon" onClick={() => setSelectedMon(m)} title="Xem chi tiết">
                            <Monitor size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            title="Mã QR"
                            onClick={() => setQrAsset({
                              id: m.id,
                              name: m.model,
                              serial: m.serial,
                              user: getEmployeeName(m.current_user_id),
                              location: m.location || 'N/A'
                            })}
                          >
                            <QrCode size={14} />
                          </button>
                          {canEdit && (
                            <>
                              <button className="btn btn-secondary btn-icon" onClick={() => handleOpenEdit(m)} title="Sửa thông số">
                                <Edit size={14} />
                              </button>
                              <button className="btn btn-danger btn-icon" onClick={() => handleDelete(m.id)} title="Xóa">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAILS DRAWER */}
        <div className="drawer">
          {selectedMon ? (
            <div>
              <div className="drawer-header">
                <h3 className="drawer-title">Chi tiết màn hình</h3>
                <button className="modal-close" onClick={() => setSelectedMon(null)}><X size={18} /></button>
              </div>

              {/* Specs */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{selectedMon.id}</span>
                  <button 
                    className="btn btn-secondary btn-icon" 
                    title="In QR Code"
                    onClick={() => setQrAsset({
                      id: selectedMon.id,
                      name: selectedMon.model,
                      serial: selectedMon.serial,
                      user: getEmployeeName(selectedMon.current_user_id),
                      location: selectedMon.location || 'N/A'
                    })}
                  >
                    <QrCode size={14} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem' }}>
                  <div>Model: <b>{selectedMon.model}</b></div>
                  {selectedMon.serial && <div>🔢 S/N: <code>{selectedMon.serial}</code></div>}
                  {selectedMon.size_inches && <div>📏 Kích thước: {selectedMon.size_inches} inches</div>}
                  {selectedMon.resolution && <div>📐 Độ phân giải: {selectedMon.resolution}</div>}
                  <div>📍 Vị trí: {selectedMon.location || 'Chưa cập nhật'}</div>
                </div>
              </div>

              {/* Connections */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Laptop size={14} /> Liên kết máy tính
                </h4>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>Kết nối máy: <b>{getComputerName(selectedMon.connected_computer_id)}</b></div>
                  <div>Người dùng: <b>{getEmployeeName(selectedMon.current_user_id)}</b></div>
                </div>
              </div>

              {/* Warranty */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} /> Mua hàng & Bảo hành
                </h4>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <div>Ngày mua: {selectedMon.purchase_date || 'N/A'}</div>
                  <div>Thời hạn bảo hành: {selectedMon.warranty_months} tháng</div>
                </div>
              </div>

              {/* Controls */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedMon.current_user_id || selectedMon.connected_computer_id ? (
                      <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.75rem' }} onClick={handleReclaim}>
                        Thu hồi về kho dự phòng
                      </button>
                    ) : (
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem', gap: '0.25rem' }} onClick={handleOpenHandover}>
                        <UserPlus size={14} /> Bàn giao sử dụng
                      </button>
                    )}
                  </div>
                )}

                {canUpdateStatus && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cập nhật tình trạng màn hình:</label>
                    <select 
                      className="form-control" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                      value={selectedMon.status}
                      onChange={(e) => handleStatusChange(e.target.value as any)}
                    >
                      <option value="Active">Đang sử dụng</option>
                      <option value="Spare">Dự phòng</option>
                      <option value="Repair">Bảo trì</option>
                      <option value="Broken">Hỏng</option>
                      <option value="Disposed">Thanh lý</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Timeline History */}
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ArrowRightLeft size={14} /> Lịch sử bàn giao
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {monHistory.length === 0 ? (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chưa ghi nhận lịch sử chuyển giao</div>
                  ) : (
                    monHistory.map(h => (
                      <div key={h.id} style={{ padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--primary-light)' }}>
                          <span>Bàn giao: {getEmployeeName(h.new_user_id)}</span>
                          <span>{h.transfer_date}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Người giao: {h.actor_user_id}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
              <Monitor size={32} style={{ marginBottom: '1rem' }} />
              <p>Chọn một màn hình từ danh sách để xem cấu hình và lịch sử kết nối máy tính.</p>
            </div>
          )}
        </div>
      </div>

      {/* MONITOR ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Thêm màn hình mới' : 'Chỉnh sửa màn hình'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mã màn hình</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    disabled={modalMode === 'edit'}
                    value={formMon.id}
                    onChange={(e) => setFormMon({ ...formMon, id: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Model màn hình</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Ví dụ: Dell UltraSharp U2422H"
                    value={formMon.model}
                    onChange={(e) => setFormMon({ ...formMon, model: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formMon.serial || ''}
                      onChange={(e) => setFormMon({ ...formMon, serial: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kích thước (inches)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ví dụ: 24, 27..."
                      value={formMon.size_inches || ''}
                      onChange={(e) => setFormMon({ ...formMon, size_inches: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Độ phân giải</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ví dụ: 1920x1080 FHD hoặc 4K"
                    value={formMon.resolution || ''}
                    onChange={(e) => setFormMon({ ...formMon, resolution: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ngày mua</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formMon.purchase_date || ''}
                      onChange={(e) => setFormMon({ ...formMon, purchase_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bảo hành (tháng)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formMon.warranty_months}
                      onChange={(e) => setFormMon({ ...formMon, warranty_months: parseInt(e.target.value) || 24 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vị trí</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formMon.location || ''}
                    onChange={(e) => setFormMon({ ...formMon, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái màn hình</label>
                  <select 
                    className="form-control" 
                    value={formMon.status}
                    disabled={modalMode === 'edit'}
                    onChange={(e) => setFormMon({ ...formMon, status: e.target.value as any })}
                  >
                    <option value="Spare">Dự phòng</option>
                    <option value="Repair">Bảo trì</option>
                    <option value="Broken">Hỏng</option>
                    <option value="Disposed">Thanh lý</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HANDOVER MONITOR MODAL */}
      {isHandoverOpen && selectedMon && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Bàn giao màn hình {selectedMon.id}</h3>
              <button className="modal-close" onClick={() => setIsHandoverOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCommitHandover}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Bàn giao màn hình cho nhân viên và tùy chọn kết nối với case máy tính.
                </p>

                <div className="form-group">
                  <label className="form-label">Chọn người sử dụng</label>
                  <select 
                    className="form-control" 
                    value={handoverUserId}
                    onChange={(e) => {
                      setHandoverUserId(e.target.value);
                      // Auto-select computer of this employee if any
                      const userPc = computers.find(c => c.current_user_id === e.target.value);
                      if (userPc) setHandoverPcId(userPc.id);
                      else setHandoverPcId('');
                    }}
                  >
                    <option value="">Không gán trực tiếp người sử dụng</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Liên kết máy tính kết nối</label>
                  <select 
                    className="form-control" 
                    value={handoverPcId}
                    onChange={(e) => setHandoverPcId(e.target.value)}
                  >
                    <option value="">Không kết nối máy tính</option>
                    {computers.map(pc => (
                      <option key={pc.id} value={pc.id}>{pc.id} - {pc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsHandoverOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Xác nhận bàn giao</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER QR CODE MODAL */}
      {qrAsset && (
        <QrModal 
          assetId={qrAsset.id}
          assetName={qrAsset.name}
          assetType="Monitor"
          serialNumber={qrAsset.serial}
          currentUser={qrAsset.user}
          location={qrAsset.location}
          onClose={() => setQrAsset(null)}
        />
      )}
    </div>
  );
};
