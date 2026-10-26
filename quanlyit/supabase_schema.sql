-- DDL Schema Setup for IT Asset & Folder Access Management System
-- Run this script in the Supabase SQL Editor.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. DEPARTMENTS
create table departments (
    id text primary key,
    name text not null,
    name_kr text,
    manager_id text, -- foreign key added later to avoid circular dependency
    status text not null default 'Active' check (status in ('Active', 'Inactive')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. POSITIONS
create table positions (
    id text primary key,
    name text not null,
    department_id text references departments(id) on delete cascade,
    rank_level integer not null default 1,
    status text not null default 'Active' check (status in ('Active', 'Inactive')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. EMPLOYEES
create table employees (
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

-- Add manager_id foreign key constraint in departments now that employees exists
alter table departments add constraint fk_dept_manager foreign key (manager_id) references employees(id) on delete set null;

-- 4. WEBAPP USERS & SYSTEM ROLES
-- Note: Links to Supabase auth.users
create table webapp_users (
    id uuid primary key,
    email text not null,
    display_name text,
    role text not null default 'VIEWER' check (role in ('SUPER_ADMIN', 'IT_ADMIN', 'IT_USER', 'VIEWER')),
    status text not null default 'Active' check (status in ('Active', 'Suspended')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. COMPUTERS
create table computers (
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

-- 6. MONITORS
create table monitors (
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

-- 7. IT ASSETS (OTHER DEVICES)
create table it_assets (
    id text primary key, -- e.g. ASSET-001
    asset_type text not null, -- e.g. Laptop, Printer, Switch, Server, NAS
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

-- 8. SHARED FOLDERS (TREE STRUCTURE)
create table shared_folders (
    id text primary key,
    parent_id text references shared_folders(id) on delete cascade,
    name text not null,
    folder_path text not null,
    description text,
    status text not null default 'Active' check (status in ('Active', 'Archived')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. FOLDER ROLES (PERMISSION ROLES)
create table folder_roles (
    id text primary key, -- e.g. ROLE_KETOAN, ROLE_NHANSU
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. ROLE PERMISSIONS
create table role_permissions (
    id uuid default gen_random_uuid() primary key,
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

-- 11. EMPLOYEE ROLES (MANY TO MANY)
create table employee_roles (
    employee_id text references employees(id) on delete cascade,
    role_id text references folder_roles(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (employee_id, role_id)
);

-- 12. USER PERMISSION OVERRIDES (EXCEPTIONS)
create table user_permission_overrides (
    id uuid default gen_random_uuid() primary key,
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

-- 13. PERMISSION LOGS
create table permission_logs (
    id uuid default gen_random_uuid() primary key,
    actor_user_id text not null, -- Who made the change
    target_employee_id text not null, -- Who received the change
    folder_id text not null,
    old_permissions text,
    new_permissions text,
    reason text,
    change_type text not null check (change_type in ('RoleAssign', 'RoleRevoke', 'OverrideAdd', 'OverrideModify', 'OverrideRemove')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. ASSET HISTORY
create table asset_history (
    id uuid default gen_random_uuid() primary key,
    asset_id text not null, -- PC-001, MON-001, etc.
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

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- Enable RLS on all tables
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

-- Helper Function to check current webapp user's role
create or replace function get_my_webapp_role()
returns text as $$
  select role from webapp_users where id = auth.uid();
$$ language sql security definer;

-- Create policies for DEPARTMENTS
create policy dept_select on departments for select using (true);
create policy dept_all on departments for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));

-- Create policies for POSITIONS
create policy pos_select on positions for select using (true);
create policy pos_all on positions for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));

-- Create policies for EMPLOYEES
create policy emp_select on employees for select using (true);
create policy emp_all on employees for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));

-- Create policies for WEBAPP_USERS
create policy users_select on webapp_users for select using (true);
create policy users_admin on webapp_users for all using (get_my_webapp_role() = 'SUPER_ADMIN');
create policy users_self_update on webapp_users for update using (auth.uid() = id);

-- Create policies for COMPUTERS
create policy pc_select on computers for select using (true);
create policy pc_all on computers for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));
create policy pc_it_user_update on computers for update using (get_my_webapp_role() = 'IT_USER') with check (
    -- IT_USER can only update status
    (old.status IS DISTINCT FROM new.status) AND
    (old.id = new.id) AND (old.name = new.name) AND (old.serial = new.serial) AND (old.current_user_id = new.current_user_id)
);

-- Create policies for MONITORS
create policy mon_select on monitors for select using (true);
create policy mon_all on monitors for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));
create policy mon_it_user_update on monitors for update using (get_my_webapp_role() = 'IT_USER') with check (
    (old.status IS DISTINCT FROM new.status) AND
    (old.id = new.id) AND (old.model = new.model) AND (old.serial = new.serial)
);

-- Create policies for IT_ASSETS
create policy asset_select on it_assets for select using (true);
create policy asset_all on it_assets for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));
create policy asset_it_user_update on it_assets for update using (get_my_webapp_role() = 'IT_USER') with check (
    (old.status IS DISTINCT FROM new.status) AND
    (old.id = new.id)
);

-- Create policies for SHARED_FOLDERS
create policy folders_select on shared_folders for select using (true);
create policy folders_all on shared_folders for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));

-- Create policies for FOLDER_ROLES
create policy folder_roles_select on folder_roles for select using (true);
create policy folder_roles_all on folder_roles for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));

-- Create policies for ROLE_PERMISSIONS
create policy role_perm_select on role_permissions for select using (true);
create policy role_perm_all on role_permissions for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));

-- Create policies for EMPLOYEE_ROLES
create policy emp_roles_select on employee_roles for select using (true);
create policy emp_roles_all on employee_roles for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));

-- Create policies for USER_PERMISSION_OVERRIDES
create policy override_select on user_permission_overrides for select using (true);
create policy override_all on user_permission_overrides for all using (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));

-- Create policies for PERMISSION_LOGS
create policy logs_select on permission_logs for select using (true);
create policy logs_insert on permission_logs for insert with check (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));

-- Create policies for ASSET_HISTORY
create policy asset_hist_select on asset_history for select using (true);
create policy asset_hist_insert on asset_history for insert with check (get_my_webapp_role() in ('SUPER_ADMIN', 'IT_ADMIN'));
