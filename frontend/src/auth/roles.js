export const DEMO_ROLES = [
  {
    id: 'owner',
    title: 'Mill Owner',
    name: 'Sivakumar M.',
    email: 'owner@everesttextiles.in',
    badge: 'Executive',
    defaultTab: 'dashboard',
    modules: [
      'dashboard',
      'inventory',
      'production',
      'quality',
      'orders',
      'dispatch',
      'workforce',
      'costing',
      'insights',
      'floormap',
      'settings'
    ],
    desc: 'Executive access: P&L, machine utilization, cash flow and all 11 modules.'
  },
  {
    id: 'store',
    title: 'Store & Warehouse Head',
    name: 'Venkatesh K.',
    email: 'store@everesttextiles.in',
    badge: 'Store & Logistics',
    defaultTab: 'inventory',
    modules: ['inventory', 'dispatch', 'orders', 'floormap', 'settings'],
    desc: 'Yarn stock verification, supplier arrivals, dispatch invoices & dye-lot checking.'
  },
  {
    id: 'floor',
    title: 'Floor Supervisor',
    name: 'Murugan S.',
    email: 'floor@everesttextiles.in',
    badge: 'Operations',
    defaultTab: 'production',
    modules: ['production', 'floormap', 'quality', 'workforce'],
    desc: 'Loom schedules, job card assignment, shift telemetry & workforce attendance.'
  },
  {
    id: 'qc',
    title: 'Quality Inspector',
    name: 'Anitha P.',
    email: 'qc@everesttextiles.in',
    badge: 'Quality Control',
    defaultTab: 'quality',
    modules: ['quality', 'production', 'floormap', 'insights'],
    desc: 'Perch table inspection, ASTM 4-Point scoring, defect logging & Roll Passports.'
  }
];

export const ROLE_MAP = DEMO_ROLES.reduce((acc, role) => {
  acc[role.id] = role;
  return acc;
}, {});
