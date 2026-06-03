import React from 'react';
import { cn } from './Button';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className }: CardProps) => (
  <div className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}>
    {children}
  </div>
);

export const CardHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)}>
    {children}
  </div>
);

export const CardTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h3 className={cn('font-semibold leading-none tracking-tight', className)}>{children}</h3>
);

export const CardDescription = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <p className={cn('text-sm text-gray-500', className)}>{children}</p>
);

export const CardContent = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn('p-6 pt-0', className)}>{children}</div>
);
