import React from 'react';

const STATUS_BORDERS = {
  running: 'border-l-4 border-l-[#2BA38C]',
  pass: 'border-l-4 border-l-[#2BA38C]',
  passed: 'border-l-4 border-l-[#2BA38C]',
  idle: 'border-l-4 border-l-[#F59E0B]',
  pending: 'border-l-4 border-l-[#F59E0B]',
  rework: 'border-l-4 border-l-[#F59E0B]',
  breakdown: 'border-l-4 border-l-[#DC2626]',
  reject: 'border-l-4 border-l-[#DC2626]',
  rejected: 'border-l-4 border-l-[#DC2626]'
};

export function Card({ children, statusBorder, className = '', ...props }) {
  const borderClass = statusBorder ? (STATUS_BORDERS[statusBorder.toLowerCase()] || '') : '';
  return (
    <div
      className={`bg-white rounded-[16px] border border-[#E5E9F2] shadow-[0_2px_8px_rgba(15,23,42,0.04)] overflow-hidden transition-all duration-150 ${borderClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`p-5 sm:p-6 border-b border-[#E5E9F2] flex items-center justify-between gap-4 ${className}`}>
      <div>
        <h3 className="font-semibold text-[16px] text-[#0F172A] leading-snug tracking-tight">{title}</h3>
        {subtitle && <p className="text-[13px] text-[#475569] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`p-5 sm:p-6 bg-[#F8FAFC] border-t border-[#E5E9F2] flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}
