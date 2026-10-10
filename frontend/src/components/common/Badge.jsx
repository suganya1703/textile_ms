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
  // Created: grey
  created: 'bg-gray-100 text-gray-700 border-gray-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',

  // Yarn Reserved: teal
  'yarn reserved': 'bg-teal-50 text-teal-700 border-teal-200',
  yarn_reserved: 'bg-teal-50 text-teal-700 border-teal-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',

  // Spinning: purple
  spinning: 'bg-purple-50 text-purple-700 border-purple-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',

  // Weaving/Dyeing: blue
  weaving: 'bg-blue-50 text-blue-700 border-blue-200',
  dyeing: 'bg-blue-50 text-blue-700 border-blue-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',

  // QC / Pending: yellow
  qc: 'bg-amber-50 text-amber-700 border-amber-200',
  'quality check': 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  'qc pending': 'bg-amber-50 text-amber-700 border-amber-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',

  // Ready / Dispatched / Passed / Running: green
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

  // Breakdown / Rejected: red
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
