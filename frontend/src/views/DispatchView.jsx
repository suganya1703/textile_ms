import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  FormField,
  Input,
  Select,
  Table,
  PageHeader,
  formatStatus,
  formatNumber,
  formatINR,
  useToast
} from '../components/common';
import { api } from '../api/client';

export function DispatchView() {
  const [activeTab, setActiveTab] = useState('Dispatch Rolls'); // 'Dispatch Rolls' or 'Finished Stock'
  const [finishedStock, setFinishedStock] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Wizard / Dispatch State
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('TN-38-CY-4821');
  const [eligibleRolls, setEligibleRolls] = useState([]);
  const [rollsLoaded, setRollsLoaded] = useState(false);
  const [loadingRolls, setLoadingRolls] = useState(false);

  // NONE SELECTED BY DEFAULT
  const [selectedRollIds, setSelectedRollIds] = useState(new Set());

  // Dye Lot Clash Guard State
  const [dyeLotClashWarning, setDyeLotClashWarning] = useState(null);
  const [overrideWarning, setOverrideWarning] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stockRes, buyRes] = await Promise.all([
        api.getFinishedStock(),
        api.getBuyers()
      ]);
      setFinishedStock(stockRes);
      setBuyers(buyRes || []);

      if (buyRes?.length > 0 && !selectedBuyerId) {
        setSelectedBuyerId(buyRes[0].id);
      }
    } catch (err) {
      showToast('Failed to load dispatch data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLoadRolls = async () => {
    if (!selectedBuyerId) return;
    try {
      setLoadingRolls(true);
      const res = await api.getEligibleRollsForBuyer(selectedBuyerId);
      setEligibleRolls(res.rolls || []);
      // NONE selected by default
      setSelectedRollIds(new Set());
      setRollsLoaded(true);
    } catch (err) {
      showToast('Error loading rolls: ' + err.message, 'error');
    } finally {
      setLoadingRolls(false);
    }
  };

  // Evaluate dye-lot guard whenever selectedRollIds change
  useEffect(() => {
    const selected = eligibleRolls.filter((r) => selectedRollIds.has(r.id));
    if (selected.length <= 1) {
      setDyeLotClashWarning(null);
      setOverrideWarning(false);
      return;
    }

    const lots = new Set(selected.map((r) => r.dye_lot).filter(Boolean));
    if (lots.size > 1) {
      const lotList = Array.from(lots).join(', ');
      setDyeLotClashWarning({
        message: `Dye Lot Clash Detected! Selected rolls span ${lots.size} distinct dye lots: [${lotList}]. Mixing dye lots in a single garment cut can cause shade variation disputes with buyers.`,
        lots: Array.from(lots)
      });
    } else {
      setDyeLotClashWarning(null);
      setOverrideWarning(false);
    }
  }, [selectedRollIds, eligibleRolls]);

  const toggleRoll = (id) => {
    const updated = new Set(selectedRollIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedRollIds(updated);
  };

  const handleSelectAll = () => {
    if (selectedRollIds.size === eligibleRolls.length) {
      setSelectedRollIds(new Set());
    } else {
      setSelectedRollIds(new Set(eligibleRolls.map((r) => r.id)));
    }
  };

  // Calculations
  const selectedRollsList = eligibleRolls.filter((r) => selectedRollIds.has(r.id));
  const totalLengthM = selectedRollsList.reduce((acc, r) => acc + (r.length_m || 0), 0);
  const estimatedSubtotal = selectedRollsList.reduce((acc, r) => acc + (r.length_m * (r.order_price_per_m || 130)), 0);
  const gstAmount = estimatedSubtotal * 0.05;
  const finalInvoiceTotal = estimatedSubtotal + gstAmount;

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (selectedRollIds.size === 0) {
      showToast('Please select at least 1 roll to dispatch', 'warning');
      return;
    }
    if (!vehicleNo.trim()) {
      showToast('Please enter transport vehicle number', 'warning');
      return;
    }
    if (dyeLotClashWarning && !overrideWarning) {
      showToast('Dye Lot Clash! Please resolve multi-lot selection or approve override.', 'warning');
      return;
    }

    try {
      setSubmittingDispatch(true);
      const res = await api.executeDispatch({
        buyer_id: Number(selectedBuyerId),
        roll_ids: Array.from(selectedRollIds),
        vehicle_no: vehicleNo.trim().toUpperCase(),
        override_dye_lot_warning: Boolean(overrideWarning),
        override_reason: overrideReason
      });

      showToast(`Invoice #${res.invoice_number} generated! ${res.rolls_dispatched} rolls dispatched.`, 'success');
      setSelectedRollIds(new Set());
      setOverrideWarning(false);
      setOverrideReason('');
      handleLoadRolls();
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const rollColumns = [
    {
      header: (
        <input
          type="checkbox"
          checked={eligibleRolls.length > 0 && selectedRollIds.size === eligibleRolls.length}
          onChange={handleSelectAll}
          className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67] cursor-pointer"
        />
      ),
      accessor: 'id',
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedRollIds.has(r.id)}
          onChange={() => toggleRoll(r.id)}
          className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67] cursor-pointer"
        />
      )
    },
    {
      header: '#',
      accessor: 'roll_number',
      render: (r) => (
        <span className="font-mono font-bold text-[#714B67] text-xs sm:text-sm">
          {r.roll_number}
        </span>
      )
    },
    {
      header: 'Order #',
      accessor: 'order_number',
      render: (r) => (
        <span className="font-mono font-semibold text-[#111827] text-xs sm:text-sm">
          #{r.order_number}
        </span>
      )
    },
    {
      header: 'Dye Lot',
      accessor: 'dye_lot',
      render: (r) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-[#111827]">
          {r.dye_lot || 'LOT-NB-01'}
        </span>
      )
    },
    {
      header: 'Length',
      accessor: 'length_m',
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums text-[#111827]">
          {formatNumber(r.length_m)} m
        </span>
      )
    },
    {
      header: 'Grade',
      accessor: 'grade',
      align: 'center',
      render: (r) => (
        <Badge variant={r.grade === 'A' ? 'grade-a' : 'grade-b'}>
          Grade {r.grade}
        </Badge>
      )
    },
    {
      header: 'Rate / m',
      accessor: 'order_price_per_m',
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums text-[#111827]">
          {formatINR(r.order_price_per_m || 130)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-5">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
          Dispatch
        </h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          Warehouse staging, dye-lot guard and invoice generation
        </p>
      </div>

      {/* Tabs: "Dispatch Rolls" and "Finished Stock" */}
      <div className="flex items-center gap-3 text-xs pt-1">
        {['Dispatch Rolls', 'Finished Stock'].map((item) => {
          const isActive = activeTab === item;
          return (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              className={`transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-[#111827] shadow-xs font-semibold px-3.5 py-1.5 rounded-[8px]'
                  : 'text-[#6B7280] hover:text-[#111827] px-2 py-1.5 font-normal'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {activeTab === 'Dispatch Rolls' ? (
        <div className="space-y-6">
          {/* "Select Buyer" card with Buyer and Vehicle No. inputs and a "Load Rolls" outlined button */}
          <Card>
            <CardHeader
              title="Select Buyer"
              subtitle="Choose buyer and transport details to pull QC-cleared warehouse rolls"
            />
            <CardContent className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1">
                    Buyer Name
                  </label>
                  <select
                    value={selectedBuyerId}
                    onChange={(e) => {
                      setSelectedBuyerId(e.target.value);
                      setRollsLoaded(false);
                    }}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] font-medium focus:outline-none focus:border-[#714B67]"
                  >
                    {buyers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city || 'India'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] block mb-1">
                    Transport Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="e.g. TN-38-CY-4821"
                    className="w-full font-mono uppercase bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <Button
                    variant="secondary"
                    onClick={handleLoadRolls}
                    loading={loadingRolls}
                    className="w-full sm:w-auto"
                  >
                    Load Rolls
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* After loading: roll checklist and totals */}
          {rollsLoaded && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Roll Checklist Table */}
              <div className="lg:col-span-8 space-y-4">
                <Card>
                  <CardHeader
                    title="Available QC-Passed Rolls"
                    subtitle={`${eligibleRolls.length} rolls ready in warehouse for this buyer`}
                  />
                  <CardContent className="p-0">
                    <Table
                      columns={rollColumns}
                      data={eligibleRolls}
                      keyField="id"
                      emptyMessage="No QC-passed rolls available for this buyer."
                    />
                  </CardContent>
                </Card>

                {/* Dye Lot Clash Warning */}
                {dyeLotClashWarning && (
                  <div className="p-4 bg-amber-50 rounded-[12px] border border-amber-300 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">
                          Dye Lot Clash Detected!
                        </h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          {dyeLotClashWarning.message}
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 pt-1 text-xs text-amber-950 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideWarning}
                        onChange={(e) => setOverrideWarning(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Override Dye-Lot Warning (Confirm with Buyer)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Totals Panel */}
              <div className="lg:col-span-4 space-y-4">
                <Card>
                  <CardHeader
                    title="Dispatch Summary"
                    subtitle="Calculated invoice value"
                  />
                  <CardContent className="space-y-3 pt-1 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                      <span className="text-[#6B7280]">Selected Rolls</span>
                      <span className="font-mono font-bold text-[#111827]">
                        {selectedRollIds.size} of {eligibleRolls.length}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                      <span className="text-[#6B7280]">Total Metres</span>
                      <span className="font-mono font-bold text-[#111827]">
                        {formatNumber(totalLengthM)} m
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                      <span className="text-[#6B7280]">Estimated Subtotal</span>
                      <span className="font-mono font-medium text-[#111827]">
                        {formatINR(estimatedSubtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-[#F3F4F6]">
                      <span className="text-[#6B7280]">GST (5%)</span>
                      <span className="font-mono font-medium text-[#111827]">
                        {formatINR(gstAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 text-base font-bold text-[#111827]">
                      <span>Total Invoice</span>
                      <span className="font-mono text-[#714B67]">
                        {formatINR(finalInvoiceTotal)}
                      </span>
                    </div>

                    <div className="pt-3">
                      <Button
                        variant="primary"
                        onClick={handleDispatchSubmit}
                        loading={submittingDispatch}
                        disabled={selectedRollIds.size === 0}
                        className="w-full"
                      >
                        Dispatch & Generate Invoice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Finished Stock View */
        <Card>
          <CardHeader
            title="Finished Stock Inventory"
            subtitle="Rolls on warehouse shelf inspected, graded, and awaiting dispatch"
          />
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                <div className="text-xs font-semibold text-[#6B7280] uppercase">Total Ready Rolls</div>
                <div className="text-2xl font-bold font-mono text-[#714B67] mt-1">
                  {finishedStock?.total_ready_rolls || 14}
                </div>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                <div className="text-xs font-semibold text-[#6B7280] uppercase">Total Metres on Shelf</div>
                <div className="text-2xl font-bold font-mono text-[#111827] mt-1">
                  {formatNumber(finishedStock?.total_ready_metres || 1420)} m
                </div>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                <div className="text-xs font-semibold text-[#6B7280] uppercase">Active Dye Lots</div>
                <div className="text-2xl font-bold font-mono text-[#111827] mt-1">
                  {finishedStock?.lots_count || 4}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
