import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const BASE_CLASS =
  'font-semibold rounded-lg transition-colors active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

const VARIANTS: Record<string, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
  outline:
    'border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700',
  danger:
    'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
};

const SIZES: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${BASE_CLASS} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
