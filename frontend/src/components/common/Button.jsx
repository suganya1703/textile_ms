import React from 'react';

const VARIANTS = {
  primary: 'bg-[#2F3E8F] hover:bg-[#26337A] active:bg-[#1E2A5E] text-white shadow-xs focus-visible:ring-4 focus-visible:ring-[#E3F5F1] disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'bg-white hover:bg-[#E8EBF7] border border-[#2F3E8F] text-[#2F3E8F] shadow-xs focus-visible:ring-4 focus-visible:ring-[#E3F5F1] disabled:opacity-50 disabled:cursor-not-allowed',
  outline: 'bg-transparent hover:bg-[#E8EBF7] border border-[#2F3E8F] text-[#2F3E8F] focus-visible:ring-4 focus-visible:ring-[#E3F5F1] disabled:opacity-50 disabled:cursor-not-allowed',
  teal: 'bg-[#2BA38C] hover:bg-[#248C78] active:bg-[#1F7564] text-white font-medium shadow-xs focus-visible:ring-4 focus-visible:ring-[#E3F5F1] disabled:opacity-50 disabled:cursor-not-allowed',
  accent: 'bg-[#2BA38C] hover:bg-[#248C78] active:bg-[#1F7564] text-white font-medium shadow-xs focus-visible:ring-4 focus-visible:ring-[#E3F5F1] disabled:opacity-50 disabled:cursor-not-allowed',
  danger: 'bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white shadow-xs focus-visible:ring-4 focus-visible:ring-[#FEE2E2] disabled:opacity-50 disabled:cursor-not-allowed',
  ghost: 'bg-transparent hover:bg-[#E8EBF7]/50 text-[#475569] hover:text-[#0F172A] disabled:opacity-50 disabled:cursor-not-allowed'
};

const SIZES = {
  sm: 'h-8 px-3 text-xs rounded-[8px] gap-1.5',
  md: 'h-10 px-4 text-sm rounded-[10px] gap-2',
  lg: 'h-12 px-5 text-base rounded-[10px] gap-2.5'
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer outline-none ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      ) : Icon ? (
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5 shrink-0' : size === 'lg' ? 'w-5 h-5 shrink-0' : 'w-4 h-4 shrink-0'} />
      ) : null}
      {children}
      {IconRight && !loading && (
        <IconRight className={size === 'sm' ? 'w-3.5 h-3.5 shrink-0' : size === 'lg' ? 'w-5 h-5 shrink-0' : 'w-4 h-4 shrink-0'} />
      )}
    </button>
  );
}
