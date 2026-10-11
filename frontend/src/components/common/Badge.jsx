import React from 'react';

export function formatStatus(status) {
  if (!status) return '';
  const str = String(status).trim();
  const lower = str.toLowerCase().replace(/[- ]/g, '_');

  const labelMap = {
    created: 'Created',
    yarn_reserved: 'Yarn Reserved',
    spinning: 'Spinning',
    weaving: 'Weaving',
    dyeing: 'Dyeing',
    qc: 'QC',
    qc_inspection: 'QC',
    pending_qc: 'QC',
    qc_pending: 'QC',
    pending: 'Pending',
    ready: 'Ready',
    ready_for_dispatch: 'Ready',
    ready_to_dispatch: 'Ready',
    dispatched: 'Dispatched',
    pass: 'Passed',
    passed: 'Passed',
    rework: 'Rework',
    reject: 'Rejected',
    rejected: 'Rejected',
    grade_a: 'Grade A',
    grade_b: 'Grade B',
    running: 'Running',
    idle: 'Idle',
    breakdown: 'Breakdown',
    loss: 'Margin Loss'
  };

  if (labelMap[lower]) return labelMap[lower];

  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const VARIANTS = {
  // Neutral / Created
  created: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
  neutral: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
  gray: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',

  // Production stages / Primary: deep indigo tint
  spinning: 'bg-[#E8EBF7] text-[#2F3E8F] border-[#C7D0EF]',
  weaving: 'bg-[#E8EBF7] text-[#2F3E8F] border-[#C7D0EF]',
  dyeing: 'bg-[#E8EBF7] text-[#2F3E8F] border-[#C7D0EF]',
  primary: 'bg-[#E8EBF7] text-[#2F3E8F] border-[#C7D0EF]',
  blue: 'bg-[#E8EBF7] text-[#2F3E8F] border-[#C7D0EF]',

  // Accent / Success / Highlights: teal tint #E3F5F1
  'yarn reserved': 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  yarn_reserved: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  ready: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  'ready to dispatch': 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  'ready for dispatch': 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  dispatched: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  pass: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  passed: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  running: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  'grade a': 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  'grade-a': 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  teal: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  accent: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  green: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',
  success: 'bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]',

  // Warning Amber: idle, pending, rework, grade B, QC
  idle: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  pending: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  qc: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  'quality check': 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  'qc pending': 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  rework: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  'grade b': 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  'grade-b': 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  amber: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  yellow: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  warning: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',

  // Danger Red: breakdown, reject, loss
  breakdown: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  reject: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  rejected: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  loss: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  danger: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  red: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]'
};

export function Badge({ children, variant = 'neutral', size = 'md', className = '' }) {
  const normalizedVariant = String(variant).toLowerCase().trim().replace(/_/g, ' ');
  const style = VARIANTS[normalizedVariant] || VARIANTS[String(variant).toLowerCase()] || VARIANTS.neutral;

  return (
    <span
      className={`inline-flex items-center justify-center text-[12px] font-semibold rounded-full px-2.5 py-0.5 border ${style} ${className}`}
    >
      {children}
    </span>
  );
}
