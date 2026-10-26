// Excel & CSV Helper Utility
// Handles CSV generation with UTF-8 BOM for correct character encoding in Excel (accents & Korean text)

export const ExcelTool = {
  /**
   * Export an array of objects to a downloadable CSV file.
   */
  exportToCsv: (filename: string, headers: string[], rows: any[][]): void => {
    const csvContent = 
      headers.join(',') + '\n' +
      rows.map(row => 
        row.map(val => {
          if (val === undefined || val === null) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      ).join('\n');

    // Add UTF-8 BOM to prevent Excel from displaying corrupt Vietnamese/Korean characters
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  /**
   * Generates a template CSV string based on asset type.
   */
  downloadTemplate: (type: 'employees' | 'computers' | 'monitors' | 'itassets'): void => {
    let headers: string[] = [];
    let dummyRow: string[] = [];

    switch (type) {
      case 'employees':
        headers = ['Mã nhân viên', 'Họ tên', 'Tên tiếng Hàn', 'Mã Bộ phận', 'Mã Chức vụ', 'Email', 'Tài khoản Windows', 'Số điện thoại', 'Ngày vào', 'Trạng thái'];
        dummyRow = ['EMP-999', 'Nguyen Van Mau', '원반마우', 'IT', 'IT-NHANVIEN', 'mau.nv@company.com', 'it.maunv', '0901234567', '2026-08-21', 'Active'];
        break;
      case 'computers':
        headers = ['Mã máy', 'Tên máy', 'Số Serial', 'CPU', 'Mainboard', 'RAM', 'Ổ cứng', 'VGA', 'Hệ điều hành', 'Phần mềm Office', 'Ngày mua', 'Thời hạn bảo hành', 'Tình trạng', 'Vị trí'];
        dummyRow = ['PC-999', 'DESKTOP-TEST', 'SN99998888', 'Intel Core i5', 'Gigabyte H610', '16GB DDR4', 'SSD 512GB', 'Integrated', 'Windows 11 Pro', 'Office 2021', '2026-01-10', '24', 'Spare', 'Kho IT'];
        break;
      case 'monitors':
        headers = ['Mã màn hình', 'Model', 'Số Serial', 'Kích thước', 'Độ phân giải', 'Vị trí', 'Ngày mua', 'Thời hạn bảo hành', 'Tình trạng'];
        dummyRow = ['MON-999', 'LG 24MP400-B', 'SNM999922', '24', '1920x1080 FHD', 'Kho IT', '2026-01-10', '24', 'Spare'];
        break;
      case 'itassets':
        headers = ['Mã thiết bị', 'Loại thiết bị', 'Model', 'Số Serial', 'Địa chỉ IP', 'Vị trí', 'Ngày mua', 'Thời hạn bảo hành', 'Tình trạng', 'Ghi chú'];
        dummyRow = ['AST-PRN99', 'Printer', 'HP LaserJet Pro', 'SNPRN11223', '1920x1080', 'Văn phòng tầng 1', '2026-02-15', '12', 'Active', 'Máy in hóa đơn'];
        break;
    }

    const csvContent = headers.join(',') + '\n' + dummyRow.map(v => `"${v}"`).join(',');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `template_${type}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  /**
   * Parse a CSV string into rows of string arrays
   */
  parseCsv: (csvText: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';

    // Remove Carriage Returns and process characters
    const cleanText = csvText.replace(/\r/g, '');
    
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentVal += '"';
          i++; // skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\n' && !inQuotes) {
        row.push(currentVal.trim());
        result.push(row);
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }

    // Push last value if any
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      result.push(row);
    }

    return result.filter(r => r.length > 0 && r.some(cell => cell !== ''));
  }
};
