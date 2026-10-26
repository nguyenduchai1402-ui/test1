import React, { useState, useEffect } from 'react';
import { db } from '../utils/supabaseClient';
import { UserPermissionOverride, Employee, SharedFolder } from '../types';
import { ShieldAlert, Trash2, Plus, Edit, X, Search, Check } from 'lucide-react';

interface UserExceptionsProps {
  currentUserRole: string;
}

export const UserExceptions: React.FC<UserExceptionsProps> = ({ currentUserRole }) => {
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // CRUD Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formOverride, setFormOverride] = useState<Partial<UserPermissionOverride>>({
    id: '', employee_id: '', folder_id: '', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false, notes: ''
  });

  const canEdit = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'IT_ADMIN';

  const loadData = async () => {
    try {
      setLoading(true);
      const [overs, emps, folds] = await Promise.all([
        db.getUserPermissionOverrides(),
        db.getEmployees(),
        db.getSharedFolders()
      ]);
      setOverrides(overs);
      setEmployees(emps.filter(e => e.status === 'Active'));
      setFolders(folds);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('webapp_user_changed', loadData);
    return () => window.removeEventListener('webapp_user_changed', loadData);
  }, []);

  const getEmpName = (id: string) => employees.find(e => e.id === id)?.name || id;
  const getFolderPath = (id: string) => folders.find(f => f.id === id)?.folder_path || id;

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormOverride({
      id: Math.random().toString(36).substr(2, 9),
      employee_id: employees[0]?.id || '',
      folder_id: folders[0]?.id || '',
      can_view: true,
      can_read: true,
      can_write: false,
      can_edit: false,
      can_delete: false,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ov: UserPermissionOverride) => {
    setModalMode('edit');
    setFormOverride(ov);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOverride.employee_id || !formOverride.folder_id) return;
    const actor = db.getCurrentWebappUser();
    try {
      await db.saveUserPermissionOverride(formOverride as UserPermissionOverride);
      
      // Log it
      await db.addPermissionLog({
        id: Math.random().toString(36).substr(2, 9),
        actor_user_id: actor.display_name,
        target_employee_id: formOverride.employee_id,
        folder_id: formOverride.folder_id,
        old_permissions: 'None / Role',
        new_permissions: `${formOverride.can_view ? 'V' : ''}${formOverride.can_read ? 'R' : ''}${formOverride.can_write ? 'W' : ''}${formOverride.can_edit ? 'E' : ''}${formOverride.can_delete ? 'D' : ''}`,
        reason: formOverride.notes || 'Thiết lập quyền ngoại lệ từ danh mục tổng',
        change_type: modalMode === 'add' ? 'OverrideAdd' : 'OverrideModify',
        created_at: new Date().toISOString()
      });

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert('Lỗi lưu ngoại lệ');
    }
  };

  const handleDelete = async (id: string, empId: string, folderId: string) => {
    if (!window.confirm('Khôi phục quyền của nhân sự này về mặc định của Role?')) return;
    const actor = db.getCurrentWebappUser();
    try {
      await db.deleteUserPermissionOverride(id);
      await db.addPermissionLog({
        id: Math.random().toString(36).substr(2, 9),
        actor_user_id: actor.display_name,
        target_employee_id: empId,
        folder_id: folderId,
        old_permissions: 'Override Exception',
        new_permissions: 'Inherited',
        reason: 'Hủy bỏ quyền ngoại lệ từ danh mục tổng',
        change_type: 'OverrideRemove',
        created_at: new Date().toISOString()
      });
      loadData();
    } catch (err) {
      alert('Lỗi xóa ngoại lệ');
    }
  };

  const filteredOverrides = overrides.filter(ov => 
    getEmpName(ov.employee_id).toLowerCase().includes(search.toLowerCase()) ||
    getFolderPath(ov.folder_id).toLowerCase().includes(search.toLowerCase()) ||
    (ov.notes && ov.notes.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>Đang tải danh mục phân quyền ngoại lệ...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Danh sách Phân quyền Ngoại lệ (Overrides)</h1>
          <p className="page-subtitle">Xem và quản lý các quyền truy cập ổ chung gán riêng cho từng nhân sự (ghi đè lên nhóm quyền Role bộ phận)</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Thêm Ngoại lệ
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm theo tên nhân viên, đường dẫn thư mục, ghi chú..."
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="panel" style={{ margin: 0 }}>
        <div className="table-container">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Thư mục</th>
                <th style={{ textAlign: 'center' }}>Xem</th>
                <th style={{ textAlign: 'center' }}>Đọc</th>
                <th style={{ textAlign: 'center' }}>Ghi</th>
                <th style={{ textAlign: 'center' }}>Sửa</th>
                <th style={{ textAlign: 'center' }}>Xóa</th>
                <th>Lý do / Ghi chú</th>
                {canEdit && <th style={{ textAlign: 'center' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {filteredOverrides.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Không có ngoại lệ phân quyền trực tiếp nào đang có hiệu lực.
                  </td>
                </tr>
              ) : (
                filteredOverrides.map(ov => (
                  <tr key={ov.id}>
                    <td style={{ fontWeight: 600 }}>{getEmpName(ov.employee_id)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{getFolderPath(ov.folder_id)}</td>
                    <td style={{ textAlign: 'center' }}>{ov.can_view ? '✅' : '❌'}</td>
                    <td style={{ textAlign: 'center' }}>{ov.can_read ? '✅' : '❌'}</td>
                    <td style={{ textAlign: 'center' }}>{ov.can_write ? '✅' : '❌'}</td>
                    <td style={{ textAlign: 'center' }}>{ov.can_edit ? '✅' : '❌'}</td>
                    <td style={{ textAlign: 'center' }}>{ov.can_delete ? '✅' : '❌'}</td>
                    <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ov.notes || '-'}</span></td>
                    {canEdit && (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn btn-secondary btn-icon" onClick={() => handleOpenEdit(ov)} title="Sửa quyền">
                            <Edit size={12} />
                          </button>
                          <button className="btn btn-danger btn-icon" onClick={() => handleDelete(ov.id, ov.employee_id, ov.folder_id)} title="Hủy bỏ">
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

      {/* OVERRIDE EXCEPTION ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Tạo quyền ngoại lệ mới' : 'Chỉnh sửa quyền ngoại lệ'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nhân viên được áp dụng</label>
                  <select 
                    className="form-control"
                    disabled={modalMode === 'edit'}
                    value={formOverride.employee_id}
                    onChange={(e) => setFormOverride({ ...formOverride, employee_id: e.target.value })}
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Thư mục áp dụng</label>
                  <select 
                    className="form-control"
                    disabled={modalMode === 'edit'}
                    value={formOverride.folder_id}
                    onChange={(e) => setFormOverride({ ...formOverride, folder_id: e.target.value })}
                  >
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.folder_path}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '0.5rem' }}>Các quyền hạn gán trực tiếp</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formOverride.can_view} onChange={(e) => setFormOverride({ ...formOverride, can_view: e.target.checked })} />
                      <span>Xem thư mục (View)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formOverride.can_read} onChange={(e) => setFormOverride({ ...formOverride, can_read: e.target.checked })} />
                      <span>Đọc tập tin (Read)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formOverride.can_write} onChange={(e) => setFormOverride({ ...formOverride, can_write: e.target.checked })} />
                      <span>Ghi đè/Tạo mới (Write)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formOverride.can_edit} onChange={(e) => setFormOverride({ ...formOverride, can_edit: e.target.checked })} />
                      <span>Sửa đổi thuộc tính (Edit)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formOverride.can_delete} onChange={(e) => setFormOverride({ ...formOverride, can_delete: e.target.checked })} />
                      <span>Xóa tập tin/thư mục (Delete)</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Lý do ngoại lệ</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    placeholder="Ví dụ: Phục vụ công tác thanh tra chất lượng..."
                    value={formOverride.notes || ''}
                    onChange={(e) => setFormOverride({ ...formOverride, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Xác nhận cấp</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
