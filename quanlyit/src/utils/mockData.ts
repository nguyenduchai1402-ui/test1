import { 
  Department, 
  Position, 
  Employee, 
  WebappUser, 
  Computer, 
  Monitor, 
  ITAsset, 
  SharedFolder, 
  FolderRole, 
  FolderPermission, 
  EmployeeRole, 
  UserPermissionOverride,
  PermissionLog,
  AssetHistory
} from '../types';

export const initialDepartments: Department[] = [
  { id: 'IT', name: 'IT Department', name_kr: 'IT부서', manager_id: 'EMP-005', status: 'Active', notes: 'Quản trị hệ thống IT' },
  { id: 'KETOAN', name: 'Kế toán', name_kr: '회계팀', manager_id: 'EMP-006', status: 'Active', notes: 'Tài chính kế toán công ty' },
  { id: 'NHANSU', name: 'Nhân sự', name_kr: '인사팀', manager_id: 'EMP-002', status: 'Active', notes: 'Tuyển dụng, hành chính, lương' },
  { id: 'SANXUAT', name: 'Sản xuất', name_kr: '생산팀', manager_id: 'EMP-007', status: 'Active', notes: 'Bộ phận xưởng sản xuất trực tiếp' },
  { id: 'QA', name: 'QA', name_kr: 'QA팀', manager_id: 'EMP-008', status: 'Active', notes: 'Quality Assurance - Đảm bảo chất lượng' },
  { id: 'QC', name: 'QC', name_kr: 'QC팀', manager_id: 'EMP-009', status: 'Active', notes: 'Quality Control - Kiểm soát chất lượng' },
  { id: 'MUAHANG', name: 'Mua hàng', name_kr: '구매팀', manager_id: 'EMP-010', status: 'Active', notes: 'Thu mua vật tư thiết bị' },
  { id: 'KINHDOANH', name: 'Kinh doanh', name_kr: '영업팀', manager_id: 'EMP-011', status: 'Active', notes: 'Kinh doanh và Marketing' }
];

export const initialPositions: Position[] = [
  { id: 'IT-TRUONGPHONG', name: 'Trưởng phòng IT', department_id: 'IT', rank_level: 2, status: 'Active' },
  { id: 'IT-NHANVIEN', name: 'Nhân viên IT', department_id: 'IT', rank_level: 4, status: 'Active' },
  { id: 'KT-TRUONGPHONG', name: 'Trưởng phòng Kế toán', department_id: 'KETOAN', rank_level: 2, status: 'Active' },
  { id: 'KT-NHANVIEN', name: 'Nhân viên Kế toán', department_id: 'KETOAN', rank_level: 4, status: 'Active' },
  { id: 'NS-TRUONGPHONG', name: 'Trưởng phòng Nhân sự', department_id: 'NHANSU', rank_level: 2, status: 'Active' },
  { id: 'NS-NHANVIEN', name: 'Nhân viên Nhân sự', department_id: 'NHANSU', rank_level: 4, status: 'Active' },
  { id: 'SX-TRUONGPHONG', name: 'Trưởng phòng Sản xuất', department_id: 'SANXUAT', rank_level: 2, status: 'Active' },
  { id: 'SX-NHANVIEN', name: 'Nhân viên Sản xuất', department_id: 'SANXUAT', rank_level: 4, status: 'Active' },
  { id: 'QA-TRUONGPHONG', name: 'Trưởng phòng QA', department_id: 'QA', rank_level: 2, status: 'Active' },
  { id: 'QA-NHANVIEN', name: 'Nhân viên QA', department_id: 'QA', rank_level: 4, status: 'Active' },
  { id: 'QC-TRUONGPHONG', name: 'Trưởng phòng QC', department_id: 'QC', rank_level: 2, status: 'Active' },
  { id: 'QC-NHANVIEN', name: 'Nhân viên QC', department_id: 'QC', rank_level: 4, status: 'Active' },
  { id: 'MH-TRUONGPHONG', name: 'Trưởng phòng Mua hàng', department_id: 'MUAHANG', rank_level: 2, status: 'Active' },
  { id: 'KD-TRUONGPHONG', name: 'Trưởng phòng Kinh doanh', department_id: 'KINHDOANH', rank_level: 2, status: 'Active' }
];

export const initialEmployees: Employee[] = [
  { id: 'EMP-001', name: 'Nguyễn Văn A', name_kr: '원반아', department_id: 'KETOAN', position_id: 'KT-NHANVIEN', email: 'vana@company.com', win_account: 'ketoan.ana', phone: '0987111222', join_date: '2025-01-01', status: 'Active' },
  { id: 'EMP-002', name: 'Nguyễn Văn B', name_kr: '원반비', department_id: 'NHANSU', position_id: 'NS-TRUONGPHONG', email: 'vanb@company.com', win_account: 'hr.vanb', phone: '0987333444', join_date: '2024-03-15', status: 'Active' },
  { id: 'EMP-003', name: 'Nguyễn Văn C', name_kr: '원반시', department_id: 'SANXUAT', position_id: 'SX-NHANVIEN', email: 'vanc@company.com', win_account: 'sx.vanc', phone: '0987555666', join_date: '2025-05-10', status: 'Active' },
  { id: 'EMP-004', name: 'Nguyễn Văn D', name_kr: '원반디', department_id: 'QA', position_id: 'QA-NHANVIEN', email: 'vand@company.com', win_account: 'qa.vand', phone: '0987777888', join_date: '2024-08-20', status: 'Active' },
  { id: 'EMP-005', name: 'Nguyễn Văn E', name_kr: '원반이', department_id: 'IT', position_id: 'IT-NHANVIEN', email: 'vane@company.com', win_account: 'it.vane', phone: '0987999000', join_date: '2023-11-01', status: 'Active' },
  { id: 'EMP-006', name: 'Lê Thị C', name_kr: '이티시', department_id: 'KETOAN', position_id: 'KT-TRUONGPHONG', email: 'thic@company.com', win_account: 'ketoan.thic', phone: '0912111222', join_date: '2022-06-01', status: 'Active' },
  { id: 'EMP-007', name: 'Trần Văn Hùng', name_kr: '진반웅', department_id: 'SANXUAT', position_id: 'SX-TRUONGPHONG', email: 'hung.tv@company.com', win_account: 'sx.hungtv', phone: '0912333444', join_date: '2021-02-15', status: 'Active' },
  { id: 'EMP-008', name: 'Park Sung Ho', name_kr: '박성호', department_id: 'QA', position_id: 'QA-TRUONGPHONG', email: 'park@company.com', win_account: 'qa.parksh', phone: '0912555666', join_date: '2023-01-10', status: 'Active' },
  { id: 'EMP-009', name: 'Kim Tae Heon', name_kr: '김태헌', department_id: 'QC', position_id: 'QC-TRUONGPHONG', email: 'kimth@company.com', win_account: 'qc.kimth', phone: '0912777888', join_date: '2023-08-01', status: 'Active' },
  { id: 'EMP-010', name: 'Nguyễn Văn Mua', name_kr: '원반무아', department_id: 'MUAHANG', position_id: 'MH-TRUONGPHONG', email: 'muanv@company.com', win_account: 'purchasing.muanv', phone: '0912999000', join_date: '2024-04-01', status: 'Active' },
  { id: 'EMP-011', name: 'Hwang Ji Min', name_kr: '황지민', department_id: 'KINHDOANH', position_id: 'KD-TRUONGPHONG', email: 'hwang@company.com', win_account: 'sales.hwangjm', phone: '0909111222', join_date: '2024-10-15', status: 'Active' },
  { id: 'EMP-012', name: 'Trần Văn B', name_kr: '진반비', department_id: 'SANXUAT', position_id: 'SX-NHANVIEN', email: 'vanb.tran@company.com', win_account: 'sx.vanbt', phone: '0909333444', join_date: '2025-02-01', status: 'Active' }
];

export const initialWebappUsers: WebappUser[] = [
  { id: 'user-admin-1', email: 'superadmin@company.com', display_name: 'Hệ thống Admin', role: 'SUPER_ADMIN', status: 'Active' },
  { id: 'user-admin-2', email: 'itadmin@company.com', display_name: 'IT Admin B', role: 'IT_ADMIN', status: 'Active' },
  { id: 'user-user-1', email: 'ituser@company.com', display_name: 'IT Kỹ thuật viên', role: 'IT_USER', status: 'Active' },
  { id: 'user-view-1', email: 'viewer@company.com', display_name: 'Người xem', role: 'VIEWER', status: 'Active' }
];

export const initialComputers: Computer[] = [
  { id: 'PC-001', name: 'DESKTOP-KT01', serial: 'SNDK12938481', current_user_id: 'EMP-001', department_id: 'KETOAN', ip_address: '192.168.1.50', mac_address: '00:1A:2B:3C:4D:5E', cpu: 'Intel Core i5-12400', mainboard: 'ASUS Prime B660M', ram: '16GB DDR4 3200MHz', storage: 'SSD 512GB NVMe', vga: 'Intel UHD Graphics 730', os: 'Windows 11 Pro', office: 'Office 2021 LTSC', purchase_date: '2025-01-02', assignment_date: '2025-01-05', warranty_months: 24, status: 'Active', location: 'Văn phòng tầng 2 - Phòng Kế Toán', notes: 'Máy kế toán tổng hợp' },
  { id: 'PC-002', name: 'DESKTOP-NS01', serial: 'SNDK12938482', current_user_id: 'EMP-002', department_id: 'NHANSU', ip_address: '192.168.1.60', mac_address: '00:1A:2B:3C:4D:5F', cpu: 'Intel Core i5-11400', mainboard: 'Gigabyte H510M', ram: '8GB DDR4', storage: 'SSD 256GB', vga: 'Integrated Graphics', os: 'Windows 10 Pro', office: 'Office 2019 Home & Business', purchase_date: '2024-03-10', assignment_date: '2024-03-15', warranty_months: 24, status: 'Active', location: 'Văn phòng tầng 1 - Phòng Nhân sự', notes: 'Máy dùng tuyển dụng' },
  { id: 'PC-003', name: 'DESKTOP-SX01', serial: 'SNDK12938483', current_user_id: 'EMP-003', department_id: 'SANXUAT', ip_address: '192.168.2.11', mac_address: '00:1A:2B:3C:4D:60', cpu: 'Intel Core i3-12100', mainboard: 'MSI PRO H610M-E', ram: '8GB DDR4', storage: 'SSD 256GB', vga: 'Integrated', os: 'Windows 10 Pro', office: 'Office 2016 Standard', purchase_date: '2025-05-08', assignment_date: '2025-05-10', warranty_months: 24, status: 'Active', location: 'Xưởng sản xuất A', notes: 'Máy ghi chép báo cáo sản lượng' },
  { id: 'PC-004', name: 'DESKTOP-QA01', serial: 'SNDK12938484', current_user_id: 'EMP-004', department_id: 'QA', ip_address: '192.168.1.70', mac_address: '00:1A:2B:3C:4D:61', cpu: 'Intel Core i5-12400', mainboard: 'ASUS Prime B660M', ram: '16GB DDR4', storage: 'SSD 512GB', vga: 'Intel UHD', os: 'Windows 11 Pro', office: 'Office 2021 LTSC', purchase_date: '2024-08-15', assignment_date: '2024-08-20', warranty_months: 24, status: 'Active', location: 'Phòng Lab QA', notes: 'Máy quản lý ISO và hồ sơ chất lượng' },
  { id: 'PC-005', name: 'DESKTOP-IT01', serial: 'SNDK12938485', current_user_id: 'EMP-005', department_id: 'IT', ip_address: '192.168.10.15', mac_address: '00:1A:2B:3C:4D:62', cpu: 'Intel Core i7-13700', mainboard: 'ASUS ROG STRIX B760-G', ram: '32GB DDR5 5600MHz', storage: 'SSD 1TB NVMe Gen4', vga: 'NVIDIA RTX 3060 12GB', os: 'Windows 11 Pro', office: 'Office 365 Pro', purchase_date: '2023-10-25', assignment_date: '2023-11-01', warranty_months: 36, status: 'Active', location: 'Phòng IT tầng 3', notes: 'Máy làm việc của IT Admin' },
  { id: 'PC-006', name: 'DESKTOP-SPARE1', serial: 'SNDK12938486', current_user_id: undefined, department_id: undefined, ip_address: undefined, mac_address: '00:1A:2B:3C:4D:63', cpu: 'Intel Core i3-10100', mainboard: 'Gigabyte H410M', ram: '8GB DDR4', storage: 'SSD 120GB + HDD 500GB', vga: 'Integrated', os: 'Windows 10 Pro', office: 'None', purchase_date: '2022-05-15', assignment_date: undefined, warranty_months: 24, status: 'Spare', location: 'Kho IT tầng 3', notes: 'Máy tính dự phòng cấp cho nhân viên mới' },
  { id: 'PC-007', name: 'DESKTOP-SPARE2', serial: 'SNDK12938487', current_user_id: undefined, department_id: undefined, ip_address: undefined, mac_address: '00:1A:2B:3C:4D:64', cpu: 'Intel Core i5-12400', mainboard: 'ASUS Prime B660M', ram: '16GB DDR4', storage: 'SSD 512GB', vga: 'Integrated', os: 'Windows 11 Pro', office: 'None', purchase_date: '2025-07-20', assignment_date: undefined, warranty_months: 24, status: 'Spare', location: 'Kho IT tầng 3', notes: 'Máy dự phòng cấu hình cao mới mua' },
  { id: 'PC-008', name: 'DESKTOP-REPAIR1', serial: 'SNDK12938488', current_user_id: undefined, department_id: undefined, ip_address: undefined, mac_address: '00:1A:2B:3C:4D:65', cpu: 'Intel Core i5-10400', mainboard: 'ASUS H470M', ram: '8GB DDR4', storage: 'HDD 1TB', vga: 'Integrated', os: 'Windows 10 Pro', office: 'Office 2019', purchase_date: '2021-12-10', assignment_date: undefined, warranty_months: 24, status: 'Repair', location: 'Khu vực kỹ thuật IT', notes: 'Lỗi nguồn chập chờn, đang đợi bảo hành hoặc thay thế' },
  { id: 'PC-009', name: 'DESKTOP-BROKEN1', serial: 'SNDK12938489', current_user_id: undefined, department_id: undefined, ip_address: undefined, mac_address: '00:1A:2B:3C:4D:66', cpu: 'Intel Core 2 Duo E8400', mainboard: 'G31', ram: '4GB DDR2', storage: 'HDD 160GB', vga: 'Integrated', os: 'Windows 7 Ultimate', office: 'Office 2007', purchase_date: '2015-04-10', assignment_date: undefined, warranty_months: 12, status: 'Broken', location: 'Kho phế liệu tầng hầm', notes: 'Hỏng chip cầu bắc mainboard, không sửa được' },
  { id: 'PC-010', name: 'DESKTOP-DISPOSED1', serial: 'SNDK12938490', current_user_id: undefined, department_id: undefined, ip_address: undefined, mac_address: '00:1A:2B:3C:4D:67', cpu: 'Core i3-3220', mainboard: 'H61', ram: '4GB DDR3', storage: 'HDD 250GB', vga: 'Integrated', os: 'Windows 7', office: 'None', purchase_date: '2017-06-15', assignment_date: undefined, warranty_months: 12, status: 'Disposed', location: 'N/A', notes: 'Đã thanh lý đợt thanh lý tháng 6/2026' }
];

export const initialMonitors: Monitor[] = [
  { id: 'MON-001', model: 'Dell UltraSharp U2422H', serial: 'CN0A12349081', size_inches: '24', resolution: '1920x1080 FHD', current_user_id: 'EMP-001', connected_computer_id: 'PC-001', location: 'Phòng Kế Toán', purchase_date: '2025-01-02', warranty_months: 36, status: 'Active' },
  { id: 'MON-002', model: 'Dell SE2422H', serial: 'CN0B12349082', size_inches: '24', resolution: '1920x1080 FHD', current_user_id: 'EMP-001', connected_computer_id: 'PC-001', location: 'Phòng Kế Toán', purchase_date: '2025-01-02', warranty_months: 24, status: 'Active' }, // Dual screen
  { id: 'MON-003', model: 'HP M27fw', serial: 'CN0C12349083', size_inches: '27', resolution: '1920x1080 FHD', current_user_id: 'EMP-002', connected_computer_id: 'PC-002', location: 'Phòng Nhân sự', purchase_date: '2024-03-10', warranty_months: 24, status: 'Active' },
  { id: 'MON-004', model: 'Samsung Essential S3 S31C', serial: 'CN0D12349084', size_inches: '24', resolution: '1920x1080 FHD', current_user_id: 'EMP-003', connected_computer_id: 'PC-003', location: 'Xưởng sản xuất A', purchase_date: '2025-05-08', warranty_months: 24, status: 'Active' },
  { id: 'MON-005', model: 'LG 27UP600-W', serial: 'CN0E12349085', size_inches: '27', resolution: '3840x2160 4K', current_user_id: 'EMP-004', connected_computer_id: 'PC-004', location: 'Phòng Lab QA', purchase_date: '2024-08-15', warranty_months: 24, status: 'Active' },
  { id: 'MON-006', model: 'Asus ProArt PA278QV', serial: 'CN0F12349086', size_inches: '27', resolution: '2560x1440 2K', current_user_id: 'EMP-005', connected_computer_id: 'PC-005', location: 'Phòng IT', purchase_date: '2023-10-25', warranty_months: 36, status: 'Active' },
  { id: 'MON-007', model: 'Asus ProArt PA278QV', serial: 'CN0G12349087', size_inches: '27', resolution: '2560x1440 2K', current_user_id: 'EMP-005', connected_computer_id: 'PC-005', location: 'Phòng IT', purchase_date: '2023-10-25', warranty_months: 36, status: 'Active' }, // IT Dual screen 1
  { id: 'MON-008', model: 'Dell UltraSharp U2723QE', serial: 'CN0H12349088', size_inches: '27', resolution: '3840x2160 4K', current_user_id: 'EMP-005', connected_computer_id: 'PC-005', location: 'Phòng IT', purchase_date: '2024-12-01', warranty_months: 36, status: 'Active' }, // IT Triple screen!
  { id: 'MON-009', model: 'LG 24MP400-B', serial: 'CN0I12349089', size_inches: '24', resolution: '1920x1080 FHD', current_user_id: undefined, connected_computer_id: undefined, location: 'Kho IT', purchase_date: '2025-07-20', warranty_months: 24, status: 'Spare' },
  { id: 'MON-010', model: 'LG 24MP400-B', serial: 'CN0J12349090', size_inches: '24', resolution: '1920x1080 FHD', current_user_id: undefined, connected_computer_id: undefined, location: 'Kho IT', purchase_date: '2025-07-20', warranty_months: 24, status: 'Spare' },
  { id: 'MON-011', model: 'Samsung Odyssey G3', serial: 'CN0K12349091', size_inches: '24', resolution: '1920x1080 FHD 144Hz', current_user_id: undefined, connected_computer_id: undefined, location: 'Kho IT', purchase_date: '2024-05-15', warranty_months: 24, status: 'Spare' },
  { id: 'MON-012', model: 'HP V22v', serial: 'CN0L12349092', size_inches: '21.5', resolution: '1920x1080 FHD', current_user_id: undefined, connected_computer_id: undefined, location: 'Khu kỹ thuật', purchase_date: '2021-12-10', warranty_months: 24, status: 'Repair' },
  { id: 'MON-013', model: 'Acer HA220Q', serial: 'CN0M12349093', size_inches: '21.5', resolution: '1920x1080 FHD', current_user_id: undefined, connected_computer_id: undefined, location: 'Khu kỹ thuật', purchase_date: '2021-11-15', warranty_months: 24, status: 'Repair' },
  { id: 'MON-014', model: 'ViewSonic VA1903H', serial: 'CN0N12349094', size_inches: '19', resolution: '1366x768', current_user_id: undefined, connected_computer_id: undefined, location: 'Kho phế liệu', purchase_date: '2016-08-10', warranty_months: 12, status: 'Broken' },
  { id: 'MON-015', model: 'AOC E970SWN', serial: 'CN0O12349095', size_inches: '18.5', resolution: '1366x768', current_user_id: undefined, connected_computer_id: undefined, location: 'N/A', purchase_date: '2015-05-12', warranty_months: 12, status: 'Disposed' }
];

export const initialITAssets: ITAsset[] = [
  { id: 'AST-LAP01', asset_type: 'Laptop', model: 'ThinkPad L14 Gen 3', serial: 'L14G3-998822', current_user_id: 'EMP-006', department_id: 'KETOAN', location: 'Phòng Kế Toán', purchase_date: '2024-05-20', warranty_months: 24, status: 'Active', notes: 'Laptop dùng đi công tác của KTT' },
  { id: 'AST-PRN01', asset_type: 'Printer', model: 'Canon LBP2900', serial: 'CAN29-123412', current_user_id: undefined, department_id: 'KETOAN', location: 'Văn phòng Tầng 2', purchase_date: '2023-01-15', warranty_months: 12, status: 'Active', notes: 'Máy in laser trắng đen phòng Kế toán' },
  { id: 'AST-SW01', asset_type: 'Switch', model: 'Cisco Catalyst 2960L 24 Ports', serial: 'CISCO2960-9182', current_user_id: undefined, department_id: 'IT', location: 'Tủ Rack Tầng 1', purchase_date: '2022-10-10', warranty_months: 36, status: 'Active', notes: 'Switch trung tâm Tầng 1' },
  { id: 'AST-AP01', asset_type: 'Access Point', model: 'Aruba AP-303', serial: 'ARUBA303-7744', current_user_id: undefined, department_id: 'IT', location: 'Trần hành lang Tầng 2', ip_address: '192.168.1.10', purchase_date: '2023-05-05', warranty_months: 24, status: 'Active', notes: 'Bộ phát Wifi hành lang' },
  { id: 'AST-NAS01', asset_type: 'NAS', model: 'Synology DS923+', serial: 'SYN923-8822', current_user_id: undefined, department_id: 'IT', location: 'Phòng IT Tầng 3', ip_address: '192.168.10.200', purchase_date: '2024-02-15', warranty_months: 36, status: 'Active', notes: 'Thiết bị lưu trữ ổ chung và backup dữ liệu' },
  { id: 'AST-SRV01', asset_type: 'Server', model: 'Dell PowerEdge R750', serial: 'DELLSRV-00192', current_user_id: undefined, department_id: 'IT', location: 'Phòng Server Tầng 3', ip_address: '192.168.10.10', purchase_date: '2023-08-01', warranty_months: 36, status: 'Active', notes: 'Máy chủ chạy ảo hóa ESXi phục vụ Active Directory, ERP' },
  { id: 'AST-UPS01', asset_type: 'UPS', model: 'APC Smart-UPS 2200VA', serial: 'APCUPS-11883', current_user_id: undefined, department_id: 'IT', location: 'Phòng Server Tầng 3', purchase_date: '2023-08-01', warranty_months: 24, status: 'Active', notes: 'Bộ lưu điện phòng Server' },
  { id: 'AST-CAM01', asset_type: 'Camera', model: 'Hikvision DS-2CD2121G0-I', serial: 'HIKCAM-99881', current_user_id: undefined, department_id: undefined, location: 'Cổng bảo vệ', ip_address: '192.168.1.99', purchase_date: '2024-11-20', warranty_months: 24, status: 'Active', notes: 'Camera quan sát cổng chính' }
];

export const initialSharedFolders: SharedFolder[] = [
  { id: 'ROOT', parent_id: undefined, name: 'Ổ CHUNG', folder_path: 'Ổ CHUNG', description: 'Thư mục gốc ổ đĩa dùng chung', status: 'Active' },
  { id: 'FLD-KETOAN', parent_id: 'ROOT', name: 'KE TOAN', folder_path: 'Ổ CHUNG/KE TOAN', description: 'Thư mục tài liệu kế toán tài chính', status: 'Active' },
  { id: 'FLD-NHANSU', parent_id: 'ROOT', name: 'NHAN SU', folder_path: 'Ổ CHUNG/NHAN SU', description: 'Thư mục quản lý nhân sự, bảo hiểm, lương', status: 'Active' },
  { id: 'FLD-SANXUAT', parent_id: 'ROOT', name: 'SAN XUAT', folder_path: 'Ổ CHUNG/SAN XUAT', description: 'Kế hoạch sản xuất và báo cáo xưởng', status: 'Active' },
  { id: 'FLD-QA', parent_id: 'ROOT', name: 'QA', folder_path: 'Ổ CHUNG/QA', description: 'Tài liệu quy trình ISO và chất lượng hệ thống', status: 'Active' },
  { id: 'FLD-QC', parent_id: 'ROOT', name: 'QC', folder_path: 'Ổ CHUNG/QC', description: 'Kết quả kiểm tra chất lượng sản phẩm', status: 'Active' },
  { id: 'FLD-MUAHANG', parent_id: 'ROOT', name: 'MUA HANG', folder_path: 'Ổ CHUNG/MUA HANG', description: 'Hợp đồng, báo giá, yêu cầu mua hàng', status: 'Active' },
  { id: 'FLD-KINHDOANH', parent_id: 'ROOT', name: 'KINH DOANH', folder_path: 'Ổ CHUNG/KINH DOANH', description: 'Hồ sơ khách hàng, kế hoạch sales', status: 'Active' },
  { id: 'FLD-IT', parent_id: 'ROOT', name: 'IT', folder_path: 'Ổ CHUNG/IT', description: 'Tài liệu kỹ thuật IT, phần mềm, bản quyền', status: 'Active' },
  { id: 'FLD-COMMON', parent_id: 'ROOT', name: 'TAI LIEU CHUNG', folder_path: 'Ổ CHUNG/TAI LIEU CHUNG', description: 'Thông báo, biểu mẫu và quy định chung của công ty', status: 'Active' },
  // Subfolders
  { id: 'FLD-KT-REPORT', parent_id: 'FLD-KETOAN', name: 'BAO CAO THUE', folder_path: 'Ổ CHUNG/KE TOAN/BAO CAO THUE', description: 'Báo cáo thuế GTGT, TNCN, TNDN hàng năm', status: 'Active' },
  { id: 'FLD-NS-PROFILE', parent_id: 'FLD-NHANSU', name: 'HO SO NHAN VIEN', folder_path: 'Ổ CHUNG/NHAN SU/HO SO NHAN VIEN', description: 'Hợp đồng lao động và hồ sơ cá nhân scan', status: 'Active' },
  { id: 'FLD-CM-TEMPLATES', parent_id: 'FLD-COMMON', name: 'MAU BIEU', folder_path: 'Ổ CHUNG/TAI LIEU CHUNG/MAU BIEU', description: 'Các mẫu đơn xin nghỉ phép, tạm ứng, thanh toán', status: 'Active' }
];

export const initialFolderRoles: FolderRole[] = [
  { id: 'ROLE_IT', name: 'ROLE_IT', description: 'Quyền hạn bộ phận IT' },
  { id: 'ROLE_KETOAN', name: 'ROLE_KETOAN', description: 'Quyền hạn phòng Kế toán' },
  { id: 'ROLE_NHANSU', name: 'ROLE_NHANSU', description: 'Quyền hạn phòng Nhân sự' },
  { id: 'ROLE_SANXUAT', name: 'ROLE_SANXUAT', description: 'Quyền hạn phòng Sản xuất' },
  { id: 'ROLE_QA', name: 'ROLE_QA', description: 'Quyền hạn phòng QA' },
  { id: 'ROLE_QC', name: 'ROLE_QC', description: 'Quyền hạn phòng QC' },
  { id: 'ROLE_MUAHANG', name: 'ROLE_MUAHANG', description: 'Quyền hạn phòng Mua hàng' },
  { id: 'ROLE_KINHDOANH', name: 'ROLE_KINHDOANH', description: 'Quyền hạn phòng Kinh doanh' },
  { id: 'ROLE_COMMON', name: 'ROLE_COMMON', description: 'Quyền đọc tài liệu công cộng' }
];

export const initialRolePermissions: FolderPermission[] = [
  // ROLE_IT: Toàn quyền tất cả
  { id: 'p-it-root', role_id: 'ROLE_IT', folder_id: 'ROOT', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: true },
  { id: 'p-it-it', role_id: 'ROLE_IT', folder_id: 'FLD-IT', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: true },
  { id: 'p-it-kt', role_id: 'ROLE_IT', folder_id: 'FLD-KETOAN', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: true },
  { id: 'p-it-ns', role_id: 'ROLE_IT', folder_id: 'FLD-NHANSU', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: true },

  // ROLE_KETOAN: Toàn quyền KE TOAN, đọc TAI LIEU CHUNG
  { id: 'p-kt-kt', role_id: 'ROLE_KETOAN', folder_id: 'FLD-KETOAN', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: false },
  { id: 'p-kt-sub', role_id: 'ROLE_KETOAN', folder_id: 'FLD-KT-REPORT', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: true },
  { id: 'p-kt-com', role_id: 'ROLE_KETOAN', folder_id: 'FLD-COMMON', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },

  // ROLE_NHANSU: Toàn quyền NHAN SU, đọc TAI LIEU CHUNG
  { id: 'p-ns-ns', role_id: 'ROLE_NHANSU', folder_id: 'FLD-NHANSU', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: false },
  { id: 'p-ns-sub', role_id: 'ROLE_NHANSU', folder_id: 'FLD-NS-PROFILE', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: true },
  { id: 'p-ns-com', role_id: 'ROLE_NHANSU', folder_id: 'FLD-COMMON', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },

  // ROLE_SANXUAT: Toàn quyền SAN XUAT, đọc TAI LIEU CHUNG, đọc QA, đọc QC
  { id: 'p-sx-sx', role_id: 'ROLE_SANXUAT', folder_id: 'FLD-SANXUAT', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: false },
  { id: 'p-sx-qa', role_id: 'ROLE_SANXUAT', folder_id: 'FLD-QA', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },
  { id: 'p-sx-qc', role_id: 'ROLE_SANXUAT', folder_id: 'FLD-QC', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },
  { id: 'p-sx-com', role_id: 'ROLE_SANXUAT', folder_id: 'FLD-COMMON', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },

  // ROLE_QA: Toàn quyền QA, đọc QC, đọc SAN XUAT
  { id: 'p-qa-qa', role_id: 'ROLE_QA', folder_id: 'FLD-QA', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: false },
  { id: 'p-qa-qc', role_id: 'ROLE_QA', folder_id: 'FLD-QC', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },
  { id: 'p-qa-sx', role_id: 'ROLE_QA', folder_id: 'FLD-SANXUAT', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },
  { id: 'p-qa-com', role_id: 'ROLE_QA', folder_id: 'FLD-COMMON', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },

  // ROLE_QC: Toàn quyền QC, đọc QA, đọc SAN XUAT
  { id: 'p-qc-qc', role_id: 'ROLE_QC', folder_id: 'FLD-QC', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: false },
  { id: 'p-qc-qa', role_id: 'ROLE_QC', folder_id: 'FLD-QA', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },
  { id: 'p-qc-sx', role_id: 'ROLE_QC', folder_id: 'FLD-SANXUAT', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },
  { id: 'p-qc-com', role_id: 'ROLE_QC', folder_id: 'FLD-COMMON', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },

  // ROLE_MUAHANG: Toàn quyền MUA HANG, đọc TAI LIEU CHUNG
  { id: 'p-mh-mh', role_id: 'ROLE_MUAHANG', folder_id: 'FLD-MUAHANG', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: false },
  { id: 'p-mh-com', role_id: 'ROLE_MUAHANG', folder_id: 'FLD-COMMON', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false },

  // ROLE_KINHDOANH: Toàn quyền KINH DOANH, đọc TAI LIEU CHUNG
  { id: 'p-kd-kd', role_id: 'ROLE_KINHDOANH', folder_id: 'FLD-KINHDOANH', can_view: true, can_read: true, can_write: true, can_edit: true, can_delete: false },
  { id: 'p-kd-com', role_id: 'ROLE_KINHDOANH', folder_id: 'FLD-COMMON', can_view: true, can_read: true, can_write: false, can_edit: false, can_delete: false }
];

export const initialEmployeeRoles: EmployeeRole[] = [
  { employee_id: 'EMP-001', role_id: 'ROLE_KETOAN' },
  { employee_id: 'EMP-002', role_id: 'ROLE_NHANSU' },
  { employee_id: 'EMP-003', role_id: 'ROLE_SANXUAT' },
  { employee_id: 'EMP-004', role_id: 'ROLE_QA' },
  { employee_id: 'EMP-005', role_id: 'ROLE_IT' },
  { employee_id: 'EMP-006', role_id: 'ROLE_KETOAN' },
  { employee_id: 'EMP-007', role_id: 'ROLE_SANXUAT' },
  { employee_id: 'EMP-008', role_id: 'ROLE_QA' },
  { employee_id: 'EMP-009', role_id: 'ROLE_QC' },
  { employee_id: 'EMP-010', role_id: 'ROLE_MUAHANG' },
  { employee_id: 'EMP-011', role_id: 'ROLE_KINHDOANH' },
  { employee_id: 'EMP-012', role_id: 'ROLE_SANXUAT' }
];

export const initialUserPermissionOverrides: UserPermissionOverride[] = [
  // Nguyễn Văn A (Kế toán) thuộc bộ phận Kế toán nhưng cần truy cập thư mục QA (chỉ Xem/Đọc)
  { 
    id: 'ov-001', 
    employee_id: 'EMP-001', 
    folder_id: 'FLD-QA', 
    can_view: true, 
    can_read: true, 
    can_write: false, 
    can_edit: false, 
    can_delete: false, 
    notes: 'Yêu cầu kiểm tra hồ sơ chất lượng liên quan đến quyết toán chi phí phòng Lab' 
  }
];

export const initialPermissionLogs: PermissionLog[] = [
  { 
    id: 'log-001', 
    actor_user_id: 'IT Admin B', 
    target_employee_id: 'EMP-001', 
    folder_id: 'FLD-QA', 
    old_permissions: 'None', 
    new_permissions: 'View, Read', 
    reason: 'Cấp quyền phục vụ kiểm toán nội bộ phòng Lab', 
    change_type: 'OverrideAdd', 
    created_at: '2026-08-21T10:30:00Z' 
  }
];

export const initialAssetHistory: AssetHistory[] = [
  {
    id: 'ah-001',
    asset_id: 'PC-001',
    asset_type: 'Computer',
    previous_user_id: undefined,
    new_user_id: 'EMP-001',
    previous_dept_id: undefined,
    new_dept_id: 'KETOAN',
    transfer_date: '2025-01-05',
    actor_user_id: 'IT Admin B',
    notes: 'Bàn giao máy mới mua lắp đặt tại văn phòng phòng Kế toán',
    created_at: '2025-01-05T09:00:00Z'
  }
];
