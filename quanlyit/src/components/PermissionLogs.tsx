import React, { useState, useEffect } from 'react';
import { db } from '../utils/supabaseClient';
import { PermissionLog, Employee, SharedFolder } from '../types';
import { Search, Calendar, ShieldCheck, HelpCircle } from 'lucide-react';

export const PermissionLogs: React.FC = () => {
  const [logs, setLogs] = useState<PermissionLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [logList, emps, folds] = await Promise.all([
        db.getPermissionLogs(),
        db.getEmployees(),
        db.getSharedFolders()
      ]);
      setLogs(logList);
      setEmployees(emps);
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

  const getEmpName = (id: string) => {
    if (id.startsWith('ROLE: ')) return id; // target role log
    return employees.find(e => e.id === id)?.name || id;
  };

  const getFolderPath = (id: string) => {
    if (id === 'ALL') return 'TẤT CẢ THƯ MỤC (Bộ phận)';
    return folders.find(f => f.id === id)?.folder_path || id;
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'RoleAssign': return 'badge-success';
      case 'RoleRevoke': return 'badge-danger';
      case 'OverrideAdd': return 'badge-warning';
      case 'OverrideModify': return 'badge-info';
      case 'OverrideRemove': return 'badge-danger';
      default: return 'badge-muted';
    }
  };

  const getChangeTypeName = (type: string) => {
    switch (type) {
      case 'RoleAssign': return 'Gán Role Bộ phận';
      case 'RoleRevoke': return 'Thu hồi Role';
      case 'OverrideAdd': return 'Cấp Override';
      case 'OverrideModify': return 'Sửa Override';
      case 'OverrideRemove': return 'Xóa Override';
      default: return type;
    }
  };

  const filteredLogs = logs.filter(log => 
    getEmpName(log.target_employee_id).toLowerCase().includes(search.toLowerCase()) ||
    getFolderPath(log.folder_id).toLowerCase().includes(search.toLowerCase()) ||
    log.actor_user_id.toLowerCase().includes(search.toLowerCase()) ||
    (log.reason && log.reason.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>Đang tải lịch sử phân quyền...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Nhật ký thay đổi quyền (Audit Logs)</h1>
          <p className="page-subtitle">Bản ghi nhật ký bảo mật lưu giữ thông tin kiểm toán phân quyền không thể chỉnh sửa</p>
        </div>
      </div>

      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm theo người thực hiện, nhân sự thay đổi, lý do..."
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
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Đối tượng thay đổi</th>
                <th>Thư mục</th>
                <th style={{ textAlign: 'center' }}>Loại thay đổi</th>
                <th>Quyền cũ</th>
                <th>Quyền mới</th>
                <th>Lý do phân quyền</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Không tìm thấy bản ghi nhật ký phân quyền nào.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                        <Calendar size={12} color="var(--text-muted)" />
                        <span>{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.actor_user_id}</td>
                    <td style={{ fontWeight: 600 }}>{getEmpName(log.target_employee_id)}</td>
                    <td style={{ color: 'var(--primary-light)' }}><code>{getFolderPath(log.folder_id)}</code></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${getBadgeColor(log.change_type)}`} style={{ fontSize: '0.65rem' }}>
                        {getChangeTypeName(log.change_type)}
                      </span>
                    </td>
                    <td><code style={{ fontSize: '0.75rem' }}>{log.old_permissions || '-'}</code></td>
                    <td><code style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--success)' }}>{log.new_permissions || '-'}</code></td>
                    <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.reason || '-'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
