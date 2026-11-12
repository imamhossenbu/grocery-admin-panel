'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
}: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = {
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071a10]/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${sizeClass} max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-[#dfece3] shadow-2xl transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-[#e6f0e9] bg-white/95 backdrop-blur px-6 py-4">
            <div>
              {title && (
                <h3 className="font-display text-xl font-bold text-[#112a1d]">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-xs text-[#5a7165]">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-[#5a7165] hover:bg-[#e8f5ee] hover:text-[#112a1d] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

