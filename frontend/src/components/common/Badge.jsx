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
  // Created: neutral slate/gray
  created: 'bg-slate-100 text-slate-700 border-slate-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',

  // Yarn Reserved: teal accent (#2BA38C)
  'yarn reserved': 'bg-teal-50 text-[#1F7D6B] border-teal-200',
  yarn_reserved: 'bg-teal-50 text-[#1F7D6B] border-teal-200',
  teal: 'bg-teal-50 text-[#1F7D6B] border-teal-200',
  accent: 'bg-teal-50 text-[#1F7D6B] border-teal-200',

  // Primary: deep indigo (#2F3E8F)
  primary: 'bg-[#EEF2FF] text-[#2F3E8F] border-[#C7D2FE]',
  indigo: 'bg-[#EEF2FF] text-[#2F3E8F] border-[#C7D2FE]',

  // Spinning: light indigo
  spinning: 'bg-indigo-50 text-indigo-700 border-indigo-200',

  // Weaving/Dyeing: blue
  weaving: 'bg-blue-50 text-blue-700 border-blue-200',
  dyeing: 'bg-sky-50 text-sky-700 border-sky-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',

  // QC / Pending: amber/yellow
  qc: 'bg-amber-50 text-amber-700 border-amber-200',
  'quality check': 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  'qc pending': 'bg-amber-50 text-amber-700 border-amber-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',

  // Ready / Dispatched / Passed / Running: emerald
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'ready to dispatch': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'ready for dispatch': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dispatched: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  passed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  running: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'grade a': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'grade-a': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',

  // Idle: amber
  idle: 'bg-amber-50 text-amber-700 border-amber-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rework: 'bg-amber-50 text-amber-700 border-amber-200',
  'grade b': 'bg-amber-50 text-amber-700 border-amber-200',
  'grade-b': 'bg-amber-50 text-amber-700 border-amber-200',

  // Breakdown / Rejected: rose/red
  breakdown: 'bg-rose-50 text-rose-700 border-rose-200',
  reject: 'bg-rose-50 text-rose-700 border-rose-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  loss: 'bg-rose-50 text-rose-700 border-rose-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200'
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
