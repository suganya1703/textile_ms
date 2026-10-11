import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  actionLabel,
  onAction,
  actionIcon,
  className = ''
}) {
  return (
    <div className={`py-14 px-4 text-center bg-white rounded-[16px] border border-dashed border-[#E5E9F2] flex flex-col items-center justify-center ${className}`}>
      <div className="w-14 h-14 rounded-[12px] bg-[#E8EBF7] text-[#2F3E8F] flex items-center justify-center mb-4 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-semibold text-[#0F172A] text-base">{title}</h3>
      <p className="text-sm text-[#475569] mt-1 max-w-sm mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" icon={actionIcon} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
