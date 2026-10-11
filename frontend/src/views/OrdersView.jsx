import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  Eye,
  Check,
  Copy,
  List as ListIcon,
  LayoutGrid,
  Calendar,
  Layers,
  ArrowLeft,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Modal,
  FormField,
  Input,
  Select,
  Table,
  PageHeader,
  Breadcrumbs,
  ControlPanel,
  ChevronStatusBar,
  PIPELINE_STAGES,
  ActivityLog,
  formatStatus,
  formatNumber,
  formatINR,
  useToast
} from '../components/common';
import { api } from '../api/client';

const FILTER_STAGES = [
  'All',
  'Created',
  'Yarn reserved',
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
  const [delayRiskMap, setDelayRiskMap] = useState({});
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // ERP View Mode: 'list' or 'kanban'
  const [viewMode, setViewMode] = useState('list');

  // Control Panel Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Order Detail View (two-column form + activity log)
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [copiedOrderId, setCopiedOrderId] = useState(null);

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

      const riskMapping = {};
      if (riskRes?.orders) {
        riskRes.orders.forEach((r) => {
          riskMapping[r.order_number] = r;
        });
      }
      setDelayRiskMap(riskMapping);

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

  // Live filter without reload
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (statusFilter !== 'All') {
        const normFilter = statusFilter.toLowerCase().replace(/[-_ ]/g, '');
        const normStatus = (o.status || '').toLowerCase().replace(/[-_ ]/g, '');
        if (normFilter !== normStatus) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const numMatch = (o.order_number || '').toLowerCase().includes(term);
        const buyerMatch = (o.buyer_name || '').toLowerCase().includes(term);
        const fabricMatch = (o.fabric_type || '').toLowerCase().includes(term);
        const colourMatch = (o.colour || '').toLowerCase().includes(term);
        if (!numMatch && !buyerMatch && !fabricMatch && !colourMatch) return false;
      }

      return true;
    });
  }, [orders, statusFilter, searchTerm]);

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

  const copyWhatsAppNotification = (order) => {
    const text = `Dear ${order.buyer_name}, your order #${order.order_number} (${order.fabric_type} ${order.colour}) is currently ${order.status} at Everest Textile Mills. Expected delivery: ${order.deadline}. Track live: http://localhost:5173/track/${order.order_number}`;
    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.id);
    showToast('Customer dispatch notification copied to clipboard!', 'info');
    setTimeout(() => setCopiedOrderId(null), 3000);
  };

  const columns = [
    {
      header: 'Order #',
      accessor: 'order_number',
      render: (o) => (
        <span className="font-mono font-bold text-[#2F3E8F] text-xs">
          #{o.order_number}
        </span>
      )
    },
    {
      header: 'Buyer',
      accessor: 'buyer_name',
      render: (o) => <span className="font-medium text-[#111827] text-xs">{o.buyer_name}</span>
    },
    {
      header: 'Fabric Construction',
      accessor: 'fabric_type',
      render: (o) => (
        <div className="text-xs">
          <div className="text-[#111827] font-medium">{o.fabric_type}</div>
          <div className="text-[11px] text-[#6B7280]">{o.colour}</div>
        </div>
      )
    },
    {
      header: 'Quantity',
      accessor: 'quantity_m',
      align: 'right',
      sum: true,
      sumRender: (total) => `${formatNumber(total)} m`,
      render: (o) => (
        <span className="font-mono tabular-nums text-xs font-semibold text-[#111827]">
          {formatNumber(o.quantity_m)} m
        </span>
      )
    },
    {
      header: 'Rate / Metre',
      accessor: 'price_per_m',
      align: 'right',
      render: (o) => (
        <span className="font-mono tabular-nums text-xs text-[#4B5563]">
          {formatINR(o.price_per_m)}
        </span>
      )
    },
    {
      header: 'Total Value',
      accessor: 'total_value',
      align: 'right',
      sum: true,
      sumRender: (total) => formatINR(total),
      render: (o) => (
        <span className="font-mono tabular-nums text-xs font-semibold text-[#111827]">
          {formatINR(o.quantity_m * o.price_per_m)}
        </span>
      )
    },
    {
      header: 'Deadline',
      accessor: 'deadline',
      render: (o) => (
        <span className="font-mono tabular-nums text-xs text-[#4B5563]">
          {o.deadline}
        </span>
      )
    },
    {
      header: 'Delay Risk',
      accessor: 'risk',
      align: 'center',
      render: (o) => {
        const risk = delayRiskMap[o.order_number];
        if (!risk) return <Badge variant="pass">On Track</Badge>;
        const variant = risk.status === 'red' ? 'breakdown' : risk.status === 'amber' ? 'warning' : 'pass';
        return <Badge variant={variant}>{risk.risk_level || 'On Track'}</Badge>;
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      align: 'center',
      render: (o) => <Badge variant={o.status}>{formatStatus(o.status)}</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (o) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrder(o);
          }}
          className="inline-flex items-center gap-1 text-xs text-[#2F3E8F] hover:text-[#232F70] hover:underline font-semibold cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Open</span>
        </button>
      )
    }
  ];

  // -------------------------------------------------------------
  // DETAIL VIEW: Horizontal Chevron Status Bar + Form + Activity Log
  // -------------------------------------------------------------
  if (selectedOrder) {
    const risk = delayRiskMap[selectedOrder.order_number];

    return (
      <div className="space-y-6">
        {/* Top Control Bar & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-[12px] border border-[#E5E7EB] shadow-xs">
          <div className="space-y-1">
            <Breadcrumbs
              items={[
                { label: 'Orders', onClick: () => setSelectedOrder(null) },
                { label: `#${selectedOrder.order_number}` }
              ]}
            />
            <div className="flex items-center gap-3 pt-1">
              <h1 className="text-xl font-bold text-[#111827]">
                Order #{selectedOrder.order_number}
              </h1>
              <Badge variant={selectedOrder.status}>
                {formatStatus(selectedOrder.status)}
              </Badge>
              {risk && (
                <Badge variant={risk.status === 'red' ? 'breakdown' : risk.status === 'amber' ? 'warning' : 'pass'}>
                  {risk.risk_level}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              icon={copiedOrderId === selectedOrder.id ? Check : Copy}
              onClick={() => copyWhatsAppNotification(selectedOrder)}
            >
              {copiedOrderId === selectedOrder.id ? 'Copied' : 'Copy Notification'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={ExternalLink}
              onClick={() => {
                if (onOpenTracking) onOpenTracking(selectedOrder.order_number);
              }}
            >
              Live Tracking
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={ArrowLeft}
              onClick={() => setSelectedOrder(null)}
            >
              Back to Orders
            </Button>
          </div>
        </div>

        {/* Status Bar: Horizontal Chevron Pipeline */}
        <Card>
          <CardHeader
            title="Manufacturing Pipeline Status"
            subtitle="Current manufacturing progression from yarn allocation to customer dispatch"
          />
          <CardContent className="pt-1">
            <ChevronStatusBar currentStatus={selectedOrder.status} />
          </CardContent>
        </Card>

        {/* Two-Column Layout: Left = Fields Form, Right = Activity Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Fields (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <Card>
              <CardHeader
                title="Order Specifications"
                subtitle="Contractual requirements, material consumption and fabric specs"
              />
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block font-medium">Buyer / Customer</span>
                    <span className="font-semibold text-sm text-[#111827] mt-0.5 block">
                      {selectedOrder.buyer_name || 'Buyer'}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block font-medium">Target Delivery Deadline</span>
                    <span className="font-mono font-semibold text-sm text-[#111827] mt-0.5 block">
                      {selectedOrder.deadline}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block font-medium">Fabric Construction</span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {selectedOrder.fabric_type}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block font-medium">Colour / Shade</span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {selectedOrder.colour}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block font-medium">Contract Quantity</span>
                    <span className="font-mono font-bold text-sm text-[#111827] mt-0.5 block">
                      {formatNumber(selectedOrder.quantity_m)} metres
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block font-medium">Contract Price / Metre</span>
                    <span className="font-mono font-bold text-sm text-[#111827] mt-0.5 block">
                      {formatINR(selectedOrder.price_per_m)} (Total: {formatINR(selectedOrder.quantity_m * selectedOrder.price_per_m)})
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block font-medium">Estimated Yarn Need</span>
                    <span className="font-mono font-semibold text-[#111827] mt-0.5 block">
                      {formatNumber(selectedOrder.yarn_required_kg || Math.round(selectedOrder.quantity_m * 0.22))} kg
                    </span>
                  </div>

                  <div className="p-3 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                    <span className="text-[#6B7280] block font-medium">Expected Delivery</span>
                    <span className="font-mono text-[#111827] mt-0.5 block">
                      {selectedOrder.expected_delivery || selectedOrder.deadline}
                    </span>
                  </div>
                </div>

                {/* Delay Risk statement banner */}
                {risk && (
                  <div className={`mt-4 p-3.5 rounded-[8px] border text-xs ${
                    risk.status === 'red'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : risk.status === 'amber'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  }`}>
                    <div className="font-semibold mb-0.5">Delay Risk Assessment: {risk.risk_level}</div>
                    <p className="leading-relaxed">{risk.reason}</p>
                    {risk.suggested_action && (
                      <p className="mt-1 font-medium">
                        <strong>Suggested Action:</strong> {risk.suggested_action}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Activity Log Timeline (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <ActivityLog
              entity="Order"
              entityId={selectedOrder.id}
              entityIdentifier={selectedOrder.order_number}
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN VIEW: Page Header, Control Panel, List vs Kanban Toggle
  // -------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h1 className="page-title text-[24px] font-bold text-[#111827] tracking-tight leading-tight">
          Orders
        </h1>
        <p className="page-subtitle text-[14px] text-[#6B7280] mt-0.5">
          Manufacturing order pipeline, delivery forecasting and delay risk
        </p>
      </div>

      {/* Control Panel: Breadcrumbs, Search, Filter Chips, List/Kanban Switcher, Primary Button */}
      <ControlPanel
        breadcrumbs={['Orders', viewMode === 'kanban' ? 'Kanban Pipeline' : 'All Orders']}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search order#, buyer, fabric..."
        filterChips={FILTER_STAGES.map((st) => ({
          id: st,
          label: st,
          count: st === 'All'
            ? orders.length
            : orders.filter((o) => (o.status || '').toLowerCase().replace(/[-_ ]/g, '') === st.toLowerCase().replace(/[-_ ]/g, '')).length
        }))}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        viewModeToggle={
          <div className="inline-flex rounded-[8px] border border-[#E5E7EB] bg-gray-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#2F3E8F] shadow-xs font-semibold'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-[#2F3E8F] shadow-xs font-semibold'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        }
        actionButton={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            + New Order
          </Button>
        }
      />

      {/* VIEW MODE 1: LIST VIEW */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <Table
              columns={columns}
              data={filteredOrders}
              keyField="id"
              emptyMessage={`No orders found matching '${statusFilter}' or search query.`}
              onRowClick={(order) => setSelectedOrder(order)}
            />
          </CardContent>
        </Card>
      )}

      {/* VIEW MODE 2: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="w-full overflow-x-auto pb-4 pt-1">
          <div className="flex gap-4 min-w-[1280px]">
            {PIPELINE_STAGES.map((stage) => {
              const stageOrders = filteredOrders.filter((o) => {
                const normStage = stage.toLowerCase().replace(/[-_ ]/g, '');
                const normStatus = (o.status || '').toLowerCase().replace(/[-_ ]/g, '');
                return normStage === normStatus;
              });

              return (
                <div
                  key={stage}
                  className="flex-1 bg-[#F9FAFB] rounded-[10px] border border-[#E5E7EB] p-3 flex flex-col min-w-[200px] max-w-[240px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E5E7EB]">
                    <h3 className="font-bold text-xs text-[#111827] uppercase tracking-wider">
                      {stage}
                    </h3>
                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[11px] font-mono font-bold flex items-center justify-center">
                      {stageOrders.length}
                    </span>
                  </div>

                  {/* Cards Column (Read-only) */}
                  <div className="space-y-2.5 flex-1 min-h-[300px]">
                    {stageOrders.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-[#9CA3AF] italic">
                        No orders in {stage}
                      </div>
                    ) : (
                      stageOrders.map((order) => {
                        const risk = delayRiskMap[order.order_number];
                        const riskVariant = risk?.status === 'red' ? 'breakdown' : risk?.status === 'amber' ? 'warning' : 'pass';

                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="bg-white p-3.5 rounded-[8px] border border-[#E5E7EB] hover:border-[#2F3E8F] shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2 group"
                          >
                            {/* Card Top: Order Number & Delay Risk */}
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="font-mono font-bold text-xs text-[#2F3E8F] group-hover:underline">
                                #{order.order_number}
                              </span>
                              {risk && (
                                <Badge variant={riskVariant} size="sm">
                                  {risk.risk_level || 'On Track'}
                                </Badge>
                              )}
                            </div>

                            {/* Buyer */}
                            <div className="text-xs font-semibold text-[#111827] truncate">
                              {order.buyer_name}
                            </div>

                            {/* Fabric & Colour */}
                            <div className="text-[11px] text-[#4B5563] truncate">
                              {order.fabric_type} • <span className="text-[#6B7280]">{order.colour}</span>
                            </div>

                            {/* Quantity & Deadline */}
                            <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between text-[11px] text-[#6B7280]">
                              <span className="font-mono font-bold text-[#111827]">
                                {formatNumber(order.quantity_m)} m
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                {order.deadline}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Order Modal */}
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
    </div>
  );
}
