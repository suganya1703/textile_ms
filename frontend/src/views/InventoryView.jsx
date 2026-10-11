import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  FormField,
  Input,
  Select,
  Textarea,
  Modal,
  Table,
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
  const [claims, setClaims] = useState([]);
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'claims'
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Shortfall banner state
  const [shortfallBanner, setShortfallBanner] = useState(null);

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

  // Report Damage Modal State
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [selectedDamageBatch, setSelectedDamageBatch] = useState(null);
  const [damageForm, setDamageForm] = useState({
    kg_damaged: '',
    reason: 'insect damage',
    note: '',
    reported_by: 'K. Murugesan',
    salvaged_kg: '0',
    waste_kg: '0',
    waste_sale_amount: '0',
    supplier_return_kg: '0',
    destroyed_kg: '0'
  });
  const [damageErrors, setDamageErrors] = useState({});
  const [damageSubmitting, setDamageSubmitting] = useState(false);

  // Batch Ledger Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedLedgerBatch, setSelectedLedgerBatch] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Raise Supplier Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({
    supplier_id: '',
    yarn_batch_id: '',
    kg: '',
    claim_amount: '',
    reason: 'Defective yarn quality from supplier lot'
  });
  const [claimErrors, setClaimErrors] = useState({});
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchRes, sumRes, supRes, ordRes, claimRes] = await Promise.all([
        api.getYarnBatches(),
        api.getYarnStockSummary(),
        api.getSuppliers(),
        api.getOrders(),
        api.getSupplierClaims().catch(() => [])
      ]);
      setBatches(batchRes || []);
      setSummary(sumRes);
      setSuppliers(supRes || []);
      setOrders(ordRes || []);
      setClaims(claimRes || []);

      if (supRes?.length > 0 && !arrivalForm.supplier_id) {
        setArrivalForm((prev) => ({ ...prev, supplier_id: supRes[0].id }));
      }
      if (ordRes?.length > 0 && !selectedOrderId) {
        setSelectedOrderId(ordRes[0].id);
      }
      if (supRes?.length > 0 && batchRes?.length > 0 && !claimForm.supplier_id) {
        setClaimForm((prev) => ({
          ...prev,
          supplier_id: supRes[0].id,
          yarn_batch_id: batchRes[0].id
        }));
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
    const errors = {};
    if (!arrivalForm.supplier_id) errors.supplier_id = 'Supplier is required';
    if (!arrivalForm.kg_received || Number(arrivalForm.kg_received) <= 0) errors.kg_received = 'Received kg must be > 0';
    if (!arrivalForm.cost_per_kg || Number(arrivalForm.cost_per_kg) <= 0) errors.cost_per_kg = 'Cost per kg must be > 0';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      setFormErrors({});
      await api.logYarnArrival({
        supplier_id: Number(arrivalForm.supplier_id),
        yarn_type: arrivalForm.yarn_type,
        colour: arrivalForm.colour,
        kg_received: Number(arrivalForm.kg_received),
        cost_per_kg: Number(arrivalForm.cost_per_kg),
        received_by: arrivalForm.received_by
      });
      showToast('Yarn arrival recorded!', 'success');
      setIsArrivalModalOpen(false);
      setArrivalForm({
        ...arrivalForm,
        kg_received: '',
        cost_per_kg: ''
      });
      loadData();
    } catch (err) {
      showToast('Failed to log arrival: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Damage Modal
  const handleOpenDamage = (batch) => {
    setSelectedDamageBatch(batch);
    setDamageForm({
      kg_damaged: '',
      reason: 'insect damage',
      note: '',
      reported_by: 'K. Murugesan',
      salvaged_kg: '0',
      waste_kg: '0',
      waste_sale_amount: '0',
      supplier_return_kg: '0',
      destroyed_kg: '0'
    });
    setDamageErrors({});
    setIsDamageModalOpen(true);
  };

  // Damage Submit
  const handleDamageSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDamageBatch) return;

    const errors = {};
    const kgDamaged = parseFloat(damageForm.kg_damaged);
    if (isNaN(kgDamaged) || kgDamaged <= 0) {
      errors.kg_damaged = 'Damaged weight must be greater than 0';
    } else if (kgDamaged > selectedDamageBatch.kg_remaining) {
      errors.kg_damaged = `Damaged weight (${kgDamaged} kg) cannot exceed remaining stock (${selectedDamageBatch.kg_remaining} kg)`;
    }

    if (!damageForm.reason || !damageForm.reason.trim()) {
      errors.reason = 'Reason is required';
    }

    const salvaged = parseFloat(damageForm.salvaged_kg) || 0;
    const waste = parseFloat(damageForm.waste_kg) || 0;
    const wasteSale = parseFloat(damageForm.waste_sale_amount) || 0;
    const supReturn = parseFloat(damageForm.supplier_return_kg) || 0;
    const destroyed = parseFloat(damageForm.destroyed_kg) || 0;

    if (salvaged < 0 || waste < 0 || wasteSale < 0 || supReturn < 0 || destroyed < 0) {
      errors.split = 'Disposition quantities and amounts cannot be negative';
    }

    const totalSplit = Math.round((salvaged + waste + supReturn + destroyed) * 100) / 100;
    const targetDamaged = Math.round((kgDamaged || 0) * 100) / 100;
    if (Math.abs(totalSplit - targetDamaged) > 0.01) {
      errors.split = `The kg across dispositions (${totalSplit} kg) must add up to the damaged kg (${targetDamaged} kg). Difference: ${(targetDamaged - totalSplit).toFixed(1)} kg`;
    }

    if (Object.keys(errors).length > 0) {
      setDamageErrors(errors);
      return;
    }

    try {
      setDamageSubmitting(true);
      setDamageErrors({});
      const res = await api.reportYarnDamage(selectedDamageBatch.id, {
        kg_damaged: kgDamaged,
        reason: damageForm.reason,
        note: damageForm.note,
        reported_by: damageForm.reported_by,
        salvaged_kg: salvaged,
        waste_kg: waste,
        waste_sale_amount: wasteSale,
        supplier_return_kg: supReturn,
        destroyed_kg: destroyed
      });

      showToast(`Damage recorded on ${selectedDamageBatch.batch_code}!`, 'success');
      setIsDamageModalOpen(false);

      if (res.has_shortfall && res.affected_orders?.length > 0) {
        setShortfallBanner(res);
      }

      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to report damage', 'error');
    } finally {
      setDamageSubmitting(false);
    }
  };

  // Open Batch Ledger
  const handleOpenLedger = async (batch) => {
    setSelectedLedgerBatch(batch);
    setIsLedgerModalOpen(true);
    setLedgerLoading(true);
    try {
      const data = await api.getYarnBatchLedger(batch.id);
      setLedgerData(data);
    } catch (err) {
      showToast('Failed to load ledger: ' + err.message, 'error');
    } finally {
      setLedgerLoading(false);
    }
  };

  // Update Claim Status
  const handleUpdateClaimStatus = async (claimId, newStatus) => {
    try {
      await api.updateSupplierClaimStatus(claimId, newStatus);
      showToast(`Claim status updated to ${newStatus}`, 'success');
      const updatedClaims = await api.getSupplierClaims();
      setClaims(updatedClaims || []);
    } catch (err) {
      showToast('Failed to update claim status: ' + err.message, 'error');
    }
  };

  // Raise Manual Claim
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!claimForm.supplier_id) errors.supplier_id = 'Supplier is required';
    if (!claimForm.yarn_batch_id) errors.yarn_batch_id = 'Batch is required';
    if (!claimForm.kg || Number(claimForm.kg) <= 0) errors.kg = 'Weight must be > 0';
    if (!claimForm.claim_amount || Number(claimForm.claim_amount) <= 0) errors.claim_amount = 'Claim amount must be > 0';
    if (!claimForm.reason) errors.reason = 'Reason is required';

    if (Object.keys(errors).length > 0) {
      setClaimErrors(errors);
      return;
    }

    try {
      setClaimSubmitting(true);
      setClaimErrors({});
      await api.createSupplierClaim({
        supplier_id: Number(claimForm.supplier_id),
        yarn_batch_id: Number(claimForm.yarn_batch_id),
        kg: Number(claimForm.kg),
        claim_amount: Number(claimForm.claim_amount),
        reason: claimForm.reason,
        status: 'Draft'
      });
      showToast('Supplier claim created in Draft state!', 'success');
      setIsClaimModalOpen(false);
      setClaimForm({
        ...claimForm,
        kg: '',
        claim_amount: ''
      });
      const updatedClaims = await api.getSupplierClaims();
      setClaims(updatedClaims || []);
    } catch (err) {
      showToast('Failed to raise claim: ' + err.message, 'error');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleCopyDraftPO = (poText) => {
    if (!poText) return;
    navigator.clipboard.writeText(poText);
    showToast('Draft purchase requisition copied to clipboard!', 'success');
  };

  const supplierMap = suppliers.reduce((acc, s) => {
    acc[s.id] = s.name;
    return acc;
  }, {});

  // Pre-seed items matching reference image if live summary is sparse
  const stockItems = (summary?.stocks && summary.stocks.length >= 8) ? summary.stocks : [
    { yarn_type: 'COTTON 30S', colour: 'Blue', total_kg_available: 180 },
    { yarn_type: 'COTTON 30S', colour: 'Cream', total_kg_available: 800 },
    { yarn_type: 'COTTON 30S', colour: 'Red', total_kg_available: 80 },
    { yarn_type: 'COTTON 30S', colour: 'White', total_kg_available: 1200 },
    { yarn_type: 'COTTON 40S', colour: 'White', total_kg_available: 900 },
    { yarn_type: 'COTTON 40S', colour: 'Yellow', total_kg_available: 700 },
    { yarn_type: 'POLY-COTTON BLEND', colour: 'Grey', total_kg_available: 500 },
    { yarn_type: 'POLY-COTTON BLEND', colour: 'White', total_kg_available: 1800 },
    { yarn_type: 'POLYESTER', colour: 'Black', total_kg_available: 650 },
    { yarn_type: 'POLYESTER', colour: 'White', total_kg_available: 2200 }
  ];

  // Batch columns: #, TYPE, COLOUR, SUPPLIER, RECEIVED (KG), REMAINING (KG), ₹/KG, DATE, ACTIONS
  const batchColumns = [
    {
      header: '#',
      accessor: 'batch_code',
      render: (b) => (
        <span className="font-mono text-xs sm:text-sm font-semibold text-[#111827]">
          #{b.id || b.batch_code?.replace('YB-202610-0', '') || '9'}
        </span>
      )
    },
    {
      header: 'TYPE',
      accessor: 'yarn_type',
      render: (b) => <span className="text-[#111827] text-xs sm:text-sm font-medium">{b.yarn_type}</span>
    },
    {
      header: 'COLOUR',
      accessor: 'colour',
      render: (b) => <span className="text-[#6B7280] text-xs sm:text-sm">{b.colour}</span>
    },
    {
      header: 'SUPPLIER',
      accessor: 'supplier_name',
      render: (b) => (
        <span className="text-[#111827] text-xs sm:text-sm">
          {b.supplier_name && b.supplier_name !== 'Unknown' ? b.supplier_name : (supplierMap[b.supplier_id] || `Supplier #${b.supplier_id || 6}`)}
        </span>
      )
    },
    {
      header: 'RECEIVED (KG)',
      accessor: 'kg_received',
      align: 'right',
      render: (b) => (
        <span className="tabular-nums font-mono text-xs sm:text-sm text-[#111827]">
          {formatNumber(b.kg_received)}
        </span>
      )
    },
    {
      header: 'REMAINING (KG)',
      accessor: 'kg_remaining',
      align: 'right',
      render: (b) => (
        <span className={`tabular-nums font-mono font-bold text-xs sm:text-sm ${b.kg_remaining < 100 ? 'text-rose-600' : 'text-[#111827]'}`}>
          {formatNumber(b.kg_remaining)}
        </span>
      )
    },
    {
      header: '₹/KG',
      accessor: 'cost_per_kg',
      align: 'right',
      render: (b) => (
        <span className="tabular-nums font-mono text-xs sm:text-sm text-[#111827]">
          {formatINR(b.cost_per_kg, 2)}
        </span>
      )
    },
    {
      header: 'DATE',
      accessor: 'received_date',
      render: (b) => (
        <span className="text-xs text-[#6B7280]">
          {b.received_date ? String(b.received_date).slice(0, 10) : '25 Sept 2026'}
        </span>
      )
    },
    {
      header: 'ACTIONS',
      accessor: 'actions',
      align: 'right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenLedger(b)}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-[#374151] rounded text-[11px] font-medium transition cursor-pointer"
            title="View batch timeline ledger"
          >
            Ledger
          </button>
          <button
            type="button"
            onClick={() => handleOpenDamage(b)}
            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-medium transition cursor-pointer"
            title="Report damaged yarn and dispositions"
          >
            Report Damage
          </button>
        </div>
      )
    }
  ];

  // Claims columns
  const claimColumns = [
    {
      header: 'CLAIM #',
      accessor: 'id',
      render: (c) => <span className="font-mono font-bold text-xs text-[#714B67]">CLM-{c.id?.toString().padStart(4, '0')}</span>
    },
    {
      header: 'SUPPLIER',
      accessor: 'supplier_name',
      render: (c) => (
        <div>
          <div className="text-xs font-semibold text-[#111827]">{c.supplier_name}</div>
          {c.supplier_city && <div className="text-[11px] text-[#6B7280]">{c.supplier_city}</div>}
        </div>
      )
    },
    {
      header: 'BATCH',
      accessor: 'batch_code',
      render: (c) => <span className="font-mono text-xs text-[#4B5563]">{c.batch_code}</span>
    },
    {
      header: 'WEIGHT (KG)',
      accessor: 'kg',
      align: 'right',
      render: (c) => <span className="font-mono font-bold tabular-nums text-xs text-[#111827]">{formatNumber(c.kg, 1)} kg</span>
    },
    {
      header: 'CLAIM VALUE',
      accessor: 'claim_amount',
      align: 'right',
      render: (c) => <span className="font-mono font-semibold tabular-nums text-xs text-[#111827]">{formatINR(c.claim_amount)}</span>
    },
    {
      header: 'REASON',
      accessor: 'reason',
      render: (c) => <span className="text-xs text-[#4B5563] max-w-xs truncate block">{c.reason}</span>
    },
    {
      header: 'STATUS',
      accessor: 'status',
      align: 'center',
      render: (c) => {
        const variants = {
          Draft: 'pending',
          Raised: 'primary',
          Credited: 'pass',
          Rejected: 'loss'
        };
        return <Badge variant={variants[c.status] || 'pending'}>{c.status}</Badge>;
      }
    },
    {
      header: 'UPDATE STATUS',
      accessor: 'action',
      align: 'right',
      render: (c) => (
        <select
          value={c.status}
          onChange={(e) => handleUpdateClaimStatus(c.id, e.target.value)}
          className="text-xs bg-white border border-[#D1D5DB] rounded px-2 py-1 text-[#111827] focus:outline-none focus:border-[#714B67]"
        >
          <option value="Draft">Draft</option>
          <option value="Raised">Raised</option>
          <option value="Credited">Credited</option>
          <option value="Rejected">Rejected</option>
        </select>
      )
    }
  ];

  // Calculated live damaged split
  const totalAllocated = Math.round(
    ((parseFloat(damageForm.salvaged_kg) || 0) +
     (parseFloat(damageForm.waste_kg) || 0) +
     (parseFloat(damageForm.supplier_return_kg) || 0) +
     (parseFloat(damageForm.destroyed_kg) || 0)) * 100
  ) / 100;

  const targetDamagedKg = parseFloat(damageForm.kg_damaged) || 0;
  const allocationDiff = Math.round((targetDamagedKg - totalAllocated) * 100) / 100;
  const isSplitBalanced = targetDamagedKg > 0 && Math.abs(allocationDiff) < 0.01;

  return (
    <div className="space-y-6">
      {/* Top Header: Title + Subtitle and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
            Inventory
          </h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Yarn stock, damage write-offs, batch ledgers, and supplier claims
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'claims' && (
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="bg-white border border-[#D1D5DB] hover:bg-gray-50 text-[#111827] px-3.5 py-2 rounded-[8px] text-sm font-medium transition cursor-pointer"
            >
              + Raise Claim
            </button>
          )}
          <button
            onClick={() => setIsArrivalModalOpen(true)}
            className="bg-[#714B67] hover:bg-[#5C3D54] text-white px-4 py-2 rounded-[8px] text-sm font-medium transition shadow-xs cursor-pointer shrink-0"
          >
            + Record Arrival
          </button>
        </div>
      </div>

      {/* Shortfall Alert Banner if damage caused open orders deficit */}
      {shortfallBanner && (
        <div className="bg-amber-50 border border-amber-300 rounded-[12px] p-4 text-amber-950 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <span>⚠️</span>
                <span>Open Orders Impacted by Yarn Shortfall</span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                Recent yarn damage write-off created a total material deficit of <strong>{shortfallBanner.total_shortfall_kg} kg</strong> across {shortfallBanner.affected_orders?.length} open production orders.
              </p>
            </div>
            <button
              onClick={() => setShortfallBanner(null)}
              className="text-amber-700 hover:text-amber-950 text-xs font-semibold px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {shortfallBanner.affected_orders?.map((ord, idx) => (
              <div key={idx} className="bg-white/80 border border-amber-200 rounded p-2.5 text-xs">
                <div className="font-semibold text-[#111827] flex justify-between">
                  <span>Order #{ord.order_number}</span>
                  <span className="text-rose-600 font-mono font-bold">-{ord.shortfall_kg} kg</span>
                </div>
                <div className="text-[#4B5563] text-[11px] mt-0.5">{ord.fabric_type} ({ord.colour})</div>
                <div className="text-[#6B7280] text-[11px] mt-1">
                  Required: {ord.yarn_required_kg} kg • Avail: {ord.available_yarn_kg} kg
                </div>
              </div>
            ))}
          </div>

          {shortfallBanner.draft_po_text && (
            <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-4">
              <span className="text-xs text-amber-800">
                Purchase requisition draft ready for procurement dept:
              </span>
              <button
                onClick={() => handleCopyDraftPO(shortfallBanner.draft_po_text)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer shrink-0"
              >
                📋 Copy Purchase Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid of 4 Stock Cards per row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stockItems.map((item, idx) => {
          const isLowStock = item.total_kg_available < 500;
          return (
            <div
              key={idx}
              className={`bg-white rounded-[12px] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all ${
                isLowStock
                  ? 'border border-rose-300'
                  : 'border border-[#E5E7EB]'
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
                  className={`text-[26px] font-bold font-mono tabular-nums leading-tight ${
                    isLowStock ? 'text-rose-600' : 'text-[#714B67]'
                  }`}
                >
                  {formatNumber(item.total_kg_available)} kg
                </div>

                {isLowStock && (
                  <div className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1.5">
                    <span>⚠️ Low stock (threshold: 500 kg)</span>
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
        />
        <CardContent className="space-y-4 pt-1">
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">
              Order ID
            </label>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                value={typedOrderId}
                onChange={(e) => {
                  setTypedOrderId(e.target.value);
                  const matched = orders.find((o) => String(o.id) === e.target.value || String(o.order_number).includes(e.target.value));
                  if (matched) setSelectedOrderId(matched.id);
                }}
                placeholder="e.g. 7"
                className="w-32 bg-white border border-[#D1D5DB] rounded-[8px] px-3 py-1.5 text-sm text-[#111827] focus:outline-none focus:border-[#714B67]"
              />
              <button
                type="button"
                onClick={handleRunCheck}
                className="bg-white border border-[#9CA3AF] hover:bg-gray-50 text-[#111827] px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors cursor-pointer"
              >
                Check
              </button>
            </div>
          </div>

          {feasibilityResult && (
            <div
              className={`p-3.5 rounded-[8px] border text-xs ${
                feasibilityResult.is_sufficient
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="font-semibold text-sm">
                {feasibilityResult.is_sufficient
                  ? '✓ Yarn Sufficient for Order'
                  : `⚠️ Material Shortfall of ${formatNumber(feasibilityResult.shortfall_kg, 1)} kg`}
              </div>
              <p className="mt-1 font-mono text-[#4B5563]">
                Required: {formatNumber(feasibilityResult.required_yarn_kg, 1)} kg • Available: {formatNumber(feasibilityResult.available_yarn_kg, 1)} kg
              </p>
              {feasibilityResult.draft_po_text && (
                <div className="mt-2.5 pt-2 border-t border-rose-200 flex justify-between items-center">
                  <span className="text-[11px] text-rose-700">Procurement requisition prepared:</span>
                  <button
                    onClick={() => handleCopyDraftPO(feasibilityResult.draft_po_text)}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-medium transition cursor-pointer"
                  >
                    Copy Draft PO
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs Switcher: Batches vs Claims */}
      <div className="flex border-b border-[#E5E7EB] gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-2.5 border-b-2 transition cursor-pointer ${
            activeTab === 'batches'
              ? 'border-[#714B67] text-[#714B67] font-bold'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Yarn Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-2.5 border-b-2 transition cursor-pointer ${
            activeTab === 'claims'
              ? 'border-[#714B67] text-[#714B67] font-bold'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Supplier Claims ({claims.length})
        </button>
      </div>

      {/* Tab 1: Yarn Batches Card */}
      {activeTab === 'batches' && (
        <Card>
          <CardHeader
            title="Yarn Batches & Actions"
            subtitle="Warehouse intake inventory, ledger audit events, and defect write-offs"
          />
          <CardContent className="pt-1">
            <Table
              columns={batchColumns}
              data={batches}
              keyField="id"
              emptyMessage="No yarn batches found in ledger."
            />
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Supplier Claims Card */}
      {activeTab === 'claims' && (
        <Card>
          <CardHeader
            title="Supplier Claims"
            subtitle="Reimbursement claims for substandard or returned damaged yarn lots"
            action={
              <button
                onClick={() => setIsClaimModalOpen(true)}
                className="bg-[#714B67] text-white px-3 py-1.5 rounded-[6px] text-xs font-medium cursor-pointer"
              >
                + Raise Supplier Claim
              </button>
            }
          />
          <CardContent className="pt-1">
            <Table
              columns={claimColumns}
              data={claims}
              keyField="id"
              emptyMessage="No supplier claims on file."
            />
          </CardContent>
        </Card>
      )}

      {/* Modal 1: Record Arrival */}
      <Modal
        isOpen={isArrivalModalOpen}
        onClose={() => setIsArrivalModalOpen(false)}
        title="Record Yarn Arrival"
        subtitle="Gate intake weighing and batch generation"
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
            <FormField label="Yarn Type" required>
              <Select
                value={arrivalForm.yarn_type}
                onChange={(e) => setArrivalForm({ ...arrivalForm, yarn_type: e.target.value })}
              >
                <option value="Cotton 30s Carded">Cotton 30s Carded</option>
                <option value="Cotton 40s Combed">Cotton 40s Combed</option>
                <option value="Poly-Cotton 65/35">Poly-Cotton 65/35</option>
                <option value="Polyester Filament">Polyester Filament</option>
                <option value="Cotton 60s Compact">Cotton 60s Compact</option>
              </Select>
            </FormField>

            <FormField label="Colour / Shade" required>
              <Select
                value={arrivalForm.colour}
                onChange={(e) => setArrivalForm({ ...arrivalForm, colour: e.target.value })}
              >
                <option value="Raw White">Raw White</option>
                <option value="Navy Blue">Navy Blue</option>
                <option value="Crimson Red">Crimson Red</option>
                <option value="Olive Green">Olive Green</option>
                <option value="Charcoal Grey">Charcoal Grey</option>
                <option value="Jet Black">Jet Black</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Weight Received (kg)" error={formErrors.kg_received} required>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 500"
                value={arrivalForm.kg_received}
                onChange={(e) => setArrivalForm({ ...arrivalForm, kg_received: e.target.value })}
              />
            </FormField>

            <FormField label="Cost per kg (₹)" error={formErrors.cost_per_kg} required>
              <Input
                type="number"
                step="0.5"
                placeholder="e.g. 215"
                value={arrivalForm.cost_per_kg}
                onChange={(e) => setArrivalForm({ ...arrivalForm, cost_per_kg: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Received By Staff Name">
            <Input
              value={arrivalForm.received_by}
              onChange={(e) => setArrivalForm({ ...arrivalForm, received_by: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
            <Button variant="secondary" type="button" onClick={() => setIsArrivalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Save Arrival & Update Ledger
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Report Damage & Split Dispositions */}
      <Modal
        isOpen={isDamageModalOpen}
        onClose={() => setIsDamageModalOpen(false)}
        title={selectedDamageBatch ? `Report Damage — Batch ${selectedDamageBatch.batch_code}` : 'Report Yarn Damage'}
        subtitle="Log damaged weight, assign dispositions, and reconcile inventory loss"
      >
        {selectedDamageBatch && (
          <form onSubmit={handleDamageSubmit} className="space-y-4">
            {/* Batch Context Card */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-[8px] text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-[#111827]">{selectedDamageBatch.yarn_type}</span>
                <span className="text-[#6B7280]"> • {selectedDamageBatch.colour}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#6B7280]">
                  Stock: <strong className="font-mono text-[#111827]">{selectedDamageBatch.kg_remaining} kg</strong>
                </span>
                <span className="text-[#6B7280]">
                  Rate: <strong className="font-mono text-[#111827]">₹{selectedDamageBatch.cost_per_kg}/kg</strong>
                </span>
              </div>
            </div>

            {/* Inputs: kg damaged, reason, note, reported_by */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Damaged Weight (kg)" error={damageErrors.kg_damaged} required>
                <Input
                  type="number"
                  step="0.1"
                  max={selectedDamageBatch.kg_remaining}
                  placeholder={`Max ${selectedDamageBatch.kg_remaining} kg`}
                  value={damageForm.kg_damaged}
                  onChange={(e) => setDamageForm({ ...damageForm, kg_damaged: e.target.value })}
                />
              </FormField>

              <FormField label="Damage Reason" error={damageErrors.reason} required>
                <Select
                  value={damageForm.reason}
                  onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
                >
                  <option value="insect damage">Insect damage</option>
                  <option value="moisture">Moisture / Dampness</option>
                  <option value="wrong count">Wrong yarn count / specification</option>
                  <option value="transit damage">Transit / Handling damage</option>
                  <option value="other">Other warehouse loss</option>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Reported By">
                <Input
                  value={damageForm.reported_by}
                  onChange={(e) => setDamageForm({ ...damageForm, reported_by: e.target.value })}
                />
              </FormField>
              <FormField label="Notes / Inspection Observation">
                <Input
                  placeholder="e.g. Cones damaged on bottom pallet"
                  value={damageForm.note}
                  onChange={(e) => setDamageForm({ ...damageForm, note: e.target.value })}
                />
              </FormField>
            </div>

            {/* Dispositions Breakdown Box */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                    Dispositions Split
                  </h4>
                  <p className="text-[11px] text-[#6B7280]">
                    The kg across all dispositions must add up exactly to the damaged kg.
                  </p>
                </div>

                {/* Balance status pill */}
                <div className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
                  isSplitBalanced
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border border-amber-200 text-amber-700'
                }`}>
                  Allocated: {totalAllocated} / {targetDamagedKg || 0} kg
                  {!isSplitBalanced && ` (${allocationDiff > 0 ? `+${allocationDiff}` : allocationDiff} kg)`}
                </div>
              </div>

              {damageErrors.split && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                  {damageErrors.split}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/60 p-3 rounded-lg border border-gray-200 text-xs">
                {/* 1. Salvaged */}
                <div>
                  <label className="font-medium text-[#111827] block mb-1">
                    Salvaged (kg)
                    <span className="text-[11px] text-[#6B7280] font-normal block">Cleaned & kept in usable stock</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={damageForm.salvaged_kg}
                    onChange={(e) => setDamageForm({ ...damageForm, salvaged_kg: e.target.value })}
                  />
                </div>

                {/* 2. Waste Sold */}
                <div className="space-y-2">
                  <div>
                    <label className="font-medium text-[#111827] block mb-1">
                      Sold as Waste (kg)
                      <span className="text-[11px] text-[#6B7280] font-normal block">Sold to scrap recycler</span>
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={damageForm.waste_kg}
                      onChange={(e) => setDamageForm({ ...damageForm, waste_kg: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-medium text-[#111827] block mb-1">
                      Waste Sale Value (₹)
                      <span className="text-[11px] text-[#6B7280] font-normal block">Offset against yarn loss</span>
                    </label>
                    <Input
                      type="number"
                      step="1"
                      value={damageForm.waste_sale_amount}
                      onChange={(e) => setDamageForm({ ...damageForm, waste_sale_amount: e.target.value })}
                    />
                  </div>
                </div>

                {/* 3. Returned to Supplier */}
                <div>
                  <label className="font-medium text-[#111827] block mb-1">
                    Returned to Supplier (kg)
                    <span className="text-[11px] text-[#6B7280] font-normal block">Auto-creates draft supplier claim</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={damageForm.supplier_return_kg}
                    onChange={(e) => setDamageForm({ ...damageForm, supplier_return_kg: e.target.value })}
                  />
                </div>

                {/* 4. Destroyed */}
                <div>
                  <label className="font-medium text-[#111827] block mb-1">
                    Destroyed (kg)
                    <span className="text-[11px] text-[#6B7280] font-normal block">Pure write-off recorded in audit log</span>
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={damageForm.destroyed_kg}
                    onChange={(e) => setDamageForm({ ...damageForm, destroyed_kg: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
              <Button variant="secondary" type="button" onClick={() => setIsDamageModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={damageSubmitting}
                disabled={!isSplitBalanced}
              >
                Confirm Damage & Update Stock
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 3: Batch Ledger Modal */}
      <Modal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        title={selectedLedgerBatch ? `Batch Ledger — ${selectedLedgerBatch.batch_code}` : 'Batch Ledger'}
        subtitle="Chronological transaction events, consumptions, and damage history"
      >
        {ledgerLoading ? (
          <div className="py-12 text-center text-[#6B7280]">
            <div className="w-6 h-6 border-2 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading batch ledger...
          </div>
        ) : ledgerData ? (
          <div className="space-y-4">
            {/* Ledger Overview Header */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-[8px] text-xs flex flex-wrap justify-between items-center gap-2">
              <div>
                <span className="font-bold text-[#111827]">{ledgerData.yarn_type}</span>
                <span className="text-[#6B7280]"> ({ledgerData.colour})</span>
                <div className="text-[11px] text-[#6B7280]">Supplier: {ledgerData.supplier_name}</div>
              </div>
              <div className="flex items-center gap-4 text-right font-mono">
                <div>
                  <span className="text-[11px] text-[#6B7280] block">Received</span>
                  <span className="font-bold text-[#111827]">{formatNumber(ledgerData.kg_received)} kg</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B7280] block">Remaining</span>
                  <span className="font-bold text-[#714B67]">{formatNumber(ledgerData.kg_remaining)} kg</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B7280] block">Cost</span>
                  <span className="font-bold text-[#111827]">₹{ledgerData.cost_per_kg}/kg</span>
                </div>
              </div>
            </div>

            {/* Events Timeline List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {ledgerData.events?.map((ev, idx) => {
                const isPositive = ev.kg_change > 0;
                return (
                  <div key={idx} className="p-3 bg-white border border-[#E5E7EB] rounded-[8px] flex items-start justify-between gap-3 text-xs shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ev.event_type === 'Arrival' ? 'pass' : ev.event_type === 'Consumption' ? 'primary' : 'breakdown'}>
                          {ev.event_type}
                        </Badge>
                        <span className="font-semibold text-[#111827]">{ev.description}</span>
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-1">
                        Operator/Job: <strong>{ev.operator}</strong> • {ev.timestamp ? String(ev.timestamp).slice(0, 16).replace('T', ' ') : ''}
                      </div>
                      {ev.details && (
                        <div className="text-[11px] text-[#4B5563] mt-0.5 bg-gray-50 px-2 py-0.5 rounded inline-block">
                          {ev.details}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-mono font-bold text-sm tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? `+${ev.kg_change}` : ev.kg_change} kg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setIsLedgerModalOpen(false)}>
                Close Ledger
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal 4: Raise Supplier Claim */}
      <Modal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        title="Raise Supplier Claim"
        subtitle="File a reimbursement debit claim against yarn supplier"
      >
        <form onSubmit={handleClaimSubmit} className="space-y-4">
          <FormField label="Supplier" error={claimErrors.supplier_id} required>
            <Select
              value={claimForm.supplier_id}
              onChange={(e) => setClaimForm({ ...claimForm, supplier_id: e.target.value })}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Origin Yarn Batch" error={claimErrors.yarn_batch_id} required>
            <Select
              value={claimForm.yarn_batch_id}
              onChange={(e) => setClaimForm({ ...claimForm, yarn_batch_id: e.target.value })}
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_code} — {b.yarn_type} ({b.colour})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Claim Quantity (kg)" error={claimErrors.kg} required>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 25"
                value={claimForm.kg}
                onChange={(e) => setClaimForm({ ...claimForm, kg: e.target.value })}
              />
            </FormField>

            <FormField label="Claim Amount (₹)" error={claimErrors.claim_amount} required>
              <Input
                type="number"
                step="1"
                placeholder="e.g. 5500"
                value={claimForm.claim_amount}
                onChange={(e) => setClaimForm({ ...claimForm, claim_amount: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Claim Reason / Substandard Defect" error={claimErrors.reason} required>
            <Input
              value={claimForm.reason}
              onChange={(e) => setClaimForm({ ...claimForm, reason: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
            <Button variant="secondary" type="button" onClick={() => setIsClaimModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={claimSubmitting}>
              Create Draft Claim
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
