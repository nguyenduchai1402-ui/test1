import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Layers, 
  User, 
  FileText,
  Briefcase, 
  X,
  ShieldCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { db } from '../utils/supabaseClient';
import { Department, Position, Employee } from '../types';

interface DepartmentModuleProps {
  currentUserRole: string;
}

export const DepartmentModule: React.FC<DepartmentModuleProps> = ({ currentUserRole }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  
  // Modals for Department CRUD
  const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);
  const [deptModalMode, setDeptModalMode] = useState<'add' | 'edit'>('add');
  const [formDept, setFormDept] = useState<Partial<Department>>({
    id: '', name: '', name_kr: '', manager_id: '', status: 'Active', notes: ''
  });

  // Modals for Position CRUD
  const [isPosModalOpen, setIsPosModalOpen] = useState<boolean>(false);
  const [posModalMode, setPosModalMode] = useState<'add' | 'edit'>('add');
  const [formPos, setFormPos] = useState<Partial<Position>>({
    id: '', name: '', department_id: '', rank_level: 4, status: 'Active'
  });

  const canEdit = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'IT_ADMIN';

  const loadData = async () => {
    try {
      const [depts, posts, emps] = await Promise.all([
        db.getDepartments(),
        db.getPositions(),
        db.getEmployees()
      ]);
      setDepartments(depts);
      setPositions(posts);
      setEmployees(emps);
      if (depts.length > 0 && !selectedDeptId) {
        setSelectedDeptId(depts[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('webapp_user_changed', loadData);
    return () => window.removeEventListener('webapp_user_changed', loadData);
  }, [selectedDeptId]);

  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const deptPositions = positions.filter(p => p.department_id === selectedDeptId);
  const getEmployeeName = (id?: string) => employees.find(e => e.id === id)?.name || 'Chưa phân công';

  // Department CRUD
  const handleOpenAddDept = () => {
    setDeptModalMode('add');
    setFormDept({ id: '', name: '', name_kr: '', manager_id: '', status: 'Active', notes: '' });
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    setDeptModalMode('edit');
    setFormDept(dept);
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDept.id || !formDept.name) return;
    try {
      await db.saveDepartment(formDept as Department);
      setIsDeptModalOpen(false);
      setSelectedDeptId(formDept.id);
      loadData();
    } catch (err) {
      alert('Lỗi lưu bộ phận');
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (employees.some(e => e.department_id === id)) {
      alert('Không thể xóa bộ phận đang chứa nhân viên. Vui lòng chuyển nhân viên trước.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa bộ phận này?')) return;
    try {
      await db.deleteDepartment(id);
      setSelectedDeptId(departments.find(d => d.id !== id)?.id || '');
      loadData();
    } catch (err) {
      alert('Lỗi xóa bộ phận');
    }
  };

  // Position CRUD
  const handleOpenAddPos = () => {
    if (!selectedDeptId) return;
    setPosModalMode('add');
    setFormPos({
      id: `${selectedDeptId}-POS-${(deptPositions.length + 1).toString().padStart(2, '0')}`,
      name: '',
      department_id: selectedDeptId,
      rank_level: 4,
      status: 'Active'
    });
    setIsPosModalOpen(true);
  };

  const handleOpenEditPos = (pos: Position) => {
    setPosModalMode('edit');
    setFormPos(pos);
    setIsPosModalOpen(true);
  };

  const handleSavePos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPos.id || !formPos.name || !formPos.department_id) return;
    try {
      await db.savePosition(formPos as Position);
      setIsPosModalOpen(false);
      loadData();
    } catch (err) {
      alert('Lỗi lưu chức vụ');
    }
  };

  const handleDeletePos = async (id: string) => {
    if (employees.some(e => e.position_id === id)) {
      alert('Không thể xóa chức vụ đang có nhân viên đảm nhiệm.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa chức vụ này?')) return;
    try {
      await db.deletePosition(id);
      loadData();
    } catch (err) {
      alert('Lỗi xóa chức vụ');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Quản lý Bộ phận & Chức vụ</h1>
          <p className="page-subtitle">Quản trị danh sách phòng ban hành chính và thang phân cấp chức vụ nội bộ</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAddDept}>
            <Plus size={16} /> Thêm Bộ phận
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* DEPARTMENTS LIST SIDEBAR */}
        <div className="panel" style={{ margin: 0, padding: '1rem' }}>
          <h3 className="panel-title" style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <Layers size={16} /> Danh sách phòng ban
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {departments.map(dept => (
              <div 
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: selectedDeptId === dept.id ? 'var(--primary)' : 'var(--bg-primary)',
                  color: selectedDeptId === dept.id ? '#ffffff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{dept.name}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{dept.id} {dept.name_kr && `| ${dept.name_kr}`}</span>
                </div>
                <span className={`badge ${dept.status === 'Active' ? (selectedDeptId === dept.id ? 'badge-muted' : 'badge-success') : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                  {dept.status === 'Active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* DEPARTMENT DETAILS & POSITIONS TABLE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedDept ? (
            <>
              {/* Department Overview */}
              <div className="panel" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{selectedDept.name}</h2>
                    {selectedDept.name_kr && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tên tiếng Hàn: {selectedDept.name_kr}</p>}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" onClick={() => handleOpenEditDept(selectedDept)}>
                        <Edit size={14} /> Sửa bộ phận
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDeleteDept(selectedDept.id)}>
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} color="var(--text-muted)" />
                    <span>Trưởng bộ phận: <b>{getEmployeeName(selectedDept.manager_id)}</b></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={16} color={selectedDept.status === 'Active' ? 'var(--success)' : 'var(--danger)'} />
                    <span>Trạng thái: <b>{selectedDept.status === 'Active' ? 'Hoạt động' : 'Tạm ngưng'}</b></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: 'span 2' }}>
                    <FileText size={16} color="var(--text-muted)" />
                    <span>Ghi chú: {selectedDept.notes || 'Không có ghi chú'}</span>
                  </div>
                </div>
              </div>

              {/* Positions List */}
              <div className="panel" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="panel-title" style={{ margin: 0 }}>
                    <Briefcase size={18} color="var(--primary-light)" /> Chức vụ thuộc bộ phận ({deptPositions.length})
                  </h3>
                  {canEdit && (
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }} onClick={handleOpenAddPos}>
                      <Plus size={14} /> Thêm Chức vụ
                    </button>
                  )}
                </div>

                <div className="table-container">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>Mã Chức vụ</th>
                        <th>Tên chức vụ</th>
                        <th style={{ textAlign: 'center' }}>Cấp bậc / Level</th>
                        <th style={{ textAlign: 'center' }}>Trạng thái</th>
                        {canEdit && <th style={{ textAlign: 'center' }}>Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {deptPositions.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit ? 5 : 4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Chưa thiết lập chức vụ cho bộ phận này.
                          </td>
                        </tr>
                      ) : (
                        deptPositions.map(pos => (
                          <tr key={pos.id}>
                            <td style={{ fontWeight: 700 }}>{pos.id}</td>
                            <td style={{ fontWeight: 600 }}>{pos.name}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge badge-info" style={{ borderRadius: '4px' }}>Cấp {pos.rank_level}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${pos.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                                {pos.status === 'Active' ? 'Hoạt động' : 'Tạm ngưng'}
                              </span>
                            </td>
                            {canEdit && (
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button className="btn btn-secondary btn-icon" onClick={() => handleOpenEditPos(pos)} title="Sửa">
                                    <Edit size={12} />
                                  </button>
                                  <button className="btn btn-danger btn-icon" onClick={() => handleDeletePos(pos.id)} title="Xóa">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              Vui lòng tạo hoặc chọn một bộ phận để xem chi tiết.
            </div>
          )}
        </div>
      </div>

      {/* DEPARTMENT MODAL */}
      {isDeptModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{deptModalMode === 'add' ? 'Thêm Bộ phận mới' : 'Chỉnh sửa Bộ phận'}</h3>
              <button className="modal-close" onClick={() => setIsDeptModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveDept}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mã bộ phận</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Ví dụ: IT, KETOAN, QA..."
                    disabled={deptModalMode === 'edit'}
                    value={formDept.id}
                    onChange={(e) => setFormDept({ ...formDept, id: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tên Bộ phận</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="Ví dụ: Kế toán"
                      value={formDept.name}
                      onChange={(e) => setFormDept({ ...formDept, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên tiếng Hàn (nếu có)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ví dụ: 회계팀"
                      value={formDept.name_kr || ''}
                      onChange={(e) => setFormDept({ ...formDept, name_kr: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Người phụ trách (Manager)</label>
                    <select 
                      className="form-control" 
                      value={formDept.manager_id || ''}
                      onChange={(e) => setFormDept({ ...formDept, manager_id: e.target.value })}
                    >
                      <option value="">Chọn nhân sự phụ trách</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái bộ phận</label>
                    <select 
                      className="form-control" 
                      value={formDept.status}
                      onChange={(e) => setFormDept({ ...formDept, status: e.target.value as any })}
                    >
                      <option value="Active">Hoạt động (Active)</option>
                      <option value="Inactive">Tạm ngưng (Inactive)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    placeholder="Mô tả chức năng nhiệm vụ..."
                    value={formDept.notes || ''}
                    onChange={(e) => setFormDept({ ...formDept, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsDeptModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POSITION MODAL */}
      {isPosModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{posModalMode === 'add' ? 'Thêm Chức vụ mới' : 'Chỉnh sửa Chức vụ'}</h3>
              <button className="modal-close" onClick={() => setIsPosModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePos}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mã chức vụ</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    disabled={posModalMode === 'edit'}
                    value={formPos.id}
                    onChange={(e) => setFormPos({ ...formPos, id: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tên Chức vụ</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Ví dụ: Nhân viên chính thức"
                    value={formPos.name}
                    onChange={(e) => setFormPos({ ...formPos, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Cấp bậc / Level</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      required 
                      min={1} 
                      max={10}
                      value={formPos.rank_level}
                      onChange={(e) => setFormPos({ ...formPos, rank_level: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái</label>
                    <select 
                      className="form-control" 
                      value={formPos.status}
                      onChange={(e) => setFormPos({ ...formPos, status: e.target.value as any })}
                    >
                      <option value="Active">Hoạt động (Active)</option>
                      <option value="Inactive">Tạm ngưng (Inactive)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPosModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
