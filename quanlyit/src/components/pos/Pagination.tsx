import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (totalItems <= pageSize) return null;

  return (
    <div className="pos-pagination">
      <button
        type="button"
        className="pos-page-btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft size={16} />
        <span>Trước</span>
      </button>

      <div className="pos-page-info">
        Trang <strong style={{ color: '#15803d' }}>{currentPage}</strong> / {totalPages} ({totalItems} mục)
      </div>

      <button
        type="button"
        className="pos-page-btn"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Trang sau"
      >
        <span>Sau</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
