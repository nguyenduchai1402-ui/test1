import React, { useState, useEffect } from 'react';
import { db } from '../utils/supabaseClient';
import { AssetHistory as HistoryType, Employee, Department } from '../types';
import { History, Search, Calendar, Laptop, Monitor, Wrench } from 'lucide-react';

export const AssetHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [hist, emps, depts] = await Promise.all([
        db.getAssetHistory(),
        db.getEmployees(),
        db.getDepartments()
      ]);
      setHistory(hist);
      setEmployees(emps);
      setDepartments(depts);
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

  const getEmpName = (id?: string) => employees.find(e => e.id === id)?.name || 'Kho dự phòng';
  const getDeptName = (id?: string) => departments.find(d => d.id === id)?.name || 'IT Admin';

  const filteredHistory = history.filter(h => 
    h.asset_id.toLowerCase().includes(search.toLowerCase()) ||
    (h.notes && h.notes.toLowerCase().includes(search.toLowerCase())) ||
    h.actor_user_id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>Đang tải lịch sử bàn giao tài sản...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Nhật ký Bàn giao Tài sản</h1>
          <p className="page-subtitle">Xem toàn bộ lịch sử bàn giao, thu hồi và luân chuyển tài sản IT trong doanh nghiệp</p>
        </div>
      </div>

      <div className="filters-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo mã tài sản, người thực hiện, lý do..."
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
                <th>Mã Tài sản</th>
                <th>Loại</th>
                <th>Người dùng cũ</th>
                <th>Người dùng mới</th>
                <th>Bộ phận cũ</th>
                <th>Bộ phận mới</th>
                <th>Ngày chuyển giao</th>
                <th>Người thực hiện</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Không có nhật ký bàn giao nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                filteredHistory.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 700 }}>{h.asset_id}</td>
                    <td>
                      <span className="badge badge-muted" style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                        {h.asset_type === 'Computer' && <Laptop size={10} />}
                        {h.asset_type === 'Monitor' && <Monitor size={10} />}
                        {h.asset_type === 'ITAsset' && <Wrench size={10} />}
                        {h.asset_type}
                      </span>
                    </td>
                    <td>{h.previous_user_id ? getEmpName(h.previous_user_id) : <span style={{ color: 'var(--text-muted)' }}>Kho IT</span>}</td>
                    <td style={{ fontWeight: 600 }}>{h.new_user_id ? getEmpName(h.new_user_id) : <span style={{ color: 'var(--warning)' }}>Thu hồi về kho</span>}</td>
                    <td>{h.previous_dept_id ? getDeptName(h.previous_dept_id) : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}</td>
                    <td>{h.new_dept_id ? getDeptName(h.new_dept_id) : <span style={{ color: 'var(--warning)' }}>N/A</span>}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} color="var(--text-muted)" />
                        <span>{h.transfer_date}</span>
                      </div>
                    </td>
                    <td>{h.actor_user_id}</td>
                    <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{h.notes || '-'}</span></td>
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
