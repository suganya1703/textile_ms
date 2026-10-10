import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  AlertOctagon,
  Plus,
  ArrowLeft,
  Gauge,
  Sliders,
  QrCode,
  ShieldAlert
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/common';

export function MobileFloorModeView({ onBack }) {
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [outputIncrement, setOutputIncrement] = useState(10);
  const [defectType, setDefectType] = useState('uneven_weave');
  const [defectSize, setDefectSize] = useState(4.0);
  const [rolls, setRolls] = useState([]);
  const [targetRollId, setTargetRollId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [mRes, rRes] = await Promise.all([
        api.getMachines(),
        api.getRolls('qc_status=pending')
      ]);
      setMachines(mRes.machines);
      setRolls(rRes);
      if (mRes.machines.length > 0 && !selectedMachineId) {
        setSelectedMachineId(mRes.machines[3]?.id || mRes.machines[0].id); // Loom W-01
      }
      if (rRes.length > 0 && !targetRollId) {
        setTargetRollId(rRes[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedMachine = machines.find((m) => m.id === Number(selectedMachineId));

  const handleSetStatus = async (status) => {
    if (!selectedMachine) return;
    try {
      await api.updateMachineStatus(selectedMachine.id, status);
      showToast(`${selectedMachine.name} status set to ${status.toUpperCase()}!`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddOutput = async (increment) => {
    if (!selectedMachine?.current_job) {
      showToast('Machine has no active job assigned.', 'warning');
      return;
    }
    try {
      setSubmitting(true);
      await api.updateJobProgress(selectedMachine.current_job.job_id, {
        output_increment_m: increment
      });
      showToast(`Logged +${increment} metres to ${selectedMachine.name}!`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDefect = async () => {
    if (!targetRollId) {
      showToast('Please select a roll to log defects.', 'warning');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.logDefect(targetRollId, {
        type: defectType,
        size_in: Number(defectSize)
      });
      showToast(`Flaw recorded: +${res.points_awarded} pts -> Grade ${res.grade?.toUpperCase()}`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-loomdo-teal selection:text-slate-900 pb-8">
      {/* Top Floor Bar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-5 h-5 text-loomdo-teal" />
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white">MILL-FLOOR TOUCH MODE</h1>
            <p className="text-[10px] text-slate-400">Everest Textile Mills • Perch & Loom Terminal</p>
          </div>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Desktop Console
          </button>
        )}
      </div>

      {/* Main Touch Controls Container */}
      <div className="p-4 max-w-lg w-full mx-auto space-y-6">
        {/* Machine Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Mill Machine
          </label>
          <select
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            className="w-full p-3.5 bg-slate-800 text-white font-bold rounded-xl border border-slate-700 text-base outline-none focus:ring-2 focus:ring-[var(--color-loomdo-teal)]"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} [{m.status.toUpperCase()}]
              </option>
            ))}
          </select>
        </div>

        {/* Machine Status Card */}
        {selectedMachine && (
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-black text-white">{selectedMachine.name}</span>
                <p className="text-xs text-slate-400 uppercase mt-0.5">{selectedMachine.stage} Department</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  selectedMachine.status === 'running'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : selectedMachine.status === 'idle'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                }`}
              >
                {selectedMachine.status}
              </span>
            </div>

            {/* 1-Tap Machine Status Toggle Buttons (Large touch targets) */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleSetStatus('running')}
                className={`py-3.5 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedMachine.status === 'running'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 ring-2 ring-emerald-400'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                Running
              </button>

              <button
                onClick={() => handleSetStatus('idle')}
                className={`py-3.5 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedMachine.status === 'idle'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50 ring-2 ring-amber-400'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Pause className="w-5 h-5" />
                Idle
              </button>

              <button
                onClick={() => handleSetStatus('breakdown')}
                className={`py-3.5 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center justify-center gap-1 transition-all ${
                  selectedMachine.status === 'breakdown'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50 ring-2 ring-rose-400 animate-pulse'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <AlertOctagon className="w-5 h-5" />
                Breakdown
              </button>
            </div>
          </div>
        )}

        {/* Rapid Metre Output Logger */}
        {selectedMachine?.current_job && (
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300 uppercase">
                Active Job: #{selectedMachine.current_job.order_number}
              </span>
              <span className="font-mono text-loomdo-teal font-bold">
                {selectedMachine.current_job.output_today_m}m woven
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={submitting}
                onClick={() => handleAddOutput(10)}
                className="py-4 bg-loomdo-primary hover:bg-loomdo-primary-dark text-white font-black text-sm rounded-xl transition-all shadow-md active:scale-95"
              >
                +10 Metres
              </button>

              <button
                disabled={submitting}
                onClick={() => handleAddOutput(25)}
                className="py-4 bg-loomdo-primary hover:bg-loomdo-primary-dark text-white font-black text-sm rounded-xl transition-all shadow-md active:scale-95"
              >
                +25 Metres
              </button>

              <button
                disabled={submitting}
                onClick={() => handleAddOutput(50)}
                className="py-4 bg-loomdo-teal hover:bg-loomdo-teal-dark text-slate-950 font-black text-sm rounded-xl transition-all shadow-md active:scale-95"
              >
                +50 Metres
              </button>
            </div>
          </div>
        )}

        {/* Rapid Defect Logger on Perch Station */}
        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
            Perch Table Defect Logger (ASTM 4-Point)
          </span>

          <div className="space-y-2">
            <select
              value={targetRollId}
              onChange={(e) => setTargetRollId(e.target.value)}
              className="w-full p-2.5 bg-slate-900 text-white font-semibold rounded-xl border border-slate-700 text-xs"
            >
              {rolls.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roll_number} ({r.length_m}m, {r.dye_lot})
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={defectType}
                onChange={(e) => setDefectType(e.target.value)}
                className="p-2.5 bg-slate-900 text-white font-semibold rounded-xl border border-slate-700 text-xs"
              >
                <option value="uneven_weave">Uneven Weave</option>
                <option value="hole">Hole / Cut</option>
                <option value="colour_mismatch">Colour Mismatch</option>
                <option value="stain">Stain Spot</option>
                <option value="other">Other Flaw</option>
              </select>

              <select
                value={defectSize}
                onChange={(e) => setDefectSize(e.target.value)}
                className="p-2.5 bg-slate-900 text-white font-semibold rounded-xl border border-slate-700 text-xs"
              >
                <option value={2.0}>Small (&lt;3" - 1pt)</option>
                <option value={5.0}>Medium (3-6" - 2pt)</option>
                <option value={8.0}>Large (6-9" - 3pt)</option>
                <option value={12.0}>Severe (&gt;9" - 4pt)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleQuickDefect}
            disabled={submitting || !targetRollId}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-xl transition-all shadow-md active:scale-95"
          >
            Record Fabric Flaw
          </button>
        </div>
      </div>
    </div>
  );
}
