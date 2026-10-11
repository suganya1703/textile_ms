import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Truck,
  ArrowLeft,
  FileText,
  Package,
  Layers,
  Lock,
  Phone,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { formatNumber, formatINR } from '../components/common';

const TRANSLATIONS = {
  en: {
    title: 'Public Buyer Tracking Portal',
    subtitle: 'Secure live manufacturing timeline, dispatches & invoices',
    identifierLabel: 'Order Number or Buyer Code',
    identifierPlaceholder: 'e.g. ORD-2026-002 or Kaveri Fashions...',
    phoneLabel: 'Registered Phone (Last 4 digits)',
    phonePlaceholder: 'e.g. 6329',
    trackBtn: 'Track Buyer Orders',
    millHeader: 'Everest Textile Mills',
    tagline: 'Every roll, traced from yarn to invoice.',
    fabricType: 'Fabric Construction',
    colour: 'Target Shade',
    orderedQty: 'Ordered Quantity',
    producedQty: 'Woven & Passed',
    progress: 'Manufacturing Progress',
    expDelivery: 'Estimated Delivery',
    deadline: 'Contract Deadline',
    status: 'Current Floor Status',
    readyToDispatch: 'Ready in Stock',
    allOrders: 'Manufacturing Orders',
    dispatchesTitle: 'Shipment Dispatches',
    invoicesTitle: 'Invoices & Billing',
    noDispatches: 'No shipment dispatches logged yet.',
    noInvoices: 'No invoices issued yet.',
    paid: 'PAID',
    unpaid: 'UNPAID',
    stages: {
      Spinning: 'Spinning',
      Weaving: 'Weaving',
      Dyeing: 'Dyeing',
      'Quality Inspection': 'Quality Inspection',
      'Ready for Dispatch': 'Ready for Dispatch',
      Dispatched: 'Dispatched'
    },
    backToApp: 'Back to Loomdo Console',
    notFound: 'No match found. Please verify your order number / buyer code and last 4 phone digits.'
  },
  ta: {
    title: 'வாடிக்கையாளர் நேரடி கண்காணிப்பு தளம்',
    subtitle: 'நூல் முதல் சரக்கு வரை நேரடி உற்பத்தி நிலை, அனுப்புதல்கள் & ரசீதுகள்',
    identifierLabel: 'ஆர்டர் எண் அல்லது வாடிக்கையாளர் பெயர்',
    identifierPlaceholder: 'எ.கா. ORD-2026-002 அல்லது Kaveri Fashions...',
    phoneLabel: 'பதிவு செய்த தொலைபேசி (கடைசி 4 இலக்கங்கள்)',
    phonePlaceholder: 'எ.கா. 6329',
    trackBtn: 'ஆர்டர்களைக் கண்காணிக்க',
    millHeader: 'எவரெஸ்ட் டெக்ஸ்டைல் மில்ஸ்',
    tagline: 'ஒவ்வொரு துணி ரோலும், நூல் முதல் ரசீது வரை கண்காணிக்கப்படுகிறது.',
    fabricType: 'துணி ரகம்',
    colour: 'வண்ணம் / நிறம்',
    orderedQty: 'ஆர்டர் செய்த அளவு',
    producedQty: 'நெய்து முடிக்கப்பட்ட அளவு',
    progress: 'உற்பத்தி முன்னேற்றம்',
    expDelivery: 'எதிர்பார்க்கப்படும் தேதி',
    deadline: 'ஒப்பந்தக் கடைசித் தேதி',
    status: 'தற்போதைய உற்பத்தி நிலை',
    readyToDispatch: 'அனுப்பத் தயார் இருப்பு',
    allOrders: 'உற்பத்தி ஆர்டர்கள்',
    dispatchesTitle: 'சரக்கு விநியோகங்கள்',
    invoicesTitle: 'விலைப் பட்டியல் மற்றும் ரசீதுகள்',
    noDispatches: 'இதுவரை சரக்கு விநியோகங்கள் எதுவும் அனுப்பப்படவில்லை.',
    noInvoices: 'ரசீதுகள் எதுவும் வெளியிடப்படவில்லை.',
    paid: 'செலுத்தப்பட்டது',
    unpaid: 'செலுத்தப்படவில்லை',
    stages: {
      Spinning: 'நூல் நூற்றல்',
      Weaving: 'நெசவு',
      Dyeing: 'சாயமிடுதல்',
      'Quality Inspection': 'தரப் பரிசோதனை',
      'Ready for Dispatch': 'அனுப்பத் தயார்',
      Dispatched: 'அனுப்பப்பட்டது'
    },
    backToApp: 'லூம்டோ மில் திரைக்குத் திரும்பு',
    notFound: 'பொருந்தும் தகவல்கள் கிடைக்கவில்லை. உங்கள் ஆர்டர் எண் மற்றும் தொலைபேசி எண்ணின் கடைசி 4 இலக்கங்களைச் சரிபார்க்கவும்.'
  }
};

export function PublicTrackingView({ initialOrderNumber = 'ORD-2026-002', onBack }) {
  const [lang, setLang] = useState('en');
  const [identifier, setIdentifier] = useState(initialOrderNumber);
  const [phoneLast4, setPhoneLast4] = useState('6329');
  const [trackingResult, setTrackingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const t = TRANSLATIONS[lang];

  const handleTrackSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !phoneLast4.trim()) {
      setError(t.notFound);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.trackBuyerOrders({
        identifier: identifier.trim(),
        phone_last4: phoneLast4.trim()
      });
      setTrackingResult(res);
    } catch (err) {
      setTrackingResult(null);
      const msg = err.message || '';
      if (msg.includes('Too many failed')) {
        setError(msg);
      } else {
        setError(t.notFound);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      handleTrackSubmit();
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between selection:bg-[#2F3E8F] selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2F3E8F] flex items-center justify-center text-white shadow-inner font-bold text-lg">
              E
            </div>
            <div>
              <div className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
                {t.millHeader}
                <span className="text-[10px] bg-indigo-50 text-[#2F3E8F] px-2 py-0.5 rounded-full font-bold">
                  Buyer 360 Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  lang === 'en' ? 'bg-white text-[#2F3E8F] shadow-xs' : 'text-slate-500'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('ta')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  lang === 'ta' ? 'bg-white text-[#2F3E8F] shadow-xs' : 'text-slate-500'
                }`}
              >
                தமிழ்
              </button>
            </div>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t.backToApp}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 my-4 space-y-6">
        {/* Secure Tracking Query Box */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleTrackSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.identifierLabel}</span>
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t.identifierPlaceholder}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/20 focus:border-[#2F3E8F] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.phoneLabel}</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={4}
                    value={phoneLast4}
                    onChange={(e) => setPhoneLast4(e.target.value)}
                    placeholder={t.phonePlaceholder}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/20 focus:border-[#2F3E8F] font-mono tracking-widest"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Protected by rate limiting & verified customer credentials
              </span>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#2F3E8F] hover:bg-indigo-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Verifying...' : t.trackBtn}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results View */}
        {trackingResult && (
          <div className="space-y-6">
            {/* Buyer Profile Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F3E8F] bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Verified Buyer
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {trackingResult.buyer_name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {trackingResult.city} • {trackingResult.orders?.length || 0} active/completed orders
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Orders</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{trackingResult.orders?.length || 0}</span>
                </div>
                <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Dispatches</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{trackingResult.dispatches?.length || 0}</span>
                </div>
                <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 block uppercase font-semibold">Invoices</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{trackingResult.invoices?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Section 1: All Manufacturing Orders */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-[#2F3E8F]" />
                <span>{t.allOrders} ({trackingResult.orders?.length || 0})</span>
              </h3>

              <div className="space-y-4">
                {trackingResult.orders?.map((ord) => (
                  <div
                    key={ord.order_number}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2F3E8F]">
                            #{ord.order_number}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-[#2F3E8F]">
                            {ord.status}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          {ord.fabric_type}
                        </h4>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {t.colour}: <span className="font-semibold text-slate-800">{ord.colour}</span> • {t.orderedQty}: <span className="font-mono font-semibold text-slate-800">{formatNumber(ord.quantity_m)} m</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.expDelivery}</span>
                          <span className="text-xs font-bold text-[#2F3E8F] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#2BA38C]" />
                            {ord.expected_delivery}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Ready Stock Stats */}
                    <div className="p-4 sm:p-5 border-b border-slate-100">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                        <span>{t.progress}</span>
                        <span className="font-mono text-[#2F3E8F]">{ord.progress_pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-[#2F3E8F] rounded-full transition-all duration-700"
                          style={{ width: `${ord.progress_pct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t.readyToDispatch}: <strong>{ord.rolls_ready} rolls</strong> ({formatNumber(ord.metres_ready)} m)</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {t.deadline}: <span className="font-mono text-slate-600">{ord.deadline}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stage Pipeline Timeline */}
                    <div className="p-4 sm:p-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {ord.stage_timeline?.map((stg, idx) => {
                          const isDone = stg.completed;
                          const isAct = stg.active;

                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                isDone
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : isAct
                                  ? 'bg-indigo-50 border-[#2F3E8F] text-[#2F3E8F] ring-1 ring-[#2F3E8F]/20'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            >
                              <div className="text-[10px] font-bold uppercase opacity-75">
                                {idx + 1}. {t.stages[stg.name] || stg.name}
                              </div>
                              <div className="mt-1 font-bold text-xs">
                                {isDone ? '✓ Passed' : isAct ? '● In Progress' : 'Queued'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Dispatches */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#2F3E8F]" />
                <span>{t.dispatchesTitle} ({trackingResult.dispatches?.length || 0})</span>
              </h3>

              {trackingResult.dispatches?.length === 0 ? (
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-400 text-center">
                  {t.noDispatches}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trackingResult.dispatches?.map((disp) => (
                    <div
                      key={disp.dispatch_number}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">#{disp.dispatch_number}</span>
                        <span className="font-mono text-emerald-700 font-bold">{formatNumber(disp.total_metres)} m</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Vehicle: <span className="font-mono text-slate-700">{disp.vehicle_no}</span> • {disp.roll_count} rolls
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Date: {disp.dispatched_at.slice(0, 10)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Invoices */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2F3E8F]" />
                <span>{t.invoicesTitle} ({trackingResult.invoices?.length || 0})</span>
              </h3>

              {trackingResult.invoices?.length === 0 ? (
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-400 text-center">
                  {t.noInvoices}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trackingResult.invoices?.map((inv) => (
                    <div
                      key={inv.invoice_number}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{inv.invoice_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.is_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.is_paid ? t.paid : t.unpaid}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[11px] text-slate-500">{inv.issued_at.slice(0, 10)}</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{formatINR(inv.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400">
        <p>
          Everest Textile Mills • 100% Offline Secured Tracking • Zero Cost / Margin Leaks
        </p>
      </footer>
    </div>
  );
}
