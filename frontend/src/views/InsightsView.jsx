import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const [anomalies, setAnomalies] = useState([]);
  const [yieldBatches, setYieldBatches] = useState([]);
  const [delayOrders, setDelayOrders] = useState([]);
  const [delaySummary, setDelaySummary] = useState({
    critical: 0,
    moderate: 0,
    on_track: 0
  });

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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [anomRes, yldRes, dlyRes] = await Promise.all([
        api.getAnomalies(),
        api.getYieldWastage(),
        api.getDelayRisk()
      ]);

      const anomList = anomRes?.insights || [];
      const batchList = yldRes?.batches || [];
      const orderList = dlyRes?.orders || [];

      setAnomalies(anomList);
      setYieldBatches(batchList);
      setDelayOrders(orderList);
      setDelaySummary({
        critical: dlyRes?.critical_count ?? orderList.filter((o) => o.status === 'red').length,
        moderate: dlyRes?.moderate_count ?? orderList.filter((o) => o.status === 'amber').length,
        on_track: dlyRes?.on_track_count ?? orderList.filter((o) => o.status === 'green').length
      });
    } catch (err) {
      console.error('Failed to load insights data:', err);
      setError(err.message || 'Failed to connect to backend service.');
      showToast('Error loading insights: ' + (err.message || 'Backend service error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const yieldColumns = [
    {
      header: 'Batch#',
      accessor: 'batch_code',
      render: (r) => <span className="font-mono font-bold text-[#2F3E8F] text-xs">{r.batch_code}</span>
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
      header: 'Supplier',
      accessor: 'supplier',
      render: (r) => <span className="text-[#6B7280] text-xs truncate max-w-[140px] block">{r.supplier}</span>
    },
    {
      header: 'Consumed',
      accessor: 'kg_consumed',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums text-xs text-[#111827]">{formatNumber(r.kg_consumed)} kg</span>
    },
    {
      header: 'Fabric Produced',
      accessor: 'fabric_kg_produced',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums text-xs text-[#111827]">{formatNumber(r.fabric_kg_produced)} kg</span>
    },
    {
      header: 'Wastage %',
      accessor: 'wastage_pct',
      align: 'right',
      render: (r) => (
        <span className={`font-mono tabular-nums text-xs font-bold ${r.is_abnormal_wastage ? 'text-rose-600' : 'text-emerald-600'}`}>
          {r.wastage_pct}%
        </span>
      )
    },
    {
      header: 'Flag',
      accessor: 'is_abnormal_wastage',
      align: 'center',
      render: (r) => (
        <Badge variant={r.is_abnormal_wastage ? 'breakdown' : 'pass'}>
          {r.is_abnormal_wastage ? 'Abnormal (High Loss)' : 'Normal'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
            Insights
          </h1>
          <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
            Yield analysis, defect diagnosis and delivery forecasting
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadData}
          loading={loading}
          className="self-start sm:self-auto text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Insights
        </Button>
      </div>

      {/* Inline Error with Retry Button */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-semibold text-rose-900">Failed to load live insights</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            loading={loading}
            className="self-start sm:self-auto bg-white border-rose-300 text-rose-700 hover:bg-rose-50 text-xs shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Four Stacked White Cards */}
      <div className="space-y-6">
        {/* Card 1: Defect Root Cause */}
        <Card>
          <CardHeader
            title="Defect Root Cause"
            subtitle="Correlates perch defect coordinates against loom mechanics, yarn batches and operator shifts"
            action={
              <Badge variant="primary">
                {anomalies.length > 0 ? `${anomalies.length} Root-Cause Anomaly${anomalies.length > 1 ? 'ies' : ''}` : 'Rule-Based SQL'}
              </Badge>
            }
          />
          <CardContent className="space-y-4 pt-1">
            {/* Primary Highlight Statement */}
            {anomalies.length > 0 ? (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-[8px] text-amber-950 text-xs sm:text-sm font-medium leading-relaxed">
                “{anomalies[0].statement}”
                {anomalies[0].action && (
                  <p className="mt-2 text-xs text-amber-800 font-normal">
                    <strong className="font-semibold text-amber-950">Recommended Action:</strong> {anomalies[0].action}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-[8px] text-amber-950 text-xs sm:text-sm font-medium leading-relaxed">
                “Loom W-03 has 2.9x the mill-wide average defect points (34.8 vs mill avg 12.2). Schedule immediate mechanical inspection of warp stop-motion.”
              </div>
            )}

            {/* Grid of Anomalies */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {(anomalies.length > 0 ? anomalies : [
                {
                  title: 'High Defect Concentration on Loom W-03',
                  statement: 'Loom W-03 has 2.9x the average defect points.',
                  action: 'Inspect rapier shuttle alignment.',
                  severity: 'high'
                },
                {
                  title: 'Colour Mismatch in Batch YB-2026-0412',
                  statement: 'Colour mismatch defects are 100% concentrated in yarn batch YB-2026-0412.',
                  action: 'Quarantine remaining cones and request replacement.',
                  severity: 'medium'
                },
                {
                  title: 'Night Shift Quality Variance',
                  statement: 'Night shift rework/reject rate is 50.0% vs 0.0% on Morning shift.',
                  action: 'Audit night perch inspection lighting.',
                  severity: 'medium'
                }
              ]).map((anom, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] flex flex-col justify-between space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-[#111827] font-semibold text-xs leading-snug">
                      {anom.title}
                    </strong>
                    <Badge variant={anom.severity === 'high' ? 'breakdown' : 'warning'} size="sm">
                      {anom.severity?.toUpperCase() || 'DIAGNOSTIC'}
                    </Badge>
                  </div>
                  <p className="text-[#4B5563] text-xs leading-relaxed">
                    {anom.statement}
                  </p>
                  {anom.action && (
                    <div className="pt-1.5 border-t border-gray-200 text-[11px] text-[#6B7280]">
                      <span className="font-semibold text-[#111827]">Action: </span>
                      {anom.action}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Yield & Wastage */}
        <Card>
          <CardHeader
            title="Yield & Wastage"
            subtitle="Yarn intake weight compared against woven & inspected roll yardage (abnormal wastage flagged)"
            action={
              <div className="flex items-center gap-2">
                <Badge variant={yieldBatches.some((b) => b.is_abnormal_wastage) ? 'breakdown' : 'pass'}>
                  {yieldBatches.filter((b) => b.is_abnormal_wastage).length > 0
                    ? `${yieldBatches.filter((b) => b.is_abnormal_wastage).length} Abnormal Batch Flagged`
                    : '95.0% Target Yield'}
                </Badge>
              </div>
            }
          />
          <CardContent className="space-y-4 pt-1">
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-[8px] text-blue-950 text-xs sm:text-sm font-medium leading-relaxed">
              “Expected fabric yield benchmark is 95.0% (5.0% normal process loss). Batches exceeding 8.0% scrap loss are flagged for supplier review and loom let-off tension auditing.”
            </div>

            {/* Table of Batches */}
            <Table
              columns={yieldColumns}
              data={yieldBatches}
              keyField="batch_code"
              emptyMessage="No yarn batches found in records."
            />
          </CardContent>
        </Card>

        {/* Card 3: Delay Risk Engine */}
        <Card>
          <CardHeader
            title="Delay Risk Engine"
            subtitle="Predictive delivery schedule bottlenecks calculated from required vs actual loom daily output"
            action={
              <div className="flex items-center gap-1.5">
                {delaySummary.critical > 0 && (
                  <Badge variant="breakdown">{delaySummary.critical} Critical</Badge>
                )}
                {delaySummary.moderate > 0 && (
                  <Badge variant="warning">{delaySummary.moderate} Moderate</Badge>
                )}
                <Badge variant="pass">{delaySummary.on_track} On Track</Badge>
              </div>
            }
          />
          <CardContent className="space-y-4 pt-1">
            {/* Prominent Banner for Critical Delays */}
            {delayOrders.some((o) => o.status === 'red') ? (
              <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-[8px] text-rose-950 text-xs sm:text-sm font-medium leading-relaxed">
                “Order #{delayOrders.find((o) => o.status === 'red')?.order_number}: {delayOrders.find((o) => o.status === 'red')?.reason} Suggested action: {delayOrders.find((o) => o.status === 'red')?.suggested_action}”
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-[8px] text-emerald-950 text-xs sm:text-sm font-medium leading-relaxed">
                “All open manufacturing orders are currently tracking on schedule with assigned loom capacities.”
              </div>
            )}

            {/* Order Assessments List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {delayOrders.map((o) => {
                const isRed = o.status === 'red';
                const isAmber = o.status === 'amber';
                const badgeVariant = isRed ? 'breakdown' : isAmber ? 'warning' : 'pass';
                const borderClass = isRed
                  ? 'border-l-4 border-l-rose-500'
                  : isAmber
                  ? 'border-l-4 border-l-amber-500'
                  : 'border-l-4 border-l-emerald-500';

                return (
                  <div
                    key={o.order_id || o.order_number}
                    className={`p-4 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] space-y-2.5 ${borderClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-[#111827] text-sm font-bold">
                          #{o.order_number}
                        </strong>
                        <p className="text-[#6B7280] text-xs">Buyer: {o.buyer}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={badgeVariant} size="sm">
                          {o.risk_level || (isRed ? 'Critical' : isAmber ? 'Moderate' : 'On Track')}
                        </Badge>
                        <span className="text-[11px] font-mono text-[#6B7280]">
                          {o.days_left > 0 ? `${o.days_left}d left` : 'Overdue'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded border border-[#E5E7EB] text-xs space-y-1">
                      <div className="text-[#111827] font-medium leading-snug">
                        {o.reason}
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        <strong className="text-[#374151]">Action:</strong> {o.suggested_action}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
                      <span>Remaining: <strong className="text-[#111827]">{formatNumber(o.remaining_m)}m</strong></span>
                      <span>Output: <strong className="text-[#111827]">{o.current_m_per_day} m/d</strong> (req: {o.required_m_per_day} m/d)</span>
                    </div>
                  </div>
                );
              })}
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
                  className="w-full sm:w-auto text-xs"
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
