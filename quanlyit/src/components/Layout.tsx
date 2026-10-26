import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  FolderTree, 
  Grid, 
  History, 
  FileSpreadsheet, 
  Laptop, 
  Monitor, 
  ShieldAlert, 
  Sun, 
  Moon, 
  Search, 
  Wrench,
  Settings,
  Database
} from 'lucide-react';
import { db, isSupabaseConfigured } from '../utils/supabaseClient';
import { WebappUser, WebappRole } from '../types';
import { initialWebappUsers } from '../utils/mockData';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
  onSearch: (query: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children, onSearch }) => {
  const [currentUser, setCurrentUser] = useState<WebappUser>(db.getCurrentWebappUser());
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const handleUserChange = () => {
      setCurrentUser(db.getCurrentWebappUser());
    };
    window.addEventListener('webapp_user_changed', handleUserChange);
    return () => window.removeEventListener('webapp_user_changed', handleUserChange);
  }, []);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRole = e.target.value as WebappRole;
    const foundUser = initialWebappUsers.find(u => u.role === selectedRole);
    if (foundUser) {
      db.setCurrentWebappUser(foundUser);
    }
  };

  const toggleTheme = () => {
    const nextMode = !isLightMode;
    setIsLightMode(nextMode);
    if (nextMode) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER', 'VIEWER'] },
    { id: 'employees', label: 'Nhân viên', icon: Users, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER', 'VIEWER'] },
    { id: 'departments', label: 'Bộ phận & Chức vụ', icon: Layers, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER', 'VIEWER'] },
    { id: 'computers', label: 'Máy tính', icon: Laptop, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER', 'VIEWER'] },
    { id: 'monitors', label: 'Màn hình', icon: Monitor, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER', 'VIEWER'] },
    { id: 'it-assets', label: 'Thiết bị IT', icon: Wrench, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER', 'VIEWER'] },
    { id: 'folders', label: 'Ổ chung', icon: FolderTree, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER', 'VIEWER'] },
    { id: 'matrix', label: 'Access Matrix', icon: Grid, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER'] },
    { id: 'logs', label: 'Lịch sử hệ thống', icon: History, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER'] },
    { id: 'reports', label: 'Báo cáo & Export', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'IT_ADMIN', 'IT_USER'] }
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">IT</div>
          <span className="brand-name">Portal IT Manager</span>
        </div>
        <ul className="sidebar-menu">
          {visibleMenuItems.map(item => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="sidebar-item">
                <a 
                  className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    // Clear search on tab switch
                    setSearchQuery('');
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="sidebar-footer">
          <div>Phiên bản 1.0.0</div>
          <div style={{ marginTop: '0.25rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <Database size={10} color={isSupabaseConfigured ? '#10b981' : '#f59e0b'} />
            {isSupabaseConfigured ? 'Supabase Connected' : 'Local Sandbox Storage'}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="main-wrapper">
        {/* TOPBAR */}
        <header className="topbar">
          <form className="global-search-container" onSubmit={handleSearchSubmit}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="global-search-input" 
              placeholder="Tìm nhân viên, tài sản, IP, thư mục..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch(e.target.value); // Instant filter as you type
              }}
            />
          </form>

          <div className="topbar-actions">
            {/* Quick Testing Role Switcher */}
            <div className="role-switcher-wrapper">
              <span className="role-switcher-label">Chế độ Role:</span>
              <select className="role-select" value={currentUser.role} onChange={handleRoleChange}>
                <option value="SUPER_ADMIN">SUPER ADMIN</option>
                <option value="IT_ADMIN">IT ADMIN</option>
                <option value="IT_USER">IT USER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button className="btn btn-secondary btn-icon" onClick={toggleTheme} title="Đổi giao diện">
              {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* User Profile */}
            <div className="user-badge">
              <div className="avatar">
                {currentUser.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-name">{currentUser.display_name}</span>
                <span className="user-role-label">{currentUser.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};
