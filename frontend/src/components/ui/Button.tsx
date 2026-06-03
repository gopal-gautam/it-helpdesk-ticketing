import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const BASE_CLASS =
  'font-semibold uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

const VARIANTS: Record<string, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white',
  outline:
    'border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/50 text-zinc-300',
  danger:
    'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25',
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
