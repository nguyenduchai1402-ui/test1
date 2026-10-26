import React, { useState, useEffect } from 'react';
import { db } from '../utils/supabaseClient';
import { SharedFolder, FolderRole, FolderPermission } from '../types';
import { Grid, HelpCircle, X, ShieldAlert, Check } from 'lucide-react';

interface AccessMatrixProps {
  currentUserRole: string;
}

export const AccessMatrix: React.FC<AccessMatrixProps> = ({ currentUserRole }) => {
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [roles, setRoles] = useState<FolderRole[]>([]);
  const [permissions, setPermissions] = useState<FolderPermission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Edit cell modal
  const [editingCell, setEditingCell] = useState<{ folderId: string; roleId: string } | null>(null);
  const [editPerms, setEditPerms] = useState({ view: false, read: false, write: false, edit: false, delete: false });

  const canEdit = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'IT_ADMIN';

  const loadData = async () => {
    try {
      setLoading(true);
      const [foldList, roleList, permList] = await Promise.all([
        db.getSharedFolders(),
        db.getFolderRoles(),
        db.getRolePermissions()
      ]);
      setFolders(foldList);
      setRoles(roleList);
      setPermissions(permList);
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

  const getCellPermissionString = (folderId: string, roleId: string): string => {
    const perm = permissions.find(p => p.folder_id === folderId && p.role_id === roleId);
    if (!perm) return '-';
    
    const parts = [];
    if (perm.can_view) parts.push('V');
    if (perm.can_read) parts.push('R');
    if (perm.can_write) parts.push('W');
    if (perm.can_edit) parts.push('E');
    if (perm.can_delete) parts.push('D');
    
    return parts.join(' ') || '-';
  };

  const getCellColorClass = (permStr: string) => {
    if (permStr === '-') return { backgroundColor: 'transparent', color: 'var(--text-muted)' };
    if (permStr.includes('D')) return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', fontWeight: 700 };
    if (permStr.includes('W') || permStr.includes('E')) return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontWeight: 700 };
    return { backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)', fontWeight: 500 };
  };

  const handleCellClick = (folderId: string, roleId: string) => {
    if (!canEdit) return;
    const perm = permissions.find(p => p.folder_id === folderId && p.role_id === roleId);
    if (perm) {
      setEditPerms({
        view: perm.can_view,
        read: perm.can_read,
        write: perm.can_write,
        edit: perm.can_edit,
        delete: perm.can_delete
      });
    } else {
      setEditPerms({ view: false, read: false, write: false, edit: false, delete: false });
    }
    setEditingCell({ folderId, roleId });
  };

  const handleSavePermissions = async () => {
    if (!editingCell) return;
    const { folderId, roleId } = editingCell;
    const existing = permissions.find(p => p.folder_id === folderId && p.role_id === roleId);
    const actor = db.getCurrentWebappUser();

    const updatedPerm: FolderPermission = {
      id: existing ? existing.id : Math.random().toString(36).substr(2, 9),
      role_id: roleId,
      folder_id: folderId,
      can_view: editPerms.view,
      can_read: editPerms.read,
      can_write: editPerms.write,
      can_edit: editPerms.edit,
      can_delete: editPerms.delete
    };

    try {
      await db.saveRolePermission(updatedPerm);
      
      // Log it
      await db.addPermissionLog({
        id: Math.random().toString(36).substr(2, 9),
        actor_user_id: actor.display_name,
        target_employee_id: `ROLE: ${roleId}`,
        folder_id: folderId,
        old_permissions: existing ? getCellPermissionString(folderId, roleId) : 'None',
        new_permissions: `${editPerms.view ? 'V' : ''}${editPerms.read ? 'R' : ''}${editPerms.write ? 'W' : ''}${editPerms.edit ? 'E' : ''}${editPerms.delete ? 'D' : ''}` || 'None',
        reason: 'Thay đổi ma trận phân quyền hệ thống',
        change_type: 'OverrideModify', // Log as modify
        created_at: new Date().toISOString()
      });

      setEditingCell(null);
      loadData();
    } catch (err) {
      alert('Lỗi cập nhật quyền hạn');
    }
  };

  // Quick action presets
  const applyPreset = (preset: 'all' | 'readwrite' | 'viewonly' | 'clear') => {
    switch (preset) {
      case 'all':
        setEditPerms({ view: true, read: true, write: true, edit: true, delete: true });
        break;
      case 'readwrite':
        setEditPerms({ view: true, read: true, write: true, edit: true, delete: false });
        break;
      case 'viewonly':
        setEditPerms({ view: true, read: true, write: false, edit: false, delete: false });
        break;
      case 'clear':
        setEditPerms({ view: false, read: false, write: false, edit: false, delete: false });
        break;
    }
  };

  if (loading) {
    return <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>Đang tải Ma trận phân quyền...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Ma trận phân quyền (Access Matrix)</h1>
          <p className="page-subtitle">Sơ đồ bảng trực quan chéo cấu trúc Folder ổ chung và các Role phân hệ bộ phận</p>
        </div>
      </div>

      {/* MATRIX CONTAINER */}
      <div className="panel" style={{ margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span><b>V:</b> View (Xem mục)</span>
            <span><b>R:</b> Read (Đọc tập tin)</span>
            <span><b>W:</b> Write (Ghi đè/Tạo mới)</span>
            <span><b>E:</b> Edit (Sửa đổi thuộc tính)</span>
            <span><b>D:</b> Delete (Xóa mục)</span>
          </div>
          {canEdit ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--primary-light)', fontWeight: 600 }}>
              💡 Click trực tiếp vào ô để thay đổi phân quyền
            </div>
          ) : (
            <span className="badge badge-muted">Chỉ xem (Read Only)</span>
          )}
        </div>

        <div className="matrix-container" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <table className="matrix-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: '220px' }}>📁 THƯ MỤC Ổ CHUNG</th>
                {roles.map(r => (
                  <th key={r.id} style={{ minWidth: '100px' }}>{r.name.replace('ROLE_', '')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {folders.map(folder => (
                <tr key={folder.id}>
                  <td style={{ textAlign: 'left', fontWeight: 600, paddingLeft: folder.parent_id ? '1.5rem' : '0.75rem', color: folder.id === 'ROOT' ? 'var(--primary-light)' : '' }}>
                    {folder.id === 'ROOT' ? '📁 Ổ CHUNG (ROOT)' : `📁 ${folder.name}`}
                  </td>
                  {roles.map(role => {
                    const permStr = getCellPermissionString(folder.id, role.id);
                    const cellStyle = getCellColorClass(permStr);
                    return (
                      <td 
                        key={role.id}
                        onClick={() => handleCellClick(folder.id, role.id)}
                        className={canEdit ? 'matrix-cell-interactive' : ''}
                        style={{ ...cellStyle, verticalAlign: 'middle', transition: 'all 0.15s ease', cursor: canEdit ? 'pointer' : 'default' }}
                      >
                        {permStr}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK CONFIG MODAL */}
      {editingCell && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1rem' }}>Cấu hình nhanh quyền hạn</h3>
              <button className="modal-close" onClick={() => setEditingCell(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>THƯ MỤC:</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {folders.find(f => f.id === editingCell.folderId)?.folder_path}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>ROLE NHÓM:</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-light)' }}>
                  {editingCell.roleId}
                </div>
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editPerms.view} onChange={(e) => setEditPerms({ ...editPerms, view: e.target.checked })} />
                  <span>View (Xem mục)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editPerms.read} onChange={(e) => setEditPerms({ ...editPerms, read: e.target.checked })} />
                  <span>Read (Đọc tập tin)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editPerms.write} onChange={(e) => setEditPerms({ ...editPerms, write: e.target.checked })} />
                  <span>Write (Ghi đè/Tạo mới)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editPerms.edit} onChange={(e) => setEditPerms({ ...editPerms, edit: e.target.checked })} />
                  <span>Edit (Sửa đổi thuộc tính)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editPerms.delete} onChange={(e) => setEditPerms({ ...editPerms, delete: e.target.checked })} />
                  <span>Delete (Xóa mục)</span>
                </label>
              </div>

              {/* Preset buttons shortcuts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cài đặt nhanh presets:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem' }} onClick={() => applyPreset('all')}>Toàn quyền</button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem' }} onClick={() => applyPreset('readwrite')}>Xem + Ghi</button>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem' }} onClick={() => applyPreset('viewonly')}>Chỉ xem (View Only)</button>
                  <button type="button" className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '0.35rem' }} onClick={() => applyPreset('clear')}>Xóa sạch quyền</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingCell(null)}>Hủy</button>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleSavePermissions}>Lưu cài đặt</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
