import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Briefcase, 
  Mail, 
  Key, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  X,
  FileCheck,
  Laptop,
  Monitor,
  Eye,
  Info
} from 'lucide-react';
import { db } from '../utils/supabaseClient';
import { Employee, Department, Position, Computer, Monitor as MonitorType, ITAsset, FolderRole, FolderPermission, UserPermissionOverride, EmployeeRole } from '../types';

interface EmployeeModuleProps {
  currentUserRole: string;
  searchQuery?: string;
}

export const EmployeeModule: React.FC<EmployeeModuleProps> = ({ currentUserRole, searchQuery = '' }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [monitors, setMonitors] = useState<MonitorType[]>([]);
  const [itAssets, setITAssets] = useState<ITAsset[]>([]);
  const [folderRoles, setFolderRoles] = useState<FolderRole[]>([]);
  const [rolePermissions, setRolePermissions] = useState<FolderPermission[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<EmployeeRole[]>([]);
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  // Filtering & Sorting
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Modal forms
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formEmployee, setFormEmployee] = useState<Partial<Employee>>({
    id: '', name: '', name_kr: '', department_id: '', position_id: '', email: '', win_account: '', phone: '', join_date: new Date().toISOString().split('T')[0], status: 'Active'
  });

  // Override modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [overridePerms, setOverridePerms] = useState({ view: true, read: true, write: false, edit: false, delete: false });
  const [overrideNotes, setOverrideNotes] = useState<string>('');

  const canEdit = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'IT_ADMIN';

  const loadData = async () => {
    try {
      const [emps, depts, posts, pcs, mons, assets, fRoles, rPerms, empRolesList, overList, foldList] = await Promise.all([
        db.getEmployees(),
        db.getDepartments(),
        db.getPositions(),
        db.getComputers(),
        db.getMonitors(),
        db.getITAssets(),
        db.getFolderRoles(),
        db.getRolePermissions(),
        db.getEmployeeRoles(),
        db.getUserPermissionOverrides(),
        db.getSharedFolders()
      ]);
      setEmployees(emps);
      setDepartments(depts);
      setPositions(posts);
      setComputers(pcs);
      setMonitors(mons);
      setITAssets(assets);
      setFolderRoles(fRoles);
      setRolePermissions(rPerms);
      setEmployeeRoles(empRolesList);
      setOverrides(overList);
      setFolders(foldList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('webapp_user_changed', loadData);
    return () => window.removeEventListener('webapp_user_changed', loadData);
  }, []);

  // Filter logic
  const activeSearch = searchQuery || localSearch;
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
      (emp.name_kr && emp.name_kr.toLowerCase().includes(activeSearch.toLowerCase())) ||
      emp.id.toLowerCase().includes(activeSearch.toLowerCase()) ||
      (emp.win_account && emp.win_account.toLowerCase().includes(activeSearch.toLowerCase())) ||
      (emp.phone && emp.phone.includes(activeSearch));
    const matchesDept = deptFilter ? emp.department_id === deptFilter : true;
    const matchesStatus = statusFilter ? emp.status === statusFilter : true;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || id;
  const getPostName = (id: string) => positions.find(p => p.id === id)?.name || id;

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormEmployee({
      id: `EMP-${(employees.length + 1).toString().padStart(3, '0')}`,
      name: '',
      name_kr: '',
      department_id: departments[0]?.id || '',
      position_id: positions[0]?.id || '',
      email: '',
      win_account: '',
      phone: '',
      join_date: new Date().toISOString().split('T')[0],
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setModalMode('edit');
    setFormEmployee(emp);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployee.id || !formEmployee.name) return;
    try {
      await db.saveEmployee(formEmployee as Employee);
      setIsModalOpen(false);
      loadData();
      if (selectedEmployee && selectedEmployee.id === formEmployee.id) {
        setSelectedEmployee(formEmployee as Employee);
      }
    } catch (err) {
      alert('Lỗi lưu nhân sự');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhân viên này?')) return;
    try {
      await db.deleteEmployee(id);
      loadData();
      if (selectedEmployee?.id === id) setSelectedEmployee(null);
    } catch (err) {
      alert('Lỗi xóa nhân sự');
    }
  };

  // --- FOLDER PERMISSION CALCULATOR ---
  const calculateFolderPermissionsForEmployee = (employeeId: string, deptId: string) => {
    // 1. Get folder roles assigned to this employee
    const assignedRoles = employeeRoles
      .filter(er => er.employee_id === employeeId)
      .map(er => er.role_id);
    
    // Add default department role if not explicitly mapped
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
    
    // Add ROLE_COMMON automatically to everyone
    if (!assignedRoles.includes('ROLE_COMMON')) {
      assignedRoles.push('ROLE_COMMON');
    }

    // 2. Resolve Role Permissions
    const result: Record<string, {
      view: boolean; read: boolean; write: boolean; edit: boolean; delete: boolean;
      source: 'Role' | 'Override' | 'None';
      sourceDetail: string;
    }> = {};

    // Initialize all folders with No Access
    folders.forEach(f => {
      result[f.id] = {
        view: false, read: false, write: false, edit: false, delete: false,
        source: 'None',
        sourceDetail: 'Chưa cấu hình'
      };
    });

    // Populate from roles
    folders.forEach(folder => {
      assignedRoles.forEach(roleId => {
        const perm = rolePermissions.find(p => p.role_id === roleId && p.folder_id === folder.id);
        if (perm) {
          const current = result[folder.id];
          if (perm.can_view || perm.can_read || perm.can_write || perm.can_edit || perm.can_delete) {
            result[folder.id] = {
              view: current.view || perm.can_view,
              read: current.read || perm.can_read,
              write: current.write || perm.can_write,
              edit: current.edit || perm.can_edit,
              delete: current.delete || perm.can_delete,
              source: 'Role',
              sourceDetail: current.source === 'Role' ? `${current.sourceDetail}, ${roleId}` : roleId
            };
          }
        }
      });
    });

    // 3. Apply Overrides (Exceptions)
    const empOverrides = overrides.filter(o => o.employee_id === employeeId);
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

  const employeePermissions = selectedEmployee 
    ? calculateFolderPermissionsForEmployee(selectedEmployee.id, selectedEmployee.department_id) 
    : {};

  // Owned devices lists
  const employeeComputers = selectedEmployee ? computers.filter(c => c.current_user_id === selectedEmployee.id) : [];
  const employeeMonitors = selectedEmployee ? monitors.filter(m => m.current_user_id === selectedEmployee.id) : [];
  const employeeAssets = selectedEmployee ? itAssets.filter(a => a.current_user_id === selectedEmployee.id) : [];

  // Exception Override handlers
  const handleOpenAddOverride = () => {
    setSelectedFolderId(folders[0]?.id || '');
    setOverridePerms({ view: true, read: true, write: false, edit: false, delete: false });
    setOverrideNotes('');
    setIsOverrideModalOpen(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedFolderId) return;

    const actor = db.getCurrentWebappUser();
    const newOverride: UserPermissionOverride = {
      id: Math.random().toString(36).substr(2, 9),
      employee_id: selectedEmployee.id,
      folder_id: selectedFolderId,
      can_view: overridePerms.view,
      can_read: overridePerms.read,
      can_write: overridePerms.write,
      can_edit: overridePerms.edit,
      can_delete: overridePerms.delete,
      notes: overrideNotes
    };

    try {
      await db.saveUserPermissionOverride(newOverride);
      // Log it
      await db.addPermissionLog({
        id: Math.random().toString(36).substr(2, 9),
        actor_user_id: actor.display_name,
        target_employee_id: selectedEmployee.id,
        folder_id: selectedFolderId,
        old_permissions: 'Inherited',
        new_permissions: `${overridePerms.view ? 'V' : ''}${overridePerms.read ? 'R' : ''}${overridePerms.write ? 'W' : ''}${overridePerms.edit ? 'E' : ''}${overridePerms.delete ? 'D' : ''}`,
        reason: overrideNotes || 'Thiết lập ngoại lệ trực tiếp',
        change_type: 'OverrideAdd',
        created_at: new Date().toISOString()
      });
      setIsOverrideModalOpen(false);
      loadData();
    } catch (err) {
      alert('Lỗi lưu quyền ngoại lệ');
    }
  };

  const handleDeleteOverride = async (overrideId: string, folderId: string) => {
    if (!selectedEmployee || !window.confirm('Hủy bỏ quyền ngoại lệ này và khôi phục về mặc định?')) return;
    const actor = db.getCurrentWebappUser();
    try {
      await db.deleteUserPermissionOverride(overrideId);
      await db.addPermissionLog({
        id: Math.random().toString(36).substr(2, 9),
        actor_user_id: actor.display_name,
        target_employee_id: selectedEmployee.id,
        folder_id: folderId,
        old_permissions: 'Override Exception',
        new_permissions: 'Restored from Role',
        reason: 'Hủy bỏ quyền ngoại lệ',
        change_type: 'OverrideRemove',
        created_at: new Date().toISOString()
      });
      loadData();
    } catch (err) {
      alert('Lỗi hủy quyền ngoại lệ');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Quản lý Nhân viên</h1>
          <p className="page-subtitle">Roster nhân viên công ty, gán tài sản IT và phân tích phân quyền ổ chung</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Thêm nhân viên
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, email, nick Windows..."
            className="form-control"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select className="form-control" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">Tất cả Bộ phận</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả Trạng thái</option>
            <option value="Active">Đang làm việc</option>
            <option value="Resigned">Nghỉ việc</option>
            <option value="Leave">Tạm nghỉ</option>
            <option value="Transfer">Chuyển bộ phận</option>
          </select>
        </div>
      </div>

      <div className="split-layout">
        {/* EMPLOYEES TABLE */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="table-container">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ và tên</th>
                  <th>Bộ phận</th>
                  <th>Chức vụ</th>
                  <th>Tài khoản Win</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Không tìm thấy nhân viên nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr 
                      key={emp.id} 
                      style={{ cursor: 'pointer', backgroundColor: selectedEmployee?.id === emp.id ? 'rgba(99, 102, 241, 0.08)' : '' }}
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <td style={{ fontWeight: 700 }}>{emp.id}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{emp.name}</span>
                          {emp.name_kr && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.name_kr}</span>}
                        </div>
                      </td>
                      <td>{getDeptName(emp.department_id)}</td>
                      <td>{getPostName(emp.position_id)}</td>
                      <td><code>{emp.win_account || 'N/A'}</code></td>
                      <td>
                        <span className={`badge ${
                          emp.status === 'Active' ? 'badge-success' : 
                          emp.status === 'Resigned' ? 'badge-danger' : 
                          emp.status === 'Leave' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {emp.status === 'Active' && 'Đang làm việc'}
                          {emp.status === 'Resigned' && 'Nghỉ việc'}
                          {emp.status === 'Leave' && 'Tạm nghỉ'}
                          {emp.status === 'Transfer' && 'Chuyển bộ phận'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button className="btn btn-secondary btn-icon" onClick={() => setSelectedEmployee(emp)} title="Xem chi tiết">
                            <Eye size={14} />
                          </button>
                          {canEdit && (
                            <>
                              <button className="btn btn-secondary btn-icon" onClick={() => handleOpenEdit(emp)} title="Chỉnh sửa">
                                <Edit size={14} />
                              </button>
                              <button className="btn btn-danger btn-icon" onClick={() => handleDelete(emp.id)} title="Xóa">
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
          {selectedEmployee ? (
            <div>
              <div className="drawer-header">
                <h3 className="drawer-title">Chi tiết Nhân viên</h3>
                <button className="modal-close" onClick={() => setSelectedEmployee(null)}>
                  <X size={18} />
                </button>
              </div>

              {/* Basic Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div className="avatar" style={{ width: '60px', height: '60px', margin: '0 auto 0.5rem auto', fontSize: '1.5rem' }}>
                    {selectedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedEmployee.name}</h4>
                  {selectedEmployee.name_kr && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedEmployee.name_kr}</p>}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{selectedEmployee.id}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}><Briefcase size={14} color="var(--text-muted)" /> <span>Bộ phận: <b>{getDeptName(selectedEmployee.department_id)}</b></span></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}><Briefcase size={14} color="var(--text-muted)" /> <span>Chức vụ: <b>{getPostName(selectedEmployee.position_id)}</b></span></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}><Mail size={14} color="var(--text-muted)" /> <span>Email: {selectedEmployee.email || 'N/A'}</span></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}><Key size={14} color="var(--text-muted)" /> <span>Tài khoản Windows: <code>{selectedEmployee.win_account || 'N/A'}</code></span></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}><Phone size={14} color="var(--text-muted)" /> <span>Điện thoại: {selectedEmployee.phone || 'N/A'}</span></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}><Calendar size={14} color="var(--text-muted)" /> <span>Ngày vào làm: {selectedEmployee.join_date}</span></div>
                </div>
              </div>

              {/* Owned Assets */}
              <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Laptop size={14} /> Thiết bị bàn giao
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {employeeComputers.length === 0 && employeeMonitors.length === 0 && employeeAssets.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa bàn giao thiết bị nào</p>
                  ) : (
                    <>
                      {employeeComputers.map(pc => (
                        <div key={pc.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                          <span>💻 PC: <b>{pc.id}</b></span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{pc.name}</span>
                        </div>
                      ))}
                      {employeeMonitors.map(mon => (
                        <div key={mon.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                          <span>🖥️ Monitor: <b>{mon.id}</b></span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{mon.model}</span>
                        </div>
                      ))}
                      {employeeAssets.map(ast => (
                        <div key={ast.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.35rem 0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                          <span>🔧 {ast.asset_type}: <b>{ast.id}</b></span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ast.model}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Shared Folder Permissions */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ShieldCheck size={14} /> Quyền Ổ chung hiệu dụng
                  </h4>
                  {canEdit && (
                    <button className="btn btn-secondary btn-icon" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={handleOpenAddOverride}>
                      + Override
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {folders.map(f => {
                    const perm = employeePermissions[f.id] || { view: false, read: false, write: false, edit: false, delete: false, source: 'None', sourceDetail: '' };
                    const hasAny = perm.view || perm.read || perm.write || perm.edit || perm.delete;
                    if (!hasAny && f.id !== 'ROOT') return null;

                    const overrideObj = overrides.find(o => o.employee_id === selectedEmployee.id && o.folder_id === f.id);

                    return (
                      <div 
                        key={f.id} 
                        style={{ 
                          fontSize: '0.8rem', 
                          padding: '0.5rem', 
                          backgroundColor: perm.source === 'Override' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-primary)', 
                          borderRadius: 'var(--radius-sm)', 
                          border: perm.source === 'Override' ? '1px dashed var(--primary-light)' : '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: f.id === 'ROOT' ? 'var(--primary-light)' : '' }}>📁 {f.name}</span>
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            {perm.source === 'Override' && (
                              <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '0 0.25rem' }}>Override</span>
                            )}
                            {perm.source === 'Override' && canEdit && overrideObj && (
                              <button 
                                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                onClick={() => handleDeleteOverride(overrideObj.id, f.id)}
                                title="Xóa bỏ Override"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span>
                            Quyền: {f.id === 'ROOT' && !hasAny ? 'No Access' : (
                              [
                                perm.view ? 'View' : '',
                                perm.read ? 'Read' : '',
                                perm.write ? 'Write' : '',
                                perm.edit ? 'Edit' : '',
                                perm.delete ? 'Delete' : ''
                              ].filter(Boolean).join('+') || 'None'
                            )}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={perm.sourceDetail}>
                            Nguồn: {perm.sourceDetail}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
              <Info size={32} style={{ marginBottom: '1rem' }} />
              <p>Chọn một nhân viên từ danh sách để xem thông tin chi tiết và phân quyền ổ chung.</p>
            </div>
          )}
        </div>
      </div>

      {/* ADD/EDIT EMPLOYEE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Thêm nhân viên mới' : 'Chỉnh sửa nhân viên'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mã Nhân viên</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    disabled={modalMode === 'edit'}
                    value={formEmployee.id}
                    onChange={(e) => setFormEmployee({ ...formEmployee, id: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Họ và tên (Tiếng Việt)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={formEmployee.name}
                      onChange={(e) => setFormEmployee({ ...formEmployee, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên tiếng Hàn (nếu có)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formEmployee.name_kr || ''}
                      onChange={(e) => setFormEmployee({ ...formEmployee, name_kr: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bộ phận</label>
                    <select 
                      className="form-control" 
                      value={formEmployee.department_id}
                      onChange={(e) => setFormEmployee({ ...formEmployee, department_id: e.target.value })}
                    >
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chức vụ</label>
                    <select 
                      className="form-control" 
                      value={formEmployee.position_id}
                      onChange={(e) => setFormEmployee({ ...formEmployee, position_id: e.target.value })}
                    >
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={formEmployee.email || ''}
                      onChange={(e) => setFormEmployee({ ...formEmployee, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tài khoản Windows</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formEmployee.win_account || ''}
                      onChange={(e) => setFormEmployee({ ...formEmployee, win_account: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formEmployee.phone || ''}
                      onChange={(e) => setFormEmployee({ ...formEmployee, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày vào công ty</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formEmployee.join_date}
                      onChange={(e) => setFormEmployee({ ...formEmployee, join_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái nhân sự</label>
                  <select 
                    className="form-control" 
                    value={formEmployee.status}
                    onChange={(e) => setFormEmployee({ ...formEmployee, status: e.target.value as any })}
                  >
                    <option value="Active">Đang làm việc (Active)</option>
                    <option value="Resigned">Nghỉ việc (Resigned)</option>
                    <option value="Leave">Tạm nghỉ (Leave)</option>
                    <option value="Transfer">Chuyển bộ phận (Transfer)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERRIDE EXCEPTION MODAL */}
      {isOverrideModalOpen && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Phân quyền ngoại lệ (Override)</h3>
              <button className="modal-close" onClick={() => setIsOverrideModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveOverride}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Thiết lập quyền trực tiếp cho nhân viên <b>{selectedEmployee.name}</b> vào thư mục ổ chung. Quyền này sẽ đè (override) lên quyền kế thừa từ Role.
                </p>

                <div className="form-group">
                  <label className="form-label">Thư mục ổ chung</label>
                  <select 
                    className="form-control" 
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                  >
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.folder_path}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '0.5rem' }}>Các quyền hạn</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={overridePerms.view} onChange={(e) => setOverridePerms({ ...overridePerms, view: e.target.checked })} />
                      <span>Xem thư mục (View)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={overridePerms.read} onChange={(e) => setOverridePerms({ ...overridePerms, read: e.target.checked })} />
                      <span>Đọc tập tin (Read)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={overridePerms.write} onChange={(e) => setOverridePerms({ ...overridePerms, write: e.target.checked })} />
                      <span>Ghi đè/Tạo mới (Write)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={overridePerms.edit} onChange={(e) => setOverridePerms({ ...overridePerms, edit: e.target.checked })} />
                      <span>Sửa đổi thuộc tính (Edit)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={overridePerms.delete} onChange={(e) => setOverridePerms({ ...overridePerms, delete: e.target.checked })} />
                      <span>Xóa tập tin/thư mục (Delete)</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Lý do phân quyền ngoại lệ</label>
                  <textarea 
                    className="form-control" 
                    rows={3} 
                    placeholder="Ví dụ: Phục vụ kiểm toán, hỗ trợ dự án QA..."
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsOverrideModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Xác nhận cấp quyền</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
