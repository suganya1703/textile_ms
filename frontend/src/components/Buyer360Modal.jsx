import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  FileText
} from 'lucide-react';
import {
  Modal,
  Badge,
  Button,
  formatINR,
  formatNumber,
  formatStatus,
  useToast
} from './common';
import { api } from '../api/client';

export function Buyer360Modal({ isOpen, onClose, buyerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('orders'); // orders, dispatches, invoices
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen || !buyerId) {
      setData(null);
      return;
    }
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await api.getBuyer360(buyerId);
        setData(res);
      } catch (err) {
        showToast('Failed to load Buyer 360: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOpen, buyerId]);

  const copyStatusMessage = (order) => {
    const text = order.status_message || `Your order ${order.order_number} is in ${order.status.toLowerCase()}, expected on ${order.expected_delivery}`;
    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.id);
    showToast('Customer update message copied!', 'success');
    setTimeout(() => setCopiedOrderId(null), 3000);
  };

  if (!isOpen) return null;

  const profile = data?.profile;
  const fin = data?.financials;
  const orders = data?.orders || [];
  const dispatches = data?.dispatches || [];
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={profile ? `Buyer 360: ${profile.name}` : 'Buyer 360 Profile'}
      subtitle={profile ? `${profile.contact} • ${profile.city}` : 'Loading buyer details...'}
    >
      {loading ? (
        <div className="py-12 text-center text-xs text-gray-500">Loading comprehensive buyer profile...</div>
      ) : data ? (
        <div className="space-y-5">
          {/* Top Profile & Credit Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-gray-50 rounded-[10px] border border-gray-200 text-xs">
            <div className="space-y-1">
              <div className="text-gray-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Contact & City</span>
              </div>
              <div className="font-semibold text-gray-900">{profile.contact}</div>
              <div className="text-gray-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>{profile.city}</span>
                <span className="mx-1">•</span>
                <Phone className="w-3 h-3 text-gray-400" />
                <span>{profile.phone}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-gray-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                <span>Credit & Billing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Credit Limit:</span>
                <span className="font-sans tabular-nums font-semibold text-[#0F172A]">{formatINR(fin?.credit_limit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Invoiced Total:</span>
                <span className="font-sans tabular-nums text-[#475569]">{formatINR(fin?.total_invoiced || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Paid Total:</span>
                <span className="font-sans tabular-nums text-[#2BA38C] font-semibold">{formatINR(fin?.total_paid || 0)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#94A3B8] font-medium">Outstanding Balance:</span>
                <span className={`font-sans tabular-nums font-bold ${fin?.outstanding_balance > (fin?.credit_limit || 0) * 0.8 ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>
                  {formatINR(fin?.outstanding_balance || 0)}
                </span>
              </div>
              <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    (fin?.credit_utilization_pct || 0) > 85
                      ? 'bg-[#DC2626]'
                      : (fin?.credit_utilization_pct || 0) > 60
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#2F3E8F]'
                  }`}
                  style={{ width: `${Math.min(100, fin?.credit_utilization_pct || 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#94A3B8]">
                <span>{fin?.credit_utilization_pct || 0}% credit used</span>
                <span>Avail: {formatINR(fin?.available_credit || 0)}</span>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('orders')}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                activeSubTab === 'orders'
                  ? 'bg-[#2F3E8F] text-white font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              All Orders ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('dispatches')}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                activeSubTab === 'dispatches'
                  ? 'bg-[#2F3E8F] text-white font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Dispatches ({dispatches.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('invoices')}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                activeSubTab === 'invoices'
                  ? 'bg-[#2F3E8F] text-white font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Invoices & Payments ({invoices.length})
            </button>
          </div>

          {/* Tab 1: All Orders */}
          {activeSubTab === 'orders' && (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {orders.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">No orders found for this buyer.</div>
              ) : (
                orders.map((o) => {
                  const riskLevel = o.delay_risk?.status || 'green';
                  const riskBadgeClass =
                    riskLevel === 'red'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : riskLevel === 'amber'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <div
                      key={o.id}
                      className="p-3 bg-white rounded-[8px] border border-gray-200 text-xs space-y-2 hover:border-gray-300 transition-colors shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            <span>#{o.order_number}</span>
                            <Badge variant={o.status} size="sm">
                              {formatStatus(o.status)}
                            </Badge>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${riskBadgeClass}`}>
                              {o.delay_risk?.risk_level || 'On Track'}
                            </span>
                          </div>
                          <div className="text-gray-500 text-[11px] mt-0.5">
                            {o.fabric_type} • {o.colour} • <span className="font-mono font-medium text-gray-700">{formatNumber(o.quantity_m)} m</span>
                          </div>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          icon={copiedOrderId === o.id ? Check : Copy}
                          onClick={() => copyStatusMessage(o)}
                          className="shrink-0 text-[11px]"
                        >
                          {copiedOrderId === o.id ? 'Copied' : 'Copy Status Message'}
                        </Button>
                      </div>

                      {/* Progress & Deadlines */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-gray-100 text-[11px]">
                        <div>
                          <span className="text-gray-400 block">Progress:</span>
                          <span className="font-sans tabular-nums font-semibold text-gray-800">{o.progress_pct}% ({formatNumber(o.produced_m)} m)</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Selling Price:</span>
                          <span className="font-sans tabular-nums font-semibold text-gray-800">{formatINR(o.price_per_m)}/m</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Deadline:</span>
                          <span className="font-mono text-gray-800">{o.deadline}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Expected:</span>
                          <span className="font-mono text-gray-800">{o.expected_delivery}</span>
                        </div>
                      </div>

                      {/* Delay risk note if not green */}
                      {riskLevel !== 'green' && o.delay_risk?.reason && (
                        <div className="p-2 bg-rose-50/60 rounded-[6px] border border-rose-100 text-[11px] text-rose-800 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">{o.delay_risk.reason}</span>
                            {o.delay_risk.suggested_action && (
                              <span className="block text-rose-600 mt-0.5 font-normal">Action: {o.delay_risk.suggested_action}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Dispatches */}
          {activeSubTab === 'dispatches' && (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {dispatches.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">No dispatches logged for this buyer yet.</div>
              ) : (
                dispatches.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-white rounded-[8px] border border-gray-200 text-xs flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#2F3E8F]" />
                        <span>#{d.dispatch_number}</span>
                      </div>
                      <div className="text-gray-500 text-[11px] mt-0.5">
                        Vehicle: <span className="font-mono text-gray-700">{d.vehicle_no}</span> • Date: {d.dispatched_at.slice(0, 10)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-gray-900">{formatNumber(d.total_metres)} m</div>
                      <div className="text-[11px] text-gray-500">{d.roll_count} rolls</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Invoices & Payments */}
          {activeSubTab === 'invoices' && (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              <div>
                <h6 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">Invoices</h6>
                {invoices.length === 0 ? (
                  <div className="text-xs text-gray-400 py-2">No invoices.</div>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2.5 bg-white rounded-[8px] border border-gray-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-gray-900">{inv.invoice_no}</div>
                          <div className="text-gray-500 text-[11px]">Issued: {inv.issued_at.slice(0, 10)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-sans tabular-nums font-bold text-gray-900">{formatINR(inv.total)}</span>
                          </div>
                          <Badge variant={inv.status === 'paid' ? 'Completed' : 'Warning'} size="sm">
                            {inv.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h6 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">Recorded Payments</h6>
                {payments.length === 0 ? (
                  <div className="text-xs text-gray-400 py-2">No payments recorded.</div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 bg-white rounded-[8px] border border-gray-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-emerald-800">Payment via {p.method}</div>
                          <div className="text-gray-500 text-[11px]">Date: {p.paid_at.slice(0, 10)}</div>
                        </div>
                        <div className="font-sans tabular-nums font-bold text-emerald-700">
                          +{formatINR(p.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-gray-200">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
