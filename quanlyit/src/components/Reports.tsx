import React, { useState, useEffect } from 'react';
import { db } from '../utils/supabaseClient';
import { ExcelTool } from '../utils/ExcelTool';
import { FileSpreadsheet, Printer, Download, List, BarChart } from 'lucide-react';
import { Employee, Computer, Monitor, ITAsset, SharedFolder, FolderPermission, PermissionLog, AssetHistory, Department, Position } from '../types';

export const Reports: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [itAssets, setITAssets] = useState<ITAsset[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [permissions, setPermissions] = useState<FolderPermission[]>([]);
  const [permissionLogs, setPermissionLogs] = useState<PermissionLog[]>([]);
  const [assetHistory, setAssetHistory] = useState<AssetHistory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected report index (1-12)
  const [selectedReportId, setSelectedReportId] = useState<number>(1);

  const loadData = async () => {
    try {
      setLoading(true);
      const [emps, pcs, mons, asts, folds, perms, logs, hist, depts, posts] = await Promise.all([
        db.getEmployees(),
        db.getComputers(),
        db.getMonitors(),
        db.getITAssets(),
        db.getSharedFolders(),
        db.getRolePermissions(),
        db.getPermissionLogs(),
        db.getAssetHistory(),
        db.getDepartments(),
        db.getPositions()
      ]);
      setEmployees(emps);
      setComputers(pcs);
      setMonitors(mons);
      setITAssets(asts);
      setFolders(folds);
      setPermissions(perms);
      setPermissionLogs(logs);
      setAssetHistory(hist);
      setDepartments(depts);
      setPositions(posts);
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

  const getDeptName = (id?: string) => departments.find(d => d.id === id)?.name || 'Chưa gán';
  const getPostName = (id?: string) => positions.find(p => p.id === id)?.name || 'Chưa gán';
  const getEmpName = (id?: string) => employees.find(e => e.id === id)?.name || 'Chưa gán';

  // REPORT GENERATORS
  const reportsMetadata = [
    { id: 1, title: '1. Danh sách nhân sự', desc: 'Roster toàn bộ nhân sự công ty và trạng thái.' },
    { id: 2, title: '2. Danh sách máy tính', desc: 'Cấu hình phần cứng chi tiết của toàn bộ máy tính.' },
    { id: 3, title: '3. Danh sách màn hình', desc: 'Chi tiết màn hình Dell, HP và tình trạng gán PC.' },
    { id: 4, title: '4. Danh sách thiết bị IT khác', desc: 'Sơ đồ router, switch, server, NAS, printer, camera.' },
    { id: 5, title: '5. Thống kê tài sản theo bộ phận', desc: 'Số lượng máy tính, màn hình phân chia theo phòng ban.' },
    { id: 6, title: '6. Danh sách máy tính theo bộ phận', desc: 'Chi tiết vị trí lắp đặt máy tính tại các phòng ban.' },
    { id: 7, title: '7. Danh sách người sử dụng máy tính', desc: 'Bảng mapping chi tiết giữa nhân sự và case PC bàn giao.' },
    { id: 8, title: '8. Ma trận phân quyền thư mục', desc: 'Sơ đồ bảng phân quyền chi tiết giữa các Folder và Role.' },
    { id: 9, title: '9. Nhật ký thay đổi quyền hạn', desc: 'Audit log chi tiết tất cả các thay đổi phân quyền.' },
    { id: 10, title: '10. Nhật ký bàn giao tài sản', desc: 'Timeline chuyển giao máy tính, màn hình và thiết bị.' }
  ];

  const generateReportData = () => {
    switch (selectedReportId) {
      case 1: // Employees
        return {
          headers: ['Mã NV', 'Họ tên', 'Tên KR', 'Bộ phận', 'Chức vụ', 'Email', 'Win Account', 'SĐT', 'Ngày vào', 'Trạng thái'],
          rows: employees.map(e => [e.id, e.name, e.name_kr || '-', getDeptName(e.department_id), getPostName(e.position_id), e.email || '-', e.win_account || '-', e.phone || '-', e.join_date, e.status])
        };
      case 2: // Computers
        return {
          headers: ['Mã máy', 'Tên máy', 'Serial', 'Bộ phận', 'Người dùng', 'IP Address', 'CPU', 'RAM', 'Storage', 'OS', 'Tình trạng'],
          rows: computers.map(c => [c.id, c.name, c.serial || '-', getDeptName(c.department_id), getEmpName(c.current_user_id), c.ip_address || '-', c.cpu || '-', c.ram || '-', c.storage || '-', c.os || '-', c.status])
        };
      case 3: // Monitors
        return {
          headers: ['Mã MH', 'Model', 'Serial', 'Kích thước', 'Độ phân giải', 'PC Kết nối', 'Người sử dụng', 'Tình trạng'],
          rows: monitors.map(m => [m.id, m.model, m.serial || '-', m.size_inches || '-', m.resolution || '-', m.connected_computer_id || '-', getEmpName(m.current_user_id), m.status])
        };
      case 4: // IT Assets
        return {
          headers: ['Mã thiết bị', 'Loại', 'Model', 'Serial', 'IP Address', 'Vị trí', 'Quản lý', 'Tình trạng'],
          rows: itAssets.map(a => [a.id, a.asset_type, a.model, a.serial || '-', a.ip_address || '-', a.location || '-', a.current_user_id ? getEmpName(a.current_user_id) : getDeptName(a.department_id), a.status])
        };
      case 5: // Assets by department summary
        return {
          headers: ['Mã Bộ phận', 'Tên Bộ phận', 'Số nhân sự', 'Máy tính đang dùng', 'Màn hình đang dùng'],
          rows: departments.map(d => {
            const empsCount = employees.filter(e => e.department_id === d.id && e.status === 'Active').length;
            const pcsCount = computers.filter(c => c.department_id === d.id && c.status === 'Active').length;
            const monsCount = monitors.filter(m => {
              if (m.current_user_id) {
                const user = employees.find(e => e.id === m.current_user_id);
                return user?.department_id === d.id;
              }
              return false;
            }).length;
            return [d.id, d.name, empsCount, pcsCount, monsCount];
          })
        };
      case 6: // Computers by department
        return {
          headers: ['Mã Bộ phận', 'Bộ phận', 'Mã máy', 'Tên máy', 'Người sử dụng', 'Vị trí', 'Trạng thái'],
          rows: computers
            .filter(c => c.department_id)
            .map(c => [c.department_id!, getDeptName(c.department_id), c.id, c.name, getEmpName(c.current_user_id), c.location || '-', c.status])
        };
      case 7: // PC User Mappings
        return {
          headers: ['Mã NV', 'Tên nhân viên', 'Tên Windows', 'Bộ phận', 'Mã máy được cấp', 'Tên máy', 'IP Address'],
          rows: employees
            .filter(e => e.status === 'Active')
            .map(e => {
              const pc = computers.find(c => c.current_user_id === e.id && c.status === 'Active');
              return [e.id, e.name, e.win_account || '-', getDeptName(e.department_id), pc ? pc.id : 'Chưa cấp', pc ? pc.name : '-', pc ? (pc.ip_address || '-') : '-'];
            })
        };
      case 8: // Access Matrix export
        return {
          headers: ['Thư mục ổ chung', ...departments.map(d => d.name)],
          rows: folders.map(f => {
            const folderRow = [f.folder_path];
            departments.forEach(d => {
              const roleId = `ROLE_${d.id}`;
              const perm = permissions.find(p => p.folder_id === f.id && p.role_id === roleId);
              if (!perm) folderRow.push('-');
              else {
                const parts = [];
                if (perm.can_view) parts.push('V');
                if (perm.can_read) parts.push('R');
                if (perm.can_write) parts.push('W');
                if (perm.can_edit) parts.push('E');
                if (perm.can_delete) parts.push('D');
                folderRow.push(parts.join('') || '-');
              }
            });
            return folderRow;
          })
        };
      case 9: // Permission logs
        return {
          headers: ['Thời gian', 'Người thực hiện', 'Đối tượng', 'Thư mục', 'Loại thay đổi', 'Quyền cũ', 'Quyền mới', 'Lý do'],
          rows: permissionLogs.map(l => [new Date(l.created_at).toLocaleString(), l.actor_user_id, getEmpName(l.target_employee_id), l.folder_id === 'ALL' ? 'Bộ phận' : (folders.find(f => f.id === l.folder_id)?.folder_path || l.folder_id), l.change_type, l.old_permissions || '-', l.new_permissions || '-', l.reason || '-'])
        };
      case 10: // Asset history logs
        return {
          headers: ['Mã tài sản', 'Loại tài sản', 'Người dùng cũ', 'Người dùng mới', 'Bộ phận cũ', 'Bộ phận mới', 'Ngày chuyển', 'Người thực hiện', 'Ghi chú'],
          rows: assetHistory.map(h => [h.asset_id, h.asset_type, getEmpName(h.previous_user_id), getEmpName(h.new_user_id), getDeptName(h.previous_dept_id), getDeptName(h.new_dept_id), h.transfer_date, h.actor_user_id, h.notes || '-'])
        };
      default:
        return { headers: [], rows: [] };
    }
  };

  const { headers, rows } = generateReportData();

  const handleExport = () => {
    const reportTitle = reportsMetadata.find(r => r.id === selectedReportId)?.title.replace(/^\d+\.\s+/, '') || 'Báo cáo IT';
    const filename = `bao_cao_${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    ExcelTool.exportToCsv(filename, headers, rows);
  };

  const handlePrint = () => {
    const reportTitle = reportsMetadata.find(r => r.id === selectedReportId)?.title || 'Báo cáo IT';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRowsHtml = rows.map(row => `
      <tr>
        ${row.map(val => `<td>${val}</td>`).join('')}
      </tr>
    `).join('');

    const tableHeadersHtml = headers.map(h => `<th>${h}</th>`).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 10px; text-align: right; color: #777; }
          </style>
        </head>
        <body>
          <h2>${reportTitle.toUpperCase()}</h2>
          <div style="font-size: 11px; margin-bottom: 15px;">Ngày tạo báo cáo: ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>${tableHeadersHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          <div class="footer">Xuất bản từ Portal IT Manager</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>Đang tổng hợp dữ liệu báo cáo...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Trung tâm Báo cáo & Xuất dữ liệu</h1>
          <p className="page-subtitle">Xuất danh sách quản trị, ma trận phân quyền, log kiểm toán ra định dạng Excel/CSV hoặc in ấn trực tiếp</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* REPORT SELECTOR */}
        <div className="panel" style={{ margin: 0, padding: '1rem' }}>
          <h3 className="panel-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <List size={16} /> Danh mục 10 báo cáo
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {reportsMetadata.map(rep => (
              <div 
                key={rep.id}
                onClick={() => setSelectedReportId(rep.id)}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: selectedReportId === rep.id ? 'var(--primary)' : 'var(--bg-primary)',
                  color: selectedReportId === rep.id ? '#ffffff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                <div>{rep.title}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 400, marginTop: '0.25rem' }}>{rep.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* REPORT PREVIEW */}
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>XEM TRƯỚC BÁO CÁO:</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {reportsMetadata.find(r => r.id === selectedReportId)?.title}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={handlePrint} style={{ gap: '0.35rem' }}>
                <Printer size={16} /> In báo cáo
              </button>
              <button className="btn btn-primary" onClick={handleExport} style={{ gap: '0.35rem' }}>
                <Download size={16} /> Xuất Excel/CSV
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="table-custom" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  {headers.map((h, idx) => <th key={idx}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Không có dữ liệu trong kỳ báo cáo này.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((val, cellIdx) => (
                        <td key={cellIdx} style={{ whiteSpace: 'nowrap' }}>{val}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
