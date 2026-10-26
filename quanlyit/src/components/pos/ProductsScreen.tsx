import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, X, Check, Package, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { Product } from '../../types/pos';
import { posDb, formatVND, formatK } from '../../utils/posStorage';
import { downloadProductExcelTemplate, parseProductsFromExcel } from '../../utils/excelHelper';
import { Pagination } from './Pagination';

interface ProductsScreenProps {
  onShowToast: (msg: string) => void;
}

const ITEMS_PER_PAGE = 10;

export const ProductsScreen: React.FC<ProductsScreenProps> = ({ onShowToast }) => {
  const [products, setProducts] = useState<Product[]>(posDb.getProducts());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal / Bottom Sheet Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formUnit, setFormUnit] = useState('thiên');
  const [formCategory, setFormCategory] = useState('Cốc Tim');

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleUpdate = () => setProducts(posDb.getProducts());
    window.addEventListener('pos_products_updated', handleUpdate);
    return () => window.removeEventListener('pos_products_updated', handleUpdate);
  }, []);

  // Reset to page 1 on search or category filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const categories = ['Tất cả', 'Cốc Tim', 'Cốc PP', 'Cốc Pet', 'Cốc U', 'Cốc Đáy Cầu', 'Nắp & Phụ kiện', 'Phụ kiện'];

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const clean = searchQuery.trim().toLowerCase();
    return p.code.toLowerCase().includes(clean) || p.name.toLowerCase().includes(clean);
  });

  // Paginated products (10 items per page)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormCode('');
    setFormName('');
    setFormPrice('');
    setFormUnit('thiên');
    setFormCategory('Cốc Tim');
    setIsModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (prod: Product) => {
    setEditingId(prod.id);
    setFormCode(prod.code);
    setFormName(prod.name);
    setFormPrice(prod.price);
    setFormUnit(prod.unit);
    setFormCategory(prod.category);
    setIsModalOpen(true);
  };

  // Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim() || formPrice === '') {
      alert('Vui lòng nhập đủ mã, tên và đơn giá sản phẩm!');
      return;
    }

    const prod: Product = {
      id: editingId || 'p-' + Date.now(),
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      price: Number(formPrice),
      unit: formUnit.trim() || 'thiên',
      category: formCategory,
      isPopular: true
    };

    posDb.saveProduct(prod);
    onShowToast(editingId ? `Đã cập nhật sản phẩm [${prod.code}]!` : `Đã thêm sản phẩm mới [${prod.code}]!`);
    setIsModalOpen(false);
  };

  // Delete product
  const handleDeleteProduct = (prod: Product) => {
    if (window.confirm(`Xác nhận xóa sản phẩm [${prod.code}] ${prod.name}?`)) {
      posDb.deleteProduct(prod.id);
      onShowToast(`Đã xóa sản phẩm [${prod.code}]!`);
    }
  };

  // Handle Excel File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsImporting(true);

    try {
      const importedProducts = await parseProductsFromExcel(file);
      if (importedProducts.length === 0) {
        alert('Không tìm thấy dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra định dạng cột!');
        return;
      }

      // Save each imported product
      importedProducts.forEach(p => posDb.saveProduct(p));
      onShowToast(`Đã nạp thành công ${importedProducts.length} sản phẩm từ file Excel!`);
      setIsImportModalOpen(false);
    } catch (err) {
      console.error('Import error:', err);
      alert('Lỗi đọc file Excel. Vui lòng kiểm tra lại file của bạn!');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="pos-content" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 20px)' }}>
      {/* SEARCH AND ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div className="pos-search-input-wrap" style={{ flex: 1 }}>
          <Search size={18} className="pos-search-icon" />
          <input
            type="text"
            className="pos-input pos-search-input"
            placeholder="Tìm theo mã (T7, TT2...) hoặc tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 10, background: 'none', border: 'none',
                color: '#94a3b8', cursor: 'pointer', padding: 4
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* NẠP EXCEL BUTTON */}
        <button
          type="button"
          className="pos-btn pos-btn-secondary"
          onClick={() => setIsImportModalOpen(true)}
          title="Nạp dữ liệu từ file Excel"
          style={{ padding: '0 10px' }}
        >
          <Upload size={15} color="#15803d" />
          <span>Nhập Excel</span>
        </button>

        {/* THÊM SẢN PHẨM BUTTON */}
        <button
          type="button"
          className="pos-btn pos-btn-primary"
          onClick={handleOpenCreate}
          title="Thêm sản phẩm mới"
          style={{ padding: '0 12px' }}
        >
          <Plus size={16} />
          <span>Thêm</span>
        </button>
      </div>

      {/* CATEGORY TABS HORIZONTAL SCROLL */}
      <div className="pos-chips-scroll" style={{ marginBottom: 8 }}>
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            className="pos-chip"
            style={{
              backgroundColor: selectedCategory === cat ? '#15803d' : '#ffffff',
              color: selectedCategory === cat ? '#ffffff' : '#475569',
              borderColor: selectedCategory === cat ? '#15803d' : '#e2e8f0',
              fontWeight: selectedCategory === cat ? 700 : 500
            }}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* PRODUCT LIST */}
      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: '6px 2px 8px' }}>
        DANH SÁCH SẢN PHẨM ({filteredProducts.length})
      </div>

      {filteredProducts.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1.5px dashed #cbd5e1',
          borderRadius: 10,
          padding: '24px 16px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <Package size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
          <p style={{ fontSize: 14, fontWeight: 600 }}>Không tìm thấy sản phẩm nào</p>
        </div>
      ) : (
        paginatedProducts.map(prod => (
          <div 
            key={prod.id}
            className="pos-card"
            style={{ 
              padding: '10px 12px', 
              marginBottom: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <span className="pos-item-code-badge" style={{ fontSize: 12, padding: '3px 8px' }}>
                {prod.code}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {prod.name}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  ĐVT: {prod.unit} • {prod.category}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d' }}>
                  {prod.price}k
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  {formatVND(prod.price)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className="pos-item-del-btn"
                  onClick={() => handleOpenEdit(prod)}
                  title="Sửa sản phẩm"
                  aria-label="Sửa sản phẩm"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  className="pos-item-del-btn"
                  onClick={() => handleDeleteProduct(prod)}
                  title="Xóa sản phẩm"
                  aria-label="Xóa sản phẩm"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* PHÂN TRANG: 10 SẢN PHẨM / TRANG */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredProducts.length}
        pageSize={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      {/* MODAL NẠP DỮ LIỆU EXCEL */}
      {isImportModalOpen && (
        <div className="pos-sheet-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div className="pos-sheet-container" onClick={(e) => e.stopPropagation()}>
            <div className="pos-sheet-header">
              <div className="pos-sheet-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
                <FileSpreadsheet size={18} />
                <span>Nạp Dữ Liệu Sản Phẩm Từ Excel</span>
              </div>
              <button 
                type="button" 
                className="pos-icon-btn" 
                style={{ color: '#64748b' }}
                onClick={() => setIsImportModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '8px 0', fontSize: 13, color: '#475569' }}>
              <p style={{ marginBottom: 8 }}>
                Chọn file Excel chứa bảng giá ly, nắp hoặc phụ kiện in để nạp vào hệ thống.
              </p>
              
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                color: '#334155',
                marginBottom: 14
              }}>
                <strong>Cột chuẩn trong file Excel:</strong>
                <div style={{ marginTop: 4, color: '#166534', fontWeight: 600 }}>
                  Mã sản phẩm | Tên sản phẩm | Đơn giá (k) | Đơn vị tính | Danh mục
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="pos-btn pos-btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <Upload size={16} />
                  <span>{isImporting ? 'Đang đọc file Excel...' : 'Chọn File Excel Từ Thiết Bị'}</span>
                </button>

                <button
                  type="button"
                  className="pos-btn pos-btn-secondary"
                  onClick={downloadProductExcelTemplate}
                >
                  <Download size={15} color="#15803d" />
                  <span>Tải File Excel Mẫu Chuẩn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMPLE ADD / EDIT BOTTOM SHEET FORM */}
      {isModalOpen && (
        <div className="pos-sheet-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="pos-sheet-container" onClick={(e) => e.stopPropagation()}>
            <div className="pos-sheet-header">
              <div className="pos-sheet-title">
                {editingId ? 'Sửa Sản Phẩm' : '+ Thêm Sản Phẩm Mới'}
              </div>
              <button 
                type="button" 
                className="pos-icon-btn" 
                style={{ color: '#64748b' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Mã rút gọn *
                  </label>
                  <input
                    type="text"
                    required
                    className="pos-input"
                    placeholder="T7, DC, P5..."
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Đơn vị tính
                  </label>
                  <input
                    type="text"
                    className="pos-input"
                    placeholder="thiên, cây, cuộn..."
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Tên sản phẩm đầy đủ *
                </label>
                <input
                  type="text"
                  required
                  className="pos-input"
                  placeholder="Ví dụ: Cốc Tim 700ml UKP"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Đơn giá (k) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    className="pos-input"
                    placeholder="750 = 750.000đ"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  {formPrice !== '' && (
                    <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600, marginTop: 2 }}>
                      = {formatVND(Number(formPrice))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Danh mục
                  </label>
                  <select
                    className="pos-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {categories.filter(c => c !== 'Tất cả').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="pos-btn pos-btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="pos-btn pos-btn-primary"
                  style={{ flex: 2 }}
                >
                  <Check size={16} />
                  <span>{editingId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
