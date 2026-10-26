import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Laptop, 
  Monitor, 
  Folder, 
  ShieldCheck, 
  AlertTriangle,
  Server,
  Layers
} from 'lucide-react';
import { db } from '../utils/supabaseClient';
import { Employee, Computer, Monitor as MonitorType, ITAsset, SharedFolder, FolderPermission, EmployeeRole } from '../types';

interface DepartmentStat {
  deptId: string;
  deptName: string;
  employeesCount: number;
  computersCount: number;
  monitorsCount: number;
}

interface WarningAlert {
  type: 'pc_unassigned' | 'pc_repair' | 'emp_no_pc' | 'asset_no_owner' | 'emp_no_role' | 'folder_no_perm';
  message: string;
  item: string;
  targetTab: string;
}

export const Dashboard: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [monitors, setMonitors] = useState<MonitorType[]>([]);
  const [itAssets, setITAssets] = useState<ITAsset[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [permissions, setPermissions] = useState<FolderPermission[]>([]);
  const [empRoles, setEmpRoles] = useState<EmployeeRole[]>([]);
  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([]);
  const [alerts, setAlerts] = useState<WarningAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptsData, empsData, pcsData, monsData, assetsData, foldersData, permsData, empRolesData] = await Promise.all([
        db.getDepartments(),
        db.getEmployees(),
        db.getComputers(),
        db.getMonitors(),
        db.getITAssets(),
        db.getSharedFolders(),
        db.getRolePermissions(),
        db.getEmployeeRoles()
      ]);

      setEmployees(empsData);
      setComputers(pcsData);
      setMonitors(monsData);
      setITAssets(assetsData);
      setFolders(foldersData);
      setPermissions(permsData);
      setEmpRoles(empRolesData);

      // Compute statistics by department
      const stats = deptsData.map(dept => {
        const deptEmps = empsData.filter(e => e.department_id === dept.id && e.status === 'Active');
        const deptPcs = pcsData.filter(p => p.department_id === dept.id && p.status === 'Active');
        const deptMons = monsData.filter(m => {
          // Monitor is connected to a computer in this department, or assigned directly to an employee in this department
          if (m.current_user_id) {
            const user = empsData.find(e => e.id === m.current_user_id);
            return user?.department_id === dept.id;
          }
          if (m.connected_computer_id) {
            const pc = pcsData.find(p => p.id === m.connected_computer_id);
            return pc?.department_id === dept.id;
          }
          return false;
        });

        return {
          deptId: dept.id,
          deptName: dept.name,
          employeesCount: deptEmps.length,
          computersCount: deptPcs.length,
          monitorsCount: deptMons.length
        };
      });
      setDeptStats(stats);

      // Generate warnings/alerts
      const generatedAlerts: WarningAlert[] = [];

      // 1. Computers with no user assigned (Active status but current_user_id is null)
      pcsData.filter(p => p.status === 'Active' && !p.current_user_id).forEach(p => {
        generatedAlerts.push({
          type: 'pc_unassigned',
          message: `Máy tính hoạt động ${p.id} (${p.name}) chưa được bàn giao cho nhân viên nào.`,
          item: p.id,
          targetTab: 'computers'
        });
      });

      // 2. Computers needing repair or broken
      pcsData.filter(p => p.status === 'Repair' || p.status === 'Broken').forEach(p => {
        generatedAlerts.push({
          type: 'pc_repair',
          message: `Máy tính ${p.id} (${p.name}) đang gặp sự cố. Trạng thái: ${p.status === 'Repair' ? 'Bảo trì' : 'Hỏng'}.`,
          item: p.id,
          targetTab: 'computers'
        });
      });

      // 3. Employees with no computer assigned (Only active employees)
      empsData.filter(e => e.status === 'Active' && e.department_id !== 'IT').forEach(e => {
        const hasPC = pcsData.some(p => p.current_user_id === e.id && p.status === 'Active');
        if (!hasPC) {
          generatedAlerts.push({
            type: 'emp_no_pc',
            message: `Nhân viên ${e.name} (${e.id} - ${e.department_id}) hoạt động nhưng chưa được bàn giao máy tính.`,
            item: e.name,
            targetTab: 'employees'
          });
        }
      });

      // 4. Assets with no owner (IT Assets not assigned to user and not linked to department)
      assetsData.filter(a => !a.current_user_id && !a.department_id && a.status === 'Active').forEach(a => {
        generatedAlerts.push({
          type: 'asset_no_owner',
          message: `Thiết bị IT ${a.id} (${a.model}) đang ở trạng thái Hoạt động nhưng chưa có người quản lý/bộ phận quản lý.`,
          item: a.id,
          targetTab: 'it-assets'
        });
      });

      // 5. Employees with no Folder Role assigned
      empsData.filter(e => e.status === 'Active').forEach(e => {
        const hasRole = empRolesData.some(er => er.employee_id === e.id);
        if (!hasRole) {
          generatedAlerts.push({
            type: 'emp_no_role',
            message: `Nhân viên ${e.name} (${e.id}) chưa được gán bất kỳ nhóm quyền Folder Role nào.`,
            item: e.name,
            targetTab: 'matrix'
          });
        }
      });

      // 6. Folders with no permissions established (excluding root ROOT)
      foldersData.filter(f => f.id !== 'ROOT').forEach(f => {
        const hasPerm = permsData.some(p => p.folder_id === f.id && (p.can_view || p.can_read || p.can_write || p.can_edit || p.can_delete));
        if (!hasPerm) {
          generatedAlerts.push({
            type: 'folder_no_perm',
            message: `Thư mục ${f.name} (${f.folder_path}) chưa được thiết lập bất kỳ phân quyền nào.`,
            item: f.name,
            targetTab: 'folders'
          });
        }
      });

      setAlerts(generatedAlerts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Re-load if mock state changes
    window.addEventListener('webapp_user_changed', loadData);
    return () => window.removeEventListener('webapp_user_changed', loadData);
  }, []);

  if (loading) {
    return <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>Đang tải dữ liệu Dashboard...</div>;
  }

  // Summary counts
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'Active').length;
  const totalComputers = computers.length;
  const activeComputers = computers.filter(c => c.status === 'Active').length;
  const spareComputers = computers.filter(c => c.status === 'Spare').length;
  const maintenanceComputers = computers.filter(c => c.status === 'Repair' || c.status === 'Broken').length;
  const totalMonitors = monitors.length;
  const activeMonitors = monitors.filter(m => m.status === 'Active').length;
  const totalITAssets = itAssets.length;
  const totalFolders = folders.length;
  const totalRoles = empRoles.length; // Count mappings

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 className="page-title">Dashboard Tổng Quan</h1>
        <p className="page-subtitle">Thống kê nhanh tài sản IT và tình trạng phân quyền thư mục</p>
      </div>

      {/* STATS TILES */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)' }}>
            <Users size={24} />
          </div>
          <span className="card-title">Tổng nhân sự</span>
          <span className="card-value">{activeEmployees} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>/ {totalEmployees}</span></span>
        </div>

        <div className="card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: 'var(--info)' }}>
            <Laptop size={24} />
          </div>
          <span className="card-title">Máy tính đang dùng</span>
          <span className="card-value">{activeComputers} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>/ {totalComputers}</span></span>
        </div>

        <div className="card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
            <Laptop size={24} />
          </div>
          <span className="card-title">Máy tính dự phòng</span>
          <span className="card-value">{spareComputers}</span>
        </div>

        <div className="card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
            <Laptop size={24} />
          </div>
          <span className="card-title">Máy lỗi / bảo trì</span>
          <span className="card-value">{maintenanceComputers}</span>
        </div>

        <div className="card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
            <Monitor size={24} />
          </div>
          <span className="card-title font-display">Tổng màn hình</span>
          <span className="card-value">{activeMonitors} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>/ {totalMonitors}</span></span>
        </div>

        <div className="card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}>
            <Server size={24} />
          </div>
          <span className="card-title">Thiết bị IT khác</span>
          <span className="card-value">{totalITAssets}</span>
        </div>

        <div className="card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary-light)' }}>
            <Folder size={24} />
          </div>
          <span className="card-title">Mục Ổ chung</span>
          <span className="card-value">{totalFolders}</span>
        </div>
      </div>

      {/* GRID SECTION */}
      <div className="split-layout">
        {/* DEPARTMENT STATS */}
        <div className="panel" style={{ margin: 0 }}>
          <h2 className="panel-title"><Layers size={20} color="var(--primary-light)" /> Thống kê theo Bộ phận</h2>
          <div className="table-container">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Bộ phận</th>
                  <th style={{ textAlign: 'center' }}>Nhân viên</th>
                  <th style={{ textAlign: 'center' }}>Máy tính</th>
                  <th style={{ textAlign: 'center' }}>Màn hình</th>
                </tr>
              </thead>
              <tbody>
                {deptStats.map(stat => (
                  <tr key={stat.deptId}>
                    <td style={{ fontWeight: 600 }}>{stat.deptName}</td>
                    <td style={{ textAlign: 'center' }}>{stat.employeesCount}</td>
                    <td style={{ textAlign: 'center' }}>{stat.computersCount}</td>
                    <td style={{ textAlign: 'center' }}>{stat.monitorsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ALERTS AND WARNINGS */}
        <div className="drawer" style={{ position: 'static' }}>
          <div className="drawer-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="drawer-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              Cảnh báo hệ thống ({alerts.length})
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {alerts.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                Không phát hiện vấn đề bất thường nào trên hệ thống.
              </div>
            ) : (
              alerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    padding: '0.75rem', 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    fontSize: '0.8125rem',
                    lineHeight: '1.4'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                      {alert.type === 'pc_unassigned' && 'Thiếu gán máy'}
                      {alert.type === 'pc_repair' && 'Thiết bị lỗi'}
                      {alert.type === 'emp_no_pc' && 'Nhân sự thiếu máy'}
                      {alert.type === 'asset_no_owner' && 'Mất quyền kiểm soát'}
                      {alert.type === 'emp_no_role' && 'Chưa gán Folder Role'}
                      {alert.type === 'folder_no_perm' && 'Thư mục trống quyền'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{alert.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
