import React, { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  Eye,
  Check,
  Copy
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

export function OrdersView({ onOpenTracking }) {
  const [orders, setOrders] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [delayRiskData, setDelayRiskData] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
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

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'All') return true;
    const s = (o.status || '').toLowerCase().replace(/[-_]/g, ' ');
    const f = statusFilter.toLowerCase();
    if (f === 'qc') return s.includes('qc');
    if (f === 'yarn reserved') return s.includes('yarn reserved');
    return s.includes(f);
  });

  // Table columns: #, Fabric, Colour, Qty, Status pill + delay badge, Deadline, View link and an icon
  const columns = [
    {
      header: '#',
      accessor: 'order_number',
      render: (o) => (
        <span className="font-mono font-bold text-[#714B67] text-xs sm:text-sm">
          #{o.order_number}
        </span>
      )
    },
    {
      header: 'Fabric',
      accessor: 'fabric_type',
      render: (o) => (
        <span className="font-medium text-[#111827] text-xs sm:text-sm">
          {o.fabric_type}
        </span>
      )
    },
    {
      header: 'Colour',
      accessor: 'colour',
      render: (o) => (
        <span className="text-[#4B5563] text-xs">
          {o.colour}
        </span>
      )
    },
    {
      header: 'Qty',
      accessor: 'quantity_m',
      align: 'right',
      render: (o) => (
        <span className="font-mono tabular-nums text-[#111827]">
          {formatNumber(o.quantity_m)} m
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (o) => {
        const risk = getDelayRiskLevel(o);
        const riskBadge =
          risk === 'high' ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              High Risk
            </span>
          ) : risk === 'medium' ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Moderate
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
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
      header: 'Deadline',
      accessor: 'deadline',
      render: (o) => (
        <span className="font-mono text-xs text-[#4B5563]">
          {o.deadline}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      align: 'right',
      render: (o) => (
        <button
          onClick={() => handleOpenViewModal(o)}
          className="inline-flex items-center gap-1 text-xs text-[#714B67] hover:underline font-medium"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        subtitle="End-to-end order execution tracking, dispatch deadlines, and predictive delay risk scoring."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={loadData}>
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              + New Order
            </Button>
          </div>
        }
      />

      {/* Filter Chips: All active in purple fill, others plain text */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((item) => {
          const isActive = statusFilter === item;
          return (
            <button
              key={item}
              onClick={() => setStatusFilter(item)}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-colors shrink-0 ${
                isActive
                  ? 'bg-[#714B67] text-white font-medium shadow-xs'
                  : 'text-[#6B7280] hover:text-[#111827] font-normal hover:bg-gray-100'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={filteredOrders}
            keyField="id"
            emptyMessage={`No orders found with status '${statusFilter}'.`}
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

          <div className="flex justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
            <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submittingOrder}>
              Create Order & Reserve Yarn
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Order Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Order #${selectedOrder?.order_number}`}
        subtitle={`Buyer: ${selectedOrder?.buyer_name || 'Buyer'}`}
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] text-xs">
              <div>
                <span className="text-[#6B7280] block">Fabric Construction:</span>
                <span className="font-semibold text-[#111827]">{selectedOrder.fabric_type}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Colour / Shade:</span>
                <span className="font-semibold text-[#111827]">{selectedOrder.colour}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Quantity:</span>
                <span className="font-mono text-[#111827] font-semibold">{formatNumber(selectedOrder.quantity_m)} metres</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Selling Price:</span>
                <span className="font-mono text-[#111827] font-semibold">{formatINR(selectedOrder.price_per_m)}/m ({formatINR(selectedOrder.quantity_m * selectedOrder.price_per_m)})</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Delivery Deadline:</span>
                <span className="font-mono text-[#111827]">{selectedOrder.deadline}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block">Current Status:</span>
                <Badge variant={selectedOrder.status}>{formatStatus(selectedOrder.status)}</Badge>
              </div>
            </div>

            {/* Activity Timeline */}
            {selectedOrder.activity_timeline && selectedOrder.activity_timeline.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                <h5 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  Order Activity Timeline
                </h5>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedOrder.activity_timeline.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 bg-gray-50 rounded-[6px] border border-gray-200 text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-medium text-[#111827]">{act.message}</div>
                        <div className="text-[11px] text-[#6B7280]">
                          By {act.user} • {new Date(act.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="secondary" size="sm">
                        {act.action}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                icon={copiedOrderId === selectedOrder.id ? Check : Copy}
                onClick={() => copyWhatsAppNotification(selectedOrder)}
              >
                {copiedOrderId === selectedOrder.id ? 'Copied' : 'Copy Buyer Notification'}
              </Button>
              <Button
                variant="primary"
                size="sm"
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
    </div>
  );
}
