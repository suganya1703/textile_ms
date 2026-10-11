import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Printer,
  QrCode
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
  ControlPanel,
  formatStatus,
  formatNumber,
  formatINR,
  useToast
} from '../components/common';
import { api } from '../api/client';
import { PrintLabelsModal } from '../components/common/RollLabel';

export function DispatchView() {
  const [activeTab, setActiveTab] = useState('History'); // 'History' | 'Dispatch Rolls' | 'Finished Stock'
  const [finishedStock, setFinishedStock] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [dispatchHistory, setDispatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
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

  const [settings, setSettings] = useState({});
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [rollsToPrint, setRollsToPrint] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stockRes, buyRes, histRes, setRes] = await Promise.all([
        api.getFinishedStock(),
        api.getBuyers(),
        api.getDispatchHistory().catch(() => []),
        api.getSettings().catch(() => ({}))
      ]);
      setFinishedStock(stockRes);
      setBuyers(buyRes || []);
      setDispatchHistory(histRes || []);
      setSettings(setRes || {});

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
          className="rounded border-gray-300 text-[#2F3E8F] focus:ring-[#2F3E8F] cursor-pointer"
        />
      ),
      accessor: 'id',
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedRollIds.has(r.id)}
          onChange={() => toggleRoll(r.id)}
          className="rounded border-gray-300 text-[#2F3E8F] focus:ring-[#2F3E8F] cursor-pointer"
        />
      )
    },
    {
      header: '#',
      accessor: 'roll_number',
      sortable: true,
      render: (r) => (
        <span className="font-mono font-bold text-[#2F3E8F] text-xs sm:text-sm">
          {r.roll_number}
        </span>
      )
    },
    {
      header: 'Order #',
      accessor: 'order_number',
      sortable: true,
      render: (r) => (
        <span className="font-mono font-semibold text-[#111827] text-xs sm:text-sm">
          #{r.order_number}
        </span>
      )
    },
    {
      header: 'Dye Lot',
      accessor: 'dye_lot',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-[#111827]">
          {r.dye_lot || 'LOT-NB-01'}
        </span>
      )
    },
    {
      header: 'Length',
      accessor: 'length_m',
      sortable: true,
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums text-[#111827] font-semibold">
          {formatNumber(r.length_m)} m
        </span>
      )
    },
    {
      header: 'Grade',
      accessor: 'grade',
      sortable: true,
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
      sortable: true,
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums text-[#111827]">
          {formatINR(r.order_price_per_m || 130)}
        </span>
      )
    },
    {
      header: 'Passport',
      accessor: 'id',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => {
            setRollsToPrint([r]);
            setIsPrintModalOpen(true);
          }}
          className="flex items-center gap-1 text-xs text-[#2F3E8F] hover:bg-indigo-50 px-2 py-1 rounded border border-indigo-200 transition-colors cursor-pointer"
          title="Print 4x2 QR Passport Label"
        >
          <QrCode className="w-3.5 h-3.5" />
          Label
        </button>
      )
    }
  ];

  // Dispatch History Table Columns
  const historyColumns = [
    {
      header: 'DISPATCH #',
      accessor: 'dispatch_number',
      sortable: true,
      render: (d) => (
        <span className="font-mono font-bold text-xs text-[#2F3E8F]">
          {d.dispatch_number}
        </span>
      )
    },
    {
      header: 'BUYER',
      accessor: 'buyer_name',
      sortable: true,
      render: (d) => (
        <span className="font-semibold text-xs text-gray-900">
          {d.buyer_name}
        </span>
      )
    },
    {
      header: 'VEHICLE NO',
      accessor: 'vehicle_no',
      sortable: true,
      render: (d) => (
        <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {d.vehicle_no || 'TN-38-EX-1001'}
        </span>
      )
    },
    {
      header: 'ROLLS',
      accessor: 'roll_count',
      sortable: true,
      align: 'right',
      render: (d) => (
        <span className="font-mono tabular-nums text-xs font-semibold text-gray-900">
          {d.roll_count || 1}
        </span>
      )
    },
    {
      header: 'TOTAL METRES',
      accessor: 'total_metres',
      sortable: true,
      align: 'right',
      render: (d) => (
        <span className="font-mono tabular-nums text-xs text-gray-900 font-semibold">
          {formatNumber(d.total_metres || 0)} m
        </span>
      )
    },
    {
      header: 'INVOICE #',
      accessor: 'invoice_no',
      sortable: true,
      render: (d) => (
        <span className="font-mono text-xs text-gray-600">
          {d.invoice_no ? `#${d.invoice_no}` : 'INV-GEN'}
        </span>
      )
    },
    {
      header: 'INVOICE TOTAL',
      accessor: 'invoice_total',
      sortable: true,
      align: 'right',
      render: (d) => (
        <span className="font-mono tabular-nums text-xs font-bold text-[#2F3E8F]">
          {formatINR(d.invoice_total || 0)}
        </span>
      )
    },
    {
      header: 'STATUS',
      accessor: 'id',
      render: () => (
        <Badge variant="accent">
          Dispatched
        </Badge>
      )
    }
  ];

  // History Filter & Search computation
  const historyFilters = [
    { key: 'all', label: 'All Dispatches', count: dispatchHistory.length },
    ...buyers.slice(0, 3).map((b) => ({
      key: `buyer-${b.id}`,
      label: b.name.split(' ')[0],
      count: dispatchHistory.filter((d) => d.buyer_id === b.id).length
    }))
  ];

  const filteredHistory = dispatchHistory.filter((d) => {
    if (historyFilter !== 'all' && historyFilter.startsWith('buyer-')) {
      const buyerId = Number(historyFilter.replace('buyer-', ''));
      if (d.buyer_id !== buyerId) return false;
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase().trim();
      const num = String(d.dispatch_number || '').toLowerCase();
      const bname = String(d.buyer_name || '').toLowerCase();
      const veh = String(d.vehicle_no || '').toLowerCase();
      const inv = String(d.invoice_no || '').toLowerCase();
      return num.includes(q) || bname.includes(q) || veh.includes(q) || inv.includes(q);
    }
    return true;
  });

  const totalHistoryMetres = filteredHistory.reduce((acc, d) => acc + (d.total_metres || 0), 0);
  const totalHistoryRolls = filteredHistory.reduce((acc, d) => acc + (d.roll_count || 0), 0);
  const totalHistoryInvoice = filteredHistory.reduce((acc, d) => acc + (d.invoice_total || 0), 0);

  return (
    <div className="space-y-4">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
          Dispatch
        </h1>
        <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
          Consignment history, warehouse staging, dye-lot guard and invoice generation
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        {[
          { key: 'History', label: 'Dispatch History' },
          { key: 'Dispatch Rolls', label: '+ New Dispatch' },
          { key: 'Finished Stock', label: 'Finished Stock' }
        ].map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#2F3E8F] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'History' && (
        <div className="space-y-4">
          <ControlPanel
            breadcrumbs={[
              { label: 'Dispatch', onClick: () => setActiveTab('History') },
              { label: 'Consignments & History' }
            ]}
            searchPlaceholder="Search dispatch #, buyer, vehicle, invoice..."
            searchValue={historySearch}
            onSearchChange={setHistorySearch}
            filters={historyFilters}
            activeFilter={historyFilter}
            onFilterChange={setHistoryFilter}
            primaryAction={{
              label: '+ New Dispatch',
              onClick: () => setActiveTab('Dispatch Rolls')
            }}
          />

          <Card>
            <CardHeader
              title="Consignment Dispatch History"
              subtitle={`Showing ${filteredHistory.length} completed dispatches`}
            />
            <CardContent className="pt-1">
              <div className="overflow-x-auto">
                <Table
                  columns={historyColumns}
                  data={filteredHistory}
                  keyField="id"
                  emptyMessage="No dispatch consignments match your filter."
                />
                <div className="mt-2 px-4 py-2.5 bg-gray-50 border border-t-0 border-gray-200 rounded-b-lg flex flex-wrap items-center justify-between text-xs font-semibold text-gray-700">
                  <span>Dispatches: <strong className="font-mono text-gray-900">{filteredHistory.length}</strong></span>
                  <span>Total Rolls: <strong className="font-mono text-[#2F3E8F]">{totalHistoryRolls}</strong></span>
                  <span>Total Length: <strong className="font-mono text-gray-900">{formatNumber(totalHistoryMetres)} m</strong></span>
                  <span>Total Invoiced: <strong className="font-mono text-[#2BA38C] text-sm">{formatINR(totalHistoryInvoice)}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'Dispatch Rolls' && (
        <div className="space-y-4">
          <ControlPanel
            breadcrumbs={[
              { label: 'Dispatch', onClick: () => setActiveTab('History') },
              { label: 'New Dispatch Wizard' }
            ]}
            primaryAction={{
              label: '← View History',
              onClick: () => setActiveTab('History'),
              variant: 'secondary'
            }}
          />

          {/* Select Buyer Card */}
          <Card>
            <CardHeader
              title="Select Buyer & Transport"
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
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] font-medium focus:outline-none focus:border-[#2F3E8F]"
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
                    className="w-full font-mono uppercase bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3.5 py-2 text-sm text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
                  />
                </div>

                <div>
                  <Button
                    variant="primary"
                    onClick={handleLoadRolls}
                    loading={loadingRolls}
                    className="w-full sm:w-auto"
                  >
                    Load Available Rolls
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
                      <span className="font-mono text-[#2F3E8F]">
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
      )}

      {activeTab === 'Finished Stock' && (
        <div className="space-y-4">
          <ControlPanel
            breadcrumbs={[
              { label: 'Dispatch', onClick: () => setActiveTab('History') },
              { label: 'Finished Goods Inventory' }
            ]}
            primaryAction={{
              label: '+ Dispatch Rolls',
              onClick: () => setActiveTab('Dispatch Rolls')
            }}
          />

          <Card>
            <CardHeader
              title="Finished Stock Inventory"
              subtitle="Rolls on warehouse shelf inspected, graded, and awaiting dispatch"
            />
            <CardContent className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#EEF2FF] rounded-[8px] border border-[#C7D2FE]">
                  <div className="text-xs font-semibold text-[#2F3E8F] uppercase">Total Ready Rolls</div>
                  <div className="text-2xl font-bold font-mono text-[#2F3E8F] mt-1">
                    {finishedStock?.total_ready_rolls || 14}
                  </div>
                </div>
                <div className="p-4 bg-teal-50 rounded-[8px] border border-teal-200">
                  <div className="text-xs font-semibold text-[#1F7D6B] uppercase">Total Metres on Shelf</div>
                  <div className="text-2xl font-bold font-mono text-[#1F7D6B] mt-1">
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
        </div>
      )}

      {/* 4x2 Label Print Modal */}
      <PrintLabelsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        rolls={rollsToPrint}
        baseUrl={settings.public_base_url?.value || window.location.origin || 'http://localhost:5173'}
      />
    </div>
  );
}
