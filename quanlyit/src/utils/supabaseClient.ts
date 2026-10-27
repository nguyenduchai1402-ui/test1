import { createClient } from '@supabase/supabase-js';
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
  AssetHistory,
  WebappRole
} from '../types';

import {
  initialDepartments,
  initialPositions,
  initialEmployees,
  initialWebappUsers,
  initialComputers,
  initialMonitors,
  initialITAssets,
  initialSharedFolders,
  initialFolderRoles,
  initialRolePermissions,
  initialEmployeeRoles,
  initialUserPermissionOverrides,
  initialPermissionLogs,
  initialAssetHistory
} from './mockData';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

const cleanUrl = supabaseUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
export const supabase = isSupabaseConfigured 
  ? createClient(cleanUrl, supabaseAnonKey.trim()) 
  : null;

// --- LOCAL STORAGE REPOSITORY (MOCK DATABASE ENGINE) ---
const getStorageItem = <T>(key: string, initialData: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initialData));
    return initialData;
  }
  try {
    return JSON.parse(data) as T;
  } catch {
    return initialData;
  }
};

const setStorageItem = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Keys
const KEYS = {
  DEPARTMENTS: 'it_departments',
  POSITIONS: 'it_positions',
  EMPLOYEES: 'it_employees',
  WEBAPP_USERS: 'it_webapp_users',
  COMPUTERS: 'it_computers',
  MONITORS: 'it_monitors',
  IT_ASSETS: 'it_assets',
  SHARED_FOLDERS: 'it_shared_folders',
  FOLDER_ROLES: 'it_folder_roles',
  ROLE_PERMISSIONS: 'it_role_permissions',
  EMPLOYEE_ROLES: 'it_employee_roles',
  OVERRIDES: 'it_user_permission_overrides',
  PERMISSION_LOGS: 'it_permission_logs',
  ASSET_HISTORY: 'it_asset_history',
  CURRENT_WEBAPP_USER: 'it_current_webapp_user'
};

// Repository API
export const db = {
  // Webapp User Simulation
  getCurrentWebappUser: (): WebappUser => {
    const defaultUser = initialWebappUsers[0]; // SUPER_ADMIN by default for easy local testing
    return getStorageItem<WebappUser>(KEYS.CURRENT_WEBAPP_USER, defaultUser);
  },
  setCurrentWebappUser: (user: WebappUser): void => {
    setStorageItem(KEYS.CURRENT_WEBAPP_USER, user);
    window.dispatchEvent(new Event('webapp_user_changed'));
  },
  getWebappUsers: async (): Promise<WebappUser[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('webapp_users').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<WebappUser[]>(KEYS.WEBAPP_USERS, initialWebappUsers);
  },
  saveWebappUser: async (user: WebappUser): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('webapp_users').upsert(user);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<WebappUser[]>(KEYS.WEBAPP_USERS, initialWebappUsers);
    const index = list.findIndex(u => u.id === user.id);
    if (index >= 0) list[index] = user;
    else list.push(user);
    setStorageItem(KEYS.WEBAPP_USERS, list);
  },

  // Departments
  getDepartments: async (): Promise<Department[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('departments').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<Department[]>(KEYS.DEPARTMENTS, initialDepartments);
  },
  saveDepartment: async (dept: Department): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('departments').upsert(dept);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Department[]>(KEYS.DEPARTMENTS, initialDepartments);
    const index = list.findIndex(d => d.id === dept.id);
    if (index >= 0) list[index] = dept;
    else list.push(dept);
    setStorageItem(KEYS.DEPARTMENTS, list);
  },
  deleteDepartment: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Department[]>(KEYS.DEPARTMENTS, initialDepartments);
    setStorageItem(KEYS.DEPARTMENTS, list.filter(d => d.id !== id));
  },

  // Positions
  getPositions: async (): Promise<Position[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('positions').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<Position[]>(KEYS.POSITIONS, initialPositions);
  },
  savePosition: async (pos: Position): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('positions').upsert(pos);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Position[]>(KEYS.POSITIONS, initialPositions);
    const index = list.findIndex(p => p.id === pos.id);
    if (index >= 0) list[index] = pos;
    else list.push(pos);
    setStorageItem(KEYS.POSITIONS, list);
  },
  deletePosition: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('positions').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Position[]>(KEYS.POSITIONS, initialPositions);
    setStorageItem(KEYS.POSITIONS, list.filter(p => p.id !== id));
  },

  // Employees
  getEmployees: async (): Promise<Employee[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('employees').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
  },
  saveEmployee: async (emp: Employee): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('employees').upsert(emp);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
    const index = list.findIndex(e => e.id === emp.id);
    const oldEmp = list.find(e => e.id === emp.id);
    
    if (index >= 0) {
      list[index] = emp;
    } else {
      list.push(emp);
    }
    setStorageItem(KEYS.EMPLOYEES, list);

    // If department has changed, register permission logs or change events as needed
    if (oldEmp && oldEmp.department_id !== emp.department_id) {
      // Create transfer log
      const actor = db.getCurrentWebappUser();
      const folderRoleMap: Record<string, string> = {
        'IT': 'ROLE_IT',
        'KETOAN': 'ROLE_KETOAN',
        'NHANSU': 'ROLE_NHANSU',
        'SANXUAT': 'ROLE_SANXUAT',
        'QA': 'ROLE_QA',
        'QC': 'ROLE_QC',
        'MUAHANG': 'ROLE_MUAHANG',
        'KINHDOANH': 'ROLE_KINHDOANH'
      };

      const oldRole = folderRoleMap[oldEmp.department_id] || '';
      const newRole = folderRoleMap[emp.department_id] || '';

      if (oldRole) {
        await db.removeEmployeeRole(emp.id, oldRole);
        await db.addPermissionLog({
          id: Math.random().toString(36).substr(2, 9),
          actor_user_id: actor.display_name,
          target_employee_id: emp.id,
          folder_id: 'ALL',
          old_permissions: oldRole,
          new_permissions: 'None',
          reason: `Chuyển bộ phận từ ${oldEmp.department_id} sang ${emp.department_id}`,
          change_type: 'RoleRevoke',
          created_at: new Date().toISOString()
        });
      }
      if (newRole) {
        await db.addEmployeeRole(emp.id, newRole);
        await db.addPermissionLog({
          id: Math.random().toString(36).substr(2, 9),
          actor_user_id: actor.display_name,
          target_employee_id: emp.id,
          folder_id: 'ALL',
          old_permissions: 'None',
          new_permissions: newRole,
          reason: `Chuyển bộ phận từ ${oldEmp.department_id} sang ${emp.department_id}`,
          change_type: 'RoleAssign',
          created_at: new Date().toISOString()
        });
      }
    }
  },
  deleteEmployee: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
    setStorageItem(KEYS.EMPLOYEES, list.filter(e => e.id !== id));
  },

  // Computers
  getComputers: async (): Promise<Computer[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('computers').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<Computer[]>(KEYS.COMPUTERS, initialComputers);
  },
  saveComputer: async (pc: Computer): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('computers').upsert(pc);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Computer[]>(KEYS.COMPUTERS, initialComputers);
    const index = list.findIndex(c => c.id === pc.id);
    const oldPc = list.find(c => c.id === pc.id);

    if (index >= 0) list[index] = pc;
    else list.push(pc);
    setStorageItem(KEYS.COMPUTERS, list);

    // Track Assignment History if user changed
    if (pc.current_user_id !== (oldPc ? oldPc.current_user_id : undefined)) {
      const actor = db.getCurrentWebappUser();
      
      // Load employees to check departments
      const employees = getStorageItem<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
      const oldUser = employees.find(e => e.id === oldPc?.current_user_id);
      const newUser = employees.find(e => e.id === pc.current_user_id);

      await db.addAssetHistory({
        id: Math.random().toString(36).substr(2, 9),
        asset_id: pc.id,
        asset_type: 'Computer',
        previous_user_id: oldPc?.current_user_id,
        new_user_id: pc.current_user_id,
        previous_dept_id: oldUser?.department_id,
        new_dept_id: newUser?.department_id || pc.department_id,
        transfer_date: new Date().toISOString().split('T')[0],
        actor_user_id: actor.display_name,
        notes: pc.current_user_id ? `Bàn giao máy tính ${pc.id}` : `Thu hồi máy tính ${pc.id} về kho`,
        created_at: new Date().toISOString()
      });
    }
  },
  deleteComputer: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('computers').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Computer[]>(KEYS.COMPUTERS, initialComputers);
    setStorageItem(KEYS.COMPUTERS, list.filter(c => c.id !== id));
  },

  // Monitors
  getMonitors: async (): Promise<Monitor[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('monitors').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<Monitor[]>(KEYS.MONITORS, initialMonitors);
  },
  saveMonitor: async (mon: Monitor): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('monitors').upsert(mon);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Monitor[]>(KEYS.MONITORS, initialMonitors);
    const index = list.findIndex(m => m.id === mon.id);
    const oldMon = list.find(m => m.id === mon.id);

    if (index >= 0) list[index] = mon;
    else list.push(mon);
    setStorageItem(KEYS.MONITORS, list);

    // Track Monitor Assignment History
    if (mon.current_user_id !== (oldMon ? oldMon.current_user_id : undefined)) {
      const actor = db.getCurrentWebappUser();
      const employees = getStorageItem<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
      const oldUser = employees.find(e => e.id === oldMon?.current_user_id);
      const newUser = employees.find(e => e.id === mon.current_user_id);

      await db.addAssetHistory({
        id: Math.random().toString(36).substr(2, 9),
        asset_id: mon.id,
        asset_type: 'Monitor',
        previous_user_id: oldMon?.current_user_id,
        new_user_id: mon.current_user_id,
        previous_dept_id: oldUser?.department_id,
        new_dept_id: newUser?.department_id,
        transfer_date: new Date().toISOString().split('T')[0],
        actor_user_id: actor.display_name,
        notes: mon.current_user_id ? `Bàn giao màn hình ${mon.id}` : `Thu hồi màn hình ${mon.id} về kho`,
        created_at: new Date().toISOString()
      });
    }
  },
  deleteMonitor: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('monitors').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<Monitor[]>(KEYS.MONITORS, initialMonitors);
    setStorageItem(KEYS.MONITORS, list.filter(m => m.id !== id));
  },

  // IT Assets
  getITAssets: async (): Promise<ITAsset[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('it_assets').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<ITAsset[]>(KEYS.IT_ASSETS, initialITAssets);
  },
  saveITAsset: async (asset: ITAsset): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('it_assets').upsert(asset);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<ITAsset[]>(KEYS.IT_ASSETS, initialITAssets);
    const index = list.findIndex(a => a.id === asset.id);
    const oldAsset = list.find(a => a.id === asset.id);

    if (index >= 0) list[index] = asset;
    else list.push(asset);
    setStorageItem(KEYS.IT_ASSETS, list);

    // Track Assignment
    if (asset.current_user_id !== (oldAsset ? oldAsset.current_user_id : undefined)) {
      const actor = db.getCurrentWebappUser();
      const employees = getStorageItem<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
      const oldUser = employees.find(e => e.id === oldAsset?.current_user_id);
      const newUser = employees.find(e => e.id === asset.current_user_id);

      await db.addAssetHistory({
        id: Math.random().toString(36).substr(2, 9),
        asset_id: asset.id,
        asset_type: 'ITAsset',
        previous_user_id: oldAsset?.current_user_id,
        new_user_id: asset.current_user_id,
        previous_dept_id: oldUser?.department_id,
        new_dept_id: newUser?.department_id || asset.department_id,
        transfer_date: new Date().toISOString().split('T')[0],
        actor_user_id: actor.display_name,
        notes: asset.current_user_id ? `Bàn giao thiết bị ${asset.id} (${asset.asset_type})` : `Thu hồi thiết bị ${asset.id} về kho`,
        created_at: new Date().toISOString()
      });
    }
  },
  deleteITAsset: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('it_assets').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<ITAsset[]>(KEYS.IT_ASSETS, initialITAssets);
    setStorageItem(KEYS.IT_ASSETS, list.filter(a => a.id !== id));
  },

  // Shared Folders
  getSharedFolders: async (): Promise<SharedFolder[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('shared_folders').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<SharedFolder[]>(KEYS.SHARED_FOLDERS, initialSharedFolders);
  },
  saveSharedFolder: async (folder: SharedFolder): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('shared_folders').upsert(folder);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<SharedFolder[]>(KEYS.SHARED_FOLDERS, initialSharedFolders);
    const index = list.findIndex(f => f.id === folder.id);
    if (index >= 0) list[index] = folder;
    else list.push(folder);
    setStorageItem(KEYS.SHARED_FOLDERS, list);
  },
  deleteSharedFolder: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('shared_folders').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<SharedFolder[]>(KEYS.SHARED_FOLDERS, initialSharedFolders);
    // Recursively delete children
    const toDeleteIds = new Set<string>([id]);
    let checkMore = true;
    while (checkMore) {
      const sizeBefore = toDeleteIds.size;
      list.forEach(f => {
        if (f.parent_id && toDeleteIds.has(f.parent_id)) {
          toDeleteIds.add(f.id);
        }
      });
      if (toDeleteIds.size === sizeBefore) checkMore = false;
    }
    setStorageItem(KEYS.SHARED_FOLDERS, list.filter(f => !toDeleteIds.has(f.id)));
  },

  // Folder Roles
  getFolderRoles: async (): Promise<FolderRole[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('folder_roles').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<FolderRole[]>(KEYS.FOLDER_ROLES, initialFolderRoles);
  },
  saveFolderRole: async (role: FolderRole): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('folder_roles').upsert(role);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<FolderRole[]>(KEYS.FOLDER_ROLES, initialFolderRoles);
    const index = list.findIndex(r => r.id === role.id);
    if (index >= 0) list[index] = role;
    else list.push(role);
    setStorageItem(KEYS.FOLDER_ROLES, list);
  },
  deleteFolderRole: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('folder_roles').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<FolderRole[]>(KEYS.FOLDER_ROLES, initialFolderRoles);
    setStorageItem(KEYS.FOLDER_ROLES, list.filter(r => r.id !== id));
  },

  // Folder/Role Permissions
  getRolePermissions: async (): Promise<FolderPermission[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('role_permissions').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<FolderPermission[]>(KEYS.ROLE_PERMISSIONS, initialRolePermissions);
  },
  saveRolePermission: async (perm: FolderPermission): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('role_permissions').upsert(perm);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<FolderPermission[]>(KEYS.ROLE_PERMISSIONS, initialRolePermissions);
    const index = list.findIndex(p => p.id === perm.id || (p.role_id === perm.role_id && p.folder_id === perm.folder_id));
    if (index >= 0) list[index] = { ...list[index], ...perm };
    else list.push(perm);
    setStorageItem(KEYS.ROLE_PERMISSIONS, list);
  },
  saveRolePermissionsBatch: async (roleId: string, perms: FolderPermission[]): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('role_permissions').upsert(perms);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<FolderPermission[]>(KEYS.ROLE_PERMISSIONS, initialRolePermissions);
    const filtered = list.filter(p => p.role_id !== roleId);
    filtered.push(...perms);
    setStorageItem(KEYS.ROLE_PERMISSIONS, filtered);
  },

  // Employee Roles
  getEmployeeRoles: async (): Promise<EmployeeRole[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('employee_roles').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<EmployeeRole[]>(KEYS.EMPLOYEE_ROLES, initialEmployeeRoles);
  },
  addEmployeeRole: async (employeeId: string, roleId: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('employee_roles').insert({ employee_id: employeeId, role_id: roleId });
      if (error) throw error;
      return;
    }
    const list = getStorageItem<EmployeeRole[]>(KEYS.EMPLOYEE_ROLES, initialEmployeeRoles);
    if (!list.some(r => r.employee_id === employeeId && r.role_id === roleId)) {
      list.push({ employee_id: employeeId, role_id: roleId });
      setStorageItem(KEYS.EMPLOYEE_ROLES, list);
    }
  },
  removeEmployeeRole: async (employeeId: string, roleId: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('employee_roles').delete().eq('employee_id', employeeId).eq('role_id', roleId);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<EmployeeRole[]>(KEYS.EMPLOYEE_ROLES, initialEmployeeRoles);
    setStorageItem(KEYS.EMPLOYEE_ROLES, list.filter(r => !(r.employee_id === employeeId && r.role_id === roleId)));
  },
  saveEmployeeRolesBatch: async (employeeId: string, roleIds: string[]): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      // Clear all and re-add
      await supabase.from('employee_roles').delete().eq('employee_id', employeeId);
      if (roleIds.length > 0) {
        const { error } = await supabase.from('employee_roles').insert(
          roleIds.map(rid => ({ employee_id: employeeId, role_id: rid }))
        );
        if (error) throw error;
      }
      return;
    }
    const list = getStorageItem<EmployeeRole[]>(KEYS.EMPLOYEE_ROLES, initialEmployeeRoles);
    const filtered = list.filter(r => r.employee_id !== employeeId);
    roleIds.forEach(rid => {
      filtered.push({ employee_id: employeeId, role_id: rid });
    });
    setStorageItem(KEYS.EMPLOYEE_ROLES, filtered);
  },

  // User Permission Overrides (Exceptions)
  getUserPermissionOverrides: async (): Promise<UserPermissionOverride[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('user_permission_overrides').select('*');
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<UserPermissionOverride[]>(KEYS.OVERRIDES, initialUserPermissionOverrides);
  },
  saveUserPermissionOverride: async (override: UserPermissionOverride): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('user_permission_overrides').upsert(override);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<UserPermissionOverride[]>(KEYS.OVERRIDES, initialUserPermissionOverrides);
    const index = list.findIndex(o => o.id === override.id || (o.employee_id === override.employee_id && o.folder_id === override.folder_id));
    if (index >= 0) list[index] = { ...list[index], ...override };
    else list.push(override);
    setStorageItem(KEYS.OVERRIDES, list);
  },
  deleteUserPermissionOverride: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('user_permission_overrides').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<UserPermissionOverride[]>(KEYS.OVERRIDES, initialUserPermissionOverrides);
    setStorageItem(KEYS.OVERRIDES, list.filter(o => o.id !== id));
  },

  // Permission Logs
  getPermissionLogs: async (): Promise<PermissionLog[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('permission_logs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<PermissionLog[]>(KEYS.PERMISSION_LOGS, initialPermissionLogs)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addPermissionLog: async (log: PermissionLog): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('permission_logs').insert(log);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<PermissionLog[]>(KEYS.PERMISSION_LOGS, initialPermissionLogs);
    list.unshift(log);
    setStorageItem(KEYS.PERMISSION_LOGS, list);
  },

  // Asset History
  getAssetHistory: async (): Promise<AssetHistory[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('asset_history').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return getStorageItem<AssetHistory[]>(KEYS.ASSET_HISTORY, initialAssetHistory)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addAssetHistory: async (hist: AssetHistory): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('asset_history').insert(hist);
      if (error) throw error;
      return;
    }
    const list = getStorageItem<AssetHistory[]>(KEYS.ASSET_HISTORY, initialAssetHistory);
    list.unshift(hist);
    setStorageItem(KEYS.ASSET_HISTORY, list);
  },

  // Utility to clear or reset demo data
  resetDemoData: (): void => {
    localStorage.removeItem(KEYS.DEPARTMENTS);
    localStorage.removeItem(KEYS.POSITIONS);
    localStorage.removeItem(KEYS.EMPLOYEES);
    localStorage.removeItem(KEYS.WEBAPP_USERS);
    localStorage.removeItem(KEYS.COMPUTERS);
    localStorage.removeItem(KEYS.MONITORS);
    localStorage.removeItem(KEYS.IT_ASSETS);
    localStorage.removeItem(KEYS.SHARED_FOLDERS);
    localStorage.removeItem(KEYS.FOLDER_ROLES);
    localStorage.removeItem(KEYS.ROLE_PERMISSIONS);
    localStorage.removeItem(KEYS.EMPLOYEE_ROLES);
    localStorage.removeItem(KEYS.OVERRIDES);
    localStorage.removeItem(KEYS.PERMISSION_LOGS);
    localStorage.removeItem(KEYS.ASSET_HISTORY);
    localStorage.removeItem(KEYS.CURRENT_WEBAPP_USER);
    window.location.reload();
  }
};
