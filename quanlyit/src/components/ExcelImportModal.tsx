import React, { useState, useEffect } from 'react';
import { ExcelTool } from '../utils/ExcelTool';
import { db } from '../utils/supabaseClient';
import { X, Upload, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { Department, Position } from '../types';

interface ExcelImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface RowValidation {
  rowIdx: number;
  data: string[];
  isValid: boolean;
  errors: string[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ onClose, onImportComplete }) => {
  const [importType, setImportType] = useState<'employees' | 'computers' | 'monitors' | 'itassets'>('employees');
  const [step, setStep] = useState<number>(1); // 1: Upload, 2: Preview & Validate
  const [fileName, setFileName] = useState<string>('');
  const [validationRows, setValidationRows] = useState<RowValidation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    const fetchReferences = async () => {
      const depts = await db.getDepartments();
      const posts = await db.getPositions();
      setDepartments(depts);
      setPositions(posts);
    };
    fetchReferences();
  }, []);

  const handleDownloadTemplate = () => {
    ExcelTool.downloadTemplate(importType);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsedRows = ExcelTool.parseCsv(text);
      if (parsedRows.length <= 1) {
        alert('File trống hoặc chỉ chứa dòng tiêu đề.');
        return;
      }

      // First row is header
      const dataRows = parsedRows.slice(1);
      validateData(dataRows);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const validateData = (rows: string[][]) => {
    const validations: RowValidation[] = rows.map((row, idx) => {
      const errors: string[] = [];
      const rowNum = idx + 2; // header is 1

      if (importType === 'employees') {
        const [id, name, name_kr, deptId, posId, email, winAcc, phone, joinDate, status] = row;
        
        if (!id) errors.push(`Dòng ${rowNum}: Thiếu mã nhân viên.`);
        else if (!id.startsWith('EMP-')) errors.push(`Dòng ${rowNum}: Mã nhân viên phải bắt đầu bằng 'EMP-'.`);

        if (!name) errors.push(`Dòng ${rowNum}: Thiếu họ tên.`);
        
        if (deptId && !departments.some(d => d.id === deptId)) {
          errors.push(`Dòng ${rowNum}: Mã bộ phận '${deptId}' không tồn tại trên hệ thống.`);
        }
        if (posId && !positions.some(p => p.id === posId)) {
          errors.push(`Dòng ${rowNum}: Mã chức vụ '${posId}' không tồn tại.`);
        }

        const validStatuses = ['Active', 'Resigned', 'Leave', 'Transfer'];
        if (status && !validStatuses.includes(status)) {
          errors.push(`Dòng ${rowNum}: Trạng thái '${status}' không hợp lệ. Phải là: Active, Resigned, Leave, hoặc Transfer.`);
        }
      }

      if (importType === 'computers') {
        const [id, name, serial, cpu, mainboard, ram, storage, vga, os, office, purchaseDate, warranty, status, location] = row;
        
        if (!id) errors.push(`Dòng ${rowNum}: Thiếu mã máy.`);
        else if (!id.startsWith('PC-')) errors.push(`Dòng ${rowNum}: Mã máy phải bắt đầu bằng 'PC-'.`);

        if (!name) errors.push(`Dòng ${rowNum}: Thiếu tên máy tính.`);
        
        const validStatuses = ['Active', 'Spare', 'Repair', 'Broken', 'Disposed'];
        if (status && !validStatuses.includes(status)) {
          errors.push(`Dòng ${rowNum}: Trạng thái '${status}' không hợp lệ. Phải là: Active, Spare, Repair, Broken, hoặc Disposed.`);
        }
      }

      if (importType === 'monitors') {
        const [id, model, serial, size, resolution, location, purchaseDate, warranty, status] = row;
        
        if (!id) errors.push(`Dòng ${rowNum}: Thiếu mã màn hình.`);
        else if (!id.startsWith('MON-')) errors.push(`Dòng ${rowNum}: Mã màn hình phải bắt đầu bằng 'MON-'.`);

        if (!model) errors.push(`Dòng ${rowNum}: Thiếu model màn hình.`);

        const validStatuses = ['Active', 'Spare', 'Repair', 'Broken', 'Disposed'];
        if (status && !validStatuses.includes(status)) {
          errors.push(`Dòng ${rowNum}: Trạng thái '${status}' không hợp lệ. Phải là: Active, Spare, Repair, Broken, hoặc Disposed.`);
        }
      }

      if (importType === 'itassets') {
        const [id, type, model, serial, ip, location, purchaseDate, warranty, status, notes] = row;
        
        if (!id) errors.push(`Dòng ${rowNum}: Thiếu mã thiết bị.`);
        else if (!id.startsWith('AST-')) errors.push(`Dòng ${rowNum}: Mã thiết bị phải bắt đầu bằng 'AST-'.`);

        if (!type) errors.push(`Dòng ${rowNum}: Thiếu loại thiết bị.`);
        if (!model) errors.push(`Dòng ${rowNum}: Thiếu model thiết bị.`);

        const validStatuses = ['Active', 'Spare', 'Repair', 'Broken', 'Disposed'];
        if (status && !validStatuses.includes(status)) {
          errors.push(`Dòng ${rowNum}: Trạng thái '${status}' không hợp lệ. Phải là: Active, Spare, Repair, Broken, hoặc Disposed.`);
        }
      }

      return {
        rowIdx: idx,
        data: row,
        isValid: errors.length === 0,
        errors
      };
    });

    setValidationRows(validations);
  };

  const handleCommitImport = async () => {
    const validRows = validationRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Không có dòng dữ liệu hợp lệ để import.');
      return;
    }

    try {
      if (importType === 'employees') {
        for (const row of validRows) {
          const [id, name, name_kr, deptId, posId, email, winAcc, phone, joinDate, status] = row.data;
          await db.saveEmployee({
            id,
            name,
            name_kr: name_kr || undefined,
            department_id: deptId,
            position_id: posId,
            email: email || undefined,
            win_account: winAcc || undefined,
            phone: phone || undefined,
            join_date: joinDate || new Date().toISOString().split('T')[0],
            status: (status as any) || 'Active'
          });
        }
      }

      if (importType === 'computers') {
        for (const row of validRows) {
          const [id, name, serial, cpu, mainboard, ram, storage, vga, os, office, purchaseDate, warranty, status, location] = row.data;
          await db.saveComputer({
            id,
            name,
            serial: serial || undefined,
            cpu: cpu || undefined,
            mainboard: mainboard || undefined,
            ram: ram || undefined,
            storage: storage || undefined,
            vga: vga || undefined,
            os: os || undefined,
            office: office || undefined,
            purchase_date: purchaseDate || undefined,
            warranty_months: parseInt(warranty) || 24,
            status: (status as any) || 'Spare',
            location: location || undefined
          });
        }
      }

      if (importType === 'monitors') {
        for (const row of validRows) {
          const [id, model, serial, size, resolution, location, purchaseDate, warranty, status] = row.data;
          await db.saveMonitor({
            id,
            model,
            serial: serial || undefined,
            size_inches: size || undefined,
            resolution: resolution || undefined,
            location: location || undefined,
            purchase_date: purchaseDate || undefined,
            warranty_months: parseInt(warranty) || 24,
            status: (status as any) || 'Spare'
          });
        }
      }

      if (importType === 'itassets') {
        for (const row of validRows) {
          const [id, type, model, serial, ip, location, purchaseDate, warranty, status, notes] = row.data;
          await db.saveITAsset({
            id,
            asset_type: type,
            model,
            serial: serial || undefined,
            ip_address: ip || undefined,
            location: location || undefined,
            purchase_date: purchaseDate || undefined,
            warranty_months: parseInt(warranty) || 24,
            status: (status as any) || 'Spare',
            notes: notes || undefined
          });
        }
      }

      alert(`Đã import thành công ${validRows.length} / ${validationRows.length} dòng dữ liệu.`);
      onImportComplete();
      onClose();
    } catch (err) {
      alert('Lỗi trong quá trình import dữ liệu.');
    }
  };

  const getPreviewHeaders = () => {
    switch (importType) {
      case 'employees': return ['ID', 'Tên', 'Tên KR', 'Bộ phận', 'Chức vụ', 'Win Account', 'Trạng thái'];
      case 'computers': return ['ID', 'Tên máy', 'S/N', 'CPU', 'RAM', 'Storage', 'Trạng thái'];
      case 'monitors': return ['ID', 'Model', 'S/N', 'Kích thước', 'Độ phân giải', 'Trạng thái'];
      case 'itassets': return ['ID', 'Loại', 'Model', 'S/N', 'Vị trí', 'Trạng thái'];
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-content" style={{ maxWidth: '850px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Trình nhập dữ liệu IT Excel / CSV</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ minHeight: '380px' }}>
          {step === 1 ? (
            // STEP 1: Select Type & Upload File
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Bước 1: Chọn bảng dữ liệu và tải file mẫu</h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select 
                    className="form-control" 
                    style={{ width: '220px' }}
                    value={importType}
                    onChange={(e) => setImportType(e.target.value as any)}
                  >
                    <option value="employees">1. Danh sách Nhân viên</option>
                    <option value="computers">2. Danh sách Máy tính</option>
                    <option value="monitors">3. Danh sách Màn hình</option>
                    <option value="itassets">4. Danh sách Thiết bị IT khác</option>
                  </select>

                  <button className="btn btn-secondary" onClick={handleDownloadTemplate} style={{ gap: '0.35rem' }}>
                    <Download size={14} /> Tải Template CSV
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Bước 2: Tải lên file dữ liệu đã điền (CSV)</h4>
                
                <label 
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-primary)',
                    transition: 'all var(--transition-fast)'
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      setFileName(file.name);
                      // Trigger validation
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const parsed = ExcelTool.parseCsv(event.target?.result as string);
                        validateData(parsed.slice(1));
                        setStep(2);
                      };
                      reader.readAsText(file);
                    }
                  }}
                >
                  <Upload size={36} color="var(--primary-light)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Kéo thả file CSV của bạn vào đây hoặc click để chọn file</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hỗ trợ file định dạng .csv mã hóa UTF-8</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          ) : (
            // STEP 2: Preview and Validate Rows
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Xem trước & Xác thực dữ liệu: <code style={{ color: 'var(--primary-light)' }}>{fileName}</code></h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Tổng số: {validationRows.length} dòng. Hợp lệ: {validationRows.filter(r => r.isValid).length} dòng. Lỗi: {validationRows.filter(r => !r.isValid).length} dòng.
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ fontSize: '0.75rem' }}>Upload file khác</button>
              </div>

              {/* Validation Grid */}
              <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="table-custom" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Dòng</th>
                      <th style={{ width: '90px' }}>Kiểm tra</th>
                      {getPreviewHeaders()?.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                      <th>Mô tả lỗi chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationRows.map((row, idx) => (
                      <tr 
                        key={idx} 
                        style={{ 
                          backgroundColor: row.isValid ? '' : 'rgba(239, 68, 68, 0.08)',
                          color: row.isValid ? '' : 'var(--danger)' 
                        }}
                      >
                        <td style={{ fontWeight: 700, textAlign: 'center' }}>{idx + 2}</td>
                        <td style={{ textAlign: 'center' }}>
                          {row.isValid ? (
                            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                              <CheckCircle size={12} /> Hợp lệ
                            </span>
                          ) : (
                            <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontWeight: 700 }}>
                              <AlertCircle size={12} /> Lỗi
                            </span>
                          )}
                        </td>
                        {/* Display preview column inputs */}
                        {row.data.slice(0, getPreviewHeaders()?.length).map((val, cellIdx) => (
                          <td key={cellIdx} style={{ whiteSpace: 'nowrap' }}>{val}</td>
                        ))}
                        <td style={{ color: 'var(--danger)', fontWeight: 500 }}>
                          {row.errors.join(' | ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
          {step === 2 && (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleCommitImport}
              style={{ gap: '0.5rem' }}
            >
              <FileText size={16} /> Import {validationRows.filter(r => r.isValid).length} dòng hợp lệ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
