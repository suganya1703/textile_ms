import React from 'react';

export function FormField({
  label,
  error,
  required = false,
  hint,
  children,
  className = ''
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#0F172A]">
          {label} {required && <span className="text-[#DC2626]">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-[#DC2626] flex items-center gap-1 font-medium mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] inline-block shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#94A3B8] mt-1">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className = '', error, ...props }) {
  return (
    <input
      className={`w-full h-10 px-3.5 text-sm bg-white border rounded-[10px] transition-all outline-none focus:border-[#2F3E8F] focus:ring-4 focus:ring-[#E3F5F1] disabled:bg-slate-50 disabled:text-slate-400 ${
        error ? 'border-[#DC2626] bg-[#FEE2E2]/20' : 'border-[#E5E9F2] hover:border-slate-300'
      } ${className}`}
      {...props}
    />
  );
}

export function Select({ children, className = '', error, ...props }) {
  return (
    <select
      className={`w-full h-10 px-3.5 text-sm bg-white border rounded-[10px] transition-all outline-none focus:border-[#2F3E8F] focus:ring-4 focus:ring-[#E3F5F1] disabled:bg-slate-50 disabled:text-slate-400 ${
        error ? 'border-[#DC2626] bg-[#FEE2E2]/20' : 'border-[#E5E9F2] hover:border-slate-300'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = '', error, ...props }) {
  return (
    <textarea
      className={`w-full p-3 text-sm bg-white border rounded-[10px] transition-all outline-none focus:border-[#2F3E8F] focus:ring-4 focus:ring-[#E3F5F1] disabled:bg-slate-50 disabled:text-slate-400 ${
        error ? 'border-[#DC2626] bg-[#FEE2E2]/20' : 'border-[#E5E9F2] hover:border-slate-300'
      } ${className}`}
      {...props}
    />
  );
}
