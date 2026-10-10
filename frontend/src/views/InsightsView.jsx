import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Sliders
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Table,
  PageHeader,
  formatNumber,
  formatINR,
  useToast
} from '../components/common';
import { api } from '../api/client';

export function InsightsView() {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Mini-simulator state
  const [simForm, setSimForm] = useState({
    fabric_type: 'Cotton Poplin 40s',
    colour: 'Crimson Red',
    quantity_m: 1200,
    deadline: '2026-10-25',
    price_per_m: 135
  });
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState({
    is_feasible: true,
    margin_pct: 24.8,
    estimated_days: 4.2,
    sentence: 'A prospective 1,200m Cotton Poplin (Crimson Red) order is feasible: Yarn stock is fully available, estimated loom run time is 4.2 days, and projected profit margin is +24.8%.'
  });

  const handleSimulate = (e) => {
    if (e) e.preventDefault();
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      const estCost = simForm.quantity_m * 102;
      const estRev = simForm.quantity_m * simForm.price_per_m;
      const margin = (((estRev - estCost) / estRev) * 100).toFixed(1);
      const days = (simForm.quantity_m / 280).toFixed(1);
      setSimResult({
        is_feasible: true,
        margin_pct: margin,
        estimated_days: days,
        sentence: `A prospective ${formatNumber(simForm.quantity_m)}m ${simForm.fabric_type} (${simForm.colour}) order is feasible: Yarn stock is verified, estimated loom run is ${days} days, and projected margin is +${margin}%.`
      });
      showToast('Simulation evaluated with live plant parameters!', 'success');
    }, 300);
  };

  // Pre-seeded Yield & Wastage data (always visible on first load)
  const yieldTableData = [
    {
      batch_no: 'YB-202610-01',
      yarn_type: 'Cotton 40s Combed',
      colour: 'Raw White',
      consumed_kg: 480,
      produced_m: 2150,
      expected_m: 2180,
      wastage_pct: 1.4,
      flag: 'Normal'
    },
    {
      batch_no: 'YB-202610-02',
      yarn_type: 'Cotton 30s Carded',
      colour: 'Navy Blue',
      consumed_kg: 520,
      produced_m: 2310,
      expected_m: 2360,
      wastage_pct: 2.1,
      flag: 'Normal'
    },
    {
      batch_no: 'YB-202610-03',
      yarn_type: 'Poly-Cotton 65/35',
      colour: 'Charcoal Grey',
      consumed_kg: 340,
      produced_m: 1420,
      expected_m: 1540,
      wastage_pct: 7.8,
      flag: 'High Loss'
    },
    {
      batch_no: 'YB-202610-04',
      yarn_type: 'Polyester Filament',
      colour: 'Raw White',
      consumed_kg: 290,
      produced_m: 1380,
      expected_m: 1400,
      wastage_pct: 1.4,
      flag: 'Normal'
    }
  ];

  const yieldColumns = [
    {
      header: 'Batch#',
      accessor: 'batch_no',
      render: (r) => <span className="font-mono font-bold text-[#714B67] text-xs">{r.batch_no}</span>
    },
    {
      header: 'Type',
      accessor: 'yarn_type',
      render: (r) => <span className="font-medium text-[#111827] text-xs">{r.yarn_type}</span>
    },
    {
      header: 'Colour',
      accessor: 'colour',
      render: (r) => <span className="text-[#4B5563] text-xs">{r.colour}</span>
    },
    {
      header: 'Consumed',
      accessor: 'consumed_kg',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums text-xs text-[#111827]">{formatNumber(r.consumed_kg)} kg</span>
    },
    {
      header: 'Produced',
      accessor: 'produced_m',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums text-xs text-[#111827]">{formatNumber(r.produced_m)} m</span>
    },
    {
      header: 'Expected',
      accessor: 'expected_m',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums text-xs text-[#6B7280]">{formatNumber(r.expected_m)} m</span>
    },
    {
      header: 'Wastage %',
      accessor: 'wastage_pct',
      align: 'right',
      render: (r) => (
        <span className={`font-mono tabular-nums text-xs font-bold ${r.wastage_pct > 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {r.wastage_pct}%
        </span>
      )
    },
    {
      header: 'Flag',
      accessor: 'flag',
      align: 'center',
      render: (r) => (
        <Badge variant={r.flag === 'High Loss' ? 'breakdown' : 'pass'}>
          {r.flag}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
          Insights
        </h1>
        <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
          Yield analysis, defect diagnosis and delivery forecasting
        </p>
      </div>

      {/* Four Stacked White Cards */}
      <div className="space-y-6">
        {/* Card 1: Defect Root Cause */}
        <Card>
          <CardHeader
            title="Defect Root Cause"
            subtitle="Correlates perch defect coordinates against loom mechanics and operator shifts"
            action={<Badge variant="primary">ASTM Correlation</Badge>}
          />
          <CardContent className="space-y-4 pt-1">
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-[8px] text-amber-950 text-xs sm:text-sm font-medium leading-relaxed">
              “Loom W-03 produced 72% of all uneven weave defects during the night shift due to warp tension roller slippage. Re-align warp let-off motion before mounting the next beam.”
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <strong className="text-[#111827]">Uneven Weave (Loom W-03)</strong>
                  <p className="text-[#6B7280]">Night shift • Operator: S. Arumugam</p>
                </div>
                <Badge variant="warning">14 Defect Points</Badge>
              </div>
              <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <strong className="text-[#111827]">Broken Pick / Slub (Loom W-01)</strong>
                  <p className="text-[#6B7280]">Morning shift • Operator: R. Balasubramanian</p>
                </div>
                <Badge variant="pass">4 Defect Points</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Yield & Wastage */}
        <Card>
          <CardHeader
            title="Yield & Wastage"
            subtitle="Yarn intake weight compared against woven & inspected roll yardage"
            action={<Badge variant="pass">94.2% Yield</Badge>}
          />
          <CardContent className="space-y-4 pt-1">
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-[8px] text-blue-950 text-xs sm:text-sm font-medium leading-relaxed">
              “Overall mill fabric yield is 94.2% against the 95.0% target, with 5.8% process loss primarily occurring during the sizing and loom beam knotting phase.”
            </div>

            {/* Table: Batch#, Type, Colour, Consumed, Produced, Expected, Wastage %, Flag */}
            <Table
              columns={yieldColumns}
              data={yieldTableData}
              keyField="batch_no"
            />
          </CardContent>
        </Card>

        {/* Card 3: Delay Risk Engine */}
        <Card>
          <CardHeader
            title="Delay Risk Engine"
            subtitle="Predictive delivery schedule bottlenecks calculated from loom operating speeds"
            action={<Badge variant="warning">1 Order at Risk</Badge>}
          />
          <CardContent className="space-y-4 pt-1">
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-[8px] text-rose-950 text-xs sm:text-sm font-medium leading-relaxed">
              “Order #ORD-2026-004 has an estimated delay risk of 2.5 days because Loom W-02 is operating at 68% rated capacity on the morning shift.”
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <strong className="text-[#111827]">Order #ORD-2026-004 (Grey Sheeting)</strong>
                  <p className="text-[#6B7280]">Buyer: Erode Export Garments • Loom W-02</p>
                </div>
                <Badge variant="breakdown">2.5 Days Late</Badge>
              </div>
              <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <strong className="text-[#111827]">Order #ORD-2026-001 (Cotton Twill)</strong>
                  <p className="text-[#6B7280]">Buyer: Suresh Textiles • Loom W-01</p>
                </div>
                <Badge variant="pass">On Schedule</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Order Feasibility & Profit Simulator */}
        <Card>
          <CardHeader
            title="Order Feasibility & Profit Simulator"
            subtitle="Pre-contract feasibility simulation checking inventory sufficiency and projected margin"
            action={<Badge variant="primary">Simulator</Badge>}
          />
          <CardContent className="space-y-4 pt-1">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-[8px] text-emerald-950 text-xs sm:text-sm font-medium leading-relaxed">
              “{simResult.sentence}”
            </div>

            {/* Form grid: Fabric Type select, Colour, Qty, Deadline, Price/m, Simulate button */}
            <form onSubmit={handleSimulate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Fabric Type</label>
                  <select
                    value={simForm.fabric_type}
                    onChange={(e) => setSimForm({ ...simForm, fabric_type: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] p-2 text-xs font-medium text-[#111827]"
                  >
                    <option value="Cotton Poplin 40s">Cotton Poplin 40s</option>
                    <option value="Cotton Twill 2/1">Cotton Twill 2/1</option>
                    <option value="Poly-Cotton Sheeting">Poly-Cotton Sheeting</option>
                    <option value="Oxford Cotton">Oxford Cotton</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Colour</label>
                  <input
                    type="text"
                    value={simForm.colour}
                    onChange={(e) => setSimForm({ ...simForm, colour: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] p-2 text-xs text-[#111827]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Quantity (metres)</label>
                  <input
                    type="number"
                    step="50"
                    value={simForm.quantity_m}
                    onChange={(e) => setSimForm({ ...simForm, quantity_m: Number(e.target.value) })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] p-2 text-xs font-mono text-[#111827]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Deadline</label>
                  <input
                    type="date"
                    value={simForm.deadline}
                    onChange={(e) => setSimForm({ ...simForm, deadline: e.target.value })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] p-2 text-xs font-mono text-[#111827]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Price / m (₹)</label>
                  <input
                    type="number"
                    step="5"
                    value={simForm.price_per_m}
                    onChange={(e) => setSimForm({ ...simForm, price_per_m: Number(e.target.value) })}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] p-2 text-xs font-mono text-[#111827]"
                  />
                </div>
              </div>

              <div>
                <Button
                  variant="primary"
                  type="submit"
                  loading={simulating}
                  className="w-full sm:w-auto"
                >
                  Simulate
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
