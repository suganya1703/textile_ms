import React from 'react';
import { Search, X } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';

export function ControlPanel({
  breadcrumbs = [],
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterChips = [],
  activeFilter = 'All',
  onFilterChange,
  actionButton,
  viewModeToggle,
  extraRight,
  className = ''
}) {
  return (
    <div className={`bg-white rounded-[12px] border border-[#E5E7EB] p-3.5 shadow-xs space-y-3 ${className}`}>
      {/* Top Row: Breadcrumb on left, View Switcher / Action Button on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {viewModeToggle}
          {extraRight}
          {actionButton}
        </div>
      </div>

      {/* Bottom Row: Search Box and Filter Chips */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2.5 border-t border-[#F3F4F6]">
        {/* Search input */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] focus:outline-none focus:border-[#2F3E8F] text-[#111827] placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange && onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        {filterChips && filterChips.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {filterChips.map((chip) => {
              const id = typeof chip === 'string' ? chip : chip.id;
              const label = typeof chip === 'string' ? chip : chip.label;
              const count = typeof chip === 'object' ? chip.count : undefined;
              const isActive = activeFilter === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onFilterChange && onFilterChange(id)}
                  className={`px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#2F3E8F] text-white font-semibold shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-[#4B5563] font-medium'
                  }`}
                >
                  {label}
                  {count !== undefined && (
                    <span className={`ml-1 text-[11px] ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
