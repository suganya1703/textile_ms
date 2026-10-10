import React from 'react';

const VARIANTS = {
  primary: 'bg-[#714B67] hover:bg-[#5C3D54] active:bg-[#4A3144] text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'bg-white hover:bg-[#FAF5F9] border border-[#714B67] text-[#714B67] shadow-xs disabled:opacity-50 disabled:cursor-not-allowed',
  outline: 'bg-transparent hover:bg-[#FAF5F9] border border-[#714B67] text-[#714B67] disabled:opacity-50 disabled:cursor-not-allowed',
  teal: 'bg-[#714B67] hover:bg-[#5C3D54] text-white font-medium shadow-xs disabled:opacity-50 disabled:cursor-not-allowed',
  danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed',
  ghost: 'bg-transparent hover:bg-gray-100 text-[#6B7280] hover:text-[#111827] disabled:opacity-50 disabled:cursor-not-allowed'
};

const SIZES = {
  sm: 'text-xs px-3 py-1.5 rounded-[8px] gap-1.5',
  md: 'text-sm px-4 py-2 rounded-[8px] gap-2',
  lg: 'text-base px-5 py-2.5 rounded-[8px] gap-2.5'
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
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      ) : Icon ? (
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      ) : null}
      {children}
      {IconRight && !loading && (
        <IconRight className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      )}
    </button>
  );
}
