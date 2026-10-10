import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Package,
  Layers,
  Clock,
  User,
  Truck,
  DollarSign,
  ShieldCheck,
  Search
} from 'lucide-react';
import { api } from '../api/client';
import { RollLabel, PrintLabelsModal } from '../components/common/RollLabel';

export function RollPassportView({ rollNumber: initialRollNumber, onBack, isPublic = false }) {
  // Determine roll code from prop or pathname
  const getInitialCode = () => {
    if (initialRollNumber) return initialRollNumber;
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/passport/')) {
      const code = window.location.pathname.replace(/^\/passport\/?/, '').split('/')[0];
      if (code) return decodeURIComponent(code);
    }
    return 'ROLL-20261001-0001';
  };

  const [currentCode, setCurrentCode] = useState(getInitialCode);
  const [searchInput, setSearchInput] = useState('');
  const [passportData, setPassportData] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const loadPassport = async (codeToFetch) => {
    try {
      setLoading(true);
      setError(null);
      const [data, settingsRes] = await Promise.all([
        api.getRollPassport(codeToFetch),
        api.getSettings().catch(() => ({}))
      ]);
      setPassportData(data);
      setSettings(settingsRes || {});
    } catch (err) {
      setError(err.message || `Roll '${codeToFetch}' not found.`);
      setPassportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassport(currentCode);
  }, [currentCode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setCurrentCode(searchInput.trim());
      setSearchInput('');
    }
  };

  const baseUrl = settings.public_base_url?.value || window.location.origin || 'http://localhost:5173';
  const qrUrl = `${baseUrl.replace(/\/$/, '')}/passport/${encodeURIComponent(currentCode)}`;

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-700">Loading Roll Passport & QR Provenance...</p>
        <p className="text-xs text-gray-400 font-mono mt-1">{currentCode}</p>
      </div>
    );
  }

  // Friendly 404 / Error Screen
  if (error || !passportData) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col justify-between selection:bg-[#714B67] selection:text-white">
        <header className="bg-white border-b border-gray-200 py-3.5 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#714B67] text-white flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm text-gray-900">Loomdo Roll Passport</span>
                <p className="text-[11px] text-gray-500">Everest Textile Mills</p>
              </div>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Console
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 max-w-md w-full text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Roll Not Found</h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              We could not find any active mill records matching <code className="font-mono font-bold text-gray-900">'{currentCode}'</code>.
              Please check the roll code on the fabric tag or search another roll number below.
            </p>

            <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Enter roll code e.g. ROLL-20261001-0001"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 text-xs font-mono bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-[#714B67]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#714B67] text-white text-xs font-semibold rounded-lg hover:bg-[#5B3B52] transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentCode('ROLL-20261001-0001')}
                className="text-xs text-[#714B67] hover:underline font-semibold cursor-pointer"
              >
                View Sample Roll (ROLL-20261001-0001)
              </button>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200 py-3 text-center text-[11px] text-gray-400">
          Loomdo Certified Traceability • Everest Textile Mills
        </footer>
      </div>
    );
  }

  // Active Passport Journey Data
  const { timeline = [], cost = {}, grade, qc_status, defect_points, length_m, width_in, dye_lot, shade_value, fabric_type } = passportData;
  const yarnStage = timeline.find((s) => s.step === 'yarn_intake') || {};
  const orderStage = timeline.find((s) => s.step === 'order_booking') || {};
  const weavingStage = timeline.find((s) => s.step === 'weaving_production') || {};
  const qcStage = timeline.find((s) => s.step === 'quality_inspection') || {};
  const dispatchStage = timeline.find((s) => s.step === 'dispatch_invoicing') || {};

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col justify-between selection:bg-[#714B67] selection:text-white">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-2xs no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#714B67] text-white flex items-center justify-center shrink-0">
              <QrCode className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">Loomdo Roll Passport</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Offline QR Authenticated
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Everest Textile Mills • ASTM D5430 Traceability</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#714B67] hover:bg-[#5B3B52] rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print 4×2" Label
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Printable 4x2 Label Preview Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Industrial Roll Passport Tag
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                grade === 'B' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                GRADE {grade || 'A'}
              </span>
              {passportData.dispatched && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-blue-100 text-blue-800">
                  Dispatched
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-mono font-black text-gray-950 tracking-tight">
              {passportData.roll_code || passportData.roll_number}
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Fabric</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{fabricType || orderStage.fabric_type || 'Cotton Sheeting'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Dimensions</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{length_m} m × {widthIn}"</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Dye Lot</span>
                <span className="font-bold font-mono text-gray-900 mt-0.5 block">{dyeLot} ({shade_value || 'Default'})</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">ASTM Points</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{defect_points} pts ({qcStage.defects_count || 0} flaws)</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Production Shift</span>
                <span className="font-bold text-gray-900 mt-0.5 capitalize block">{passportData.shift || 'Morning'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-semibold uppercase text-[10px] block">Manufactured</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{passportData.created_at?.substring(0, 10)}</span>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-200 shrink-0 text-center">
            <QRCodeSVG
              value={qrUrl}
              size={110}
              level="M"
              includeMargin={false}
              fgColor="#111827"
            />
            <span className="text-[9px] font-mono font-bold text-gray-600 mt-1.5 uppercase tracking-wider">
              Scan Passport
            </span>
            <span className="text-[8px] font-mono text-gray-400 max-w-[120px] truncate">
              {baseUrl}/passport/...
            </span>
          </div>
        </div>

        {/* Complete Vertical Journey Timeline */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                Complete Roll Journey Provenance
              </h2>
              <p className="text-xs text-gray-500">
                Verifiable genealogy from raw yarn intake to warehouse invoice
              </p>
            </div>
            <span className="text-xs font-mono text-[#714B67] bg-purple-50 px-2 py-0.5 rounded-md font-semibold">
              Rule-Based • 100% Offline
            </span>
          </div>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
            {/* Step 1: Yarn Intake */}
            <div className="relative flex items-start gap-4">
              <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-[#714B67] text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white">
                1
              </div>
              <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#714B67] uppercase">
                    Yarn Batch & Raw Material Intake
                  </span>
                  <span className="font-mono text-xs text-gray-500 font-semibold">
                    {yarnStage.batch_code || 'YB-STOCK-01'}
                  </span>
                </div>
                <div className="text-sm font-bold text-gray-900 mt-1">
                  {yarnStage.yarn_type || 'Cotton 30s'} ({yarnStage.colour || 'Natural'})
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  Supplied by <strong>{yarnStage.supplier || 'Coimbatore Yarn Traders'}</strong>
                  {yarnStage.cost_per_kg ? ` at ₹${yarnStage.cost_per_kg}/kg` : ''}
                  {yarnStage.received_date ? ` • Received on ${yarnStage.received_date.substring(0, 10)}` : ''}
                </p>
              </div>
            </div>

            {/* Step 2: Customer Order */}
            <div className="relative flex items-start gap-4">
              <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-[#714B67] text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white">
                2
              </div>
              <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#714B67] uppercase">
                    Customer Order Booking
                  </span>
                  <span className="font-mono text-xs text-gray-500 font-semibold">
                    #{orderStage.order_number || 'Stock'}
                  </span>
                </div>
                <div className="text-sm font-bold text-gray-900 mt-1">
                  Buyer: {orderStage.buyer || 'Internal Warehouse Stock'}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  Specification: <strong>{orderStage.fabric_type || 'Cotton Sheeting'}</strong>
                  {orderStage.ordered_at ? ` • Booked on ${orderStage.ordered_at.substring(0, 10)}` : ''}
                </p>
              </div>
            </div>

            {/* Step 3: Weaving Floor */}
            <div className="relative flex items-start gap-4">
              <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-[#714B67] text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white">
                3
              </div>
              <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#714B67] uppercase">
                    Loom Weaving & Machine Operation
                  </span>
                  <span className="font-mono text-xs text-gray-500 font-semibold capitalize">
                    {weavingStage.shift || 'Morning'} Shift
                  </span>
                </div>
                <div className="text-sm font-bold text-gray-900 mt-1">
                  Machine: {weavingStage.machine || 'Airjet Loom A1'} ({weavingStage.stage || 'weaving'})
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  Operated by <strong>{weavingStage.operator || 'Shift Operator'}</strong> ({weavingStage.operator_role || 'Weaver'})
                  • Dye Lot: <span className="font-mono">{dyeLot}</span>
                </p>
              </div>
            </div>

            {/* Step 4: Quality & ASTM Inspection */}
            <div className="relative flex items-start gap-4">
              <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white">
                4
              </div>
              <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase">
                    ASTM D5430 4-Point Perch Inspection
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Grade {grade || 'A'} ({qc_status?.toUpperCase() || 'PASS'})
                  </span>
                </div>
                <div className="text-sm font-bold text-gray-900 mt-1">
                  Inspection Result: {defect_points} Defect Points
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  Area Inspected: {passportData.inspected_area_sq_yd || (length_m * 1.0936 * (widthIn / 36)).toFixed(1)} sq yd ({length_m}m × {widthIn}")
                </p>

                {/* Defect flaw list */}
                {qcStage.defects && qcStage.defects.length > 0 ? (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-700 block">Flaws Logged ({qcStage.defects.length}):</span>
                    {qcStage.defects.map((d) => (
                      <div key={d.id} className="text-xs text-gray-600 flex justify-between bg-white px-2.5 py-1 rounded border border-gray-200">
                        <span className="capitalize">• {d.type.replace(/_/g, ' ')} ({d.size_in}")</span>
                        <span className="font-mono font-bold text-[#714B67]">{d.points} pts</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-emerald-700 font-medium">
                    ✓ Clean roll pass: Zero defect points recorded.
                  </div>
                )}
              </div>
            </div>

            {/* Step 5: Dispatch & Invoicing */}
            <div className="relative flex items-start gap-4">
              <div className={`absolute -left-6 mt-1 w-5 h-5 rounded-full ${passportData.dispatched ? 'bg-blue-600' : 'bg-gray-400'} text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white`}>
                5
              </div>
              <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs font-bold ${passportData.dispatched ? 'text-blue-800' : 'text-gray-600'} uppercase`}>
                    Warehouse Dispatch & Invoicing
                  </span>
                  <span className="font-mono text-xs text-gray-500 font-semibold">
                    {dispatchStage.dispatch_number || (passportData.dispatched ? 'DSP-COMPLETE' : 'Staged In Warehouse')}
                  </span>
                </div>
                {passportData.dispatched ? (
                  <>
                    <div className="text-sm font-bold text-gray-900 mt-1">
                      Transport Vehicle: <span className="font-mono">{dispatchStage.vehicle_no || 'TN-38-CY-4821'}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Invoice: <strong className="font-mono">{dispatchStage.invoice_no || 'INV-202610-001'}</strong>
                      {dispatchStage.dispatched_at ? ` • Dispatched on ${dispatchStage.dispatched_at.substring(0, 10)}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600 mt-1">
                    Quality inspection cleared. Roll is staged in warehouse shelf inventory, ready for buyer dispatch loading.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Roll Manufacturing Cost Breakdown */}
          {cost && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#714B67]" />
                Roll Production Cost Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <span className="text-gray-500 block">Yarn Material Cost</span>
                  <span className="font-bold text-sm text-gray-900 mt-0.5 block">
                    ₹{cost.yarn_cost ? Number(cost.yarn_cost).toLocaleString('en-IN') : '0'}
                  </span>
                  <span className="text-[10px] text-gray-400">Based on yarn kg consumed</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                  <span className="text-gray-500 block">Machine Overhead</span>
                  <span className="font-bold text-sm text-gray-900 mt-0.5 block">
                    ₹{cost.overhead_cost ? Number(cost.overhead_cost).toLocaleString('en-IN') : '0'}
                  </span>
                  <span className="text-[10px] text-gray-400">Power, loom wear & factory rate</span>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs">
                  <span className="text-[#714B67] font-semibold block">Total Roll Cost</span>
                  <span className="font-black text-sm text-[#714B67] mt-0.5 block">
                    ₹{cost.total_cost ? Number(cost.total_cost).toLocaleString('en-IN') : '0'}
                  </span>
                  <span className="text-[10px] text-[#714B67]/70">Excluding sales tax / GST</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-3.5 px-6 text-center text-xs text-gray-400 no-print">
        Loomdo Certified Traceability • Everest Textile Mills • Standard ASTM D5430
      </footer>

      {/* 4x2 Label Print Modal */}
      <PrintLabelsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        rolls={[passportData]}
        baseUrl={baseUrl}
      />
    </div>
  );
}
