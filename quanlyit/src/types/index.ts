// TypeScript Interfaces for the IT Asset & Folder Access Management System

export type WebappRole = 'SUPER_ADMIN' | 'IT_ADMIN' | 'IT_USER' | 'VIEWER';

export interface WebappUser {
  id: string;
  email: string;
  display_name: string;
  role: WebappRole;
  status: 'Active' | 'Suspended';
}

export interface Department {
  id: string;
  name: string;
  name_kr?: string;
  manager_id?: string; // Employee ID
  status: 'Active' | 'Inactive';
  notes?: string;
}

export interface Position {
  id: string;
  name: string;
  department_id: string;
  rank_level: number;
  status: 'Active' | 'Inactive';
}

export interface Employee {
  id: string;
  name: string;
  name_kr?: string;
  department_id: string;
  position_id: string;
  email?: string;
  win_account?: string;
  phone?: string;
  join_date: string;
  status: 'Active' | 'Resigned' | 'Leave' | 'Transfer';
}

export interface Computer {
  id: string; // e.g. PC-001
  name: string;
  serial?: string;
  current_user_id?: string; // Employee ID
  department_id?: string; // Department ID
  ip_address?: string;
  mac_address?: string;
  cpu?: string;
  mainboard?: string;
  ram?: string;
  storage?: string;
  vga?: string;
  os?: string;
  office?: string;
  purchase_date?: string;
  assignment_date?: string;
  warranty_months: number;
  status: 'Active' | 'Spare' | 'Repair' | 'Broken' | 'Disposed';
  location?: string;
  notes?: string;
}

export interface Monitor {
  id: string; // e.g. MON-001
  model: string;
  serial?: string;
  size_inches?: string;
  resolution?: string;
  current_user_id?: string; // Employee ID
  connected_computer_id?: string; // Computer ID
  location?: string;
  purchase_date?: string;
  warranty_months: number;
  status: 'Active' | 'Spare' | 'Repair' | 'Broken' | 'Disposed';
}

export interface ITAsset {
  id: string; // e.g. EXP-001
  asset_type: string; // Laptop, Printer, Switch, Server, etc.
  model: string;
  serial?: string;
  current_user_id?: string; // Employee ID
  department_id?: string; // Department ID
  location?: string;
  ip_address?: string;
  purchase_date?: string;
  warranty_months: number;
  status: 'Active' | 'Spare' | 'Repair' | 'Broken' | 'Disposed';
  notes?: string;
}

export interface SharedFolder {
  id: string;
  parent_id?: string; // SharedFolder ID
  name: string;
  folder_path: string;
  description?: string;
  status: 'Active' | 'Archived';
}

export interface FolderRole {
  id: string; // e.g. ROLE_KETOAN
  name: string;
  description?: string;
}

export interface FolderPermission {
  id: string;
  role_id: string; // FolderRole ID
  folder_id: string; // SharedFolder ID
  can_view: boolean;
  can_read: boolean;
  can_write: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface EmployeeRole {
  employee_id: string;
  role_id: string; // FolderRole ID
}

export interface UserPermissionOverride {
  id: string;
  employee_id: string;
  folder_id: string;
  can_view: boolean;
  can_read: boolean;
  can_write: boolean;
  can_edit: boolean;
  can_delete: boolean;
  notes?: string;
}

export interface PermissionLog {
  id: string;
  actor_user_id: string; // WebappUser name/email/id
  target_employee_id: string; // Employee ID
  folder_id: string;
  old_permissions: string;
  new_permissions: string;
  reason?: string;
  change_type: 'RoleAssign' | 'RoleRevoke' | 'OverrideAdd' | 'OverrideModify' | 'OverrideRemove';
  created_at: string;
}

export interface AssetHistory {
  id: string;
  asset_id: string;
  asset_type: 'Computer' | 'Monitor' | 'ITAsset';
  previous_user_id?: string;
  new_user_id?: string;
  previous_dept_id?: string;
  new_dept_id?: string;
  transfer_date: string;
  actor_user_id: string;
  notes?: string;
  created_at: string;
}
