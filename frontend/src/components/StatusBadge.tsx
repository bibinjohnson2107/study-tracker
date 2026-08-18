import React from 'react';
import { StatusType } from '../types';
import { CheckCircle2, Clock, CircleDot } from 'lucide-react';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  switch (status) {
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}>
          <CheckCircle2 className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          Completed
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 ${sizeClasses}`}>
          <Clock className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          In Progress
        </span>
      );
    case 'NOT_STARTED':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses}`}>
          <CircleDot className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          Not Started
        </span>
      );
  }
};
