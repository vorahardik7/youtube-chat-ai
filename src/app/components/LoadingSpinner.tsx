'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'teal' | 'white' | 'slate' | 'gradient';
  className?: string;
  showText?: boolean;
}

export function LoadingSpinner({ 
  size = 'medium', 
  color = 'teal', 
  className = '',
  showText = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-6 h-6 border-2',
    large: 'w-10 h-10 border-3',
  };

  const colorClasses = {
    teal: 'border-teal-100 border-t-teal-600',
    white: 'border-white/20 border-t-white',
    slate: 'border-slate-200 border-t-slate-600',
    gradient: 'border-slate-200 border-t-transparent bg-gradient-to-r from-teal-500 to-teal-600 bg-clip-border',
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin shadow-sm`}
        style={{ animationDuration: '0.8s' }}
        role="status"
        aria-label="Loading"
      ></div>
      {showText && (
        <span className={`${textSizeClasses[size]} text-slate-500 font-medium`}>
          Loading...
        </span>
      )}
    </div>
  );
}
