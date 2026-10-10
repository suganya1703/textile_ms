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
        <label className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-rose-600 flex items-center gap-1 font-medium mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className = '', error, ...props }) {
  return (
    <input
      className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg transition-all outline-none focus:ring-2 focus:ring-loomdo-primary/20 focus:border-loomdo-primary disabled:bg-slate-50 disabled:text-slate-500 ${
        error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300 hover:border-slate-400'
      } ${className}`}
      {...props}
    />
  );
}

export function Select({ children, className = '', error, ...props }) {
  return (
    <select
      className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg transition-all outline-none focus:ring-2 focus:ring-loomdo-primary/20 focus:border-loomdo-primary disabled:bg-slate-50 disabled:text-slate-500 ${
        error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300 hover:border-slate-400'
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
      className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg transition-all outline-none focus:ring-2 focus:ring-loomdo-primary/20 focus:border-loomdo-primary disabled:bg-slate-50 disabled:text-slate-500 ${
        error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300 hover:border-slate-400'
      } ${className}`}
      {...props}
    />
  );
}
