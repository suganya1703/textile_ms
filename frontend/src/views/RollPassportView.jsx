import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Package,
  Layers,
  Clock,
  User,
  Truck,
  ExternalLink
} from 'lucide-react';
import { api } from '../api/client';

export function RollPassportView({ rollNumber = 'ROLL-20261001-0001', onBack }) {
  const [rollData, setRollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPassport = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all rolls to find id
      const rolls = await api.getRolls();
      const match = rolls.find((r) => r.roll_number === rollNumber || String(r.id) === rollNumber);
      if (!match) {
        throw new Error(`Roll '${rollNumber}' not found in mill records.`);
      }
      const pedigree = await api.getRollPedigree(match.id);
      setRollData(pedigree);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassport();
  }, [rollNumber]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-loomdo-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading Roll Passport & QR Provenance...
        </div>
      </div>
    );
  }

  if (error || !rollData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Roll Passport Not Found</h2>
          <p className="text-xs text-slate-500">{error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-loomdo-primary text-white rounded-xl text-xs font-bold"
            >
              Back to Mill Console
            </button>
          )}
        </div>
      </div>
    );
  }

  const { traceability, defects } = rollData;
  const qrUrl = `http://127.0.0.1:5173/passport/${rollData.roll_number}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between selection:bg-loomdo-primary selection:text-white">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-20 no-print shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-loomdo-primary flex items-center justify-center text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 flex items-center gap-2">
                Loomdo Roll Passport
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Offline QR Authenticated
                </span>
              </span>
              <p className="text-xs text-slate-500">Everest Textile Mills Traceability Seal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-loomdo-primary hover:bg-loomdo-primary-dark rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Roll Sticker Tag
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-4 space-y-6">
        {/* Printable Industrial Roll Tag / Barcode Sticker */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 print:border-2 print:shadow-none print:m-0">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-slate-500 uppercase">
                EVEREST TEXTILE MILLS • CERTIFIED ROLL
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-loomdo-primary text-white font-mono font-bold">
                GRADE {rollData.grade || 'A'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-mono font-black text-slate-950 tracking-tight">
              {rollData.roll_number}
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Construction</span>
                <div className="font-bold text-slate-900 mt-0.5">{traceability.order.fabric_type}</div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Dimensions</span>
                <div className="font-bold text-slate-900 mt-0.5">{rollData.length_m} m × {rollData.width_in}"</div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Dye Lot</span>
                <div className="font-bold text-slate-900 mt-0.5"><span className="font-mono">{rollData.dye_lot}</span> ({rollData.shade_value})</div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Loom / Operator</span>
                <div className="font-medium text-slate-800 mt-0.5">{traceability.machine.name} / {traceability.operator.name}</div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">ASTM 4-Point</span>
                <div className="font-bold text-slate-900 mt-0.5">{rollData.defect_points} pts ({defects.length} flaws)</div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Inspection Date</span>
                <div className="font-medium text-slate-800 mt-0.5">{rollData.created_at.substring(0, 10)}</div>
              </div>
            </div>
          </div>

          {/* Local QR Code Canvas Container */}
          <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200 shrink-0 text-center">
            <QRCodeSVG
              value={qrUrl}
              size={130}
              level="H"
              includeMargin={true}
              fgColor="#1E293B"
            />
            <span className="text-[10px] font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider">
              Scan to Verify
            </span>
          </div>
        </div>

        {/* Complete Journey Provenance Timeline */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Complete Roll Journey Provenance (Yarn to Invoice)
          </h2>

          <div className="space-y-4">
            {/* Stage 1: Yarn Batch */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-loomdo-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-loomdo-primary uppercase">Yarn Arrival at Mill Gate</span>
                  <span className="font-mono text-slate-500">{traceability.yarn_batch.batch_code}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {traceability.yarn_batch.yarn_type} ({traceability.yarn_batch.colour})
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supplied by <strong>{traceability.yarn_batch.supplier}</strong> at ₹{traceability.yarn_batch.cost_per_kg}/kg
                </p>
              </div>
            </div>

            {/* Stage 2: Weaving Loom */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-loomdo-teal text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#2D8371] uppercase">Loom Floor Production</span>
                  <span className="font-mono text-slate-500">{rollData.shift.toUpperCase()} Shift</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  Loom: {traceability.machine.name}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operated by <strong>{traceability.operator.name}</strong> ({traceability.operator.role})
                </p>
              </div>
            </div>

            {/* Stage 3: ASTM 4-Point Inspection */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-800 uppercase">Quality Perch Table Inspection</span>
                  <span className="font-bold text-emerald-700">Grade {rollData.grade} (Passed)</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  ASTM D5430 Result: {rollData.defect_points} Defect Points
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total Inspected Area: {rollData.inspected_area_sq_yd} sq yd ({rollData.length_m}m × {rollData.width_in}")
                </p>

                {/* Defect List */}
                {defects.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 block">Logged Flaws:</span>
                    {defects.map((d) => (
                      <div key={d.id} className="text-xs text-slate-600 flex justify-between">
                        <span>• {d.type.replace('_', ' ')} ({d.size_in}")</span>
                        <span className="font-mono font-semibold">{d.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stage 4: Dispatch & Customer Invoice */}
            {rollData.dispatched && traceability.dispatch && (
              <div className="p-4 rounded-xl border border-slate-900 bg-slate-900 text-white flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-loomdo-teal text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  4
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-bold text-loomdo-teal uppercase">Warehouse Dispatch & Invoiced</span>
                    <span className="font-mono">{traceability.dispatch.dispatch_number}</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Transport Vehicle: <span className="font-mono">{traceability.dispatch.vehicle_no}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Customer Invoice: <strong className="font-mono">{traceability.dispatch.invoice_no}</strong> • Buyer: {traceability.order.buyer}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400 no-print">
        Loomdo Certified Traceability • Everest Textile Mills • Standard ASTM D5430
      </footer>
    </div>
  );
}
