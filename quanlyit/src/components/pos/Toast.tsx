import React from 'react';
import { CheckCircle } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="pos-toast">
      <CheckCircle size={16} color="#4ade80" />
      <span>{message}</span>
    </div>
  );
};
