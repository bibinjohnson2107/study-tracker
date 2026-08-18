import React from 'react';

interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  showPercentage = true,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const heightMap = {
    sm: 'h-2',
    md: 'h-3.5',
    lg: 'h-5',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        {showPercentage && (
          <span className="text-xs font-semibold tracking-wide text-cyan-400">
            {clamped}% Completed
          </span>
        )}
      </div>
      <div className={`w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50 shadow-inner ${heightMap[size]}`}>
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
