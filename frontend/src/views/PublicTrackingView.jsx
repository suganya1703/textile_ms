import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Truck,
  ArrowLeft,
  Globe,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';

const TRANSLATIONS = {
  en: {
    title: 'Public Order Tracking',
    subtitle: 'Live manufacturing timeline & dispatch status for buyers',
    searchPlaceholder: 'Enter Order Number (e.g. ORD-2026-001)...',
    trackBtn: 'Track Order',
    millHeader: 'Everest Textile Mills',
    tagline: 'Every roll, traced from yarn to invoice.',
    fabricType: 'Fabric Construction',
    colour: 'Target Shade',
    orderedQty: 'Ordered Quantity',
    producedQty: 'Woven & Passed',
    progress: 'Manufacturing Progress',
    expDelivery: 'Estimated Delivery Date',
    status: 'Current Floor Status',
    stages: {
      Spinning: 'Spinning (Yarn Preparation)',
      Weaving: 'Weaving (Loom Production)',
      Dyeing: 'Dyeing & Finishing',
      'Quality Inspection': 'Quality Perch Inspection',
      'Ready for Dispatch': 'Ready on Warehouse Shelves',
      Dispatched: 'Loaded on Truck & Invoiced'
    },
    backToApp: 'Back to Loomdo Mill Console',
    notFound: 'Order not found in mill records. Please check the order number on your slip.'
  },
  ta: {
    title: 'ஆர்டர் நேரடி கண்காணிப்பு',
    subtitle: 'நூல் முதல் சரக்கு வரை நேரடி உற்பத்தி நிலை',
    searchPlaceholder: 'ஆர்டர் எண்ணை உள்ளிடவும் (எ.கா. ORD-2026-001)...',
    trackBtn: 'கண்காணிக்க',
    millHeader: 'எவரெஸ்ட் டெக்ஸ்டைல் மில்ஸ்',
    tagline: 'ஒவ்வொரு துணி ரோலும், நூல் முதல் ரசீது வரை கண்காணிக்கப்படுகிறது.',
    fabricType: 'துணி ரகம்',
    colour: 'வண்ணம் / நிறம்',
    orderedQty: 'ஆர்டர் செய்யப்பட்ட அளவு',
    producedQty: 'நெய்து முடிக்கப்பட்ட அளவு',
    progress: 'உற்பத்தி முன்னேற்றம்',
    expDelivery: 'எதிர்பார்க்கப்படும் விநியோகத் தேதி',
    status: 'தற்போதைய உற்பத்தி நிலை',
    stages: {
      Spinning: 'நூல் நூற்றல் (ஆயத்த நிலை)',
      Weaving: 'நெசவு (தறி இயக்கம்)',
      Dyeing: 'சாயமிடுதல் மற்றும் மெருகேற்றல்',
      'Quality Inspection': 'தரப் பரிசோதனை (ASTM 4-புள்ளி)',
      'Ready for Dispatch': 'அனுப்பத் தயார் (கிடங்கு இருப்பு)',
      Dispatched: 'வாகனத்தில் ஏற்றப்பட்டு அனுப்பப்பட்டது'
    },
    backToApp: 'லூம்டோ மில் திரைக்குத் திரும்பு',
    notFound: 'ஆர்டர் விபரங்கள் கிடைக்கவில்லை. தயவுசெய்து ஆர்டர் எண்ணைச் சரிபார்க்கவும்.'
  }
};

export function PublicTrackingView({ initialOrderNumber = 'ORD-2026-001', onBack }) {
  const [lang, setLang] = useState('en'); // en or ta
  const [query, setQuery] = useState(initialOrderNumber);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const t = TRANSLATIONS[lang];

  const fetchTracking = async (orderRef) => {
    if (!orderRef) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPublicTracking(orderRef);
      setOrderData(res);
    } catch (err) {
      setError(err.message || t.notFound);
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking(initialOrderNumber);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTracking(query);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between selection:bg-loomdo-primary selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-loomdo-primary flex items-center justify-center text-white shadow-inner">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" className="text-loomdo-teal" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M7 4v16M12 4v16M17 4v16" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                {t.millHeader}
                <span className="text-[10px] bg-loomdo-primary-light text-loomdo-primary px-2 py-0.5 rounded-full font-bold">
                  Loomdo Public Portal
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
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  lang === 'en' ? 'bg-white text-loomdo-primary shadow-xs' : 'text-slate-500'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('ta')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  lang === 'ta' ? 'bg-white text-loomdo-primary shadow-xs' : 'text-slate-500'
                }`}
              >
                தமிழ்
              </button>
            </div>

            {onBack && (
              <button
                onClick={onBack}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t.backToApp}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Tracking Card Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-4">
        {/* Search Bar */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-loomdo-primary/20 focus:border-loomdo-primary font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-loomdo-primary hover:bg-loomdo-primary-dark text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? '...' : t.trackBtn}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200">
              {error}
            </div>
          )}
        </div>

        {/* Order Details and Stage Progress Timeline */}
        {orderData && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Top Bar with Order Number & Delivery */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-loomdo-primary uppercase tracking-wider">
                  #{orderData.order_number}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                  {orderData.fabric_type}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t.colour}: <strong>{orderData.colour}</strong> • {t.orderedQty}: <strong>{orderData.quantity_m.toLocaleString()} m</strong>
                </p>
              </div>

              <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 text-left sm:text-right">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t.expDelivery}
                </span>
                <div className="text-base font-extrabold text-loomdo-primary mt-0.5 flex items-center sm:justify-end gap-1.5">
                  <Clock className="w-4 h-4 text-loomdo-teal" />
                  {orderData.expected_delivery}
                </div>
              </div>
            </div>

            {/* Overall Progress Gauge */}
            <div className="p-6 border-b border-slate-100 bg-white">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                <span>{t.progress}</span>
                <span className="text-loomdo-primary text-sm">{orderData.progress_pct}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-loomdo-primary rounded-full transition-all duration-700"
                  style={{ width: `${orderData.progress_pct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
                <span>{orderData.produced_m} m {t.producedQty}</span>
                <span>{orderData.quantity_m} m {t.orderedQty}</span>
              </div>
            </div>

            {/* Stage Pipeline Timeline */}
            <div className="p-6 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Manufacturing Pipeline Milestones
              </h3>

              <div className="space-y-4">
                {orderData.stages.map((stage, idx) => {
                  const isCompleted = stage.completed;
                  const isActive = stage.active;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                        isCompleted
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                          : isActive
                          ? 'bg-indigo-50 border-loomdo-primary text-loomdo-primary-deep shadow-xs ring-1 ring-loomdo-primary/30'
                          : 'bg-slate-50/50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-600 text-white'
                              : isActive
                              ? 'bg-loomdo-primary text-white animate-pulse'
                              : 'bg-slate-200 text-slate-400 font-bold text-xs'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        <div>
                          <div className={`font-bold text-sm ${isActive ? 'text-loomdo-primary' : isCompleted ? 'text-emerald-900' : 'text-slate-500'}`}>
                            {t.stages[stage.name] || stage.name}
                          </div>
                          <p className="text-[11px] opacity-75">
                            {isCompleted
                              ? 'Quality verified & recorded'
                              : isActive
                              ? 'Currently in progress on mill floor'
                              : 'Queued milestone'}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isCompleted && (
                          <span className="text-[11px] font-bold text-emerald-700 uppercase bg-emerald-100/60 px-2.5 py-1 rounded-full">
                            Completed
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[11px] font-bold text-white uppercase bg-loomdo-primary px-2.5 py-1 rounded-full animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400">
        <p>
          Loomdo Unified Textile Manufacturing Platform • Enterprise Traceability Engine • 100% Offline & Explainable
        </p>
      </footer>
    </div>
  );
}
