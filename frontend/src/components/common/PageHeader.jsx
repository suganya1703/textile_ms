import React from 'react';

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className = ''
}) {
  return (
    <div className={`mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight leading-tight">{title}</h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-[14px] text-[#6B7280] mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
