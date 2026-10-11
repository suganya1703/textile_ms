import React from 'react';
import { Check } from 'lucide-react';

export const PIPELINE_STAGES = [
  'Created',
  'Yarn Reserved',
  'Spinning',
  'Weaving',
  'Dyeing',
  'QC',
  'Ready',
  'Dispatched'
];

export function ChevronStatusBar({ currentStatus = 'Created', className = '' }) {
  const normalizeStatus = (status) => {
    if (!status) return 'created';
    const s = String(status).toLowerCase().replace(/[-_ ]/g, '');
    if (s.includes('yarn')) return 'yarnreserved';
    if (s.includes('spin')) return 'spinning';
    if (s.includes('weav')) return 'weaving';
    if (s.includes('dye')) return 'dyeing';
    if (s.includes('qc') || s.includes('perch')) return 'qc';
    if (s.includes('ready')) return 'ready';
    if (s.includes('dispatch')) return 'dispatched';
    return 'created';
  };

  const normalizedCurrent = normalizeStatus(currentStatus);

  const stageKeys = [
    'created',
    'yarnreserved',
    'spinning',
    'weaving',
    'dyeing',
    'qc',
    'ready',
    'dispatched'
  ];

  let currentIndex = stageKeys.indexOf(normalizedCurrent);
  if (currentIndex === -1) currentIndex = 0;

  return (
    <div className={`w-full overflow-x-auto py-1 scrollbar-none ${className}`}>
      <div className="flex items-center min-w-[720px] rounded-[10px] overflow-hidden border border-[#E5E7EB] bg-white p-1 gap-1">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isFuture = idx > currentIndex;

          let bgClass = '';
          let textClass = '';

          if (isCompleted) {
            bgClass = 'bg-[#2BA38C] text-white'; // Teal filled for completed
            textClass = 'text-white';
          } else if (isCurrent) {
            bgClass = 'bg-[#2F3E8F] text-white ring-2 ring-[#2F3E8F]/20 font-bold'; // Deep Indigo for current active
            textClass = 'text-white font-bold';
          } else {
            bgClass = 'bg-gray-100 text-gray-400 font-normal'; // Grey for future
            textClass = 'text-gray-500';
          }

          return (
            <div
              key={stage}
              className={`flex-1 flex items-center justify-center py-2 px-2 text-xs transition-all relative select-none rounded-[6px] ${bgClass}`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                )}
                <span className={`truncate text-xs ${textClass}`}>{stage}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
