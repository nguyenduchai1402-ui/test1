import React, { useState, useEffect } from 'react';
import { db } from '../utils/supabaseClient';
import { Employee, Department, Position, SharedFolder, FolderPermission, UserPermissionOverride, EmployeeRole } from '../types';
import { Search, User, Folder, Shield, ShieldAlert, ArrowRight, Check, X, ShieldCheck } from 'lucide-react';

export const PermissionLookup: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [permissions, setPermissions] = useState<FolderPermission[]>([]);
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<EmployeeRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tab state
  const [activeSubTab, setActiveSubTab] = useState<'employee' | 'folder'>('employee');

  // Employee lookup state
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  
  // Folder lookup state
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [filterPrivilege, setFilterPrivilege] = useState<string>('view'); // view, read, write, edit, delete

  const loadData = async () => {
    try {
      setLoading(true);
      const [emps, depts, posts, folds, perms, overs, empRols] = await Promise.all([
        db.getEmployees(),
        db.getDepartments(),
        db.getPositions(),
        db.getSharedFolders(),
        db.getRolePermissions(),
        db.getUserPermissionOverrides(),
        db.getEmployeeRoles()
      ]);
      setEmployees(emps.filter(e => e.status === 'Active')); // Only lookup active employees
      setDepartments(depts);
      setPositions(posts);
      setFolders(folds);
      setPermissions(perms);
      setOverrides(overs);
      setEmployeeRoles(empRols);

      if (emps.length > 0 && !selectedEmpId) {
        setSelectedEmpId(emps[0].id);
      }
      if (folds.length > 0 && !selectedFolderId) {
        setSelectedFolderId(folds[0].id);
      }
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

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;
  const getPostName = (id: string) => positions.find(p => p.id === id)?.name || id;

  // --- REUSABLE PERMISSION CALCULATOR ---
  const getEmployeePermissions = (empId: string, deptId: string) => {
    // Roles assigned
    const assignedRoles = employeeRoles
      .filter(er => er.employee_id === empId)
      .map(er => er.role_id);
    
    // Default department role mapping
    const deptRoleMap: Record<string, string> = {
      'IT': 'ROLE_IT',
      'KETOAN': 'ROLE_KETOAN',
      'NHANSU': 'ROLE_NHANSU',
      'SANXUAT': 'ROLE_SANXUAT',
      'QA': 'ROLE_QA',
      'QC': 'ROLE_QC',
      'MUAHANG': 'ROLE_MUAHANG',
      'KINHDOANH': 'ROLE_KINHDOANH'
    };
    const inheritedDeptRole = deptRoleMap[deptId];
    if (inheritedDeptRole && !assignedRoles.includes(inheritedDeptRole)) {
      assignedRoles.push(inheritedDeptRole);
    }
    if (!assignedRoles.includes('ROLE_COMMON')) {
      assignedRoles.push('ROLE_COMMON');
    }

    const result: Record<string, {
      view: boolean; read: boolean; write: boolean; edit: boolean; delete: boolean;
      source: 'Role' | 'Override' | 'None';
      sourceDetail: string;
    }> = {};

    folders.forEach(f => {
      result[f.id] = { view: false, read: false, write: false, edit: false, delete: false, source: 'None', sourceDetail: '-' };
    });

    // Apply role permissions
    folders.forEach(folder => {
      assignedRoles.forEach(roleId => {
        const perm = permissions.find(p => p.role_id === roleId && p.folder_id === folder.id);
        if (perm) {
          const cur = result[folder.id];
          if (perm.can_view || perm.can_read || perm.can_write || perm.can_edit || perm.can_delete) {
            result[folder.id] = {
              view: cur.view || perm.can_view,
              read: cur.read || perm.can_read,
              write: cur.write || perm.can_write,
              edit: cur.edit || perm.can_edit,
              delete: cur.delete || perm.can_delete,
              source: 'Role',
              sourceDetail: cur.source === 'Role' ? `${cur.sourceDetail}, ${roleId}` : roleId
            };
          }
        }
      });
    });

    // Apply overrides
    const empOverrides = overrides.filter(o => o.employee_id === empId);
    empOverrides.forEach(ov => {
      if (result[ov.folder_id]) {
        result[ov.folder_id] = {
          view: ov.can_view,
          read: ov.can_read,
          write: ov.can_write,
          edit: ov.can_edit,
          delete: ov.can_delete,
          source: 'Override',
          sourceDetail: 'Quyền riêng - Override'
        };
      }
    });

    return result;
  };

  // Lookup 1: Selected Employee Permissions list
  const selectedEmp = employees.find(e => e.id === selectedEmpId);
  const selectedEmpPermissions = selectedEmp 
    ? getEmployeePermissions(selectedEmp.id, selectedEmp.department_id)
    : {};

  // Lookup 2: Reverse folder access lists
  const folderAccessReport = () => {
    if (!selectedFolderId) return { allowed: [], denied: [] };

    const allowedList: Array<{ employee: Employee; permsStr: string; source: string }> = [];
    const deniedList: Employee[] = [];

    employees.forEach(emp => {
      const empPerms = getEmployeePermissions(emp.id, emp.department_id)[selectedFolderId];
      if (empPerms) {
        // Apply privilege filter
        const passFilter = 
          (filterPrivilege === 'view' && empPerms.view) ||
          (filterPrivilege === 'read' && empPerms.read) ||
          (filterPrivilege === 'write' && empPerms.write) ||
          (filterPrivilege === 'edit' && empPerms.edit) ||
          (filterPrivilege === 'delete' && empPerms.delete);

        const hasAny = empPerms.view || empPerms.read || empPerms.write || empPerms.edit || empPerms.delete;

        if (hasAny && passFilter) {
          const parts = [];
          if (empPerms.view) parts.push('View');
          if (empPerms.read) parts.push('Read');
          if (empPerms.write) parts.push('Write');
          if (empPerms.edit) parts.push('Edit');
          if (empPerms.delete) parts.push('Delete');

          allowedList.push({
            employee: emp,
            permsStr: parts.join('+'),
            source: empPerms.sourceDetail
          });
        } else if (!hasAny) {
          deniedList.push(emp);
        }
      } else {
        deniedList.push(emp);
      }
    });

    return { allowed: allowedList, denied: deniedList };
  };

  const { allowed, denied } = folderAccessReport();

  if (loading) {
    return <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>Đang tải công cụ tra cứu phân quyền...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 className="page-title">Tra cứu & Kiểm toán Phân quyền</h1>
        <p className="page-subtitle">Kiểm tra chéo phân quyền ổ chung hai chiều: Tra cứu theo nhân viên và tra cứu ngược theo thư mục</p>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn ${activeSubTab === 'employee' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('employee')}
        >
          <User size={16} /> Tra cứu theo Nhân viên
        </button>
        <button 
          className={`btn ${activeSubTab === 'folder' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('folder')}
        >
          <Folder size={16} /> Tra cứu ngược theo Thư mục
        </button>
      </div>

      {activeSubTab === 'employee' ? (
        // LOOKUP BY EMPLOYEE
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Employee Selector panel */}
          <div className="panel" style={{ margin: 0, padding: '1rem' }}>
            <h3 className="panel-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Chọn nhân viên hoạt động
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '480px', overflowY: 'auto' }}>
              {employees.map(emp => (
                <div 
                  key={emp.id}
                  onClick={() => setSelectedEmpId(emp.id)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    backgroundColor: selectedEmpId === emp.id ? 'var(--primary)' : 'var(--bg-primary)',
                    color: selectedEmpId === emp.id ? '#ffffff' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: 600
                  }}
                >
                  <div>{emp.name}</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{emp.id} - {getDeptName(emp.department_id)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Roster of permissions */}
          {selectedEmp ? (
            <div className="panel" style={{ margin: 0 }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>TRA CỨU QUYỀN HẠN CỦA:</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
                  {selectedEmp.name} {selectedEmp.name_kr && `(${selectedEmp.name_kr})`}
                </h2>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  <span>Mã NV: <b>{selectedEmp.id}</b></span>
                  <span>Bộ phận: <b>{getDeptName(selectedEmp.department_id)}</b></span>
                  <span>Chức vụ: <b>{getPostName(selectedEmp.position_id)}</b></span>
                </div>
              </div>

              <div className="table-container">
                <table className="table-custom">
                  <thead>
                    <tr>
                      <th>Thư mục Ổ chung</th>
                      <th>Xem</th>
                      <th>Đọc</th>
                      <th>Ghi</th>
                      <th>Sửa</th>
                      <th>Xóa</th>
                      <th>Loại quyền</th>
                      <th>Nguồn cấp (Folder Role)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folders.map(folder => {
                      const perm = selectedEmpPermissions[folder.id] || { view: false, read: false, write: false, edit: false, delete: false, source: 'None', sourceDetail: '-' };
                      const isRoot = folder.id === 'ROOT';
                      const hasAccess = perm.view || perm.read || perm.write || perm.edit || perm.delete;

                      return (
                        <tr key={folder.id} style={{ backgroundColor: perm.source === 'Override' ? 'rgba(245, 158, 11, 0.05)' : '' }}>
                          <td style={{ fontWeight: 600, paddingLeft: folder.parent_id ? '1.5rem' : '0.75rem' }}>
                            {isRoot ? '📁 Ổ CHUNG (ROOT)' : `📁 ${folder.name}`}
                          </td>
                          <td style={{ textAlign: 'center' }}>{perm.view ? <Check size={14} color="var(--success)" /> : <X size={14} color="var(--text-muted)" />}</td>
                          <td style={{ textAlign: 'center' }}>{perm.read ? <Check size={14} color="var(--success)" /> : <X size={14} color="var(--text-muted)" />}</td>
                          <td style={{ textAlign: 'center' }}>{perm.write ? <Check size={14} color="var(--success)" /> : <X size={14} color="var(--text-muted)" />}</td>
                          <td style={{ textAlign: 'center' }}>{perm.edit ? <Check size={14} color="var(--success)" /> : <X size={14} color="var(--text-muted)" />}</td>
                          <td style={{ textAlign: 'center' }}>{perm.delete ? <Check size={14} color="var(--success)" /> : <X size={14} color="var(--text-muted)" />}</td>
                          <td>
                            {perm.source === 'Override' ? (
                              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Direct Override</span>
                            ) : hasAccess ? (
                              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Kế thừa Role</span>
                            ) : (
                              <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>No Access</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <code>{perm.sourceDetail}</code>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '4rem' }}>Chọn nhân viên để xem phân tích.</div>
          )}
        </div>
      ) : (
        // REVERSE LOOKUP BY FOLDER
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Folder Selector panel */}
          <div className="panel" style={{ margin: 0, padding: '1rem' }}>
            <h3 className="panel-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Chọn thư mục cần tra cứu
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '480px', overflowY: 'auto' }}>
              {folders.map(f => (
                <div 
                  key={f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    backgroundColor: selectedFolderId === f.id ? 'var(--primary)' : 'var(--bg-primary)',
                    color: selectedFolderId === f.id ? '#ffffff' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: 600
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>📁 {f.name}</span>
                  </div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.folder_path}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reverse access rosters */}
          {selectedFolderId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Folder Summary Info */}
              <div className="panel" style={{ margin: 0 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>AI CÓ QUYỀN TRUY CẬP THƯ MỤC?</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                  📁 {folders.find(f => f.id === selectedFolderId)?.folder_path}
                </h2>
                
                {/* Filter privilege level */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem', backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Lọc mức quyền:</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {['view', 'read', 'write', 'edit', 'delete'].map(priv => (
                      <button 
                        key={priv}
                        type="button" 
                        onClick={() => setFilterPrivilege(priv)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', textTransform: 'capitalize' }}
                        className={`btn ${filterPrivilege === priv ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {priv}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid lists */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                
                {/* ALLOWED STAFF */}
                <div className="panel" style={{ margin: 0 }}>
                  <h3 className="panel-title" style={{ fontSize: '0.9rem', color: 'var(--success)', marginBottom: '0.75rem' }}>
                    ✔️ Có quyền ({allowed.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {allowed.length === 0 ? (
                      <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        Không có nhân sự nào đạt quyền lọc này
                      </div>
                    ) : (
                      allowed.map(item => (
                        <div key={item.employee.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.employee.name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.employee.id} - {getDeptName(item.employee.department_id)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{item.permsStr}</span>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{item.source}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* DENIED STAFF */}
                <div className="panel" style={{ margin: 0 }}>
                  <h3 className="panel-title" style={{ fontSize: '0.9rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>
                    ❌ Không có quyền ({denied.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {denied.length === 0 ? (
                      <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        Tất cả nhân sự đều có quyền truy cập
                      </div>
                    ) : (
                      denied.map(emp => (
                        <div key={emp.id} style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{emp.id} - {getDeptName(emp.department_id)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '4rem' }}>Chọn thư mục để xem phân tích.</div>
          )}
        </div>
      )}
    </div>
  );
};
