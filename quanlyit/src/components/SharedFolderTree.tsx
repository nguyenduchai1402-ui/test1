import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  X,
  Search,
  CheckCircle,
  FileText
} from 'lucide-react';
import { db } from '../utils/supabaseClient';
import { SharedFolder, FolderPermission } from '../types';

interface FolderTreeProps {
  currentUserRole: string;
}

export const SharedFolderTree: React.FC<FolderTreeProps> = ({ currentUserRole }) => {
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [permissions, setPermissions] = useState<FolderPermission[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['ROOT']));
  const [selectedFolderId, setSelectedFolderId] = useState<string>('ROOT');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formFolder, setFormFolder] = useState<Partial<SharedFolder>>({
    id: '', parent_id: '', name: '', folder_path: '', description: '', status: 'Active'
  });

  const canEdit = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'IT_ADMIN';

  const loadData = async () => {
    try {
      const [folds, perms] = await Promise.all([
        db.getSharedFolders(),
        db.getRolePermissions()
      ]);
      setFolders(folds);
      setPermissions(perms);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('webapp_user_changed', loadData);
    return () => window.removeEventListener('webapp_user_changed', loadData);
  }, []);

  const handleToggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const getFolderPath = (name: string, parentId?: string): string => {
    if (!parentId) return name;
    const parent = folders.find(f => f.id === parentId);
    if (!parent) return name;
    return `${getFolderPath(parent.name, parent.parent_id)}/${name}`;
  };

  const handleOpenAdd = (parentId: string) => {
    setModalMode('add');
    setFormFolder({
      id: `FLD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      parent_id: parentId,
      name: '',
      folder_path: '',
      description: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (folder: SharedFolder) => {
    setModalMode('edit');
    setFormFolder(folder);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFolder.id || !formFolder.name) return;

    // Calculate path
    const resolvedPath = getFolderPath(formFolder.name, formFolder.parent_id || undefined);
    const folderToSave: SharedFolder = {
      ...formFolder,
      folder_path: resolvedPath
    } as SharedFolder;

    try {
      await db.saveSharedFolder(folderToSave);
      setIsModalOpen(false);
      loadData();
      setSelectedFolderId(folderToSave.id);
      
      // Auto-expand parent
      if (folderToSave.parent_id) {
        setExpandedFolders(prev => new Set([...prev, folderToSave.parent_id!]));
      }
    } catch (err) {
      alert('Lỗi lưu thư mục');
    }
  };

  const handleDelete = async (id: string) => {
    if (id === 'ROOT') {
      alert('Không thể xóa thư mục gốc Ổ CHUNG.');
      return;
    }
    const children = folders.filter(f => f.parent_id === id);
    let confirmMsg = 'Bạn có chắc chắn muốn xóa thư mục này?';
    if (children.length > 0) {
      confirmMsg = `Thư mục này chứa ${children.length} thư mục con. Xóa thư mục này sẽ xóa TOÀN BỘ các thư mục con bên trong! Bạn vẫn muốn tiếp tục?`;
    }
    
    if (!window.confirm(confirmMsg)) return;
    try {
      await db.deleteSharedFolder(id);
      setSelectedFolderId('ROOT');
      loadData();
    } catch (err) {
      alert('Lỗi xóa thư mục');
    }
  };

  // Build tree nodes map
  const foldersByParent: Record<string, SharedFolder[]> = {};
  folders.forEach(f => {
    if (f.parent_id) {
      if (!foldersByParent[f.parent_id]) foldersByParent[f.parent_id] = [];
      foldersByParent[f.parent_id].push(f);
    }
  });

  // Recursive rendering
  const renderTreeNode = (folder: SharedFolder, depth: number) => {
    const children = foldersByParent[folder.id] || [];
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    // Search filter check
    const matchesSearch = searchQuery 
      ? folder.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        folder.folder_path.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Render child node recursive helper
    return (
      <div key={folder.id} className="tree-node">
        {/* Row element */}
        <div 
          onClick={() => setSelectedFolderId(folder.id)}
          style={{
            display: matchesSearch ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.45rem 0.5rem',
            marginLeft: `${depth * 14}px`,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: isSelected ? 'var(--primary)' : '',
            color: isSelected ? '#ffffff' : 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'background-color var(--transition-fast)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {children.length > 0 ? (
              <span onClick={(e) => handleToggleExpand(folder.id, e)} style={{ display: 'flex', alignItems: 'center' }}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            ) : (
              <span style={{ width: '14px' }}></span>
            )}
            <Folder size={16} color={isSelected ? '#ffffff' : 'var(--primary-light)'} />
            <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.85rem' }}>{folder.name}</span>
          </div>

          {/* Action triggers */}
          {canEdit && isSelected && (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button 
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.15rem' }} 
                onClick={(e) => { e.stopPropagation(); handleOpenAdd(folder.id); }}
                title="Tạo thư mục con"
              >
                <FolderPlus size={12} />
              </button>
              {folder.id !== 'ROOT' && (
                <>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.15rem' }} 
                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(folder); }}
                    title="Đổi tên / di chuyển"
                  >
                    <Edit size={12} />
                  </button>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.15rem' }} 
                    onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }}
                    title="Xóa thư mục"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Children node list */}
        {children.length > 0 && isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const selectedFolderPermissions = permissions.filter(p => p.folder_id === selectedFolderId && (p.can_view || p.can_read || p.can_write || p.can_edit || p.can_delete));

  const rootFolder = folders.find(f => !f.parent_id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Cấu trúc cây Ổ chung</h1>
          <p className="page-subtitle">Quản trị danh mục thư mục chia sẻ, gán sơ đồ cây không giới hạn cấp độ</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => handleOpenAdd('ROOT')}>
            <Plus size={16} /> Tạo thư mục con
          </button>
        )}
      </div>

      {/* SEARCH AND GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* TREE CONTAINER */}
        <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Tìm nhanh thư mục..." 
              className="form-control" 
              style={{ paddingLeft: '2rem', fontSize: '0.8rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {rootFolder ? renderTreeNode(rootFolder, 0) : <div style={{ fontStyle: 'italic', fontSize: '0.8rem' }}>Không tìm thấy thư mục gốc</div>}
          </div>
        </div>

        {/* FOLDER DETAILS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedFolder ? (
            <>
              {/* Basic folder info */}
              <div className="panel" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>FOLDER ID: {selectedFolder.id}</span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--primary-light)' }}>
                      📁 {selectedFolder.name}
                    </h2>
                  </div>
                  {canEdit && selectedFolder.id !== 'ROOT' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleOpenEdit(selectedFolder)}>
                        Đổi tên / Di chuyển
                      </button>
                      <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleDelete(selectedFolder.id)}>
                        Xóa thư mục
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div>Đường dẫn thư mục: <code>{selectedFolder.folder_path}</code></div>
                  <div>Trạng thái hoạt động: <span className="badge badge-success">{selectedFolder.status}</span></div>
                  <div>Mô tả chức năng: {selectedFolder.description || 'Chưa thiết lập mô tả'}</div>
                </div>
              </div>

              {/* Inherited active permissions list */}
              <div className="panel" style={{ margin: 0 }}>
                <h3 className="panel-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                  <CheckCircle size={16} color="var(--success)" /> Các Role bộ phận có quyền truy cập
                </h3>
                <div className="table-container">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>Nhóm quyền (Folder Role)</th>
                        <th style={{ textAlign: 'center' }}>Xem (View)</th>
                        <th style={{ textAlign: 'center' }}>Đọc (Read)</th>
                        <th style={{ textAlign: 'center' }}>Ghi (Write)</th>
                        <th style={{ textAlign: 'center' }}>Sửa (Edit)</th>
                        <th style={{ textAlign: 'center' }}>Xóa (Delete)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFolderPermissions.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Chưa gán quyền truy cập Role nào cho thư mục này. Chỉ IT Admin mới có quyền truy xuất.
                          </td>
                        </tr>
                      ) : (
                        selectedFolderPermissions.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{p.role_id}</td>
                            <td style={{ textAlign: 'center' }}>{p.can_view ? '✅' : '❌'}</td>
                            <td style={{ textAlign: 'center' }}>{p.can_read ? '✅' : '❌'}</td>
                            <td style={{ textAlign: 'center' }}>{p.can_write ? '✅' : '❌'}</td>
                            <td style={{ textAlign: 'center' }}>{p.can_edit ? '✅' : '❌'}</td>
                            <td style={{ textAlign: 'center' }}>{p.can_delete ? '✅' : '❌'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              Vui lòng chọn một thư mục trên cây để xem chi tiết cấu hình và phân quyền.
            </div>
          )}
        </div>
      </div>

      {/* ADD/EDIT FOLDER MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Tạo thư mục mới' : 'Chỉnh sửa / Di chuyển'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mã Thư mục (Folder ID)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    disabled={modalMode === 'edit'}
                    value={formFolder.id}
                    onChange={(e) => setFormFolder({ ...formFolder, id: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tên thư mục (viết liền không dấu để tiện kết nối ổ chung)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="Ví dụ: BAN VE KITHUAT"
                    value={formFolder.name}
                    onChange={(e) => setFormFolder({ ...formFolder, name: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Thư mục Cha (Parent Folder)</label>
                    <select 
                      className="form-control" 
                      value={formFolder.parent_id || ''}
                      disabled={formFolder.id === 'ROOT'}
                      onChange={(e) => setFormFolder({ ...formFolder, parent_id: e.target.value || undefined })}
                    >
                      {folders
                        .filter(f => f.id !== formFolder.id) // Cannot be its own parent
                        .map(f => (
                          <option key={f.id} value={f.id}>{f.folder_path}</option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái</label>
                    <select 
                      className="form-control" 
                      value={formFolder.status}
                      onChange={(e) => setFormFolder({ ...formFolder, status: e.target.value as any })}
                    >
                      <option value="Active">Hoạt động (Active)</option>
                      <option value="Archived">Lưu trữ (Archived)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả mục đích sử dụng</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    value={formFolder.description || ''}
                    onChange={(e) => setFormFolder({ ...formFolder, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Xác nhận lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
