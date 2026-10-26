import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Server, 
  QrCode, 
  User, 
  Calendar, 
  Wrench,
  X,
  UserPlus,
  ArrowRightLeft
} from 'lucide-react';
import { db } from '../utils/supabaseClient';
import { ITAsset, Employee, Department, AssetHistory } from '../types';
import { QrModal } from './QrModal';

interface ITAssetModuleProps {
  currentUserRole: string;
  searchQuery?: string;
}

export const ITAssetModule: React.FC<ITAssetModuleProps> = ({ currentUserRole, searchQuery = '' }) => {
  const [assets, setAssets] = useState<ITAsset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [history, setHistory] = useState<AssetHistory[]>([]);

  // Filtering
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<ITAsset | null>(null);

  // QR Modal
  const [qrAsset, setQrAsset] = useState<{ id: string; name: string; serial?: string; user?: string; location?: string } | null>(null);

  // Modal CRUD
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formAsset, setFormAsset] = useState<Partial<ITAsset>>({
    id: '', asset_type: 'Laptop', model: '', serial: '', current_user_id: '', department_id: '',
    location: '', ip_address: '', purchase_date: new Date().toISOString().split('T')[0], warranty_months: 24, status: 'Spare', notes: ''
  });

  // Handover Modal
  const [isHandoverOpen, setIsHandoverOpen] = useState<boolean>(false);
  const [handoverUserId, setHandoverUserId] = useState<string>('');
  const [handoverDeptId, setHandoverDeptId] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');

  const canEdit = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'IT_ADMIN';
  const canUpdateStatus = canEdit || currentUserRole === 'IT_USER';

  const loadData = async () => {
    try {
      const [astList, emps, depts, hist] = await Promise.all([
        db.getITAssets(),
        db.getEmployees(),
        db.getDepartments(),
        db.getAssetHistory()
      ]);
      setAssets(astList);
      setEmployees(emps);
      setDepartments(depts);
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
  const filteredAssets = assets.filter(a => {
    const matchesSearch = 
      a.id.toLowerCase().includes(activeSearch.toLowerCase()) ||
      a.model.toLowerCase().includes(activeSearch.toLowerCase()) ||
      a.asset_type.toLowerCase().includes(activeSearch.toLowerCase()) ||
      (a.serial && a.serial.toLowerCase().includes(activeSearch.toLowerCase())) ||
      (a.ip_address && a.ip_address.includes(activeSearch)) ||
      (a.location && a.location.toLowerCase().includes(activeSearch.toLowerCase()));
    
    const matchesType = typeFilter ? a.asset_type === typeFilter : true;
    const matchesStatus = statusFilter ? a.status === statusFilter : true;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getEmployeeName = (id?: string) => employees.find(e => e.id === id)?.name || 'Chưa bàn giao';
  const getDeptName = (id?: string) => departments.find(d => d.id === id)?.name || 'IT Quản lý';

  const assetTypes = [
    'Laptop', 'Printer', 'Scanner', 'Switch', 'Router', 
    'Access Point', 'UPS', 'NAS', 'Server', 'Camera', 'Other'
  ];

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormAsset({
      id: `AST-IT-${(assets.length + 1).toString().padStart(3, '0')}`,
      asset_type: 'Laptop',
      model: '',
      serial: '',
      current_user_id: '',
      department_id: '',
      location: 'Phòng Server Tầng 3',
      ip_address: '',
      purchase_date: new Date().toISOString().split('T')[0],
      warranty_months: 24,
      status: 'Spare',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: ITAsset) => {
    setModalMode('edit');
    setFormAsset(a);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAsset.id || !formAsset.model || !formAsset.asset_type) return;
    try {
      await db.saveITAsset(formAsset as ITAsset);
      setIsModalOpen(false);
      loadData();
      if (selectedAsset && selectedAsset.id === formAsset.id) {
        setSelectedAsset(formAsset as ITAsset);
      }
    } catch (err) {
      alert('Lỗi lưu thiết bị IT');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa thiết bị IT này khỏi hệ thống?')) return;
    try {
      await db.deleteITAsset(id);
      loadData();
      if (selectedAsset?.id === id) setSelectedAsset(null);
    } catch (err) {
      alert('Lỗi xóa thiết bị IT');
    }
  };

  // Handover Operations
  const handleOpenHandover = () => {
    setHandoverUserId('');
    setHandoverDeptId(departments[0]?.id || '');
    setHandoverNotes('');
    setIsHandoverOpen(true);
  };

  const handleCommitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    let updatedAsset: ITAsset = { ...selectedAsset };
    
    if (handoverUserId) {
      const emp = employees.find(e => e.id === handoverUserId);
      if (emp) {
        updatedAsset = {
          ...updatedAsset,
          current_user_id: emp.id,
          department_id: emp.department_id,
          status: 'Active'
        };
      }
    } else {
      updatedAsset = {
        ...updatedAsset,
        current_user_id: undefined,
        department_id: handoverDeptId || undefined,
        status: 'Active'
      };
    }

    try {
      await db.saveITAsset(updatedAsset);
      setIsHandoverOpen(false);
      setSelectedAsset(updatedAsset);
      loadData();
    } catch (err) {
      alert('Lỗi bàn giao thiết bị');
    }
  };

  const handleReclaim = async () => {
    if (!selectedAsset || !window.confirm('Thu hồi thiết bị này về kho dự phòng?')) return;

    const updatedAsset: ITAsset = {
      ...selectedAsset,
      current_user_id: undefined,
      department_id: undefined,
      status: 'Spare'
    };

    try {
      await db.saveITAsset(updatedAsset);
      setSelectedAsset(updatedAsset);
      loadData();
    } catch (err) {
      alert('Lỗi thu hồi thiết bị');
    }
  };

  const handleStatusChange = async (status: any) => {
    if (!selectedAsset) return;
    const updatedAsset = { ...selectedAsset, status };
    try {
      await db.saveITAsset(updatedAsset);
      setSelectedAsset(updatedAsset);
      loadData();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  const assetHistory = selectedAsset ? history.filter(h => h.asset_id === selectedAsset.id) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Quản lý Thiết bị IT</h1>
          <p className="page-subtitle">Quản lý hạ tầng mạng, thiết bị văn phòng (Laptops, Printers, Switches, NAS, Servers, Cameras)</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Thêm thiết bị IT
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm theo ID, model, IP, vị trí..."
            className="form-control"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select className="form-control" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tất cả Loại thiết bị</option>
            {assetTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả Tình trạng</option>
            <option value="Active">Đang hoạt động</option>
            <option value="Spare">Dự phòng (Spare)</option>
            <option value="Repair">Bảo trì (Repair)</option>
            <option value="Broken">Hỏng (Broken)</option>
            <option value="Disposed">Thanh lý (Disposed)</option>
          </select>
        </div>
      </div>

      <div className="split-layout">
        {/* ASSETS LIST */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="table-container">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Mã tài sản</th>
                  <th>Loại thiết bị</th>
                  <th>Model / S/N</th>
                  <th>Quản lý/Sử dụng</th>
                  <th>IP Address</th>
                  <th>Tình trạng</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Không tìm thấy thiết bị IT nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map(a => (
                    <tr 
                      key={a.id} 
                      style={{ cursor: 'pointer', backgroundColor: selectedAsset?.id === a.id ? 'rgba(99, 102, 241, 0.08)' : '' }}
                      onClick={() => setSelectedAsset(a)}
                    >
                      <td style={{ fontWeight: 700 }}>{a.id}</td>
                      <td>
                        <span className="badge badge-muted" style={{ textTransform: 'uppercase' }}>
                          {a.asset_type}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{a.model}</span>
                          {a.serial && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>S/N: {a.serial}</span>}
                        </div>
                      </td>
                      <td>
                        {a.current_user_id ? getEmployeeName(a.current_user_id) : `Phòng: ${getDeptName(a.department_id)}`}
                      </td>
                      <td><code>{a.ip_address || 'N/A'}</code></td>
                      <td>
                        <span className={`badge ${
                          a.status === 'Active' ? 'badge-success' : 
                          a.status === 'Spare' ? 'badge-info' : 
                          a.status === 'Repair' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {a.status === 'Active' && 'Đang hoạt động'}
                          {a.status === 'Spare' && 'Dự phòng'}
                          {a.status === 'Repair' && 'Bảo trì'}
                          {a.status === 'Broken' && 'Hỏng'}
                          {a.status === 'Disposed' && 'Thanh lý'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn btn-secondary btn-icon" onClick={() => setSelectedAsset(a)} title="Xem chi tiết">
                            <Wrench size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            title="Mã QR"
                            onClick={() => setQrAsset({
                              id: a.id,
                              name: `${a.asset_type} - ${a.model}`,
                              serial: a.serial,
                              user: a.current_user_id ? getEmployeeName(a.current_user_id) : getDeptName(a.department_id),
                              location: a.location || 'N/A'
                            })}
                          >
                            <QrCode size={14} />
                          </button>
                          {canEdit && (
                            <>
                              <button className="btn btn-secondary btn-icon" onClick={() => handleOpenEdit(a)} title="Sửa thông số">
                                <Edit size={14} />
                              </button>
                              <button className="btn btn-danger btn-icon" onClick={() => handleDelete(a.id)} title="Xóa">
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
          {selectedAsset ? (
            <div>
              <div className="drawer-header">
                <h3 className="drawer-title">Thông số thiết bị</h3>
                <button className="modal-close" onClick={() => setSelectedAsset(null)}><X size={18} /></button>
              </div>

              {/* Hardware */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{selectedAsset.id}</span>
                  <button 
                    className="btn btn-secondary btn-icon" 
                    title="In QR Code"
                    onClick={() => setQrAsset({
                      id: selectedAsset.id,
                      name: `${selectedAsset.asset_type} - ${selectedAsset.model}`,
                      serial: selectedAsset.serial,
                      user: selectedAsset.current_user_id ? getEmployeeName(selectedAsset.current_user_id) : getDeptName(selectedAsset.department_id),
                      location: selectedAsset.location || 'N/A'
                    })}
                  >
                    <QrCode size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem' }}>
                  <div>Loại: <span className="badge badge-muted" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>{selectedAsset.asset_type}</span></div>
                  <div>Model: <b>{selectedAsset.model}</b></div>
                  {selectedAsset.serial && <div>🔢 S/N: <code>{selectedAsset.serial}</code></div>}
                  {selectedAsset.ip_address && <div>🌐 IP Address: <code>{selectedAsset.ip_address}</code></div>}
                  <div>📍 Vị trí: {selectedAsset.location || 'N/A'}</div>
                </div>
              </div>

              {/* Assignments */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <User size={14} /> Trách nhiệm quản lý
                </h4>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <div>Bộ phận quản lý: <b>{getDeptName(selectedAsset.department_id)}</b></div>
                  <div>Nhân sự sử dụng: <b>{getEmployeeName(selectedAsset.current_user_id)}</b></div>
                </div>
              </div>

              {/* Warranty */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} /> Bảo hành
                </h4>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <div>Ngày mua: {selectedAsset.purchase_date || 'N/A'}</div>
                  <div>Thời hạn bảo hành: {selectedAsset.warranty_months} tháng</div>
                  {selectedAsset.notes && <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', color: 'var(--text-muted)' }}>Ghi chú: {selectedAsset.notes}</div>}
                </div>
              </div>

              {/* Handover & Status Controls */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedAsset.current_user_id || selectedAsset.department_id ? (
                      <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.75rem' }} onClick={handleReclaim}>
                        Thu hồi về kho
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
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cập nhật trạng thái:</label>
                    <select 
                      className="form-control" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                      value={selectedAsset.status}
                      onChange={(e) => handleStatusChange(e.target.value as any)}
                    >
                      <option value="Active">Đang hoạt động</option>
                      <option value="Spare">Dự phòng</option>
                      <option value="Repair">Bảo trì</option>
                      <option value="Broken">Hỏng</option>
                      <option value="Disposed">Thanh lý</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Assignment logs */}
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ArrowRightLeft size={14} /> Lịch sử bàn giao
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {assetHistory.length === 0 ? (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chưa ghi nhận lịch sử chuyển giao</div>
                  ) : (
                    assetHistory.map(h => (
                      <div key={h.id} style={{ padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--primary-light)' }}>
                          <span>Giao: {h.new_user_id ? getEmployeeName(h.new_user_id) : `Phòng ${getDeptName(h.new_dept_id)}`}</span>
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
              <Server size={32} style={{ marginBottom: '1rem' }} />
              <p>Chọn một thiết bị IT để xem cấu hình và lịch sử bàn giao chi tiết.</p>
            </div>
          )}
        </div>
      </div>

      {/* IT ASSET ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Thêm thiết bị IT mới' : 'Chỉnh sửa thiết bị'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mã tài sản (Asset ID)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      disabled={modalMode === 'edit'}
                      value={formAsset.id}
                      onChange={(e) => setFormAsset({ ...formAsset, id: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Loại thiết bị IT</label>
                    <select 
                      className="form-control"
                      value={formAsset.asset_type}
                      onChange={(e) => setFormAsset({ ...formAsset, asset_type: e.target.value })}
                    >
                      {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Model thiết bị</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Ví dụ: Synology DS923+ hoặc Cisco 2960L"
                    value={formAsset.model}
                    onChange={(e) => setFormAsset({ ...formAsset, model: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số Serial (S/N)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formAsset.serial || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, serial: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IP Address (nếu có)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ví dụ: 192.168.1.100"
                      value={formAsset.ip_address || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, ip_address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ngày mua</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formAsset.purchase_date || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, purchase_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bảo hành (Tháng)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formAsset.warranty_months}
                      onChange={(e) => setFormAsset({ ...formAsset, warranty_months: parseInt(e.target.value) || 24 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vị trí lắp đặt</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formAsset.location || ''}
                    onChange={(e) => setFormAsset({ ...formAsset, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái thiết bị</label>
                  <select 
                    className="form-control" 
                    value={formAsset.status}
                    disabled={modalMode === 'edit'}
                    onChange={(e) => setFormAsset({ ...formAsset, status: e.target.value as any })}
                  >
                    <option value="Spare">Dự phòng</option>
                    <option value="Repair">Bảo trì</option>
                    <option value="Broken">Hỏng</option>
                    <option value="Disposed">Thanh lý</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả/Ghi chú</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    value={formAsset.notes || ''}
                    onChange={(e) => setFormAsset({ ...formAsset, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thiết bị</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HANDOVER IT ASSET MODAL */}
      {isHandoverOpen && selectedAsset && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Bàn giao thiết bị {selectedAsset.id}</h3>
              <button className="modal-close" onClick={() => setIsHandoverOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCommitHandover}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Bàn giao thiết bị IT cho một nhân sự sử dụng trực tiếp (ví dụ Laptop) hoặc bàn giao cho cả phòng ban quản lý chung (ví dụ Printer, AP, Switch).
                </p>

                <div className="form-group">
                  <label className="form-label">Bàn giao cá nhân sử dụng (Tùy chọn)</label>
                  <select 
                    className="form-control" 
                    value={handoverUserId}
                    onChange={(e) => {
                      setHandoverUserId(e.target.value);
                      if (e.target.value) setHandoverDeptId('');
                    }}
                  >
                    <option value="">Không gán riêng cho cá nhân</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Hoặc Gán cho Bộ phận quản lý chung</label>
                  <select 
                    className="form-control" 
                    value={handoverDeptId}
                    disabled={!!handoverUserId}
                    onChange={(e) => setHandoverDeptId(e.target.value)}
                  >
                    <option value="">Không gán cho bộ phận</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú bàn giao</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                  />
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

      {/* QR MODAL */}
      {qrAsset && (
        <QrModal 
          assetId={qrAsset.id}
          assetName={qrAsset.name}
          assetType="ITAsset"
          serialNumber={qrAsset.serial}
          currentUser={qrAsset.user}
          location={qrAsset.location}
          onClose={() => setQrAsset(null)}
        />
      )}
    </div>
  );
};
