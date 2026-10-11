import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs({ items = [], className = '' }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className={`flex items-center space-x-1.5 text-xs text-[#6B7280] ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const label = typeof item === 'string' ? item : item.label;
        const onClick = typeof item === 'object' ? item.onClick : null;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
            {onClick && !isLast ? (
              <button
                type="button"
                onClick={onClick}
                className="hover:text-[#2F3E8F] transition-colors font-medium truncate max-w-[200px] cursor-pointer"
              >
                {label}
              </button>
            ) : (
              <span className={`truncate max-w-[220px] ${isLast ? 'font-semibold text-[#111827]' : ''}`}>
                {label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
