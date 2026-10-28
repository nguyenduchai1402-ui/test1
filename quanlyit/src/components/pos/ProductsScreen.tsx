import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, X, Check, Package, FileSpreadsheet, Upload, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../../types/pos';
import { posDb, formatVND, formatK } from '../../utils/posStorage';
import { downloadProductExcelTemplate, parseProductsFromExcel, exportProductsToExcel } from '../../utils/excelHelper';
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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Modal / Bottom Sheet Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formCostPrice, setFormCostPrice] = useState<number | ''>('');
  const [formUnit, setFormUnit] = useState('thiên');
  const [formCategory, setFormCategory] = useState('Cốc Tim');

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => setProducts(posDb.getProducts());
    window.addEventListener('pos_products_updated', handleUpdate);
    return () => window.removeEventListener('pos_products_updated', handleUpdate);
  }, []);

  // Reset to page 1 on search or category filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Tự động cập nhật danh mục theo các danh mục thực tế của sản phẩm
  const categories = React.useMemo(() => {
    const catsSet = new Set<string>();
    products.forEach(p => {
      const c = (p.category || '').trim();
      if (c) catsSet.add(c);
    });
    // Nếu chưa có sản phẩm nào, gợi ý một số danh mục cơ bản
    if (catsSet.size === 0) {
      ['Ly pet', 'Ly tim', 'Ly đáy bầu', 'Ly đáy bằng'].forEach(c => catsSet.add(c));
    }
    return ['Tất cả', ...Array.from(catsSet)];
  }, [products]);

  // Đảm bảo nếu danh mục đã chọn bị xóa thì quay về 'Tất cả'
  useEffect(() => {
    if (selectedCategory !== 'Tất cả' && !categories.includes(selectedCategory)) {
      setSelectedCategory('Tất cả');
    }
  }, [categories, selectedCategory]);

  // Đóng dropdown tìm kiếm nhanh khi bấm ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cuộn danh mục sang trái / phải
  const handleScrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -160 : 160;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const clean = searchQuery.trim().toLowerCase();
    return p.code.toLowerCase().includes(clean) || p.name.toLowerCase().includes(clean);
  });

  // Sắp xếp sản phẩm mới nhất lên đầu tiên (Newest first)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    if (tA && tB && tA !== tB) return tB - tA;
    const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
    if (numA !== numB) return numB - numA;
    return b.id.localeCompare(a.id);
  });

  // Paginated products (10 items per page)
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormCode('');
    setFormName('');
    setFormPrice('');
    setFormCostPrice('');
    setFormUnit('thiên');
    const defaultCat = categories.find(c => c !== 'Tất cả') || 'Ly đáy bằng';
    setFormCategory(defaultCat);
    setIsModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (prod: Product) => {
    setEditingId(prod.id);
    setFormCode(prod.code);
    setFormName(prod.name);
    setFormPrice(prod.price);
    setFormCostPrice(prod.costPrice !== undefined && prod.costPrice !== null ? prod.costPrice : '');
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
      costPrice: formCostPrice !== '' ? Number(formCostPrice) : undefined,
      unit: formUnit.trim() || 'thiên',
      category: formCategory,
      isPopular: true
    };

    posDb.saveProduct(prod);
    onShowToast(editingId ? `Đã cập nhật sản phẩm [${prod.code}]!` : `Đã thêm sản phẩm mới [${prod.code}]!`);
    setIsModalOpen(false);
  };


  // Multi-selection handlers for Products
  const handleToggleSelectAllProducts = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedProducts = () => {
    if (selectedProductIds.length === 0) return;
    const isAll = selectedProductIds.length === products.length || selectedProductIds.length === filteredProducts.length;
    const confirmMsg = isAll
      ? `CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ ${selectedProductIds.length} sản phẩm không? Hành động này không thể hoàn tác!`
      : `Xác nhận xóa ${selectedProductIds.length} sản phẩm đã chọn?`;

    if (window.confirm(confirmMsg)) {
      if (isAll && selectedProductIds.length === products.length) {
        posDb.clearAllProducts();
      } else {
        posDb.deleteMultipleProducts(selectedProductIds);
      }
      setSelectedProductIds([]);
      onShowToast(`Đã xóa ${selectedProductIds.length} sản phẩm thành công!`);
    }
  };

  const handleDeleteAllProducts = () => {
    if (products.length === 0) return;
    if (window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ ${products.length} sản phẩm trong bảng giá không? Không thể hoàn tác!`)) {
      posDb.clearAllProducts();
      setSelectedProductIds([]);
      onShowToast(`Đã xóa sạch toàn bộ sản phẩm!`);
    }
  };

  // Delete product
  const handleDeleteProduct = (prod: Product) => {
    if (window.confirm(`Xác nhận xóa sản phẩm [${prod.code}] ${prod.name}?`)) {
      posDb.deleteProduct(prod.id);
      setSelectedProductIds(prev => prev.filter(id => id !== prod.id));
      onShowToast(`Đã xóa sản phẩm [${prod.code}]!`);
    }
  };

  // Xuất danh sách sản phẩm ra Excel
  const handleExportExcel = () => {
    const listToExport = filteredProducts.length > 0 ? filteredProducts : products;
    if (listToExport.length === 0) {
      alert('Không có sản phẩm nào để xuất Excel!');
      return;
    }
    try {
      exportProductsToExcel(listToExport);
      onShowToast(`Đã xuất file Excel cho ${listToExport.length} sản phẩm thành công!`);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại!');
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
        <div className="pos-search-input-wrap" ref={searchWrapRef} style={{ flex: 1, position: 'relative' }}>
          <Search size={18} className="pos-search-icon" />
          <input
            type="text"
            className="pos-input pos-search-input"
            placeholder="🔍 Tìm nhanh để sửa sản phẩm (mã, tên)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim()) {
                setIsSearchDropdownOpen(true);
              }
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchDropdownOpen(false);
              }}
              style={{
                position: 'absolute', right: 10, background: 'none', border: 'none',
                color: '#94a3b8', cursor: 'pointer', padding: 4
              }}
            >
              <X size={16} />
            </button>
          )}

          {/* QUICK SEARCH TO EDIT DROPDOWN */}
          {isSearchDropdownOpen && searchQuery.trim() && (
            <div 
              className="pos-autocomplete-list"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#ffffff',
                border: '1.5px solid #15803d',
                borderRadius: 8,
                marginTop: 4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                maxHeight: 280,
                overflowY: 'auto',
                zIndex: 100
              }}
            >
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                  Không tìm thấy sản phẩm nào khớp với "{searchQuery}"
                </div>
              ) : (
                filteredProducts.slice(0, 10).map(p => (
                  <div
                    key={p.id}
                    className="pos-autocomplete-item"
                    onClick={() => {
                      setIsSearchDropdownOpen(false);
                      handleOpenEdit(p);
                    }}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer'
                    }}
                    title="Bấm để mở form sửa sản phẩm này"
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="pos-item-code-badge" style={{ fontSize: 11, padding: '2px 6px' }}>{p.code}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {p.category} • ĐVT: {p.unit}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d' }}>
                          {p.price}k
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: p.costPrice !== undefined ? '#0284c7' : '#94a3b8' }}>
                          {p.costPrice !== undefined ? 'Giá nhập: ' + p.costPrice + 'k' : 'Chưa có giá nhập'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="pos-btn pos-btn-secondary"
                        style={{ height: 28, padding: '0 8px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Edit2 size={12} />
                        <span>Sửa</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* XUẤT EXCEL BUTTON */}
        <button
          type="button"
          className="pos-btn pos-btn-secondary"
          onClick={handleExportExcel}
          title="Xuất danh sách sản phẩm ra file Excel"
          style={{ padding: '0 8px' }}
        >
          <FileSpreadsheet size={15} color="#15803d" />
          <span>Xuất</span>
        </button>

        {/* NẠP EXCEL BUTTON */}
        <button
          type="button"
          className="pos-btn pos-btn-secondary"
          onClick={() => setIsImportModalOpen(true)}
          title="Nạp dữ liệu từ file Excel"
          style={{ padding: '0 8px' }}
        >
          <Upload size={15} color="#0284c7" />
          <span>Nhập</span>
        </button>

        {/* THÊM SẢN PHẨM BUTTON */}
        <button
          type="button"
          className="pos-btn pos-btn-primary"
          onClick={handleOpenCreate}
          title="Thêm sản phẩm mới"
          style={{ padding: '0 10px' }}
        >
          <Plus size={16} />
          <span>Thêm</span>
        </button>
      </div>

      {/* BỘ LỌC NHANH DANH MỤC SẢN PHẨM CÓ NÚT MŨI TÊN ĐẨY TRÁI / PHẢI */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          className="pos-scroll-arrow-btn"
          onClick={() => handleScrollCategories('left')}
          title="Cuộn danh mục sang trái"
          aria-label="Cuộn trái"
        >
          <ChevronLeft size={16} />
        </button>

        <div 
          ref={categoryScrollRef}
          className="pos-chips-scroll" 
          style={{ 
            margin: 0, 
            paddingBottom: 2, 
            flex: 1, 
            scrollBehavior: 'smooth' 
          }}
        >
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            const count = cat === 'Tất cả' 
              ? products.length 
              : products.filter(p => p.category === cat).length;

            return (
              <button
                key={cat}
                type="button"
                className="pos-chip"
                style={{
                  backgroundColor: isSelected ? '#15803d' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  borderColor: isSelected ? '#15803d' : '#e2e8f0',
                  fontWeight: isSelected ? 700 : 500,
                  whiteSpace: 'nowrap'
                }}
                onClick={() => setSelectedCategory(cat)}
              >
                <span>{cat}</span>
                <span style={{
                  fontSize: 10,
                  opacity: isSelected ? 0.9 : 0.6,
                  background: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  padding: '1px 5px',
                  borderRadius: 10,
                  marginLeft: 2
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="pos-scroll-arrow-btn"
          onClick={() => handleScrollCategories('right')}
          title="Cuộn danh mục sang phải"
          aria-label="Cuộn phải"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      
      {/* SELECTION BAR / BATCH ACTIONS */}
      {filteredProducts.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: selectedProductIds.length > 0 ? '#fef2f2' : '#f8fafc',
          border: selectedProductIds.length > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
          borderRadius: 8,
          marginBottom: 8
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}>
            <input
              type="checkbox"
              checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
              onChange={handleToggleSelectAllProducts}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#dc2626' }}
            />
            <span>
              {selectedProductIds.length > 0 
                ? `Đã chọn ${selectedProductIds.length} / ${filteredProducts.length} SP` 
                : `Chọn tất cả (${filteredProducts.length} SP)`}
            </span>
          </label>

          {selectedProductIds.length > 0 ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="pos-btn pos-btn-secondary"
                style={{ height: 30, padding: '0 8px', fontSize: 12 }}
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedProducts}
                className="pos-btn"
                style={{
                  height: 30,
                  padding: '0 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Trash2 size={13} />
                <span>Xóa {selectedProductIds.length === filteredProducts.length ? 'toàn bộ' : `(${selectedProductIds.length})`}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDeleteAllProducts}
              title="Xóa toàn bộ sản phẩm"
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px'
              }}
            >
              <Trash2 size={12} />
              <span>Xóa toàn bộ</span>
            </button>
          )}
        </div>
      )}

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
              gap: 8,
              border: selectedProductIds.includes(prod.id) ? '1.5px solid #ef4444' : '1px solid var(--border)',
              backgroundColor: selectedProductIds.includes(prod.id) ? '#fff5f5' : '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <input
                type="checkbox"
                checked={selectedProductIds.includes(prod.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  handleToggleSelectProduct(prod.id);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 17,
                  height: 17,
                  cursor: 'pointer',
                  accentColor: '#dc2626',
                  flexShrink: 0
                }}
                aria-label={`Chọn ${prod.name}`}
              />
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
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {formatVND(prod.price)}
                </div>
                {prod.costPrice !== undefined && prod.costPrice !== null && prod.costPrice !== ('' as any) ? (
                  <div style={{ 
                    fontSize: 11, 
                    color: '#0284c7', 
                    fontWeight: 700, 
                    marginTop: 2,
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    padding: '2px 6px',
                    borderRadius: 4,
                    display: 'inline-block'
                  }}>
                    Giá nhập: {prod.costPrice}k <span style={{ fontWeight: 500, color: '#0369a1' }}>({formatVND(prod.costPrice)})</span>
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: 10, 
                    color: '#94a3b8', 
                    fontStyle: 'italic',
                    marginTop: 2 
                  }}>
                    Chưa có giá nhập
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="pos-btn pos-btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(prod);
                  }}
                  title="Sửa sản phẩm"
                  aria-label="Sửa sản phẩm"
                  style={{ height: 32, padding: '0 8px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Edit2 size={13} />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  className="pos-item-del-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProduct(prod);
                  }}
                  title="Xóa sản phẩm"
                  aria-label="Xóa sản phẩm"
                  style={{ width: 32, height: 32 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* PHÂN TRANG: 10 SẢN PHẨM / TRANG */}
      <Pagination
        currentPage={currentPage}
        totalItems={sortedProducts.length}
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
                  <Download size={15} color="#0284c7" />
                  <span>Tải File Excel Mẫu Chuẩn</span>
                </button>

                <button
                  type="button"
                  className="pos-btn pos-btn-secondary"
                  onClick={() => {
                    handleExportExcel();
                    setIsImportModalOpen(false);
                  }}
                >
                  <FileSpreadsheet size={15} color="#15803d" />
                  <span>Xuất Toàn Bộ Sản Phẩm Ra Excel</span>
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
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: '#15803d' }}>
                    Đơn giá bán (k) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
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
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4, color: '#0284c7' }}>
                    Giá nhập (k)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="pos-input"
                    placeholder="Ví dụ: 550"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  {formCostPrice !== '' && (
                    <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, marginTop: 2 }}>
                      = {formatVND(Number(formCostPrice))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Danh mục
                </label>
                <input
                  list="product-categories-datalist"
                  type="text"
                  className="pos-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Chọn hoặc nhập danh mục mới"
                  required
                />
                <datalist id="product-categories-datalist">
                  {categories.filter(c => c !== 'Tất cả').map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
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
