-- ============================================================================
-- DDL & SEED SCHEMA: HỆ THỐNG QUẢN LÝ TÀI SẢN IT & PHÂN QUYỀN THƯ MỤC CHIA SẺ
-- Hướng dẫn:
-- 1. Đăng nhập Supabase Dashboard -> Chọn Project -> Chọn 'SQL Editor' (icon >_)
-- 2. Dán toàn bộ script này vào và bấm RUN (hoặc Ctrl + Enter)
-- ============================================================================

-- Bật extension tạo UUID
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 1. PHÒNG BAN (DEPARTMENTS)
create table if not exists departments (
    id text primary key,
    name text not null,
    name_kr text,
    manager_id text, -- liên kết với employees(id) sau khi bảng employees được tạo
    status text not null default 'Active' check (status in ('Active', 'Inactive')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CHỨC VỤ (POSITIONS)
create table if not exists positions (
    id text primary key,
    name text not null,
    department_id text references departments(id) on delete cascade,
    rank_level integer not null default 1,
    status text not null default 'Active' check (status in ('Active', 'Inactive')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. NHÂN VIÊN (EMPLOYEES)
create table if not exists employees (
    id text primary key,
    name text not null,
    name_kr text,
    department_id text references departments(id) on delete set null,
    position_id text references positions(id) on delete set null,
    email text,
    win_account text,
    phone text,
    join_date date,
    status text not null default 'Active' check (status in ('Active', 'Resigned', 'Leave', 'Transfer')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ràng buộc trưởng phòng (manager_id) trong departments
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'fk_dept_manager'
    ) then
        alter table departments add constraint fk_dept_manager foreign key (manager_id) references employees(id) on delete set null;
    end if;
end $$;

-- 4. NGƯỜI DÙNG WEBAPP & VAI TRÒ HỆ THỐNG (WEBAPP USERS)
create table if not exists webapp_users (
    id text primary key,
    email text not null,
    display_name text,
    role text not null default 'VIEWER' check (role in ('SUPER_ADMIN', 'IT_ADMIN', 'IT_USER', 'VIEWER')),
    status text not null default 'Active' check (status in ('Active', 'Suspended')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. MÁY TÍNH (COMPUTERS)
create table if not exists computers (
    id text primary key, -- e.g. PC-001
    name text not null,
    serial text,
    current_user_id text references employees(id) on delete set null,
    department_id text references departments(id) on delete set null,
    ip_address text,
    mac_address text,
    cpu text,
    mainboard text,
    ram text,
    storage text,
    vga text,
    os text,
    office text,
    purchase_date date,
    assignment_date date,
    warranty_months integer default 24,
    status text not null default 'Spare' check (status in ('Active', 'Spare', 'Repair', 'Broken', 'Disposed')),
    location text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. MÀN HÌNH (MONITORS)
create table if not exists monitors (
    id text primary key, -- e.g. MON-001
    model text not null,
    serial text,
    size_inches text,
    resolution text,
    current_user_id text references employees(id) on delete set null,
    connected_computer_id text references computers(id) on delete set null,
    location text,
    purchase_date date,
    warranty_months integer default 24,
    status text not null default 'Spare' check (status in ('Active', 'Spare', 'Repair', 'Broken', 'Disposed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. THIẾT BỊ IT KHÁC (IT ASSETS)
create table if not exists it_assets (
    id text primary key, -- e.g. ASSET-001
    asset_type text not null, -- Laptop, Printer, Switch, Server, NAS
    model text not null,
    serial text,
    current_user_id text references employees(id) on delete set null,
    department_id text references departments(id) on delete set null,
    location text,
    ip_address text,
    purchase_date date,
    warranty_months integer default 24,
    status text not null default 'Spare' check (status in ('Active', 'Spare', 'Repair', 'Broken', 'Disposed')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. THƯ MỤC CHIA SẺ (SHARED FOLDERS - CẤU TRÚC CÂY)
create table if not exists shared_folders (
    id text primary key,
    parent_id text references shared_folders(id) on delete cascade,
    name text not null,
    folder_path text not null,
    description text,
    status text not null default 'Active' check (status in ('Active', 'Archived')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. NHÓM QUYỀN THƯ MỤC (FOLDER ROLES)
create table if not exists folder_roles (
    id text primary key, -- e.g. ROLE_KETOAN, ROLE_NHANSU
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. QUYỀN THEO NHÓM (ROLE PERMISSIONS)
create table if not exists role_permissions (
    id text default gen_random_uuid()::text primary key,
    role_id text references folder_roles(id) on delete cascade,
    folder_id text references shared_folders(id) on delete cascade,
    can_view boolean not null default false,
    can_read boolean not null default false,
    can_write boolean not null default false,
    can_edit boolean not null default false,
    can_delete boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(role_id, folder_id)
);

-- 11. GÁN NHÓM QUYỀN CHO NHÂN VIÊN (EMPLOYEE ROLES)
create table if not exists employee_roles (
    employee_id text references employees(id) on delete cascade,
    role_id text references folder_roles(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (employee_id, role_id)
);

-- 12. NGOẠI LỆ PHÂN QUYỀN CỦA NHÂN VIÊN (USER PERMISSION OVERRIDES)
create table if not exists user_permission_overrides (
    id text default gen_random_uuid()::text primary key,
    employee_id text references employees(id) on delete cascade,
    folder_id text references shared_folders(id) on delete cascade,
    can_view boolean not null default false,
    can_read boolean not null default false,
    can_write boolean not null default false,
    can_edit boolean not null default false,
    can_delete boolean not null default false,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(employee_id, folder_id)
);

-- 13. LỊCH SỬ THAY ĐỔI QUYỀN (PERMISSION LOGS)
create table if not exists permission_logs (
    id text default gen_random_uuid()::text primary key,
    actor_user_id text not null,
    target_employee_id text not null,
    folder_id text not null,
    old_permissions text,
    new_permissions text,
    reason text,
    change_type text not null check (change_type in ('RoleAssign', 'RoleRevoke', 'OverrideAdd', 'OverrideModify', 'OverrideRemove')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. LỊCH SỬ ĐIỀU CHUYỂN TÀI SẢN (ASSET HISTORY)
create table if not exists asset_history (
    id text default gen_random_uuid()::text primary key,
    asset_id text not null,
    asset_type text not null check (asset_type in ('Computer', 'Monitor', 'ITAsset')),
    previous_user_id text references employees(id) on delete set null,
    new_user_id text references employees(id) on delete set null,
    previous_dept_id text references departments(id) on delete set null,
    new_dept_id text references departments(id) on delete set null,
    transfer_date date not null default current_date,
    actor_user_id text not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- CẤU HÌNH BẢO MẬT ROW LEVEL SECURITY (RLS)
-- Cho phép ứng dụng thao tác dữ liệu qua Supabase Client
-- ============================================================================

alter table departments enable row level security;
alter table positions enable row level security;
alter table employees enable row level security;
alter table webapp_users enable row level security;
alter table computers enable row level security;
alter table monitors enable row level security;
alter table it_assets enable row level security;
alter table shared_folders enable row level security;
alter table folder_roles enable row level security;
alter table role_permissions enable row level security;
alter table employee_roles enable row level security;
alter table user_permission_overrides enable row level security;
alter table permission_logs enable row level security;
alter table asset_history enable row level security;

-- Xóa policies cũ nếu đã tồn tại để tránh xung đột
drop policy if exists "allow_all_departments" on departments;
create policy "allow_all_departments" on departments for all using (true) with check (true);

drop policy if exists "allow_all_positions" on positions;
create policy "allow_all_positions" on positions for all using (true) with check (true);

drop policy if exists "allow_all_employees" on employees;
create policy "allow_all_employees" on employees for all using (true) with check (true);

drop policy if exists "allow_all_webapp_users" on webapp_users;
create policy "allow_all_webapp_users" on webapp_users for all using (true) with check (true);

drop policy if exists "allow_all_computers" on computers;
create policy "allow_all_computers" on computers for all using (true) with check (true);

drop policy if exists "allow_all_monitors" on monitors;
create policy "allow_all_monitors" on monitors for all using (true) with check (true);

drop policy if exists "allow_all_it_assets" on it_assets;
create policy "allow_all_it_assets" on it_assets for all using (true) with check (true);

drop policy if exists "allow_all_shared_folders" on shared_folders;
create policy "allow_all_shared_folders" on shared_folders for all using (true) with check (true);

drop policy if exists "allow_all_folder_roles" on folder_roles;
create policy "allow_all_folder_roles" on folder_roles for all using (true) with check (true);

drop policy if exists "allow_all_role_permissions" on role_permissions;
create policy "allow_all_role_permissions" on role_permissions for all using (true) with check (true);

drop policy if exists "allow_all_employee_roles" on employee_roles;
create policy "allow_all_employee_roles" on employee_roles for all using (true) with check (true);

drop policy if exists "allow_all_user_permission_overrides" on user_permission_overrides;
create policy "allow_all_user_permission_overrides" on user_permission_overrides for all using (true) with check (true);

drop policy if exists "allow_all_permission_logs" on permission_logs;
create policy "allow_all_permission_logs" on permission_logs for all using (true) with check (true);

drop policy if exists "allow_all_asset_history" on asset_history;
create policy "allow_all_asset_history" on asset_history for all using (true) with check (true);

-- BẬT REALTIME CHO TẤT CẢ CÁC BẢNG (đồng bộ tức thì)
do $$
begin
  alter publication supabase_realtime add table 
    departments, positions, employees, webapp_users, 
    computers, monitors, it_assets, shared_folders, 
    folder_roles, role_permissions, employee_roles, 
    user_permission_overrides, permission_logs, asset_history;
exception when others then null;
end $$;

-- ============================================================================
-- DỮ LIỆU KHỞI TẠO MẪU (SEED DATA - AN TOÀN KHI CHẠY NHIỀU LẦN)
-- ============================================================================

-- Webapp Users
insert into webapp_users (id, email, display_name, role, status) values
  ('user-admin-1', 'superadmin@company.com', 'Hệ thống Admin', 'SUPER_ADMIN', 'Active'),
  ('user-admin-2', 'itadmin@company.com', 'IT Admin B', 'IT_ADMIN', 'Active'),
  ('user-user-1', 'ituser@company.com', 'IT Kỹ thuật viên', 'IT_USER', 'Active'),
  ('user-view-1', 'viewer@company.com', 'Người xem', 'VIEWER', 'Active')
on conflict (id) do nothing;

-- Departments
insert into departments (id, name, name_kr, status, notes) values
  ('IT', 'IT Department', 'IT부서', 'Active', 'Quản trị hệ thống IT'),
  ('KETOAN', 'Kế toán', '회계팀', 'Active', 'Tài chính kế toán công ty'),
  ('NHANSU', 'Nhân sự', '인사팀', 'Active', 'Tuyển dụng, hành chính, lương'),
  ('SANXUAT', 'Sản xuất', '생산팀', 'Active', 'Bộ phận xưởng sản xuất trực tiếp'),
  ('QA', 'QA', 'QA팀', 'Active', 'Quality Assurance - Đảm bảo chất lượng'),
  ('QC', 'QC', 'QC팀', 'Active', 'Quality Control - Kiểm soát chất lượng'),
  ('MUAHANG', 'Mua hàng', '구매팀', 'Active', 'Thu mua vật tư thiết bị'),
  ('KINHDOANH', 'Kinh doanh', '영업팀', 'Active', 'Kinh doanh và Marketing')
on conflict (id) do nothing;

-- Positions
insert into positions (id, name, department_id, rank_level, status) values
  ('IT-TRUONGPHONG', 'Trưởng phòng IT', 'IT', 2, 'Active'),
  ('IT-NHANVIEN', 'Nhân viên IT', 'IT', 4, 'Active'),
  ('KT-TRUONGPHONG', 'Trưởng phòng Kế toán', 'KETOAN', 2, 'Active'),
  ('KT-NHANVIEN', 'Nhân viên Kế toán', 'KETOAN', 4, 'Active'),
  ('NS-TRUONGPHONG', 'Trưởng phòng Nhân sự', 'NHANSU', 2, 'Active'),
  ('NS-NHANVIEN', 'Nhân viên Nhân sự', 'NHANSU', 4, 'Active'),
  ('SX-TRUONGPHONG', 'Trưởng phòng Sản xuất', 'SANXUAT', 2, 'Active'),
  ('SX-NHANVIEN', 'Nhân viên Sản xuất', 'SANXUAT', 4, 'Active'),
  ('QA-TRUONGPHONG', 'Trưởng phòng QA', 'QA', 2, 'Active'),
  ('QA-NHANVIEN', 'Nhân viên QA', 'QA', 4, 'Active'),
  ('QC-TRUONGPHONG', 'Trưởng phòng QC', 'QC', 2, 'Active'),
  ('QC-NHANVIEN', 'Nhân viên QC', 'QC', 4, 'Active'),
  ('MH-TRUONGPHONG', 'Trưởng phòng Mua hàng', 'MUAHANG', 2, 'Active'),
  ('KD-TRUONGPHONG', 'Trưởng phòng Kinh doanh', 'KINHDOANH', 2, 'Active')
on conflict (id) do nothing;

-- Employees
insert into employees (id, name, name_kr, department_id, position_id, email, win_account, phone, join_date, status) values
  ('EMP-001', 'Nguyễn Văn A', '원반아', 'KETOAN', 'KT-NHANVIEN', 'vana@company.com', 'ketoan.ana', '0987111222', '2025-01-01', 'Active'),
  ('EMP-002', 'Nguyễn Văn B', '원반비', 'NHANSU', 'NS-TRUONGPHONG', 'vanb@company.com', 'hr.vanb', '0987333444', '2024-03-15', 'Active'),
  ('EMP-003', 'Nguyễn Văn C', '원반시', 'SANXUAT', 'SX-NHANVIEN', 'vanc@company.com', 'sx.vanc', '0987555666', '2025-05-10', 'Active'),
  ('EMP-004', 'Nguyễn Văn D', '원반디', 'QA', 'QA-NHANVIEN', 'vand@company.com', 'qa.vand', '0987777888', '2024-08-20', 'Active'),
  ('EMP-005', 'Nguyễn Văn E', '원반이', 'IT', 'IT-NHANVIEN', 'vane@company.com', 'it.vane', '0987999000', '2023-11-01', 'Active'),
  ('EMP-006', 'Lê Thị C', '이티시', 'KETOAN', 'KT-TRUONGPHONG', 'thic@company.com', 'ketoan.thic', '0912111222', '2022-06-01', 'Active'),
  ('EMP-007', 'Trần Văn Hùng', '진반웅', 'SANXUAT', 'SX-TRUONGPHONG', 'hung.tv@company.com', 'sx.hungtv', '0912333444', '2021-02-15', 'Active'),
  ('EMP-008', 'Park Sung Ho', '박성호', 'QA', 'QA-TRUONGPHONG', 'park@company.com', 'qa.parksh', '0912555666', '2023-01-10', 'Active'),
  ('EMP-009', 'Kim Tae Heon', '김태헌', 'QC', 'QC-TRUONGPHONG', 'kimth@company.com', 'qc.kimth', '0912777888', '2023-08-01', 'Active'),
  ('EMP-010', 'Nguyễn Văn Mua', '원반무아', 'MUAHANG', 'MH-TRUONGPHONG', 'muanv@company.com', 'purchasing.muanv', '0912999000', '2024-04-01', 'Active'),
  ('EMP-011', 'Hwang Ji Min', '황지민', 'KINHDOANH', 'KD-TRUONGPHONG', 'hwang@company.com', 'sales.hwangjm', '0909111222', '2024-10-15', 'Active'),
  ('EMP-012', 'Trần Văn B', '진반비', 'SANXUAT', 'SX-NHANVIEN', 'vanb.tran@company.com', 'sx.vanbt', '0909333444', '2025-02-01', 'Active')
on conflict (id) do nothing;

-- Cập nhật manager_id cho các phòng ban
update departments set manager_id = 'EMP-005' where id = 'IT';
update departments set manager_id = 'EMP-006' where id = 'KETOAN';
update departments set manager_id = 'EMP-002' where id = 'NHANSU';
update departments set manager_id = 'EMP-007' where id = 'SANXUAT';
update departments set manager_id = 'EMP-008' where id = 'QA';
update departments set manager_id = 'EMP-009' where id = 'QC';
update departments set manager_id = 'EMP-010' where id = 'MUAHANG';
update departments set manager_id = 'EMP-011' where id = 'KINHDOANH';

-- Computers
insert into computers (id, name, serial, current_user_id, department_id, ip_address, mac_address, cpu, mainboard, ram, storage, vga, os, office, purchase_date, assignment_date, warranty_months, status, location, notes) values
  ('PC-001', 'DESKTOP-KT01', 'SNDK12938481', 'EMP-001', 'KETOAN', '192.168.1.50', '00:1A:2B:3C:4D:5E', 'Intel Core i5-12400', 'ASUS Prime B660M', '16GB DDR4 3200MHz', 'SSD 512GB NVMe', 'Intel UHD Graphics 730', 'Windows 11 Pro', 'Office 2021 LTSC', '2025-01-02', '2025-01-05', 24, 'Active', 'Văn phòng tầng 2 - Phòng Kế Toán', 'Máy kế toán tổng hợp'),
  ('PC-002', 'DESKTOP-NS01', 'SNDK12938482', 'EMP-002', 'NHANSU', '192.168.1.60', '00:1A:2B:3C:4D:5F', 'Intel Core i5-11400', 'Gigabyte H510M', '8GB DDR4', 'SSD 256GB', 'Integrated Graphics', 'Windows 10 Pro', 'Office 2019 Home & Business', '2024-03-10', '2024-03-15', 24, 'Active', 'Văn phòng tầng 1 - Phòng Nhân sự', 'Máy dùng tuyển dụng'),
  ('PC-003', 'DESKTOP-SX01', 'SNDK12938483', 'EMP-003', 'SANXUAT', '192.168.2.11', '00:1A:2B:3C:4D:60', 'Intel Core i3-12100', 'MSI PRO H610M-E', '8GB DDR4', 'SSD 256GB', 'Integrated', 'Windows 10 Pro', 'Office 2016 Standard', '2025-05-08', '2025-05-10', 24, 'Active', 'Xưởng sản xuất A', 'Máy ghi chép báo cáo sản lượng'),
  ('PC-004', 'DESKTOP-QA01', 'SNDK12938484', 'EMP-004', 'QA', '192.168.1.70', '00:1A:2B:3C:4D:61', 'Intel Core i5-12400', 'ASUS Prime B660M', '16GB DDR4', 'SSD 512GB', 'Intel UHD', 'Windows 11 Pro', 'Office 2021 LTSC', '2024-08-15', '2024-08-20', 24, 'Active', 'Phòng Lab QA', 'Máy quản lý ISO và hồ sơ chất lượng'),
  ('PC-005', 'DESKTOP-IT01', 'SNDK12938485', 'EMP-005', 'IT', '192.168.10.15', '00:1A:2B:3C:4D:62', 'Intel Core i7-13700', 'ASUS ROG STRIX B760-G', '32GB DDR5 5600MHz', 'SSD 1TB NVMe Gen4', 'NVIDIA RTX 3060 12GB', 'Windows 11 Pro', 'Office 365 Pro', '2023-10-25', '2023-11-01', 36, 'Active', 'Phòng IT tầng 3', 'Máy làm việc của IT Admin'),
  ('PC-006', 'DESKTOP-SPARE1', 'SNDK12938486', null, null, null, '00:1A:2B:3C:4D:63', 'Intel Core i3-10100', 'Gigabyte H410M', '8GB DDR4', 'SSD 120GB + HDD 500GB', 'Integrated', 'Windows 10 Pro', 'None', '2022-05-15', null, 24, 'Spare', 'Kho IT tầng 3', 'Máy tính dự phòng cấp cho nhân viên mới')
on conflict (id) do nothing;

-- Monitors
insert into monitors (id, model, serial, size_inches, resolution, current_user_id, connected_computer_id, location, purchase_date, warranty_months, status) values
  ('MON-001', 'Dell UltraSharp U2422H', 'CN0A12349081', '24', '1920x1080 FHD', 'EMP-001', 'PC-001', 'Phòng Kế Toán', '2025-01-02', 36, 'Active'),
  ('MON-002', 'Dell SE2422H', 'CN0B12349082', '24', '1920x1080 FHD', 'EMP-001', 'PC-001', 'Phòng Kế Toán', '2025-01-02', 24, 'Active'),
  ('MON-003', 'HP M27fw', 'CN0C12349083', '27', '1920x1080 FHD', 'EMP-002', 'PC-002', 'Phòng Nhân sự', '2024-03-10', 24, 'Active'),
  ('MON-004', 'Samsung Essential S3 S31C', 'CN0D12349084', '24', '1920x1080 FHD', 'EMP-003', 'PC-003', 'Xưởng sản xuất A', '2025-05-08', 24, 'Active'),
  ('MON-005', 'LG 27UP600-W', 'CN0E12349085', '27', '3840x2160 4K', 'EMP-004', 'PC-004', 'Phòng Lab QA', '2024-08-15', 24, 'Active'),
  ('MON-006', 'Asus ProArt PA278QV', 'CN0F12349086', '27', '2560x1440 2K', 'EMP-005', 'PC-005', 'Phòng IT', '2023-10-25', 36, 'Active')
on conflict (id) do nothing;

-- Shared Folders
insert into shared_folders (id, parent_id, name, folder_path, description, status) values
  ('FLD-ROOT', null, 'D:\SHARE', '\\SERVER01\SHARE', 'Thư mục gốc máy chủ chia sẻ tệp công ty', 'Active'),
  ('FLD-KETOAN', 'FLD-ROOT', '01_KETOAN', '\\SERVER01\SHARE\01_KETOAN', 'Dữ liệu sổ sách và chứng từ kế toán', 'Active'),
  ('FLD-NHANSU', 'FLD-ROOT', '02_NHANSU', '\\SERVER01\SHARE\02_NHANSU', 'Hồ sơ nhân viên, BHXH và hợp đồng lao động', 'Active'),
  ('FLD-IT', 'FLD-ROOT', '03_IT_DEPT', '\\SERVER01\SHARE\03_IT_DEPT', 'Tài liệu hạ tầng mạng, cấu hình và phần mềm bản quyền', 'Active'),
  ('FLD-SANXUAT', 'FLD-ROOT', '04_SANXUAT', '\\SERVER01\SHARE\04_SANXUAT', 'Kế hoạch sản xuất, định mức vật tư và báo cáo ca', 'Active'),
  ('FLD-CONGKHAI', 'FLD-ROOT', '05_PUBLIC_SHARE', '\\SERVER01\SHARE\05_PUBLIC_SHARE', 'Tài liệu nội bộ chung cho toàn bộ nhân viên', 'Active')
on conflict (id) do nothing;

-- Folder Roles
insert into folder_roles (id, name, description) values
  ('ROLE_KETOAN', 'Nhóm Kế Toán', 'Quyền truy cập phòng kế toán'),
  ('ROLE_NHANSU', 'Nhóm Nhân Sự', 'Quyền truy cập phòng nhân sự'),
  ('ROLE_IT', 'Nhóm Quản Trị IT', 'Toàn quyền thư mục IT và hạ tầng'),
  ('ROLE_SANXUAT', 'Nhóm Sản Xuất', 'Quyền xem và cập nhật tài liệu sản xuất'),
  ('ROLE_ALL_STAFF', 'Tất Cả Nhân Viên', 'Quyền cơ bản đọc tài liệu công khai')
on conflict (id) do nothing;
