import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  FormField,
  Input,
  Select,
  Modal,
  Table,
  PageHeader,
  Breadcrumbs,
  ControlPanel,
  formatINR,
  formatNumber,
  useToast
} from '../components/common';
import { api } from '../api/client';

export function InventoryView() {
  const [batches, setBatches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Control panel search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Arrival Modal State
  const [isArrivalModalOpen, setIsArrivalModalOpen] = useState(false);
  const [arrivalForm, setArrivalForm] = useState({
    supplier_id: '',
    yarn_type: 'Cotton 40s Combed',
    colour: 'Raw White',
    kg_received: '',
    cost_per_kg: '',
    received_by: 'K. Murugesan'
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Feasibility Check Card State
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [typedOrderId, setTypedOrderId] = useState('7');
  const [feasibilityResult, setFeasibilityResult] = useState(null);
  const [checkingFeasibility, setCheckingFeasibility] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchRes, sumRes, supRes, ordRes] = await Promise.all([
        api.getYarnBatches(),
        api.getYarnStockSummary(),
        api.getSuppliers(),
        api.getOrders()
      ]);
      setBatches(batchRes || []);
      setSummary(sumRes);
      setSuppliers(supRes || []);
      setOrders(ordRes || []);

      if (supRes?.length > 0 && !arrivalForm.supplier_id) {
        setArrivalForm((prev) => ({ ...prev, supplier_id: supRes[0].id }));
      }
      if (ordRes?.length > 0 && !selectedOrderId) {
        setSelectedOrderId(ordRes[0].id);
      }
    } catch (err) {
      showToast('Failed to load inventory: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const checkOrderFeasibility = async (targetOrder) => {
    if (!targetOrder) return;
    try {
      setCheckingFeasibility(true);
      const res = await api.checkYarnFeasibility({
        fabric_type: targetOrder.fabric_type,
        colour: targetOrder.colour,
        quantity_m: targetOrder.quantity_m
      });
      setFeasibilityResult({ ...res, order: targetOrder });
    } catch (err) {
      console.error('Feasibility error:', err);
    } finally {
      setCheckingFeasibility(false);
    }
  };

  const handleRunCheck = () => {
    const matched =
      orders.find((o) => String(o.id) === String(selectedOrderId) || String(o.order_number).includes(typedOrderId)) ||
      orders[0];
    if (matched) {
      checkOrderFeasibility(matched);
    }
  };

  const handleArrivalSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!arrivalForm.supplier_id) errs.supplier_id = 'Supplier required';
    if (!arrivalForm.kg_received || Number(arrivalForm.kg_received) <= 0)
      errs.kg_received = 'Valid weight required';
    if (!arrivalForm.cost_per_kg || Number(arrivalForm.cost_per_kg) <= 0)
      errs.cost_per_kg = 'Valid rate required';

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      await api.logYarnArrival({
        supplier_id: Number(arrivalForm.supplier_id),
        yarn_type: arrivalForm.yarn_type,
        colour: arrivalForm.colour,
        kg_received: Number(arrivalForm.kg_received),
        cost_per_kg: Number(arrivalForm.cost_per_kg),
        received_by: arrivalForm.received_by
      });
      showToast('Yarn arrival booked & batch allocated!', 'success');
      setIsArrivalModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Intake booking failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Live filter and search on loaded batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // Filter chip
      if (statusFilter === 'Low Stock (< 100kg)' && b.kg_remaining >= 100) return false;
      if (statusFilter === 'In Stock' && b.kg_remaining < 100) return false;
      if (statusFilter === 'Combed' && !b.yarn_type?.toLowerCase().includes('combed')) return false;
      if (statusFilter === 'Carded' && !b.yarn_type?.toLowerCase().includes('carded')) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const codeMatch = (b.batch_code || '').toLowerCase().includes(term);
        const typeMatch = (b.yarn_type || '').toLowerCase().includes(term);
        const colMatch = (b.colour || '').toLowerCase().includes(term);
        const supMatch = (b.supplier_name || '').toLowerCase().includes(term);
        if (!codeMatch && !typeMatch && !colMatch && !supMatch) return false;
      }

      return true;
    });
  }, [batches, statusFilter, searchTerm]);

  const batchColumns = [
    {
      header: 'Batch Code',
      accessor: 'batch_code',
      render: (r) => (
        <span className="font-mono font-bold text-[#2F3E8F] text-xs">
          {r.batch_code}
        </span>
      )
    },
    {
      header: 'Supplier',
      accessor: 'supplier_name',
      render: (r) => <span className="font-medium text-[#111827] text-xs">{r.supplier_name}</span>
    },
    {
      header: 'Yarn Type',
      accessor: 'yarn_type',
      render: (r) => <span className="text-[#111827] text-xs">{r.yarn_type}</span>
    },
    {
      header: 'Colour / Shade',
      accessor: 'colour',
      render: (r) => <span className="text-[#4B5563] text-xs">{r.colour}</span>
    },
    {
      header: 'Received (kg)',
      accessor: 'kg_received',
      align: 'right',
      sum: true,
      sumRender: (total) => `${formatNumber(total)} kg`,
      render: (r) => (
        <span className="font-mono tabular-nums text-xs text-[#111827]">
          {formatNumber(r.kg_received)} kg
        </span>
      )
    },
    {
      header: 'Available (kg)',
      accessor: 'kg_remaining',
      align: 'right',
      sum: true,
      sumRender: (total) => `${formatNumber(total)} kg`,
      render: (r) => {
        const isLow = r.kg_remaining < 100;
        return (
          <span
            className={`font-mono tabular-nums text-xs font-bold ${
              isLow ? 'text-rose-600' : 'text-[#111827]'
            }`}
          >
            {formatNumber(r.kg_remaining)} kg
          </span>
        );
      }
    },
    {
      header: 'Cost / kg',
      accessor: 'cost_per_kg',
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums text-xs text-[#4B5563]">
          {formatINR(r.cost_per_kg)}
        </span>
      )
    },
    {
      header: 'Stock Health',
      accessor: 'kg_remaining',
      align: 'center',
      render: (r) => {
        const isLow = r.kg_remaining < 100;
        return (
          <Badge variant={isLow ? 'breakdown' : 'pass'}>
            {isLow ? 'Low Stock' : 'Available'}
          </Badge>
        );
      }
    }
  ];

  const stockItems = summary?.stock || [
    { yarn_type: 'Cotton 40s Combed', colour: 'Raw White', total_kg_available: 420 },
    { yarn_type: 'Cotton 30s Carded', colour: 'Navy Blue', total_kg_available: 430 },
    { yarn_type: 'Poly-Cotton 65/35', colour: 'Crimson Red', total_kg_available: 240 },
    { yarn_type: 'Cotton 30s Carded', colour: 'Jet Black', total_kg_available: 42 }
  ];

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
          Inventory
        </h1>
        <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
          Yarn warehouse balances, batch intake and production allocation
        </p>
      </div>

      {/* Control Panel: Breadcrumbs, Search, Filter Chips, Action Button */}
      <ControlPanel
        breadcrumbs={['Inventory', 'Yarn Batches & Warehouse']}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search batch code, yarn, supplier..."
        filterChips={[
          { id: 'All', label: 'All', count: batches.length },
          { id: 'In Stock', label: 'In Stock', count: batches.filter((b) => b.kg_remaining >= 100).length },
          { id: 'Low Stock (< 100kg)', label: 'Low Stock (< 100kg)', count: batches.filter((b) => b.kg_remaining < 100).length },
          { id: 'Combed', label: 'Combed', count: batches.filter((b) => b.yarn_type?.toLowerCase().includes('combed')).length },
          { id: 'Carded', label: 'Carded', count: batches.filter((b) => b.yarn_type?.toLowerCase().includes('carded')).length }
        ]}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        actionButton={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsArrivalModalOpen(true)}
          >
            + Log Yarn Arrival
          </Button>
        }
      />

      {/* KPI Cards: Current Yarn Stock Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stockItems.map((item, idx) => {
          const isLowStock = item.total_kg_available < 100;
          return (
            <div
              key={idx}
              className={`bg-white rounded-[12px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all ${
                isLowStock ? 'border-2 border-rose-400' : 'border border-[#E5E7EB]'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] truncate">
                {item.yarn_type}
              </div>
              <div className="text-sm text-[#4B5563] mt-0.5 truncate">
                {item.colour}
              </div>

              <div className="mt-3">
                <div
                  className={`text-[24px] font-bold font-mono tabular-nums leading-tight ${
                    isLowStock ? 'text-rose-600' : 'text-[#2F3E8F]'
                  }`}
                >
                  {formatNumber(item.total_kg_available)} kg
                </div>

                {isLowStock ? (
                  <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1.5">
                    <span>⚠️ Low stock (&lt; 100 kg threshold)</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#2BA38C] font-semibold flex items-center gap-1 mt-1.5">
                    <span>✓ Sufficient buffer stock</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Feasibility Check Card */}
      <Card>
        <CardHeader
          title="Order Feasibility Check"
          subtitle="Pre-check yarn balance availability before reserving material for manufacturing"
        />
        <CardContent className="space-y-4 pt-1">
          <div>
            <label className="text-xs font-semibold text-[#6B7280] block mb-1">
              Select or Enter Order ID
            </label>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                value={typedOrderId}
                onChange={(e) => {
                  setTypedOrderId(e.target.value);
                  const matched = orders.find(
                    (o) => String(o.id) === e.target.value || String(o.order_number).includes(e.target.value)
                  );
                  if (matched) setSelectedOrderId(matched.id);
                }}
                placeholder="e.g. 7"
                className="w-32 bg-white border border-[#D1D5DB] rounded-[8px] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
              />
              <button
                type="button"
                onClick={handleRunCheck}
                className="bg-white border border-[#2F3E8F] text-[#2F3E8F] hover:bg-indigo-50 px-4 py-1.5 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer"
              >
                Check Feasibility
              </button>
            </div>
          </div>

          {feasibilityResult && (
            <div
              className={`p-3.5 rounded-[8px] border text-xs ${
                feasibilityResult.is_sufficient
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="font-semibold text-sm">
                {feasibilityResult.is_sufficient
                  ? '✓ Yarn Sufficient for Order'
                  : `⚠️ Material Shortfall of ${formatNumber(feasibilityResult.shortfall_kg, 1)} kg`}
              </div>
              <p className="mt-1 font-mono text-[#4B5563]">
                Required: {formatNumber(feasibilityResult.yarn_required_kg, 1)} kg • Available: {formatNumber(feasibilityResult.stock_available_kg, 1)} kg
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yarn Batches Table */}
      <Card>
        <CardHeader
          title="Yarn Batches Ledger"
          subtitle="Received yarn consignments with remaining net weights and supplier details"
        />
        <CardContent className="p-0">
          <Table
            columns={batchColumns}
            data={filteredBatches}
            keyField="id"
            emptyMessage={`No yarn batches found matching '${statusFilter}' or query.`}
          />
        </CardContent>
      </Card>

      {/* Record Arrival Modal */}
      <Modal
        isOpen={isArrivalModalOpen}
        onClose={() => setIsArrivalModalOpen(false)}
        title="Record Yarn Arrival"
        subtitle="Gate intake weighing, mill lot allocation and batch generation"
      >
        <form onSubmit={handleArrivalSubmit} className="space-y-4">
          <FormField label="Supplier Name" error={formErrors.supplier_id} required>
            <Select
              value={arrivalForm.supplier_id}
              onChange={(e) => setArrivalForm({ ...arrivalForm, supplier_id: e.target.value })}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Yarn Count & Type" required>
              <Select
                value={arrivalForm.yarn_type}
                onChange={(e) => setArrivalForm({ ...arrivalForm, yarn_type: e.target.value })}
              >
                <option value="Cotton 40s Combed">Cotton 40s Combed</option>
                <option value="Cotton 30s Carded">Cotton 30s Carded</option>
                <option value="Poly-Cotton 65/35">Poly-Cotton 65/35</option>
                <option value="Polyester Filament">Polyester Filament</option>
                <option value="Cotton 60s Compact">Cotton 60s Compact</option>
              </Select>
            </FormField>

            <FormField label="Colour / Shade" required>
              <Input
                type="text"
                placeholder="Raw White"
                value={arrivalForm.colour}
                onChange={(e) => setArrivalForm({ ...arrivalForm, colour: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Net Weight Received (kg)" error={formErrors.kg_received} required>
              <Input
                type="number"
                step="10"
                placeholder="500"
                value={arrivalForm.kg_received}
                onChange={(e) => setArrivalForm({ ...arrivalForm, kg_received: e.target.value })}
              />
            </FormField>

            <FormField label="Cost per kg (₹)" error={formErrors.cost_per_kg} required>
              <Input
                type="number"
                step="5"
                placeholder="240"
                value={arrivalForm.cost_per_kg}
                onChange={(e) => setArrivalForm({ ...arrivalForm, cost_per_kg: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Received By / Store Keeper">
            <Input
              type="text"
              value={arrivalForm.received_by}
              onChange={(e) => setArrivalForm({ ...arrivalForm, received_by: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
            <Button variant="secondary" type="button" onClick={() => setIsArrivalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Confirm Intake & Generate Batch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
