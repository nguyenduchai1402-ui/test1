import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Cpu, 
  HardDrive, 
  QrCode, 
  User, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle, 
  X,
  UserPlus,
  ArrowRightLeft
} from 'lucide-react';
import { db } from '../utils/supabaseClient';
import { Computer, Employee, Department, AssetHistory } from '../types';
import { QrModal } from './QrModal';

interface ComputerModuleProps {
  currentUserRole: string;
  searchQuery?: string;
}

export const ComputerModule: React.FC<ComputerModuleProps> = ({ currentUserRole, searchQuery = '' }) => {
  const [computers, setComputers] = useState<Computer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [history, setHistory] = useState<AssetHistory[]>([]);

  // Filtering & Sorting
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [selectedPc, setSelectedPc] = useState<Computer | null>(null);

  // QR Modal
  const [qrAsset, setQrAsset] = useState<{ id: string; name: string; serial?: string; user?: string; location?: string } | null>(null);

  // PC CRUD Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formPc, setFormPc] = useState<Partial<Computer>>({
    id: '', name: '', serial: '', current_user_id: '', department_id: '', ip_address: '', mac_address: '',
    cpu: '', mainboard: '', ram: '', storage: '', vga: '', os: '', office: '',
    purchase_date: new Date().toISOString().split('T')[0], warranty_months: 24, status: 'Spare', location: '', notes: ''
  });

  // Handover Modal
  const [isHandoverOpen, setIsHandoverOpen] = useState<boolean>(false);
  const [handoverUserId, setHandoverUserId] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');

  const canEdit = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'IT_ADMIN';
  const canUpdateStatus = canEdit || currentUserRole === 'IT_USER';

  const loadData = async () => {
    try {
      const [pcs, emps, depts, hist] = await Promise.all([
        db.getComputers(),
        db.getEmployees(),
        db.getDepartments(),
        db.getAssetHistory()
      ]);
      setComputers(pcs);
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
  const filteredComputers = computers.filter(pc => {
    const matchesSearch = 
      pc.id.toLowerCase().includes(activeSearch.toLowerCase()) ||
      pc.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
      (pc.serial && pc.serial.toLowerCase().includes(activeSearch.toLowerCase())) ||
      (pc.ip_address && pc.ip_address.includes(activeSearch)) ||
      (pc.mac_address && pc.mac_address.toLowerCase().includes(activeSearch.toLowerCase())) ||
      (pc.cpu && pc.cpu.toLowerCase().includes(activeSearch.toLowerCase()));
    
    const matchesStatus = statusFilter ? pc.status === statusFilter : true;
    const matchesDept = deptFilter ? pc.department_id === deptFilter : true;
    
    return matchesSearch && matchesStatus && matchesDept;
  });

  const getEmployeeName = (id?: string) => employees.find(e => e.id === id)?.name || 'Chưa bàn giao';
  const getDeptName = (id?: string) => departments.find(d => d.id === id)?.name || 'Kho IT';

  const isWarrantyValid = (purchaseDate?: string, warrantyMonths: number = 24) => {
    if (!purchaseDate) return true;
    const pDate = new Date(purchaseDate);
    const expiryDate = new Date(pDate.setMonth(pDate.getMonth() + warrantyMonths));
    return expiryDate.getTime() > new Date().getTime();
  };

  const getWarrantyExpiryDate = (purchaseDate?: string, warrantyMonths: number = 24) => {
    if (!purchaseDate) return 'N/A';
    const pDate = new Date(purchaseDate);
    pDate.setMonth(pDate.getMonth() + warrantyMonths);
    return pDate.toISOString().split('T')[0];
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormPc({
      id: `PC-${(computers.length + 1).toString().padStart(3, '0')}`,
      name: '',
      serial: '',
      current_user_id: '',
      department_id: '',
      ip_address: '',
      mac_address: '',
      cpu: 'Intel Core i5',
      mainboard: 'ASUS H610',
      ram: '8GB DDR4',
      storage: 'SSD 256GB',
      vga: 'Integrated',
      os: 'Windows 10 Pro',
      office: 'Office 2019',
      purchase_date: new Date().toISOString().split('T')[0],
      warranty_months: 24,
      status: 'Spare',
      location: 'Kho IT Tầng 3',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pc: Computer) => {
    setModalMode('edit');
    setFormPc(pc);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPc.id || !formPc.name) return;
    try {
      await db.saveComputer(formPc as Computer);
      setIsModalOpen(false);
      loadData();
      if (selectedPc && selectedPc.id === formPc.id) {
        setSelectedPc(formPc as Computer);
      }
    } catch (err) {
      alert('Lỗi lưu cấu hình máy tính');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa máy tính này khỏi hệ thống?')) return;
    try {
      await db.deleteComputer(id);
      loadData();
      if (selectedPc?.id === id) setSelectedPc(null);
    } catch (err) {
      alert('Lỗi xóa máy tính');
    }
  };

  // Handover Operations
  const handleOpenHandover = () => {
    setHandoverUserId(employees[0]?.id || '');
    setHandoverNotes('');
    setIsHandoverOpen(true);
  };

  const handleCommitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPc || !handoverUserId) return;
    
    const targetEmp = employees.find(emp => emp.id === handoverUserId);
    if (!targetEmp) return;

    const updatedPc: Computer = {
      ...selectedPc,
      current_user_id: targetEmp.id,
      department_id: targetEmp.department_id,
      status: 'Active',
      assignment_date: new Date().toISOString().split('T')[0]
    };

    try {
      await db.saveComputer(updatedPc);
      setIsHandoverOpen(false);
      setSelectedPc(updatedPc);
      loadData();
    } catch (err) {
      alert('Lỗi bàn giao máy tính');
    }
  };

  const handleReclaim = async () => {
    if (!selectedPc || !window.confirm('Thu hồi máy tính này về kho dự phòng?')) return;
    
    const updatedPc: Computer = {
      ...selectedPc,
      current_user_id: undefined,
      department_id: undefined,
      status: 'Spare',
      assignment_date: undefined
    };

    try {
      await db.saveComputer(updatedPc);
      setSelectedPc(updatedPc);
      loadData();
    } catch (err) {
      alert('Lỗi thu hồi máy tính');
    }
  };

  // IT User status quick update
  const handleItUserStatusChange = async (newStatus: any) => {
    if (!selectedPc) return;
    const updatedPc: Computer = {
      ...selectedPc,
      status: newStatus
    };
    try {
      await db.saveComputer(updatedPc);
      setSelectedPc(updatedPc);
      loadData();
    } catch (err) {
      alert('Lỗi cập nhật tình trạng thiết bị');
    }
  };

  const pcHistory = selectedPc ? history.filter(h => h.asset_id === selectedPc.id) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Quản lý Máy tính</h1>
          <p className="page-subtitle">Quản lý cấu hình phần cứng, bàn giao người sử dụng và theo dõi bảo hành</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Thêm máy tính
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm mã máy, tên máy, CPU, serial, IP..."
            className="form-control"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả Tình trạng</option>
            <option value="Active">Đang sử dụng</option>
            <option value="Spare">Dự phòng</option>
            <option value="Repair">Bảo trì</option>
            <option value="Broken">Hỏng</option>
            <option value="Disposed">Thanh lý</option>
          </select>
          <select className="form-control" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">Tất cả Bộ phận</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="split-layout">
        {/* COMPUTERS ROSTER */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="table-container">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Mã tài sản</th>
                  <th>Tên máy</th>
                  <th>Người sử dụng</th>
                  <th>Bộ phận</th>
                  <th>IP Address</th>
                  <th>Tình trạng</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredComputers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Không tìm thấy máy tính nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredComputers.map(pc => (
                    <tr 
                      key={pc.id} 
                      style={{ cursor: 'pointer', backgroundColor: selectedPc?.id === pc.id ? 'rgba(99, 102, 241, 0.08)' : '' }}
                      onClick={() => setSelectedPc(pc)}
                    >
                      <td style={{ fontWeight: 700 }}>{pc.id}</td>
                      <td style={{ fontWeight: 600 }}>{pc.name}</td>
                      <td>{getEmployeeName(pc.current_user_id)}</td>
                      <td>{getDeptName(pc.department_id)}</td>
                      <td><code>{pc.ip_address || 'N/A'}</code></td>
                      <td>
                        <span className={`badge ${
                          pc.status === 'Active' ? 'badge-success' : 
                          pc.status === 'Spare' ? 'badge-info' : 
                          pc.status === 'Repair' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {pc.status === 'Active' && 'Đang sử dụng'}
                          {pc.status === 'Spare' && 'Dự phòng'}
                          {pc.status === 'Repair' && 'Bảo trì'}
                          {pc.status === 'Broken' && 'Hỏng'}
                          {pc.status === 'Disposed' && 'Thanh lý'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn btn-secondary btn-icon" onClick={() => setSelectedPc(pc)} title="Xem chi tiết">
                            <Cpu size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            title="Mã QR"
                            onClick={() => setQrAsset({
                              id: pc.id,
                              name: pc.name,
                              serial: pc.serial,
                              user: getEmployeeName(pc.current_user_id),
                              location: pc.location || 'N/A'
                            })}
                          >
                            <QrCode size={14} />
                          </button>
                          {canEdit && (
                            <>
                              <button className="btn btn-secondary btn-icon" onClick={() => handleOpenEdit(pc)} title="Sửa cấu hình">
                                <Edit size={14} />
                              </button>
                              <button className="btn btn-danger btn-icon" onClick={() => handleDelete(pc.id)} title="Xóa">
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
          {selectedPc ? (
            <div>
              <div className="drawer-header">
                <h3 className="drawer-title">Cấu hình máy tính</h3>
                <button className="modal-close" onClick={() => setSelectedPc(null)}><X size={18} /></button>
              </div>

              {/* Basic Hardware Specs */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{selectedPc.id}</span>
                  <button 
                    className="btn btn-secondary btn-icon" 
                    title="In QR Code"
                    onClick={() => setQrAsset({
                      id: selectedPc.id,
                      name: selectedPc.name,
                      serial: selectedPc.serial,
                      user: getEmployeeName(selectedPc.current_user_id),
                      location: selectedPc.location || 'N/A'
                    })}
                  >
                    <QrCode size={14} />
                  </button>
                </div>
                
                {/* Hardware List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem' }}>
                  <div>🖥️ Tên máy: <b>{selectedPc.name}</b></div>
                  {selectedPc.serial && <div>🔢 S/N: <code>{selectedPc.serial}</code></div>}
                  <div>🧠 CPU: {selectedPc.cpu || 'N/A'}</div>
                  <div>🔌 Mainboard: {selectedPc.mainboard || 'N/A'}</div>
                  <div>💾 RAM: {selectedPc.ram || 'N/A'}</div>
                  <div>💿 Storage: {selectedPc.storage || 'N/A'}</div>
                  {selectedPc.vga && <div>🎮 VGA: {selectedPc.vga}</div>}
                  <div>💿 OS: {selectedPc.os || 'N/A'}</div>
                  <div>🏢 Office: {selectedPc.office || 'N/A'}</div>
                </div>
              </div>

              {/* Assignment details */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <User size={14} /> Sử dụng & Vị trí
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                  <div>Bộ phận: <b>{getDeptName(selectedPc.department_id)}</b></div>
                  <div>Người dùng: <b>{getEmployeeName(selectedPc.current_user_id)}</b></div>
                  {selectedPc.ip_address && <div>IP Address: <code>{selectedPc.ip_address}</code></div>}
                  {selectedPc.mac_address && <div>MAC Address: <code>{selectedPc.mac_address}</code></div>}
                  <div>Vị trí: {selectedPc.location || 'Chưa định nghĩa'}</div>
                  {selectedPc.assignment_date && <div>Ngày bàn giao: {selectedPc.assignment_date}</div>}
                </div>
              </div>

              {/* Warranty Checker */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} /> Bảo hành
                </h4>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div>Ngày mua: {selectedPc.purchase_date || 'N/A'}</div>
                    <div>Hết hạn: {getWarrantyExpiryDate(selectedPc.purchase_date, selectedPc.warranty_months)}</div>
                  </div>
                  <span>
                    {isWarrantyValid(selectedPc.purchase_date, selectedPc.warranty_months) ? (
                      <span className="badge badge-success">Còn bảo hành</span>
                    ) : (
                      <span className="badge badge-danger">Hết bảo hành</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Handover & Status Controls */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {canEdit && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedPc.current_user_id ? (
                      <button className="btn btn-danger" style={{ flex: 1, fontSize: '0.75rem' }} onClick={handleReclaim}>
                        Thu hồi máy về kho
                      </button>
                    ) : (
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem', gap: '0.25rem' }} onClick={handleOpenHandover}>
                        <UserPlus size={14} /> Bàn giao sử dụng
                      </button>
                    )}
                  </div>
                )}

                {/* IT User change device status */}
                {canUpdateStatus && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cập nhật tình trạng máy:</label>
                    <select 
                      className="form-control" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                      value={selectedPc.status}
                      onChange={(e) => handleItUserStatusChange(e.target.value as any)}
                    >
                      <option value="Active">Đang sử dụng</option>
                      <option value="Spare">Dự phòng (Spare)</option>
                      <option value="Repair">Bảo trì (Repair)</option>
                      <option value="Broken">Hỏng (Broken)</option>
                      <option value="Disposed">Thanh lý (Disposed)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Assignment logs for this asset */}
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ArrowRightLeft size={14} /> Lịch sử bàn giao
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {pcHistory.length === 0 ? (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chưa ghi nhận lịch sử chuyển giao</div>
                  ) : (
                    pcHistory.map(h => (
                      <div key={h.id} style={{ padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--primary-light)' }}>
                          <span>Bàn giao: {getEmployeeName(h.new_user_id)}</span>
                          <span>{h.transfer_date}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Người giao: {h.actor_user_id}
                        </div>
                        {h.notes && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{h.notes}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
              <Cpu size={32} style={{ marginBottom: '1rem' }} />
              <p>Chọn một máy tính để xem cấu hình phần cứng và lịch sử bàn giao.</p>
            </div>
          )}
        </div>
      </div>

      {/* COMPUTER ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Thêm máy tính mới' : 'Chỉnh sửa cấu hình'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mã tài sản (ID máy)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      disabled={modalMode === 'edit'}
                      value={formPc.id}
                      onChange={(e) => setFormPc({ ...formPc, id: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên máy tính</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="Ví dụ: DESKTOP-KT01"
                      value={formPc.name}
                      onChange={(e) => setFormPc({ ...formPc, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số Serial (S/N)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formPc.serial || ''}
                      onChange={(e) => setFormPc({ ...formPc, serial: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tình trạng máy</label>
                    <select 
                      className="form-control" 
                      value={formPc.status}
                      disabled={modalMode === 'edit'} // Force using Handover controls for status updates if editing
                      onChange={(e) => setFormPc({ ...formPc, status: e.target.value as any })}
                    >
                      <option value="Spare">Dự phòng (Spare)</option>
                      <option value="Repair">Bảo trì (Repair)</option>
                      <option value="Broken">Hỏng (Broken)</option>
                      <option value="Disposed">Thanh lý (Disposed)</option>
                    </select>
                  </div>
                </div>

                <div style={{ borderBottom: '1px solid var(--border-color)', margin: '1rem 0' }}></div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary-light)' }}>Thông số phần cứng</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">CPU</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formPc.cpu || ''}
                      onChange={(e) => setFormPc({ ...formPc, cpu: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mainboard</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formPc.mainboard || ''}
                      onChange={(e) => setFormPc({ ...formPc, mainboard: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">RAM</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ví dụ: 16GB DDR4"
                      value={formPc.ram || ''}
                      onChange={(e) => setFormPc({ ...formPc, ram: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ổ cứng (Storage)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ví dụ: SSD 512GB NVMe"
                      value={formPc.storage || ''}
                      onChange={(e) => setFormPc({ ...formPc, storage: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">VGA (Card đồ họa)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formPc.vga || ''}
                      onChange={(e) => setFormPc({ ...formPc, vga: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hệ điều hành (Windows)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formPc.os || ''}
                      onChange={(e) => setFormPc({ ...formPc, os: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phần mềm văn phòng (Office)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formPc.office || ''}
                    onChange={(e) => setFormPc({ ...formPc, office: e.target.value })}
                  />
                </div>

                <div style={{ borderBottom: '1px solid var(--border-color)', margin: '1rem 0' }}></div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary-light)' }}>Hành chính & mạng</h4>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">IP Address</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="192.168.x.x"
                      value={formPc.ip_address || ''}
                      onChange={(e) => setFormPc({ ...formPc, ip_address: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">MAC Address</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="00:1A:2B:..."
                      value={formPc.mac_address || ''}
                      onChange={(e) => setFormPc({ ...formPc, mac_address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ngày mua máy</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formPc.purchase_date || ''}
                      onChange={(e) => setFormPc({ ...formPc, purchase_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bảo hành (Tháng)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={formPc.warranty_months}
                      onChange={(e) => setFormPc({ ...formPc, warranty_months: parseInt(e.target.value) || 24 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vị trí lắp đặt</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formPc.location || ''}
                    onChange={(e) => setFormPc({ ...formPc, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    value={formPc.notes || ''}
                    onChange={(e) => setFormPc({ ...formPc, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu cấu hình</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HANDOVER USER MODAL */}
      {isHandoverOpen && selectedPc && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Bàn giao máy tính {selectedPc.id}</h3>
              <button className="modal-close" onClick={() => setIsHandoverOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCommitHandover}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Chọn nhân sự để bàn giao sử dụng máy tính <b>{selectedPc.name}</b>. Hệ thống sẽ tự động chuyển đổi bộ phận của máy về cùng bộ phận của nhân viên đó.
                </p>

                <div className="form-group">
                  <label className="form-label">Chọn nhân sự nhận máy</label>
                  <select 
                    className="form-control" 
                    required
                    value={handoverUserId}
                    onChange={(e) => setHandoverUserId(e.target.value)}
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id} - {getDeptName(emp.department_id)})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú bàn giao (nếu có)</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    placeholder="Mô tả tình trạng bàn giao..."
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

      {/* RENDER QR MODAL IF ACTIVE */}
      {qrAsset && (
        <QrModal 
          assetId={qrAsset.id}
          assetName={qrAsset.name}
          assetType="Computer"
          serialNumber={qrAsset.serial}
          currentUser={qrAsset.user}
          location={qrAsset.location}
          onClose={() => setQrAsset(null)}
        />
      )}
    </div>
  );
};
