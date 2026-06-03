import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20 text-white placeholder-zinc-500 outline-none transition-all ${
          error ? 'border-red-500/50 focus:border-red-500/80 focus:ring-red-500/20' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
