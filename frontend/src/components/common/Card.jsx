import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`p-5 sm:p-6 border-b border-[#F3F4F6] flex items-center justify-between gap-4 ${className}`}>
      <div>
        <h3 className="font-semibold text-[15px] text-[#111827] leading-snug">{title}</h3>
        {subtitle && <p className="text-[13px] text-[#6B7280] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
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
    <div className={`p-5 sm:p-6 bg-[#F9FAFB] border-t border-[#F3F4F6] flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}
