"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems,
  itemsPerPage
}: PaginationProps) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    
    if (totalPages <= 5) {
      // Show all pages if 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first, last, current, and neighbors
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
      }
    }
    
    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <p className="text-body-sm text-brand-gray">
        Mostrati <span className="font-medium text-brand-dark">{startItem}-{endItem}</span> di{" "}
        <span className="font-medium text-brand-dark">{totalItems}</span> ordini
      </p>
      
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-brand-light-gray text-brand-gray hover:bg-brand-light-gray/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Pagina precedente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={page === "..."}
            className={`min-w-[40px] h-10 px-3 rounded-lg text-body-sm font-medium transition-colors ${
              page === currentPage
                ? "bg-brand-primary text-white"
                : page === "..."
                ? "cursor-default text-brand-gray"
                : "border border-brand-light-gray text-brand-gray hover:bg-brand-light-gray/30"
            }`}
          >
            {page}
          </button>
        ))}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-brand-light-gray text-brand-gray hover:bg-brand-light-gray/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Pagina successiva"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
