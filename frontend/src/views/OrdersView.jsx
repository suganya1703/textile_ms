import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  Eye,
  Check,
  Copy,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Modal,
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
import { Buyer360Modal } from '../components/Buyer360Modal';

const PIPELINE_STAGES = [
  'Created',
  'Yarn Reserved',
  'Spinning',
  'Weaving',
  'Dyeing',
  'QC',
  'Ready',
  'Dispatched'
];

export function OrdersView({ onOpenTracking }) {
  const [orders, setOrders] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [delayRiskData, setDelayRiskData] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [buyer360Id, setBuyer360Id] = useState(null);
  const [isBuyer360Open, setIsBuyer360Open] = useState(false);
  const { showToast } = useToast();

  // Create Order Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    buyer_id: '',
    fabric_type: 'Cotton Twill 2/1',
    colour: 'Navy Blue',
    quantity_m: 1000,
    deadline: '',
    price_per_m: 130.0,
    yarn_required_kg: 220.0,
    expected_delivery: ''
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // View Order Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordRes, buyRes, riskRes] = await Promise.all([
        api.getOrders(),
        api.getBuyers(),
        api.getDelayRisk()
      ]);
      setOrders(ordRes || []);
      setBuyers(buyRes || []);
      setDelayRiskData(riskRes?.risks || []);

      if (buyRes?.length > 0 && !createForm.buyer_id) {
        setCreateForm((prev) => ({ ...prev, buyer_id: buyRes[0].id }));
      }
    } catch (err) {
      showToast('Failed to load orders: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateStr = futureDate.toISOString().split('T')[0];
    setCreateForm((prev) => ({ ...prev, deadline: dateStr, expected_delivery: dateStr }));

    loadData();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!createForm.buyer_id) {
      showToast('Please select a buyer', 'warning');
      return;
    }

    try {
      setSubmittingOrder(true);
      await api.createOrder({
        buyer_id: Number(createForm.buyer_id),
        fabric_type: createForm.fabric_type,
        colour: createForm.colour,
        quantity_m: Number(createForm.quantity_m),
        deadline: createForm.deadline,
        price_per_m: Number(createForm.price_per_m),
        yarn_required_kg: Number(createForm.yarn_required_kg),
        expected_delivery: createForm.expected_delivery || createForm.deadline
      });
      showToast('New order created successfully!', 'success');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Failed to create order: ' + err.message, 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleOpenViewModal = async (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
    try {
      const details = await api.getOrderDetails(order.id);
      setSelectedOrder(details);
    } catch (e) {
      console.error(e);
    }
  };

  const copyWhatsAppNotification = (order) => {
    const text = `Dear ${order.buyer_name}, your order #${order.order_number} (${order.fabric_type} ${order.colour}) is currently ${order.status} at Everest Textile Mills. Expected delivery: ${order.deadline}. Track live: http://localhost:5173/track/${order.order_number}`;
    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.id);
    showToast('Customer update message copied!', 'success');
    setTimeout(() => setCopiedOrderId(null), 3000);
  };

  const delayRiskMap = delayRiskData.reduce((acc, r) => {
    acc[r.order_number] = r;
    return acc;
  }, {});

  const getDelayRiskLevel = (order) => {
    const matched = delayRiskMap[order.order_number];
    if (matched) {
      return matched.risk_level?.toLowerCase() || 'low';
    }
    if (order.status === 'Dispatched') return 'on_track';
    const now = new Date();
    const deadline = new Date(order.deadline);
    const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);
    if (daysLeft < 1 && (order.progress_pct || 0) < 90) return 'high';
    if (daysLeft < 4 && (order.progress_pct || 0) < 50) return 'medium';
    return 'low';
  };

  // Filter chips: All, Created, Yarn Reserved, Spinning, Weaving, Dyeing, QC, Ready, Dispatched
  const FILTER_OPTIONS = [
    'All',
    'Created',
    'Yarn Reserved',
    'Spinning',
    'Weaving',
    'Dyeing',
    'QC',
    'Ready',
    'Dispatched'
  ];

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const numMatch = String(o.order_number || '').toLowerCase().includes(query);
        const buyerMatch = String(o.buyer_name || '').toLowerCase().includes(query);
        const fabricMatch = String(o.fabric_type || '').toLowerCase().includes(query);
        const colMatch = String(o.colour || '').toLowerCase().includes(query);
        if (!numMatch && !buyerMatch && !fabricMatch && !colMatch) return false;
      }

      // Status chip filter
      if (statusFilter === 'All') return true;
      const s = (o.status || '').toLowerCase().replace(/[-_]/g, ' ');
      const f = statusFilter.toLowerCase();
      if (f === 'qc') return s.includes('qc');
      if (f === 'yarn reserved') return s.includes('yarn reserved');
      return s.includes(f);
    });
  }, [orders, statusFilter, searchQuery]);

  // Stage index helper for status bar
  const getStageIndex = (status) => {
    const s = String(status || '').toLowerCase().replace(/[-_]/g, ' ');
    if (s.includes('created')) return 0;
    if (s.includes('yarn')) return 1;
    if (s.includes('spinning')) return 2;
    if (s.includes('weaving')) return 3;
    if (s.includes('dyeing')) return 4;
    if (s.includes('qc')) return 5;
    if (s.includes('ready')) return 6;
    if (s.includes('dispatched')) return 7;
    return 0;
  };

  // Table columns
  const columns = [
    {
      header: 'ORDER #',
      accessor: 'order_number',
      render: (o) => (
        <span className="font-mono font-bold text-[#2F3E8F] text-xs sm:text-sm">
          #{o.order_number}
        </span>
      )
    },
    {
      header: 'BUYER',
      accessor: 'buyer_name',
      render: (o) => (
        <button
          type="button"
          onClick={() => {
            setBuyer360Id(o.buyer_id);
            setIsBuyer360Open(true);
          }}
          className="text-xs font-semibold text-[#0F172A] hover:text-[#2F3E8F] text-left cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <span>{o.buyer_name || 'Buyer'}</span>
          <span className="text-[10px] bg-[#E8EBF7] text-[#2F3E8F] px-1.5 py-0.2 rounded font-bold">360°</span>
        </button>
      )
    },
    {
      header: 'FABRIC',
      accessor: 'fabric_type',
      render: (o) => (
        <span className="font-medium text-[#0F172A] text-xs sm:text-sm">
          {o.fabric_type}
        </span>
      )
    },
    {
      header: 'COLOUR',
      accessor: 'colour',
      render: (o) => (
        <span className="text-[#475569] text-xs">
          {o.colour}
        </span>
      )
    },
    {
      header: 'QUANTITY',
      accessor: 'quantity_m',
      align: 'right',
      render: (o) => (
        <span className="font-sans tabular-nums font-medium text-[#0F172A] text-xs">
          {formatNumber(o.quantity_m)} m
        </span>
      )
    },
    {
      header: 'STATUS & RISK',
      accessor: 'status',
      render: (o) => {
        const risk = getDelayRiskLevel(o);
        const riskBadge =
          risk === 'high' ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
              High Risk
            </span>
          ) : risk === 'medium' ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]">
              Moderate
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E3F5F1] text-[#1F7564] border-[#A2DFD4]">
              On Track
            </span>
          );

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={o.status}>
              {formatStatus(o.status)}
            </Badge>
            {riskBadge}
          </div>
        );
      }
    },
    {
      header: 'DEADLINE',
      accessor: 'deadline',
      render: (o) => (
        <span className="font-mono text-xs text-[#475569]">
          {o.deadline}
        </span>
      )
    },
    {
      header: 'ACTIONS',
      accessor: 'id',
      align: 'right',
      render: (o) => (
        <button
          onClick={() => handleOpenViewModal(o)}
          className="inline-flex items-center gap-1 text-xs text-[#2F3E8F] hover:text-[#26337A] font-semibold cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title Row */}
      <PageHeader
        title="Orders"
        subtitle="End-to-end order execution tracking, dispatch deadlines, and predictive delay risk scoring."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={loadData}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Control Panel Row: Breadcrumb, Search Box, Filter Chips, Primary Action Button */}
      <div className="bg-white rounded-[16px] border border-[#E5E9F2] shadow-[0_2px_8px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] font-medium">
            <span>Orders</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="text-[#0F172A] font-semibold">Active Orders & Pipeline</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="relative min-w-[220px] sm:min-w-[280px]">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders, buyer, fabric..."
                className="w-full h-10 pl-9 pr-3 text-xs bg-[#F8FAFC] border border-[#E5E9F2] rounded-[10px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2F3E8F] focus:ring-4 focus:ring-[#E3F5F1] transition-all"
              />
            </div>

            {/* Primary Action Button */}
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
              className="shrink-0"
            >
              + New Order
            </Button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-[#F1F5F9]">
          {FILTER_OPTIONS.map((item) => {
            const isActive = statusFilter === item;
            return (
              <button
                key={item}
                onClick={() => setStatusFilter(item)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#2F3E8F] text-white font-semibold shadow-xs'
                    : 'bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] hover:bg-[#E8EBF7]/50 border border-[#E5E9F2] font-medium'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={filteredOrders}
            keyField="id"
            emptyMessage={`No orders found matching filter criteria.`}
          />
        </CardContent>
      </Card>

      {/* New Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Manufacturing Order"
        subtitle="Book new fabric contract and initialize material requirements"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <FormField label="Buyer Name" required>
            <Select
              value={createForm.buyer_id}
              onChange={(e) => setCreateForm({ ...createForm, buyer_id: e.target.value })}
            >
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city || 'Domestic'})
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Fabric Construction" required>
              <Select
                value={createForm.fabric_type}
                onChange={(e) => setCreateForm({ ...createForm, fabric_type: e.target.value })}
              >
                <option value="Cotton Twill 2/1">Cotton Twill 2/1</option>
                <option value="Cotton Poplin 40s">Cotton Poplin 40s</option>
                <option value="Poly-Cotton Sheeting">Poly-Cotton Sheeting</option>
                <option value="Cotton Satin 60s">Cotton Satin 60s</option>
                <option value="Linen Blend Plain">Linen Blend Plain</option>
              </Select>
            </FormField>

            <FormField label="Colour / Shade" required>
              <Select
                value={createForm.colour}
                onChange={(e) => setCreateForm({ ...createForm, colour: e.target.value })}
              >
                <option value="Navy Blue">Navy Blue</option>
                <option value="Raw White">Raw White</option>
                <option value="Charcoal Grey">Charcoal Grey</option>
                <option value="Olive Green">Olive Green</option>
                <option value="Crimson Red">Crimson Red</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Quantity (metres)" required>
              <Input
                type="number"
                step="50"
                value={createForm.quantity_m}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setCreateForm({
                    ...createForm,
                    quantity_m: m,
                    yarn_required_kg: Math.round(m * 0.22)
                  });
                }}
              />
            </FormField>

            <FormField label="Contract Price / m (₹)" required>
              <Input
                type="number"
                step="1.0"
                value={createForm.price_per_m}
                onChange={(e) => setCreateForm({ ...createForm, price_per_m: e.target.value })}
              />
            </FormField>

            <FormField label="Yarn Need (kg)">
              <Input
                type="number"
                step="1.0"
                value={createForm.yarn_required_kg}
                onChange={(e) => setCreateForm({ ...createForm, yarn_required_kg: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Target Delivery Deadline" required>
            <Input
              type="date"
              value={createForm.deadline}
              onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value, expected_delivery: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E9F2]">
            <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submittingOrder}>
              Create Order & Reserve Yarn
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Order Modal with Horizontal Chevron Status Bar */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Order #${selectedOrder?.order_number}`}
        subtitle={`Buyer: ${selectedOrder?.buyer_name || 'Buyer'}`}
      >
        {selectedOrder && (
          <div className="space-y-5">
            {/* Horizontal Chevron Status Bar */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#94A3B8] block">
                Production Pipeline Stage
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 p-1 bg-[#F8FAFC] rounded-[12px] border border-[#E5E9F2]">
                {(() => {
                  const currentIdx = getStageIndex(selectedOrder.status);
                  return PIPELINE_STAGES.map((stageName, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    let style = 'bg-transparent text-[#94A3B8] font-medium';
                    if (isCompleted) {
                      style = 'bg-[#E3F5F1] text-[#1F7564] font-semibold border border-[#A2DFD4]';
                    } else if (isCurrent) {
                      style = 'bg-[#2F3E8F] text-white font-bold shadow-xs';
                    }
                    return (
                      <div
                        key={stageName}
                        className={`text-center py-1.5 px-1 rounded-[8px] text-[11px] truncate transition-all ${style}`}
                        title={stageName}
                      >
                        {stageName}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Order Specification Details */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#F8FAFC] rounded-[12px] border border-[#E5E9F2] text-xs">
              <div>
                <span className="text-[#94A3B8] block font-medium">Fabric Construction:</span>
                <span className="font-semibold text-[#0F172A] mt-0.5 block">{selectedOrder.fabric_type}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block font-medium">Colour / Shade:</span>
                <span className="font-semibold text-[#0F172A] mt-0.5 block">{selectedOrder.colour}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block font-medium">Quantity:</span>
                <span className="font-sans tabular-nums text-[#0F172A] font-semibold mt-0.5 block">{formatNumber(selectedOrder.quantity_m)} metres</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block font-medium">Selling Price:</span>
                <span className="font-sans tabular-nums text-[#0F172A] font-semibold mt-0.5 block">{formatINR(selectedOrder.price_per_m)}/m ({formatINR(selectedOrder.quantity_m * selectedOrder.price_per_m, 0)})</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block font-medium">Delivery Deadline:</span>
                <span className="font-mono text-[#0F172A] mt-0.5 block">{selectedOrder.deadline}</span>
              </div>
              <div>
                <span className="text-[#94A3B8] block font-medium">Current Status:</span>
                <div className="mt-0.5">
                  <Badge variant={selectedOrder.status}>{formatStatus(selectedOrder.status)}</Badge>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            {selectedOrder.activity_timeline && selectedOrder.activity_timeline.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E5E9F2]">
                <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-[0.05em]">
                  Order Activity Timeline
                </h5>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedOrder.activity_timeline.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 bg-[#F8FAFC] rounded-[10px] border border-[#E5E9F2] text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-medium text-[#0F172A]">{act.message}</div>
                        <div className="text-[11px] text-[#94A3B8]">
                          By {act.user} • {new Date(act.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="primary" size="sm">
                        {act.action}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-[#E5E9F2]">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={copiedOrderId === selectedOrder.id ? Check : Copy}
                  onClick={() => copyWhatsAppNotification(selectedOrder)}
                >
                  {copiedOrderId === selectedOrder.id ? 'Copied' : 'Copy Buyer Notification'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBuyer360Id(selectedOrder.buyer_id);
                    setIsBuyer360Open(true);
                  }}
                >
                  Buyer 360°
                </Button>
              </div>
              <Button
                variant="primary"
                size="sm"
                iconRight={ExternalLink}
                onClick={() => {
                  setIsViewModalOpen(false);
                  if (onOpenTracking) onOpenTracking(selectedOrder.order_number);
                }}
              >
                Open Live Tracking
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Buyer 360 Modal */}
      <Buyer360Modal
        isOpen={isBuyer360Open}
        onClose={() => setIsBuyer360Open(false)}
        buyerId={buyer360Id}
      />
    </div>
  );
}
